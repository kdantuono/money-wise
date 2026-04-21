'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { toast } from 'sonner';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { DeterministicBehavioralAdvisor } from '@/lib/onboarding/advisors/DeterministicBehavioralAdvisor';
import { rebalanceOptimizer, type RebalanceCriterion } from '@/lib/onboarding/rebalance-optimizer';
import { inferGoalType } from '@/lib/onboarding/inferGoalType';
import { PRIORITY_LABEL_IT } from '@/types/onboarding-plan';
import type {
  AllocationResult,
  BehavioralWarning,
  SuggestionChip,
  WizardStep,
} from '@/types/onboarding-plan';
import { GoalPoolSection } from './GoalPoolSection';
import { LifestyleInfoSection } from './LifestyleInfoSection';

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

function WarningActionChip({
  chip,
  onApply,
}: {
  chip: SuggestionChip;
  onApply: (chip: SuggestionChip) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onApply(chip)}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[28px]"
      title={chip.reasoning}
    >
      {chip.description}
    </button>
  );
}

function WarningBadge({
  warning,
  onChipApply,
}: {
  warning: BehavioralWarning;
  onChipApply?: (chip: SuggestionChip) => void;
}) {
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
      className={`flex flex-col gap-2 p-3 rounded-lg border ${
        isHard
          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
      }`}
    >
      <div className="flex gap-2 items-start">
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
      {warning.actions && warning.actions.length > 0 && onChipApply && (
        <div className="flex gap-2 flex-wrap pl-7" data-testid={`warning-actions-${warning.code}`}>
          {warning.actions.map((chip, idx) => (
            <WarningActionChip key={`${chip.kind}-${idx}`} chip={chip} onApply={onChipApply} />
          ))}
        </div>
      )}
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
  const dismissedWarningCodes = useOnboardingPlanStore((s) => s.step4.dismissedWarningCodes ?? []);
  const setAllocationPreview = useOnboardingPlanStore((s) => s.setAllocationPreview);
  const setUserOverride = useOnboardingPlanStore((s) => s.setUserOverride);
  const applyRebalanceStore = useOnboardingPlanStore((s) => s.applyRebalance);
  const dismissWarningStore = useOnboardingPlanStore((s) => s.dismissWarning);
  const updateProfile = useOnboardingPlanStore((s) => s.updateProfile);
  const removeGoal = useOnboardingPlanStore((s) => s.removeGoal);
  const updateGoal = useOnboardingPlanStore((s) => s.updateGoal);
  const setStep = useOnboardingPlanStore((s) => s.setStep);

  const [showAdvancedRebalance, setShowAdvancedRebalance] = useState(false);

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
        // Sprint 1.5.4 Q4 Copilot round 1: propagate type so rebalance optimizer
        // distinguishes openended (never "complete") from fixed goals.
        type: g.type,
        presetId: g.presetId ?? null,
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

  const runRebalance = useCallback(
    // Sprint 1.6 #004: criterion opzionale — undefined → smart-default (equal se n≤3)
    (criterion?: RebalanceCriterion) => {
      const input = buildInput();
      const r = rebalanceOptimizer({ input, criterion, currentAllocations: userOverrides });
      if (r.newAllocations) {
        applyRebalanceStore(r.newAllocations);
      }
    },
    [buildInput, userOverrides, applyRebalanceStore],
  );

  const handleChipApply = (chip: SuggestionChip) => {
    switch (chip.kind) {
      case 'increase_monthly':
        if (chip.goalId) {
          const v = Number(chip.newValue);
          setUserOverride(chip.goalId, v);
          toast.success(`Budget obiettivo aggiornato a €${v.toLocaleString('it-IT')}/mese`);
        }
        break;
      case 'reduce_target':
        // Sprint 1.6 #005: direct apply via updateGoal. Goal edit modal full-flow
        // con reasoning contestuale = follow-up lavoro (scope ridotto per batch).
        if (chip.goalId && chip.newValue != null) {
          const target = Number(chip.newValue);
          if (Number.isFinite(target) && target > 0) {
            updateGoal(chip.goalId, { target });
            toast.success(`Target ridotto a €${target.toLocaleString('it-IT')}`);
          }
        }
        break;
      case 'extend_deadline':
        // Sprint 1.6 #005: direct apply via updateGoal.
        if (chip.goalId && typeof chip.newValue === 'string' && chip.newValue.length > 0) {
          updateGoal(chip.goalId, { deadline: chip.newValue });
          toast.success(`Deadline estesa a ${chip.newValue}`);
        }
        break;
      case 'rebalance_portfolio': {
        // Sprint 1.5.4 Q4 Copilot round 1: accept legacy 'balanced' alias emitted by
        // DeterministicBehavioralAdvisor.generateSuggestions() + supported 'feasibility'/'equal'.
        // 'time' was removed from public API — falls through to 'feasibility' default.
        const raw = typeof chip.newValue === 'string' ? chip.newValue : '';
        const criterion: RebalanceCriterion =
          raw === 'equal' ? 'equal' : 'feasibility';
        runRebalance(criterion);
        toast.success(
          criterion === 'equal'
            ? 'Portafoglio ribilanciato (distribuzione equa)'
            : 'Portafoglio ribilanciato (massimizza feasibility)',
        );
        break;
      }
      case 'navigate': {
        const step = Number(chip.newValue);
        if (step >= 1 && step <= 5) setStep(step as WizardStep);
        break;
      }
      case 'budget_transfer': {
        const amount = Number(chip.newValue);
        if (!chip.from || !chip.to || amount <= 0) break;
        // Sprint 1.6 #002 Bug #3: chain-aware validation DEFENSIVE. Oggi
        // DeterministicBehavioralAdvisor emette `budget_transfer` solo via warning
        // ORPHAN_* (from-pool goals.length === 0) → questo branch resta dormant per
        // i chip advisor-generati, ma protegge scenari futuri (chip programmaticamente
        // creati in test, future warning codes, manual invocation). Senza questa guardia,
        // un chip chain-unsafe causerebbe hard-block silenzioso post-transfer. Copilot
        // round 1 #524 ha segnalato potenziale dead-code: scelta conservativa è guardia
        // presente come safety net, documentata per audit futuro.
        const fromPool = chip.from;
        const goalsInFromPool = step3.goals.filter((g) => {
          const pool = inferGoalType({ name: g.name, presetId: g.presetId ?? null });
          return pool === fromPool;
        });
        if (goalsInFromPool.length > 0) {
          const poolLabel = fromPool === 'investments' ? 'Investimenti' : 'Risparmi';
          const names = goalsInFromPool.map((g) => g.name).join(', ');
          const confirmed =
            typeof window !== 'undefined' && typeof window.confirm === 'function'
              ? window.confirm(
                  `Spostando €${amount} dal pool ${poolLabel}, ${goalsInFromPool.length} obiettivo/i resteranno senza budget e genereranno un hard-block: ${names}.\n\nProcedi e rimuovi anche ${goalsInFromPool.length === 1 ? 'questo obiettivo' : `questi ${goalsInFromPool.length} obiettivi`}?`,
                )
              : true;
          if (!confirmed) break;
          for (const g of goalsInFromPool) removeGoal(g.tempId);
        }
        if (chip.from === 'investments' && chip.to === 'savings') {
          updateProfile({
            investmentsTarget: 0,
            monthlySavingsTarget: step2.monthlySavingsTarget + amount,
          });
        } else if (chip.from === 'savings' && chip.to === 'investments') {
          updateProfile({
            monthlySavingsTarget: 0,
            investmentsTarget: (step2.investmentsTarget ?? 0) + amount,
          });
        }
        toast.success(
          goalsInFromPool.length > 0
            ? `€${amount} spostati + ${goalsInFromPool.length} obiettivo${goalsInFromPool.length === 1 ? '' : 'i'} rimossi`
            : `€${amount} spostati a ${chip.to === 'investments' ? 'Investimenti' : 'Risparmi'}`,
        );
        break;
      }
      case 'bulk_remove_goals':
        if (chip.goalIds && chip.goalIds.length > 0) {
          for (const id of chip.goalIds) removeGoal(id);
          toast.success(
            `${chip.goalIds.length} obiettivo${chip.goalIds.length === 1 ? '' : 'i'} rimossi`,
          );
        }
        break;
      case 'dismiss': {
        const code = String(chip.newValue);
        if (code) {
          dismissWarningStore(code);
          toast('Avviso nascosto', { description: 'Puoi riattivarlo dalle impostazioni' });
        }
        break;
      }
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
  // Sprint 1.5.5 Phase 2: effective totals UI-aware — summary bar + pool header
  // reflect userOverrides post-rebalance/slider. computeAllocation ignora
  // userOverrides by design; computiamo effective on-the-fly dagli items.
  const effectiveAllocatedFromItems = (items: { goalId: string; monthlyAmount: number }[]) =>
    Math.round(
      items.reduce((sum, it) => sum + (userOverrides[it.goalId] ?? it.monthlyAmount), 0) * 100,
    ) / 100;
  const totalAllocated = effectiveAllocatedFromItems(result.items ?? []);
  const isHardBlocked = !!result.hardBlock;
  // Sprint 1.5.4 Q7: filter out warnings dismissed via inline chip action.
  const visibleWarnings = behavioralWarnings.filter(
    (w) => !dismissedWarningCodes.includes(w.code),
  );
  const hardWarnings = visibleWarnings.filter((w) => w.severity === 'hard');
  const softWarnings = visibleWarnings.filter((w) => w.severity === 'soft');
  const encouragement = softWarnings.find((w) => w.code === 'PLAN_BALANCED');
  const actionableWarnings = softWarnings.filter((w) => w.code !== 'PLAN_BALANCED');

  const savingsPool = Math.min(step2.monthlySavingsTarget, incomeAfterEssentials);
  const maxSlider = Math.max(savingsPool, 1);

  const hasPoolsBreakdown = !!result.pools;
  const lifestyleProtected = hasPoolsBreakdown ? result.pools!.lifestyle.budget : 0;

  // Sprint 1.6.4D #030: split chip globali (goalId=null) vs per-goal (goalId set)
  // per rendering per-goal inline sotto ciascun item in GoalPoolSection.
  const suggestionsByGoalId = (result.suggestions ?? []).reduce<Record<string, SuggestionChip[]>>(
    (acc, chip) => {
      if (chip.goalId) {
        if (!acc[chip.goalId]) acc[chip.goalId] = [];
        acc[chip.goalId]!.push(chip);
      }
      return acc;
    },
    {},
  );
  // Sprint 1.5.5 Phase 2: effective pool totals (reflect userOverrides live).
  const effectiveSavingsAllocated = hasPoolsBreakdown
    ? effectiveAllocatedFromItems(result.pools!.savings.items)
    : totalAllocated;
  const effectiveSavingsResidual = hasPoolsBreakdown
    ? Math.round((result.pools!.savings.budget - effectiveSavingsAllocated) * 100) / 100
    : 0;
  const effectiveInvestAllocated = hasPoolsBreakdown
    ? effectiveAllocatedFromItems(result.pools!.investments.items)
    : 0;
  const effectiveInvestResidual = hasPoolsBreakdown
    ? Math.round((result.pools!.investments.budget - effectiveInvestAllocated) * 100) / 100
    : 0;
  // Unallocated top-level: per pools 3-pool, residuo dopo lifestyle+savings+invest.
  // Per legacy flat, residuo totale post-savings.
  const unallocated = hasPoolsBreakdown
    ? Math.round((effectiveSavingsResidual + effectiveInvestResidual) * 100) / 100
    : Math.round((savingsPool - totalAllocated) * 100) / 100;

  return (
    <div className="space-y-4" data-testid="step-calibration">
      {/* Summary bar: 3-col (legacy) or 2x2 mobile / 4-col desktop (3-pool) */}
      <div
        className={`grid gap-2 p-3 rounded-xl bg-muted/50 border border-border text-center ${
          hasPoolsBreakdown ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
        }`}
      >
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
        {hasPoolsBreakdown && (
          <div data-testid="summary-lifestyle">
            <p className="text-xs text-muted-foreground">Lifestyle</p>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {fmtEur(lifestyleProtected)}
            </p>
          </div>
        )}
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
            <WarningBadge key={w.code} warning={w} onChipApply={handleChipApply} />
          ))}
        </div>
      )}

      {/* Soft behavioral warnings */}
      {actionableWarnings.length > 0 && (
        <div className="space-y-2">
          {actionableWarnings.map((w) => (
            <WarningBadge key={w.code} warning={w} onChipApply={handleChipApply} />
          ))}
        </div>
      )}

      {/* Encouragement (only when no other warnings) */}
      {encouragement && actionableWarnings.length === 0 && hardWarnings.length === 0 && (
        <WarningBadge warning={encouragement} onChipApply={handleChipApply} />
      )}

      {/* Sprint 1.5.4 Q4: Rebalance portfolio + opzioni avanzate */}
      {result.pools && step3.goals.length > 1 && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={() => runRebalance()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[32px]"
              data-testid="rebalance-portfolio-chip"
            >
              📋 Ribilancia il portafoglio
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedRebalance((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              {showAdvancedRebalance ? '▲ Nascondi opzioni' : '▼ Opzioni avanzate'}
            </button>
          </div>
          {showAdvancedRebalance && (
            <div className="flex gap-2 flex-wrap text-xs pl-2" data-testid="rebalance-advanced-options">
              <button
                type="button"
                onClick={() => runRebalance('feasibility')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[32px]"
                aria-label="Priorità ai goal più urgenti e fattibili"
              >
                Massimizza raggiungibilità
              </button>
              <button
                type="button"
                onClick={() => runRebalance('equal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[32px]"
                aria-label="Distribuisci il budget equamente tra tutti gli obiettivi"
              >
                Distribuzione equa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sprint 1.6.4D #030: split global chip (goalId=null) vs per-goal chip.
          Per-goal chip passati a GoalPoolSection via prop suggestionsByGoalId → rendered
          inline sotto ciascun item. Top block mostra global + fallback per-goal chip
          non rendered in pool (edge case: flag 3-pool OFF, o goal non routed a pool). */}
      {(() => {
        const poolRenderedGoalIds = new Set<string>();
        if (hasPoolsBreakdown && result.pools) {
          for (const it of result.pools.savings.items) poolRenderedGoalIds.add(it.goalId);
          for (const it of result.pools.investments.items) poolRenderedGoalIds.add(it.goalId);
        }
        const topChips = (result.suggestions ?? []).filter(
          (c) => !c.goalId || !poolRenderedGoalIds.has(c.goalId),
        );
        return topChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topChips.map((chip) => (
              <SuggestionChipButton
                key={`${chip.goalId ?? 'global'}-${chip.kind}`}
                chip={chip}
                onApply={handleChipApply}
              />
            ))}
          </div>
        ) : null;
      })()}

      {/* 3-pool breakdown rendering (when pools present, Sprint 1.5.3 WP-Q5) */}
      {hasPoolsBreakdown && (
        <div className="space-y-3">
          {(result.pools!.savings.items.length > 0 || result.pools!.savings.budget > 0) && (
            <GoalPoolSection
              poolType="savings"
              title="Savings"
              budget={result.pools!.savings.budget}
              allocated={effectiveSavingsAllocated}
              residual={effectiveSavingsResidual}
              items={result.pools!.savings.items}
              goals={step3.goals}
              userOverrides={userOverrides}
              onSliderChange={(goalId, v) => setUserOverride(goalId, v)}
              maxSlider={Math.max(result.pools!.savings.budget, 1)}
              suggestionsByGoalId={suggestionsByGoalId}
              onChipApply={handleChipApply}
            />
          )}
          {(result.pools!.investments.items.length > 0 || result.pools!.investments.budget > 0) && (
            <GoalPoolSection
              poolType="investments"
              title="Investimenti"
              budget={result.pools!.investments.budget}
              allocated={effectiveInvestAllocated}
              residual={effectiveInvestResidual}
              items={result.pools!.investments.items}
              goals={step3.goals}
              userOverrides={userOverrides}
              onSliderChange={(goalId, v) => setUserOverride(goalId, v)}
              maxSlider={Math.max(result.pools!.investments.budget, 1)}
              suggestionsByGoalId={suggestionsByGoalId}
              onChipApply={handleChipApply}
            />
          )}
          <LifestyleInfoSection budget={result.pools!.lifestyle.budget} />
        </div>
      )}

      {/* Per-goal sliders (legacy flat list — shown when pools NOT present) */}
      {!hasPoolsBreakdown && (
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
      )}

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
