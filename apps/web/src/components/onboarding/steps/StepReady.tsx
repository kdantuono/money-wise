'use client';

import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { PRIORITY_LABEL_IT } from '@/types/onboarding-plan';

// ---------------------------------------------------------------------------
// StepReady — Step 5 of the onboarding wizard (Sprint 1.5.2 WP-F)
//
// Renders:
//  1. AI preference checkboxes (kept from StepAiPrefs)
//  2. Summary box "Il tuo piano è pronto!" with:
//     - Income breakdown (reddito / essenziali / lifestyle / savings / invest)
//     - Goals list with per-goal allocation amount
//     - Aggregated behavioral reasoning (if warnings available)
//  3. Rocket animation trigger on isPersisting=true
// ---------------------------------------------------------------------------

export function StepReady() {
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step3 = useOnboardingPlanStore((s) => s.step3);
  const step5 = useOnboardingPlanStore((s) => s.step5);
  const setAiPrefs = useOnboardingPlanStore((s) => s.setAiPrefs);
  const allocationPreview = useOnboardingPlanStore((s) => s.step4.allocationPreview);
  const userOverrides = useOnboardingPlanStore((s) => s.step4.userOverrides ?? {});
  const isPersisting = useOnboardingPlanStore((s) => s.isPersisting);

  const { monthlyIncome, essentialsPct, lifestyleBuffer, monthlySavingsTarget, investmentsTarget } =
    step2;

  const essentialsEuros = monthlyIncome > 0 ? Math.round(monthlyIncome * (essentialsPct / 100)) : 0;

  // Aggregate behavioral reasoning from available warnings (soft + hard)
  const behavioralWarnings = allocationPreview?.behavioralWarnings ?? [];
  const hasWarnings = behavioralWarnings.length > 0;

  return (
    <div className="space-y-6">
      {/* Section: AI preferences (kept from StepAiPrefs) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Preferenze AI</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Zecca può usare l'AI per categorizzare automaticamente le tue transazioni e suggerirti
            ottimizzazioni del piano. Puoi cambiare queste opzioni in qualsiasi momento dalle
            Impostazioni. Passaggio opzionale.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={step5.enableAiCategorization}
              onChange={(e) => setAiPrefs(e.target.checked, step5.enableAiInsights)}
              className="mt-1 accent-blue-600"
              aria-label="Categorizzazione automatica"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Categorizzazione automatica</p>
              <p className="text-xs text-muted-foreground mt-1">
                L'AI suggerisce categorie per transazioni non ancora categorizzate. Sempre
                confermabile manualmente.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={step5.enableAiInsights}
              onChange={(e) => setAiPrefs(step5.enableAiCategorization, e.target.checked)}
              className="mt-1 accent-blue-600"
              aria-label="Insight personalizzati"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Insight personalizzati</p>
              <p className="text-xs text-muted-foreground mt-1">
                Suggerimenti periodici su riallocazione goal, spese ricorrenti anomale, opportunità
                di risparmio.
              </p>
            </div>
          </label>
        </div>

        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Tutti i dati restano nel tuo account. Zecca non condivide info finanziarie con terzi.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Section: Plan summary */}
      <div className="space-y-4" data-testid="plan-summary">
        {/* Header with Rocket animation */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              isPersisting
                ? {
                    rotate: [0, -15, 15, -10, 10, 0, 0, 0, -30, -60],
                    y: [0, 0, 0, 0, 0, 0, 0, -8, -20, -60],
                    opacity: [1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0],
                  }
                : {}
            }
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <Rocket className="h-6 w-6 text-blue-600" />
          </motion.div>
          <h2 className="text-lg font-semibold text-foreground">Il tuo piano è pronto!</h2>
        </div>

        {/* Income breakdown */}
        <div
          className="rounded-xl border border-border bg-card p-4 space-y-2"
          aria-label="Riepilogo piano finanziario"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Riepilogo mensile
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">Reddito mensile</span>
            <span className="font-semibold text-foreground text-right">
              {monthlyIncome > 0 ? `€${monthlyIncome.toLocaleString('it-IT')}` : '—'}
            </span>

            <span className="text-muted-foreground">Essenziali ({essentialsPct}%)</span>
            <span className="font-medium text-foreground text-right">
              {essentialsEuros > 0 ? `€${essentialsEuros.toLocaleString('it-IT')}` : '—'}
            </span>

            <span className="text-muted-foreground">Lifestyle buffer</span>
            <span className="font-medium text-foreground text-right">
              {lifestyleBuffer > 0 ? `€${lifestyleBuffer.toLocaleString('it-IT')}` : '—'}
            </span>

            <span className="text-muted-foreground">Risparmio target</span>
            <span className="font-medium text-green-600 dark:text-green-400 text-right">
              {monthlySavingsTarget > 0 ? `€${monthlySavingsTarget.toLocaleString('it-IT')}` : '—'}
            </span>

            <span className="text-muted-foreground">Investimenti</span>
            <span className="font-medium text-purple-600 dark:text-purple-400 text-right">
              {investmentsTarget > 0
                ? `€${investmentsTarget.toLocaleString('it-IT')}`
                : <span className="text-muted-foreground">Non allocati</span>}
            </span>
          </div>
        </div>

        {/* Goals list with per-goal allocation */}
        {step3.goals.length > 0 && (
          <div
            className="rounded-xl border border-border bg-card p-4 space-y-3"
            aria-label="I tuoi obiettivi"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Obiettivi ({step3.goals.length})
            </p>

            <ul className="space-y-2" role="list" aria-label="Lista obiettivi">
              {step3.goals.map((goal) => {
                const item = allocationPreview?.items.find((it) => it.goalId === goal.tempId);
                // Sprint 1.6.4D #034: effective allocation (override ?? raw) coerente con Step 4 summary
                const override = userOverrides[goal.tempId];
                const monthlyAmount = override !== undefined ? override : (item?.monthlyAmount ?? 0);
                const feasible = item?.deadlineFeasible ?? true;
                return (
                  <li
                    key={goal.tempId}
                    className="flex items-center justify-between text-sm"
                    role="listitem"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          feasible ? 'bg-green-500' : 'bg-amber-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-foreground truncate">{goal.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({PRIORITY_LABEL_IT[goal.priority]})
                      </span>
                    </div>
                    <span
                      className={`font-semibold flex-shrink-0 ml-2 ${
                        monthlyAmount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                      }`}
                    >
                      {monthlyAmount > 0
                        ? `€${monthlyAmount.toLocaleString('it-IT')}/mese`
                        : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Aggregated behavioral reasoning — shown only if warnings exist */}
        {hasWarnings && (
          <div
            className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2"
            role="note"
            aria-label="Consigli comportamentali"
          >
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              Note dal tuo advisor
            </p>
            <ul className="space-y-1">
              {behavioralWarnings.map((w) => (
                <li key={w.code} className="text-xs text-amber-700 dark:text-amber-300">
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
