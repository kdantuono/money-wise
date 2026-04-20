'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { DeterministicBehavioralAdvisor } from '@/lib/onboarding/advisors/DeterministicBehavioralAdvisor';
import { PRIORITY_LABEL_IT } from '@/types/onboarding-plan';
import type {
  AllocationResult,
  BehavioralWarning,
  SuggestionChip,
} from '@/types/onboarding-plan';

// ─────────────────────────────────────────────────────────────────────────
// Singleton advisor instance (pure, no I/O)
// ─────────────────────────────────────────────────────────────────────────
const _advisor = new DeterministicBehavioralAdvisor();

// ─────────────────────────────────────────────────────────────────────────
// Priority accent classes
// ─────────────────────────────────────────────────────────────────────────
const PRIORITY_ACCENT: Record<1 | 2 | 3, { border: string; bg: string }> = {
  1: { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
  2: { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  3: { border: 'border-gray-300 dark:border-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20' },
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function fmtEur(n: number): string {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function WarningBadge({ warning }: { warning: BehavioralWarning }) {
  const isHard = warning.severity === 'hard';
  const isEncouragement = warning.code === 'PLAN_BALANCED';

  if (isEncouragement) {
    return (
      <div className="flex gap-2 items-start p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
        <span aria-hidden="true" className="shrink-0 mt-0.5 text-base">✅</span>
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">{warning.message}</p>
          {warning.reasoning && (
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">{warning.reasoning}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex gap-2 items-start p-3 rounded-lg border ${
        isHard
          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
      }`}
    >
      <span aria-hidden="true" className="shrink-0 mt-0.5 text-base">
        {isHard ? '🔴' : '🟡'}
      </span>
      <div>
        <p
          className={`text-sm font-medium ${
            isHard
              ? 'text-red-800 dark:text-red-300'
              : 'text-amber-800 dark:text-amber-300'
          }`}
        >
          {warning.message}
        </p>
        {warning.reasoning && (
          <p
            className={`text-xs mt-0.5 ${
              isHard
                ? 'text-red-700 dark:text-red-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {warning.reasoning}
          </p>
        )}
      </div>
    </div>
  );
}

interface ChipProps {
  chip: SuggestionChip;
  onApply: (chip: SuggestionChip) => void;
}

function SuggestionChipButton({ chip, onApply }: ChipProps) {
  return (
    <button
      type="button"
      onClick={() => onApply(chip)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      title={chip.reasoning}
    >
      {chip.description}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export function StepCalibration() {
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step3 = useOnboardingPlanStore((s) => s.step3);
  const userOverrides = useOnboardingPlanStore((s) => s.step4.userOverrides);
  const setAllocationPreview = useOnboardingPlanStore((s) => s.setAllocationPreview);
  const setUserOverride = useOnboardingPlanStore((s) => s.setUserOverride);

  const [result, setResult] = useState<AllocationResult | null>(null);
  const [behavioralWarnings, setBehavioralWarnings] = useState<BehavioralWarning[]>([]);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build allocation input from store state
  // Post WP-C: monthlyIncome lives in step2 (merged Profilo step).
  // lifestyleBuffer + investmentsTarget from step2 wire LIFESTYLE_TOO_LOW + INVEST_ZERO_NO_DEBT
  // behavioral warnings (WP-E DeterministicBehavioralAdvisor).
  const buildInput = useCallback(() => {
    return {
      monthlyIncome: step2.monthlyIncome,
      monthlySavingsTarget: step2.monthlySavingsTarget,
      essentialsPct: step2.essentialsPct,
      lifestyleBuffer: step2.lifestyleBuffer,
      investmentsTarget: step2.investmentsTarget,
      goals: step3.goals.map((g) => ({
        id: g.tempId,
        name: g.name,
        target: g.target,
        current: 0,
        deadline: g.deadline,
        priority: g.priority,
      })),
      userOverrides,
    };
  }, [step2, step3, userOverrides]);

  // Compute allocation + behavioral analysis
  const runAnalysis = useCallback(() => {
    if (step2.monthlyIncome <= 0 || step3.goals.length === 0) {
      setResult(null);
      setBehavioralWarnings([]);
      setAllocationPreview(null);
      return;
    }
    const input = buildInput();
    const r = _advisor.proposeAllocation(input);
    setResult(r);
    setBehavioralWarnings(r.behavioralWarnings ?? []);
    setAllocationPreview(r);
  }, [buildInput, setAllocationPreview, step2.monthlyIncome, step3.goals.length]);

  // Initial analysis
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // Debounced re-analysis when userOverrides change
  useEffect(() => {
    if (Object.keys(userOverrides).length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (step2.monthlyIncome <= 0) return;
      const input = buildInput();
      const warnings = _advisor.analyzeUserOverride(userOverrides, input);
      setBehavioralWarnings(warnings);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userOverrides, buildInput, step2.monthlyIncome]);

  const handleSliderChange = (goalId: string, value: number[]) => {
    setUserOverride(goalId, value[0] ?? 0);
  };

  const handleChipApply = (chip: SuggestionChip) => {
    if (!chip.goalId) return; // rebalance_portfolio = no-op here (future impl)
    if (chip.kind === 'increase_monthly') {
      setUserOverride(chip.goalId, Number(chip.newValue));
    } else if (chip.kind === 'reduce_target') {
      // For now surface info via the warning panel — target edit requires goal modal
      // (WP-D). We show a hint that the suggestion chip has been noted.
    } else if (chip.kind === 'extend_deadline') {
      // Deadline edit also requires WP-D goal modal — chips inform only for now.
    }
  };

  if (!result) {
    if (step3.goals.length === 0) {
      return (
        <div className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Aggiungi almeno un obiettivo allo Step 3 per vedere il piano proposto.
        </div>
      );
    }
    return (
      <div className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        Inserisci il reddito mensile allo Step 2 per calcolare il piano.
      </div>
    );
  }

  const incomeAfterEssentials = result.incomeAfterEssentials;
  const totalAllocated = result.totalAllocated;
  const unallocated = result.unallocated;
  const isHardBlocked = !!result.hardBlock;
  const hardWarnings = behavioralWarnings.filter((w) => w.severity === 'hard');
  const softWarnings = behavioralWarnings.filter((w) => w.severity === 'soft');
  const encouragement = softWarnings.find((w) => w.code === 'PLAN_BALANCED');
  const actionableWarnings = softWarnings.filter((w) => w.code !== 'PLAN_BALANCED');

  const savingsPool = Math.min(step2.monthlySavingsTarget, incomeAfterEssentials);
  const maxSlider = Math.max(savingsPool, 1);

  return (
    <div className="space-y-4" data-testid="step-calibration">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50 border border-border text-center">
        <div>
          <p className="text-xs text-muted-foreground">Post-essenziali</p>
          <p className="text-sm font-semibold text-foreground">{fmtEur(incomeAfterEssentials)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Allocato</p>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {fmtEur(totalAllocated)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Residuo</p>
          <p
            className={`text-sm font-semibold ${
              unallocated < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {fmtEur(unallocated)}
          </p>
        </div>
      </div>

      {/* Hard block error */}
      {isHardBlocked && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          data-testid="hard-block-error"
        >
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            {result.hardBlock!.reason}
          </p>
        </div>
      )}

      {/* Hard behavioral warnings */}
      {hardWarnings.length > 0 && (
        <div className="space-y-2">
          {hardWarnings.map((w) => (
            <WarningBadge key={w.code} warning={w} />
          ))}
        </div>
      )}

      {/* Soft behavioral warnings */}
      {actionableWarnings.length > 0 && (
        <div className="space-y-2">
          {actionableWarnings.map((w) => (
            <WarningBadge key={w.code} warning={w} />
          ))}
        </div>
      )}

      {/* Encouragement (only when no other warnings) */}
      {encouragement && actionableWarnings.length === 0 && hardWarnings.length === 0 && (
        <WarningBadge warning={encouragement} />
      )}

      {/* Suggestion chips */}
      {(result.suggestions ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(result.suggestions ?? []).map((chip) => (
            <SuggestionChipButton
              key={`${chip.goalId ?? 'global'}-${chip.kind}`}
              chip={chip}
              onApply={handleChipApply}
            />
          ))}
        </div>
      )}

      {/* Per-goal sliders */}
      <ul className="space-y-3" aria-label="Calibrazione allocazione per obiettivo">
        {result.items.map((item) => {
          const goal = step3.goals.find((g) => g.tempId === item.goalId);
          if (!goal) return null;
          const accent = PRIORITY_ACCENT[goal.priority as 1 | 2 | 3];
          const currentValue =
            userOverrides[item.goalId] !== undefined
              ? userOverrides[item.goalId]!
              : item.monthlyAmount;

          return (
            <li
              key={item.goalId}
              className={`p-3 rounded-xl border-l-4 ${accent.border} ${accent.bg}`}
              data-testid={`goal-item-${item.goalId}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {PRIORITY_LABEL_IT[goal.priority]} priorità
                    {!item.deadlineFeasible && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        — deadline non fattibile
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 ml-2">
                  {fmtEur(currentValue)}/mese
                </p>
              </div>

              {/* Radix Slider */}
              <SliderPrimitive.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                min={0}
                max={maxSlider}
                step={5}
                value={[currentValue]}
                onValueChange={(val) => handleSliderChange(item.goalId, val)}
                aria-label={`Allocazione mensile per ${goal.name}`}
                data-testid={`slider-${item.goalId}`}
              >
                <SliderPrimitive.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-1.5">
                  <SliderPrimitive.Range className="absolute bg-blue-500 rounded-full h-full" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb
                  className="block w-4 h-4 bg-white dark:bg-gray-200 border-2 border-blue-500 rounded-full shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 hover:bg-blue-50 transition-colors"
                  aria-label={`Importo mensile ${goal.name}`}
                />
              </SliderPrimitive.Root>

              {/* Per-item reasoning */}
              {item.reasoning && (
                <p className="text-xs text-muted-foreground mt-2">{item.reasoning}</p>
              )}

              {/* Per-item warnings */}
              {item.warnings.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {item.warnings.map((w, idx) => (
                    <li key={idx} className="text-xs text-amber-700 dark:text-amber-400 flex gap-1">
                      <span aria-hidden="true">⚠</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Global allocation warnings from waterfall */}
      {result.warnings.length > 0 && (
        <ul className="space-y-1">
          {result.warnings.map((w, idx) => (
            <li key={idx} className="text-xs text-amber-700 dark:text-amber-400 flex gap-2">
              <span aria-hidden="true">⚠️</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Exported helper so WizardPianoGenerato can check hard-block state
 * before enabling the "Avanti" button on Step 4.
 */
export { _advisor as calibrationAdvisor };
