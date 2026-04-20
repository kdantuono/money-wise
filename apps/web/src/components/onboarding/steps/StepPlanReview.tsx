'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { PRIORITY_LABEL_IT } from '@/types/onboarding-plan';
import { computeAllocation } from '@/lib/onboarding/allocation';

// Priority accent classes: ALTA (1) = red, MEDIA (2) = amber, BASSA (3) = gray
const PRIORITY_ACCENT: Record<1 | 2 | 3, { border: string; bg: string }> = {
  1: {
    border: 'border-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
  },
  2: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  3: {
    border: 'border-gray-300 dark:border-gray-600',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
  },
};

export function StepPlanReview() {
  const step1 = useOnboardingPlanStore((s) => s.step1);
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step3 = useOnboardingPlanStore((s) => s.step3);
  const allocationPreview = useOnboardingPlanStore((s) => s.step4.allocationPreview);
  const setAllocationPreview = useOnboardingPlanStore((s) => s.setAllocationPreview);
  const prevStep = useOnboardingPlanStore((s) => s.prevStep);
  const setEditingGoal = useOnboardingPlanStore((s) => s.setEditingGoal);
  const setAddGoalModalOpen = useOnboardingPlanStore((s) => s.setAddGoalModalOpen);

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
      {/* Gradient header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 p-5 text-white">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1, repeat: 1, ease: 'easeInOut' }}
          >
            <Rocket className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold">Il tuo piano è pronto!</h2>
            <p className="text-sm text-blue-100 mt-0.5">
              Ecco come distribuire il risparmio tra i tuoi obiettivi.
            </p>
          </div>
        </div>
      </div>

      {/* Summary grid */}
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

      {!allocationPreview && step3.goals.length === 0 && (
        <div className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Aggiungi almeno un obiettivo allo Step 3 per vedere il piano proposto.
        </div>
      )}

      {!allocationPreview && step3.goals.length > 0 && step1.monthlyIncome <= 0 && (
        <div className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Inserisci il reddito mensile allo Step 1 per calcolare il piano.
        </div>
      )}

      {!allocationPreview && step3.goals.length > 0 && step1.monthlyIncome > 0 && (
        <div className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Calcolo allocation in corso...
        </div>
      )}

      {allocationPreview && allocationPreview.warnings.length > 0 && (
        <ul className="space-y-1">
          {allocationPreview.warnings.map((w, idx) => (
            <li key={idx} className="text-xs text-amber-700 dark:text-amber-400 flex gap-2">
              <span aria-hidden="true">⚠️</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      {allocationPreview && (
        <ul className="space-y-2">
          {allocationPreview.items.map((item) => {
            const goal = step3.goals.find((g) => g.tempId === item.goalId);
            if (!goal) return null;
            const accent = PRIORITY_ACCENT[goal.priority as 1 | 2 | 3];
            return (
              <li
                key={item.goalId}
                className={`p-3 rounded-xl border-l-4 ${accent.border} ${accent.bg}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PRIORITY_LABEL_IT[goal.priority]} priorità
                    </p>
                    {!item.deadlineFeasible && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGoal(goal.tempId);
                          setAddGoalModalOpen(true);
                          prevStep();
                        }}
                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                        aria-label={`Aggiusta goal ${goal.name}`}
                      >
                        <span aria-hidden="true">⚠️</span>
                        Aggiusta goal
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
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
