'use client';

import { motion } from 'framer-motion';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';

export function StepSavingsTarget() {
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step1 = useOnboardingPlanStore((s) => s.step1);
  const updateSavingsTarget = useOnboardingPlanStore((s) => s.updateSavingsTarget);

  const income = step1.monthlyIncome;
  const essentialsAmount = income * step2.essentialsPct / 100;
  const afterEssentialsAmount = income - essentialsAmount;
  const fiftyThirtyTwenty = income * 0.2;

  const formatEuro = (n: number) =>
    n.toLocaleString('it-IT', { maximumFractionDigits: 0 });

  const savingsExceedsAvailable =
    step2.monthlySavingsTarget > afterEssentialsAmount && income > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Il tuo obiettivo di risparmio</h2>
      <p className="text-sm text-muted-foreground">
        Quanto vuoi risparmiare ogni mese verso i tuoi goal? Una guida utile: il metodo{' '}
        <strong>50/30/20</strong> suggerisce il 20% del reddito netto.
        {income > 0 && (
          <>
            {' '}Per te sarebbero ~€{formatEuro(fiftyThirtyTwenty)}/mese.
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
          Quota spese essenziali: <span className="text-blue-600 font-semibold">{step2.essentialsPct}%</span>
          {income > 0 && (
            <span className="text-muted-foreground font-normal">
              {' '}({' '}
              <motion.span
                key={essentialsAmount}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="inline-block tabular-nums text-foreground font-semibold"
              >
                €{formatEuro(essentialsAmount)}
              </motion.span>
              /mese)
            </span>
          )}
        </label>

        {/* Visual split bar — essentials vs risparmio+goal */}
        {income > 0 && (
          <div className="mt-2 mb-3 h-14 rounded-xl overflow-hidden flex border border-border">
            <motion.div
              initial={false}
              animate={{ width: `${step2.essentialsPct}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="bg-gradient-to-br from-amber-400 to-orange-500 flex flex-col items-center justify-center text-white overflow-hidden"
            >
              <p className="text-[10px] uppercase tracking-wider opacity-90">Essenziali</p>
              <motion.p
                key={`ess-${essentialsAmount}`}
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-bold tabular-nums"
              >
                €{formatEuro(essentialsAmount)}
              </motion.p>
            </motion.div>
            <motion.div
              initial={false}
              animate={{ width: `${100 - step2.essentialsPct}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="bg-gradient-to-br from-emerald-400 to-teal-500 flex flex-col items-center justify-center text-white overflow-hidden"
            >
              <p className="text-[10px] uppercase tracking-wider opacity-90">Disponibile</p>
              <motion.p
                key={`avail-${afterEssentialsAmount}`}
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-bold tabular-nums"
              >
                €{formatEuro(afterEssentialsAmount)}
              </motion.p>
            </motion.div>
          </div>
        )}

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
          {income > 0 && (
            <>
              {' '}Media italiana ~55%. Proprietà casa senza mutuo: −10%. Città costosa: +10%.
            </>
          )}
        </p>

        {savingsExceedsAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          >
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ Il target €{formatEuro(step2.monthlySavingsTarget)} supera il disponibile €
              {formatEuro(afterEssentialsAmount)}. Abbassa il target OR riduci la quota essenziali.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
