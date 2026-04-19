'use client';

import { useEffect } from 'react';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { PRIORITY_LABEL_IT } from '@/types/onboarding-plan';
import { computeAllocation } from '@/lib/onboarding/allocation';

export function StepPlanReview() {
  const step1 = useOnboardingPlanStore((s) => s.step1);
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step3 = useOnboardingPlanStore((s) => s.step3);
  const allocationPreview = useOnboardingPlanStore((s) => s.step4.allocationPreview);
  const setAllocationPreview = useOnboardingPlanStore((s) => s.setAllocationPreview);

  const incomeAfterEssentials =
    step1.monthlyIncome * (1 - step2.essentialsPct / 100);
  const savingsTarget = Math.min(step2.monthlySavingsTarget, incomeAfterEssentials);

  // Compute allocation on mount + whenever inputs change.
  useEffect(() => {
    if (step1.monthlyIncome <= 0 || step3.goals.length === 0) {
      setAllocationPreview(null);
      return;
    }
    const result = computeAllocation({
      monthlyIncome: step1.monthlyIncome,
      monthlySavingsTarget: step2.monthlySavingsTarget,
      essentialsPct: step2.essentialsPct,
      goals: step3.goals.map((g) => ({
        id: g.tempId,
        name: g.name,
        target: g.target,
        current: 0,
        deadline: g.deadline,
        priority: g.priority,
      })),
    });
    setAllocationPreview(result);
  }, [
    step1.monthlyIncome,
    step2.monthlySavingsTarget,
    step2.essentialsPct,
    step3.goals,
    setAllocationPreview,
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Il tuo piano proposto</h2>
      <p className="text-sm text-muted-foreground">
        Basato sui tuoi input, ecco come distribuire il risparmio tra gli obiettivi.
      </p>

      <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/50 border border-border">
        <div>
          <p className="text-xs text-muted-foreground">Reddito mensile</p>
          <p className="text-sm font-semibold text-foreground">
            €{step1.monthlyIncome.toLocaleString('it-IT')}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Post-essenziali</p>
          <p className="text-sm font-semibold text-foreground">
            €{incomeAfterEssentials.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Risparmio target</p>
          <p className="text-sm font-semibold text-foreground">
            €{savingsTarget.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Goal attivi</p>
          <p className="text-sm font-semibold text-foreground">{step3.goals.length}</p>
        </div>
      </div>

      {!allocationPreview && (
        <div className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          ⏳ Calcolo allocation in corso (modulo <code>lib/onboarding/allocation.ts</code> wiring Day 4)
        </div>
      )}

      {allocationPreview && allocationPreview.warnings.length > 0 && (
        <ul className="space-y-1">
          {allocationPreview.warnings.map((w, idx) => (
            <li key={idx} className="text-xs text-amber-700 dark:text-amber-400 flex gap-2">
              <span>⚠️</span><span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      {allocationPreview && (
        <ul className="space-y-2">
          {allocationPreview.items.map((item) => {
            const goal = step3.goals.find((g) => g.tempId === item.goalId);
            if (!goal) return null;
            return (
              <li key={item.goalId} className="p-3 rounded-xl border border-border bg-card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PRIORITY_LABEL_IT[goal.priority]} priorità
                      {!item.deadlineFeasible && ' — ⚠️ deadline non fattibile'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">
                    €{item.monthlyAmount.toFixed(0)}/mese
                  </p>
                </div>
                {item.reasoning && (
                  <p className="text-xs text-muted-foreground mt-2">{item.reasoning}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
