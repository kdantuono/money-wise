'use client';

import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';

export function StepIncome() {
  const monthlyIncome = useOnboardingPlanStore((s) => s.step1.monthlyIncome);
  const updateIncome = useOnboardingPlanStore((s) => s.updateIncome);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Il tuo reddito mensile netto</h2>
      <p className="text-sm text-muted-foreground">
        Quanto percepisci in media al mese, dopo le tasse? Questo è il punto di partenza del tuo piano.
      </p>
      <div suppressHydrationWarning>
        <label htmlFor="monthly-income" className="text-sm font-medium text-foreground block mb-1">
          Reddito netto mensile (€)
        </label>
        <input
          id="monthly-income"
          type="number"
          min={0}
          step={100}
          value={monthlyIncome || ''}
          onChange={(e) => updateIncome(Number(e.target.value) || 0)}
          className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
          placeholder="es. 2500"
          suppressHydrationWarning
        />
      </div>
    </div>
  );
}
