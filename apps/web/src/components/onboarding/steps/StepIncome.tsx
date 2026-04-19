'use client';

import { useState, useId } from 'react';
import { AlertCircle, SkipForward } from 'lucide-react';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';

/** Minimum monthly income (euros/month). Must match INCOME_MIN in onboarding-plan.store. */
const INCOME_MIN = 100;
/** Maximum monthly income (euros/month). Must match INCOME_MAX in onboarding-plan.store. */
const INCOME_MAX = 100_000;

/** Accept integers or decimals with . or , separator (up to 2 digits). */
const INCOME_REGEX = /^\d+([.,]\d{1,2})?$/;

/** Parse income string (accepting both "." and "," as decimal separator). */
function parseIncome(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

/** Validate a raw income string. Returns null if valid, error message if invalid. */
function validateIncome(raw: string): string | null {
  if (!raw.trim()) return null;
  if (!INCOME_REGEX.test(raw.trim())) {
    return 'Inserisci un numero valido (es. 2.500 o 2.500,50)';
  }
  const value = parseIncome(raw.trim());
  if (isNaN(value) || value < INCOME_MIN || value > INCOME_MAX) {
    return `Il reddito deve essere un numero tra EUR${INCOME_MIN.toLocaleString('it-IT')} e EUR${INCOME_MAX.toLocaleString('it-IT')}`;
  }
  return null;
}

export function StepIncome() {
  const monthlyIncome = useOnboardingPlanStore((s) => s.step1.monthlyIncome);
  const updateIncome = useOnboardingPlanStore((s) => s.updateIncome);

  const inputId = useId();

  const [rawValue, setRawValue] = useState<string>(
    monthlyIncome > 0 ? String(monthlyIncome) : ''
  );
  const [hasBlurred, setHasBlurred] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const validationError = validateIncome(rawValue);
  const showError = hasBlurred && validationError !== null && rawValue.trim() !== '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawValue(val);
    setSkipped(false);
    if (val.trim() === '') {
      updateIncome(0);
      return;
    }
    const error = validateIncome(val);
    if (!error) {
      updateIncome(parseIncome(val.trim()));
    } else {
      updateIncome(0);
    }
  };

  const handleBlur = () => {
    setHasBlurred(true);
  };

  const handleSkip = () => {
    setRawValue('');
    setHasBlurred(false);
    setSkipped(true);
    updateIncome(0);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Il tuo reddito mensile netto</h2>
      <p className="text-sm text-muted-foreground">
        Quanto percepisci in media al mese, dopo le tasse? Questo è il punto di partenza del tuo piano.
      </p>

      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-foreground block mb-1">
          Reddito netto mensile (EUR)
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={rawValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full bg-muted/50 border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground transition-colors ${
            showError ? 'border-red-400 focus:ring-red-400' : 'border-border'
          }`}
          placeholder="es. 2.500 oppure 2.500,50"
          aria-describedby={showError ? `${inputId}-error` : `${inputId}-hint`}
          aria-invalid={showError}
        />

        {showError ? (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {validationError}
          </p>
        ) : (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-xs text-muted-foreground"
          >
            Inserisci il tuo reddito netto mensile (es. 2.500,50)
          </p>
        )}
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          <SkipForward className="w-3 h-3 inline mr-1" aria-hidden="true" />
          Preferisco saltare
        </button>
      </div>

      {skipped && (
        <div
          role="status"
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        >
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Senza reddito, il piano di allocazione (Passo 4) non potra essere calcolato. Potrai completarlo in seguito dalle impostazioni.
          </p>
        </div>
      )}
    </div>
  );
}
