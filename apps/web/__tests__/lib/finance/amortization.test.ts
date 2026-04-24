/**
 * Unit tests for amortization helpers (#045).
 *
 * Golden values verificati vs calcolatrici banca italiana (Agos/Findomestic):
 * - 4000€ TAEG 10% 36 rate → ~€129.07/mese (user QA scenario 2B-3 input 110.88 → scarto ~14%)
 * - 10000€ TAEG 5% 60 rate → ~€188.71/mese
 * - 200000€ TAEG 3% 240 rate (mutuo) → ~€1,109.20/mese
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPayment,
  amortize,
  paymentScartoRatio,
} from '@/lib/finance/amortization';

describe('calculateMonthlyPayment', () => {
  // === Golden values vs banche italiane ===

  it('Agos-typical: 4000€ TAEG 10% 36 rate → ~€129.07', () => {
    const rata = calculateMonthlyPayment({
      principal: 4000,
      annualRate: 10,
      numPayments: 36,
    });
    expect(rata).toBeCloseTo(129.07, 1);
  });

  it('Prestito medio: 10000€ TAEG 5% 60 rate → ~€188.71', () => {
    const rata = calculateMonthlyPayment({
      principal: 10000,
      annualRate: 5,
      numPayments: 60,
    });
    expect(rata).toBeCloseTo(188.71, 1);
  });

  it('Mutuo: 200000€ TAEG 3% 240 rate (20 anni) → ~€1109.20', () => {
    const rata = calculateMonthlyPayment({
      principal: 200000,
      annualRate: 3,
      numPayments: 240,
    });
    expect(rata).toBeCloseTo(1109.2, 1);
  });

  // === Edge cases ===

  it('Zero-interest: principal / n', () => {
    const rata = calculateMonthlyPayment({
      principal: 3000,
      annualRate: 0,
      numPayments: 12,
    });
    expect(rata).toBe(250);
  });

  it('Zero-interest BNPL 4 rate: 400 / 4 = 100', () => {
    const rata = calculateMonthlyPayment({
      principal: 400,
      annualRate: 0,
      numPayments: 4,
    });
    expect(rata).toBe(100);
  });

  it('Returns 0 when principal is zero', () => {
    expect(calculateMonthlyPayment({ principal: 0, annualRate: 5, numPayments: 12 })).toBe(0);
  });

  it('Returns 0 when principal is negative', () => {
    expect(calculateMonthlyPayment({ principal: -1000, annualRate: 5, numPayments: 12 })).toBe(0);
  });

  it('Returns 0 when numPayments is zero', () => {
    expect(calculateMonthlyPayment({ principal: 1000, annualRate: 5, numPayments: 0 })).toBe(0);
  });

  it('Returns 0 when numPayments is negative', () => {
    expect(calculateMonthlyPayment({ principal: 1000, annualRate: 5, numPayments: -1 })).toBe(0);
  });

  it('Returns 0 when annualRate is negative', () => {
    expect(calculateMonthlyPayment({ principal: 1000, annualRate: -1, numPayments: 12 })).toBe(0);
  });

  it('Handles high TAEG (credit card) 25% 12 rate 1000€', () => {
    const rata = calculateMonthlyPayment({
      principal: 1000,
      annualRate: 25,
      numPayments: 12,
    });
    // ~€94.56 — alto tasso revolving CC
    expect(rata).toBeGreaterThan(93);
    expect(rata).toBeLessThan(96);
  });

  it('Rounds to 2 decimals (euro cent)', () => {
    const rata = calculateMonthlyPayment({
      principal: 4000,
      annualRate: 10,
      numPayments: 36,
    });
    // Deve essere multiplo di 0.01
    expect(Math.abs(rata * 100 - Math.round(rata * 100))).toBeLessThan(0.01);
  });
});

describe('amortize', () => {
  it('returns total paid + total interest for Agos scenario', () => {
    const result = amortize({ principal: 4000, annualRate: 10, numPayments: 36 });
    expect(result.monthlyPayment).toBeCloseTo(129.07, 1);
    // Total paid = 36 × 129.07 ≈ 4646.50
    expect(result.totalPaid).toBeCloseTo(4646.5, 0);
    // Interest = total − principal ≈ 646
    expect(result.totalInterest).toBeCloseTo(646.5, 0);
  });

  it('zero-interest has totalInterest = 0', () => {
    const result = amortize({ principal: 1200, annualRate: 0, numPayments: 12 });
    expect(result.monthlyPayment).toBe(100);
    expect(result.totalPaid).toBe(1200);
    expect(result.totalInterest).toBe(0);
  });

  it('returns zero-shape for invalid input', () => {
    const result = amortize({ principal: 0, annualRate: 5, numPayments: 12 });
    expect(result.monthlyPayment).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.totalInterest).toBe(0);
  });
});

describe('paymentScartoRatio', () => {
  it('returns 0 when userPayment matches calculated', () => {
    expect(paymentScartoRatio(129.07, 129.07)).toBe(0);
  });

  it('returns negative ratio when user underpays (Agos scenario 110.88 vs 129.07)', () => {
    const ratio = paymentScartoRatio(110.88, 129.07);
    expect(ratio).toBeCloseTo(-0.141, 2); // ~14% underpay
  });

  it('returns positive ratio when user overpays', () => {
    const ratio = paymentScartoRatio(150, 129.07);
    expect(ratio).toBeGreaterThan(0.16);
  });

  it('returns NaN when calculated is zero (non-comparable)', () => {
    expect(paymentScartoRatio(100, 0)).toBeNaN();
  });

  it('returns NaN when calculated is negative (edge invalid)', () => {
    expect(paymentScartoRatio(100, -10)).toBeNaN();
  });
});
