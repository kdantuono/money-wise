/**
 * Amortization helpers — ADR/atomic #045 Fase 3 UX polish.
 *
 * Formula francese per rata costante:
 *   rata = capitale × [i × (1 + i)^n] / [(1 + i)^n − 1]
 * dove:
 *   - capitale = importo finanziato (principal)
 *   - i = tasso periodico (TAEG annuo / 12 per rate mensili)
 *   - n = numero totale rate
 *
 * Use cases:
 *   - Suggest rata in LiabilityForm (hint "Rata calcolata: €X")
 *   - Warning scarto >10% vs `minimumPayment` inserito dall'utente
 *   - Coerenza cross-field: originalAmount + TAEG + installmentsCount → rata attesa
 *
 * Edge cases gestiti:
 *   - principal ≤ 0 → 0
 *   - numPayments ≤ 0 → 0
 *   - annualRate = 0 (prestito zero-interesse) → rata = principal / n
 *   - annualRate negativo → 0 (input invalido)
 */

export interface AmortizationInput {
  principal: number; // capitale iniziale, es. 4000
  annualRate: number; // TAEG annuo percentuale, es. 10 per 10%. 0 per zero-interest.
  numPayments: number; // numero totale rate mensili, es. 36
}

export interface AmortizationResult {
  monthlyPayment: number; // rata mensile costante (formula francese)
  totalPaid: number; // monthlyPayment × numPayments
  totalInterest: number; // totalPaid − principal (may be 0 per zero-rate)
}

/**
 * Calcola rata mensile (formula francese).
 * Returns 0 per input invalidi (no-throw).
 */
export function calculateMonthlyPayment(input: AmortizationInput): number {
  const { principal, annualRate, numPayments } = input;

  if (principal <= 0 || numPayments <= 0 || annualRate < 0) return 0;

  // Zero-interest: rata = capitale / n
  if (annualRate === 0) {
    return roundEuro(principal / numPayments);
  }

  const monthlyRate = annualRate / 100 / 12;
  const compound = Math.pow(1 + monthlyRate, numPayments);
  const rata = (principal * monthlyRate * compound) / (compound - 1);
  return roundEuro(rata);
}

/**
 * Full amortization breakdown (rata + totale pagato + interessi totali).
 */
export function amortize(input: AmortizationInput): AmortizationResult {
  const monthlyPayment = calculateMonthlyPayment(input);
  const totalPaid = roundEuro(monthlyPayment * input.numPayments);
  const totalInterest = roundEuro(totalPaid - input.principal);
  return { monthlyPayment, totalPaid, totalInterest };
}

/**
 * Compara rata user-inserita vs rata calcolata → ratio scarto.
 * Returns NaN se calculated = 0 (non confrontabile).
 */
export function paymentScartoRatio(
  userPayment: number,
  calculatedPayment: number,
): number {
  if (calculatedPayment <= 0) return NaN;
  return (userPayment - calculatedPayment) / calculatedPayment;
}

function roundEuro(n: number): number {
  return Math.round(n * 100) / 100;
}
