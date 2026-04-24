'use client';

import { useId } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { AlertTriangle } from 'lucide-react';
import { PRIORITY_LABEL_IT } from '@/types/onboarding-plan';
import type { AllocationResultItem, PoolCategory, SuggestionChip } from '@/types/onboarding-plan';
import type { WizardGoalDraft } from '@/types/onboarding-plan';
import { getPresetColor } from '@/lib/onboarding/presetColors';

/**
 * Sprint 1.5.3 WP-Q5: per-pool section rendering goal sliders + chips.
 * One instance per pool (savings / investments). Lifestyle is rendered
 * separately via LifestyleInfoSection (non-allocable).
 */

interface GoalPoolSectionProps {
  poolType: PoolCategory;
  title: string;
  budget: number;
  allocated: number;
  residual: number;
  items: AllocationResultItem[];
  goals: WizardGoalDraft[];
  userOverrides: Record<string, number>;
  onSliderChange: (goalId: string, value: number) => void;
  maxSlider: number;
  /** Sprint 1.6.4D #030: per-goal suggestion chips rendered inline sotto ogni item */
  suggestionsByGoalId?: Record<string, SuggestionChip[]>;
  onChipApply?: (chip: SuggestionChip) => void;
}

const POOL_PALETTE: Record<
  PoolCategory,
  { border: string; bg: string; heading: string; icon: string; testId: string }
> = {
  savings: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50/30 dark:bg-blue-950/10',
    heading: 'text-blue-900 dark:text-blue-200',
    icon: '📂',
    testId: 'pool-section-savings',
  },
  investments: {
    border: 'border-purple-200 dark:border-purple-800',
    bg: 'bg-purple-50/30 dark:bg-purple-950/10',
    heading: 'text-purple-900 dark:text-purple-200',
    icon: '📈',
    testId: 'pool-section-investments',
  },
};

/**
 * #060: priority text chip (replaces PRIORITY_ACCENT color barcode).
 * Barcode ora riflette preset color (vedi getPresetColor in presetColors.ts).
 */
const PRIORITY_CHIP: Record<1 | 2 | 3, { label: string; className: string }> = {
  1: {
    label: 'Alta',
    className:
      'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-300/60 dark:border-red-800/60',
  },
  2: {
    label: 'Media',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60',
  },
  3: {
    label: 'Bassa',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/60',
  },
};

function fmtEur(n: number): string {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function GoalPoolSection({
  poolType,
  title,
  budget,
  allocated,
  residual,
  items,
  goals,
  userOverrides,
  onSliderChange,
  maxSlider,
  suggestionsByGoalId,
  onChipApply,
}: GoalPoolSectionProps) {
  const headingId = useId();
  const palette = POOL_PALETTE[poolType];

  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl border ${palette.border} ${palette.bg}`}
      data-testid={palette.testId}
    >
      {/* Header: pool title + 3 metric */}
      <div className="flex justify-between flex-wrap items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 border-b border-border/50">
        <h3
          id={headingId}
          className={`text-sm sm:text-base font-semibold ${palette.heading} flex items-center gap-2`}
        >
          <span aria-hidden="true">{palette.icon}</span>
          {title}
        </h3>
        <div className="flex gap-3 sm:gap-4 text-xs text-muted-foreground">
          <span>
            Budget <span className="font-medium text-foreground">{fmtEur(budget)}</span>
          </span>
          <span>
            Allocato{' '}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {fmtEur(allocated)}
            </span>
          </span>
          <span>
            Residuo{' '}
            <span
              className={`font-medium ${
                residual < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {fmtEur(residual)}
            </span>
          </span>
        </div>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <p className="px-3 py-3 sm:px-4 sm:py-4 text-xs text-muted-foreground">
          Nessun obiettivo in questo pool. {budget > 0 && 'Il budget resta non allocato.'}
        </p>
      ) : (
        <ul
          className="divide-y divide-border/30"
          aria-label={`Obiettivi ${title.toLowerCase()}`}
        >
          {items.map((item) => {
            const goal = goals.find((g) => g.tempId === item.goalId);
            if (!goal) return null;
            // #060: barcode color da preset (non da priorità). Priorità mostrata come text chip.
            const presetColor = getPresetColor(goal.presetId);
            const priorityChip = PRIORITY_CHIP[goal.priority as 1 | 2 | 3];
            const currentValue =
              userOverrides[item.goalId] !== undefined
                ? userOverrides[item.goalId]!
                : item.monthlyAmount;

            return (
              <li
                key={item.goalId}
                className={`p-3 sm:p-4 border-l-4 ${presetColor.border} ${presetColor.bg}`}
                data-testid={`goal-item-${item.goalId}`}
                data-preset={goal.presetId ?? 'custom'}
              >
                <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{goal.name}</p>
                      <span
                        className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priorityChip.className}`}
                        aria-label={`Priorità ${PRIORITY_LABEL_IT[goal.priority]}`}
                        data-testid={`priority-chip-${item.goalId}`}
                      >
                        {priorityChip.label}
                      </span>
                    </div>
                    {!item.deadlineFeasible && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        deadline non fattibile
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {fmtEur(currentValue)}/mese
                  </p>
                </div>

                <SliderPrimitive.Root
                  className="relative flex items-center select-none touch-none w-full h-5"
                  min={0}
                  max={maxSlider}
                  step={5}
                  value={[currentValue]}
                  onValueChange={(val) => onSliderChange(item.goalId, val[0] ?? 0)}
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

                {item.reasoning && (
                  <p className="text-xs text-muted-foreground mt-2">{item.reasoning}</p>
                )}

                {item.warnings.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {item.warnings.map((w, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-amber-700 dark:text-amber-400 flex gap-1 items-start"
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          <span className="sr-only">Attenzione: </span>
                          {w}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Sprint 1.6.4D #030: per-goal suggestion chips inline sotto item */}
                {suggestionsByGoalId?.[item.goalId] && suggestionsByGoalId[item.goalId]!.length > 0 && onChipApply && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {suggestionsByGoalId[item.goalId]!.map((chip) => (
                      <button
                        key={`${chip.kind}-${chip.delta}`}
                        type="button"
                        onClick={() => onChipApply(chip)}
                        title={chip.reasoning}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                      >
                        {chip.description}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
