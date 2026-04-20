'use client';

import { useState, useId, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import {
  useOnboardingPlanStore,
  INCOME_MIN,
  INCOME_MAX,
  LIFESTYLE_SOFT_MIN,
  SAVINGS_MIN,
  ESSENTIALS_MIN_PCT,
  ESSENTIALS_MAX_PCT,
  calcLifestyleDefault,
} from '@/store/onboarding-plan.store';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const INCOME_REGEX = /^\d+([.,]\d{1,2})?$/;

function parseIncome(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

function validateIncome(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null; // empty → no error (blur-gated)
  if (!INCOME_REGEX.test(trimmed)) return 'Inserisci un numero valido (es. 2.500 o 2.500,50)';
  const v = parseIncome(trimmed);
  if (isNaN(v) || v < INCOME_MIN || v > INCOME_MAX) {
    return `Reddito deve essere tra €${INCOME_MIN.toLocaleString('it-IT')} e €${INCOME_MAX.toLocaleString('it-IT')}`;
  }
  return null;
}

function formatEuro(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 0 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function StepProfile() {
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const updateProfile = useOnboardingPlanStore((s) => s.updateProfile);

  // ── Local income input state (text-mode with blur-gated validation) ──
  const [rawIncome, setRawIncome] = useState<string>(
    step2.monthlyIncome > 0 ? String(step2.monthlyIncome) : ''
  );
  const [incomeBlurred, setIncomeBlurred] = useState(false);
  const incomeError = validateIncome(rawIncome);
  const showIncomeError = incomeBlurred && incomeError !== null && rawIncome.trim() !== '';

  // ── Lifestyle buffer: track whether user has manually touched it ──
  const lifestyleTouchedRef = useRef(step2.lifestyleBuffer > 0);

  const incomeInputId = useId();
  const essentialsId = useId();
  const lifestyleId = useId();
  const savingsId = useId();
  const investId = useId();

  // ── Derived values ──
  const income = step2.monthlyIncome;
  const essentialsPct = step2.essentialsPct;
  const essentialsEuros = income > 0 ? income * (essentialsPct / 100) : 0;

  // ── Lifestyle AI default auto-fill (only while untouched) ──
  useEffect(() => {
    if (income > 0 && !lifestyleTouchedRef.current) {
      const aiDefault = calcLifestyleDefault(income, essentialsPct);
      updateProfile({ lifestyleBuffer: aiDefault });
    }
  }, [income, essentialsPct, updateProfile]);

  // ── Sum constraint ──
  const allocatedSum =
    essentialsEuros +
    step2.lifestyleBuffer +
    step2.monthlySavingsTarget +
    step2.investmentsTarget;
  const sumExceedsIncome = income > 0 && allocatedSum > income;

  // ── Warnings ──
  const lifestyleWarning =
    income > 0 && step2.lifestyleBuffer < LIFESTYLE_SOFT_MIN
      ? 'Rischio spirale debito carta di credito se spese impreviste'
      : null;
  const investWarning =
    income > 0 && step2.investmentsTarget === 0
      ? 'Zero investimenti = zero crescita patrimonio long-term'
      : null;
  const savingsWarning =
    income > 0 && step2.monthlySavingsTarget < SAVINGS_MIN && step2.monthlySavingsTarget > 0
      ? null // handled by sum constraint
      : income > 0 && step2.monthlySavingsTarget === 0
        ? 'Risparmio zero: come finanzierai i tuoi goal?'
        : null;

  // ── Split bar widths (clamped to 100%) ──
  const totalWidth = income > 0 ? income : 1;
  const essentialsPx = (essentialsEuros / totalWidth) * 100;
  const lifestylePx = Math.min(
    (step2.lifestyleBuffer / totalWidth) * 100,
    100 - essentialsPx
  );
  const savingsPx = Math.min(
    (step2.monthlySavingsTarget / totalWidth) * 100,
    100 - essentialsPx - lifestylePx
  );
  const investPx = Math.min(
    (step2.investmentsTarget / totalWidth) * 100,
    100 - essentialsPx - lifestylePx - savingsPx
  );
  const residuoPx = Math.max(0, 100 - essentialsPx - lifestylePx - savingsPx - investPx);

  // ── Income input handler ──
  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawIncome(val);
    if (!val.trim()) {
      updateProfile({ monthlyIncome: 0 });
      return;
    }
    if (!validateIncome(val)) {
      updateProfile({ monthlyIncome: parseIncome(val.trim()) });
    } else {
      updateProfile({ monthlyIncome: 0 });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Il tuo profilo finanziario</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura reddito e allocazione mensile. Il piano verrà calibrato su questi valori.
        </p>
      </div>

      {/* ── Reddito mensile ── */}
      <div>
        <label
          htmlFor={incomeInputId}
          className="text-sm font-medium text-foreground block mb-1"
        >
          Reddito netto mensile (€) <span className="text-red-500" aria-hidden>*</span>
        </label>
        <input
          id={incomeInputId}
          type="text"
          inputMode="decimal"
          value={rawIncome}
          onChange={handleIncomeChange}
          onBlur={() => setIncomeBlurred(true)}
          aria-describedby={showIncomeError ? `${incomeInputId}-error` : `${incomeInputId}-hint`}
          aria-invalid={showIncomeError}
          placeholder="es. 2.500 oppure 2.500,50"
          className={`w-full bg-muted/50 border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground transition-colors ${
            showIncomeError ? 'border-red-400 focus:ring-red-400' : 'border-border'
          }`}
        />
        {showIncomeError ? (
          <p
            id={`${incomeInputId}-error`}
            role="alert"
            className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {incomeError}
          </p>
        ) : (
          <p id={`${incomeInputId}-hint`} className="mt-1.5 text-xs text-muted-foreground">
            Reddito mensile netto (dopo tasse), €{INCOME_MIN.toLocaleString('it-IT')}–€{INCOME_MAX.toLocaleString('it-IT')}
          </p>
        )}
      </div>

      {/* ── Essenziali % slider ── */}
      <div>
        <label htmlFor={essentialsId} className="text-sm font-medium text-foreground block mb-1">
          Spese essenziali:{' '}
          <span className="text-blue-600 font-semibold">{essentialsPct}%</span>
          {income > 0 && (
            <span className="text-muted-foreground font-normal">
              {' '}(€{formatEuro(essentialsEuros)}/mese)
            </span>
          )}
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Affitto, bollette, alimentari, trasporti. Media italiana ~55%.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Diminuisci essenziali di 5%"
            onClick={() =>
              updateProfile({ essentialsPct: Math.max(ESSENTIALS_MIN_PCT, essentialsPct - 5) })
            }
            className="shrink-0 w-9 h-9 rounded-lg border border-border bg-muted/50 text-sm font-semibold hover:bg-muted active:scale-95 transition-all select-none"
          >
            −5
          </button>
          <input
            id={essentialsId}
            type="range"
            min={ESSENTIALS_MIN_PCT}
            max={ESSENTIALS_MAX_PCT}
            step={1}
            value={essentialsPct}
            onChange={(e) => updateProfile({ essentialsPct: Number(e.target.value) })}
            className="w-full accent-blue-600"
            aria-label={`Percentuale spese essenziali: ${essentialsPct}%`}
            suppressHydrationWarning
          />
          <button
            type="button"
            aria-label="Aumenta essenziali di 5%"
            onClick={() =>
              updateProfile({ essentialsPct: Math.min(ESSENTIALS_MAX_PCT, essentialsPct + 5) })
            }
            className="shrink-0 w-9 h-9 rounded-lg border border-border bg-muted/50 text-sm font-semibold hover:bg-muted active:scale-95 transition-all select-none"
          >
            +5
          </button>
        </div>
      </div>

      {/* ── Lifestyle buffer ── */}
      <div>
        <label htmlFor={lifestyleId} className="text-sm font-medium text-foreground block mb-1">
          Lifestyle buffer (€) <span className="text-red-500" aria-hidden>*</span>
          {income > 0 && (
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              (AI default: €{formatEuro(calcLifestyleDefault(income, essentialsPct))})
            </span>
          )}
        </label>
        <input
          id={lifestyleId}
          type="number"
          min={0}
          step={10}
          value={step2.lifestyleBuffer || ''}
          onChange={(e) => {
            lifestyleTouchedRef.current = true;
            updateProfile({ lifestyleBuffer: Number(e.target.value) || 0 });
          }}
          placeholder="es. 200"
          className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
          aria-describedby={lifestyleWarning ? `${lifestyleId}-warn` : undefined}
          suppressHydrationWarning
        />
        {lifestyleWarning && (
          <p
            id={`${lifestyleId}-warn`}
            role="status"
            className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {lifestyleWarning}
          </p>
        )}
        {!lifestyleWarning && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Budget per uscite, pizza, abbonamenti. Min. €50 consigliato.
          </p>
        )}
      </div>

      {/* ── Savings target ── */}
      <div>
        <label htmlFor={savingsId} className="text-sm font-medium text-foreground block mb-1">
          Risparmio mensile target (€) <span className="text-red-500" aria-hidden>*</span>
        </label>
        <input
          id={savingsId}
          type="number"
          min={SAVINGS_MIN}
          step={50}
          value={step2.monthlySavingsTarget || ''}
          onChange={(e) => updateProfile({ monthlySavingsTarget: Number(e.target.value) || 0 })}
          placeholder="es. 500"
          className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
          suppressHydrationWarning
        />
        {savingsWarning && (
          <p role="status" className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {savingsWarning}
          </p>
        )}
        {!savingsWarning && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Minimo €{SAVINGS_MIN}/mese. Regola 50/30/20: ~20% del reddito.
          </p>
        )}
      </div>

      {/* ── Investimenti target (optional) ── */}
      <div>
        <label htmlFor={investId} className="text-sm font-medium text-foreground block mb-1">
          Investimenti mensili (€){' '}
          <span className="text-xs text-muted-foreground font-normal">(opzionale)</span>
        </label>
        <input
          id={investId}
          type="number"
          min={0}
          step={25}
          value={step2.investmentsTarget || ''}
          onChange={(e) => updateProfile({ investmentsTarget: Number(e.target.value) || 0 })}
          placeholder="es. 150 (opzionale)"
          className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
          suppressHydrationWarning
        />
        {investWarning && (
          <p role="status" className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {investWarning}
          </p>
        )}
        {!investWarning && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            ETF, crypto, fondi. Anche €50/mese fa la differenza in 10 anni.
          </p>
        )}
      </div>

      {/* ── Live 4-segment split bar ── */}
      {income > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">Distribuzione reddito</p>
          <div
            data-testid="split-bar"
            className="h-12 rounded-xl overflow-hidden flex border border-border"
            role="img"
            aria-label="Distribuzione reddito: essenziali, lifestyle, risparmio, investimenti, residuo"
          >
            {essentialsPx > 0 && (
              <motion.div
                animate={{ width: `${essentialsPx}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="bg-red-400 flex items-center justify-center overflow-hidden"
                title={`Essenziali €${formatEuro(essentialsEuros)}`}
              >
                <span className="text-[9px] font-bold text-white truncate px-1">Ess.</span>
              </motion.div>
            )}
            {lifestylePx > 0 && (
              <motion.div
                animate={{ width: `${lifestylePx}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="bg-yellow-400 flex items-center justify-center overflow-hidden"
                title={`Lifestyle €${formatEuro(step2.lifestyleBuffer)}`}
              >
                <span className="text-[9px] font-bold text-white truncate px-1">Life.</span>
              </motion.div>
            )}
            {savingsPx > 0 && (
              <motion.div
                animate={{ width: `${savingsPx}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="bg-green-500 flex items-center justify-center overflow-hidden"
                title={`Risparmio €${formatEuro(step2.monthlySavingsTarget)}`}
              >
                <span className="text-[9px] font-bold text-white truncate px-1">Risp.</span>
              </motion.div>
            )}
            {investPx > 0 && (
              <motion.div
                animate={{ width: `${investPx}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="bg-purple-500 flex items-center justify-center overflow-hidden"
                title={`Investimenti €${formatEuro(step2.investmentsTarget)}`}
              >
                <span className="text-[9px] font-bold text-white truncate px-1">Inv.</span>
              </motion.div>
            )}
            {residuoPx > 0 && (
              <motion.div
                animate={{ width: `${residuoPx}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
                title="Residuo non allocato"
              >
                <span className="text-[9px] text-muted-foreground truncate px-1">Res.</span>
              </motion.div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />
              Essenziali €{formatEuro(essentialsEuros)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-sm bg-yellow-400 inline-block" />
              Lifestyle €{formatEuro(step2.lifestyleBuffer)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
              Risparmio €{formatEuro(step2.monthlySavingsTarget)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />
              Invest. €{formatEuro(step2.investmentsTarget)}
            </span>
          </div>
        </div>
      )}

      {/* ── Sum overflow error ── */}
      {sumExceedsIncome && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          role="alert"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        >
          <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            La somma eccede il reddito: €{formatEuro(allocatedSum)} &gt; €{formatEuro(income)}.
            Riduci uno o più valori.
          </p>
        </motion.div>
      )}
    </div>
  );
}
