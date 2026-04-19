'use client';

import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';

export function StepSavingsTarget() {
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step1 = useOnboardingPlanStore((s) => s.step1);
  const updateSavingsTarget = useOnboardingPlanStore((s) => s.updateSavingsTarget);

  const fiftyThirtyTwenty = step1.monthlyIncome * 0.2;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Il tuo obiettivo di risparmio</h2>
      <p className="text-sm text-muted-foreground">
        Quanto vuoi risparmiare ogni mese verso i tuoi goal? Una guida utile: il metodo{' '}
        <strong>50/30/20</strong> suggerisce il 20% del reddito netto.
        {step1.monthlyIncome > 0 && (
          <>
            {' '}Per te sarebbero ~€
            {fiftyThirtyTwenty.toLocaleString('it-IT', { maximumFractionDigits: 0 })}/mese.
          </>
        )}
      </p>

      <div suppressHydrationWarning>
        <label htmlFor="savings-target" className="text-sm font-medium text-foreground block mb-1">
          Risparmio mensile target (€)
        </label>
        <input
          id="savings-target"
          type="number"
          min={0}
          step={50}
          value={step2.monthlySavingsTarget || ''}
          onChange={(e) =>
            updateSavingsTarget(Number(e.target.value) || 0, step2.essentialsPct)
          }
          className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
          placeholder="es. 500"
          suppressHydrationWarning
        />
      </div>

      <div suppressHydrationWarning>
        <label htmlFor="essentials-pct" className="text-sm font-medium text-foreground block mb-1">
          Quota spese essenziali (% del reddito): {step2.essentialsPct}%
        </label>
        <input
          id="essentials-pct"
          type="range"
          min={20}
          max={80}
          step={5}
          value={step2.essentialsPct}
          onChange={(e) =>
            updateSavingsTarget(step2.monthlySavingsTarget, Number(e.target.value))
          }
          className="w-full accent-blue-600"
          suppressHydrationWarning
        />
        <p className="text-xs text-muted-foreground mt-1">
          Affitto, bollette, alimentari, trasporti — le spese che non puoi evitare.
        </p>
      </div>
    </div>
  );
}
