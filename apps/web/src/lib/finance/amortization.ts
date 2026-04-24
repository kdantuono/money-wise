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
 * Edge cases gestiti (applica a `calculateMonthlyPayment` + `amortize`):
 *   - principal ≤ 0 → 0
 *   - numPayments ≤ 0 → 0
 *   - numPayments non-intero (es. 12.5) → 0 (count di rate richiede intero)
 *   - annualRate = 0 (prestito zero-interesse) → rata = principal / n
 *   - annualRate negativo → 0 (input invalido)
 *   - NaN / Infinity / -Infinity su qualsiasi campo → 0 (no-throw, no silent propagation)
 *
 * Nota: `paymentScartoRatio` ritorna `NaN` (non 0) per input non-finiti o calculatedPayment ≤ 0
 * — semantica coerente con "ratio non calcolabile", non "zero".
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
 * Guard condiviso: rifiuta input non-finiti (NaN/Infinity/-Infinity) oltre ai semantici invalidi.
 *
 * Necessario perché `x <= 0` e `x < 0` ritornano false su NaN, permettendo propagazione
 * silenziosa se usato da solo. `Number.isFinite` è il solo check che coglie NaN + Infinity.
 *
 * `numPayments` richiede intero positivo: esponenti frazionari (es. 12.5) in formula
 * francese non hanno significato semantico (count di rate mensili è discreto).
 */
function isValidInput({ principal, annualRate, numPayments }: AmortizationInput): boolean {
  if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(numPayments)) {
    return false;
  }
  if (!Number.isInteger(numPayments)) return false;
  if (principal <= 0 || numPayments <= 0 || annualRate < 0) return false;
  return true;
}

/**
 * Calcola rata mensile (formula francese).
 * Returns 0 per input invalidi (no-throw).
 */
export function calculateMonthlyPayment(input: AmortizationInput): number {
  if (!isValidInput(input)) return 0;
  const { principal, annualRate, numPayments } = input;

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
 *
 * Applica lo stesso guard di `calculateMonthlyPayment` per evitare che valori
 * non-finiti (NaN/Infinity) propaghino in `totalPaid` / `totalInterest` attraverso
 * le moltiplicazioni successive (es. `0 * NaN` = NaN).
 */
export function amortize(input: AmortizationInput): AmortizationResult {
  if (!isValidInput(input)) {
    return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0 };
  }
  const monthlyPayment = calculateMonthlyPayment(input);
  const totalPaid = roundEuro(monthlyPayment * input.numPayments);
  const totalInterest = roundEuro(totalPaid - input.principal);
  return { monthlyPayment, totalPaid, totalInterest };
}

/**
 * Compara rata user-inserita vs rata calcolata → ratio decimale di scarto.
 *
 * Semantica: `(userPayment − calculatedPayment) / calculatedPayment`.
 * - 0      → match esatto
 * - +0.14  → user paga 14% in più del dovuto (overpay)
 * - −0.14  → user paga 14% in meno (underpay: warning in UI)
 *
 * Per conversione a percentuale moltiplicare per 100 lato consumer.
 *
 * Returns NaN se:
 * - `calculatedPayment ≤ 0` (non confrontabile — divisione per zero o invalido)
 * - Uno dei due input non è un numero finito (NaN/Infinity → non propagare valori corrotti)
 */
export function paymentScartoRatio(
  userPayment: number,
  calculatedPayment: number,
): number {
  if (!Number.isFinite(userPayment) || !Number.isFinite(calculatedPayment)) return NaN;
  if (calculatedPayment <= 0) return NaN;
  return (userPayment - calculatedPayment) / calculatedPayment;
}

function roundEuro(n: number): number {
  return Math.round(n * 100) / 100;
}
