'use client';

import { useId } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { AlertTriangle } from 'lucide-react';
import { PRIORITY_LABEL_IT } from '@/types/onboarding-plan';
import type { AllocationResultItem, PoolCategory } from '@/types/onboarding-plan';
import type { WizardGoalDraft } from '@/types/onboarding-plan';

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

const PRIORITY_ACCENT: Record<1 | 2 | 3, { border: string; bg: string }> = {
  1: { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
  2: { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  3: { border: 'border-gray-300 dark:border-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20' },
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
            const accent = PRIORITY_ACCENT[goal.priority as 1 | 2 | 3];
            const currentValue =
              userOverrides[item.goalId] !== undefined
                ? userOverrides[item.goalId]!
                : item.monthlyAmount;

            return (
              <li
                key={item.goalId}
                className={`p-3 sm:p-4 border-l-4 ${accent.border} ${accent.bg}`}
                data-testid={`goal-item-${item.goalId}`}
              >
                <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PRIORITY_LABEL_IT[goal.priority]} priorità
                      {!item.deadlineFeasible && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                          deadline non fattibile
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
