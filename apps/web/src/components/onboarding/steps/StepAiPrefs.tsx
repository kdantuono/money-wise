'use client';

import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';

export function StepAiPrefs() {
  const step5 = useOnboardingPlanStore((s) => s.step5);
  const setAiPrefs = useOnboardingPlanStore((s) => s.setAiPrefs);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Preferenze AI</h2>
      <p className="text-sm text-muted-foreground">
        Zecca può usare l'AI per categorizzare automaticamente le tue transazioni e suggerirti
        ottimizzazioni del piano. Puoi cambiare queste opzioni in qualsiasi momento dalle Impostazioni.
        Passaggio opzionale.
      </p>

      <div className="space-y-3">
        <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50">
          <input
            type="checkbox"
            checked={step5.enableAiCategorization}
            onChange={(e) =>
              setAiPrefs(e.target.checked, step5.enableAiInsights)
            }
            className="mt-1 accent-blue-600"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Categorizzazione automatica</p>
            <p className="text-xs text-muted-foreground mt-1">
              L'AI suggerisce categorie per transazioni non ancora categorizzate. Sempre confermabile manualmente.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50">
          <input
            type="checkbox"
            checked={step5.enableAiInsights}
            onChange={(e) =>
              setAiPrefs(step5.enableAiCategorization, e.target.checked)
            }
            className="mt-1 accent-blue-600"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Insight personalizzati</p>
            <p className="text-xs text-muted-foreground mt-1">
              Suggerimenti periodici su riallocazione goal, spese ricorrenti anomale, opportunità di risparmio.
            </p>
          </div>
        </label>
      </div>

      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          🔒 Tutti i dati restano nel tuo account. Zecca non condivide info finanziarie con terzi.
        </p>
      </div>
    </div>
  );
}
