/**
 * Unit tests for financial-instruments.client (ADR-005 Fase 2.1).
 *
 * Focus: mapping logic + computeNetWorth pure function.
 * Integration (VIEW query) coperta da E2E patrimonio.spec.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  computeNetWorth,
  type FinancialInstrument,
} from '../financial-instruments.client';

// =============================================================================
// Fixture factory
// =============================================================================

function makeInstrument(overrides: Partial<FinancialInstrument> = {}): FinancialInstrument {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    class: 'ASSET',
    type: 'CHECKING',
    userId: null,
    familyId: 'family-test',
    name: 'Test Instrument',
    currentBalance: 1000,
    currency: 'EUR',
    originalAmount: null,
    creditLimit: null,
    interestRate: null,
    minimumPayment: null,
    goalId: null,
    status: 'ACTIVE',
    institutionName: null,
    createdAt: '2026-04-24T00:00:00Z',
    updatedAt: '2026-04-24T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// computeNetWorth
// =============================================================================

describe('computeNetWorth', () => {
  it('returns zero net worth for empty list', () => {
    const result = computeNetWorth([]);
    expect(result.assets).toBe(0);
    expect(result.liabilities).toBe(0);
    expect(result.netWorth).toBe(0);
    expect(result.count).toEqual({ asset: 0, liability: 0 });
    expect(result.currency).toBe('EUR');
  });

  it('sums assets correctly when only ASSET class present', () => {
    const items = [
      makeInstrument({ class: 'ASSET', currentBalance: 5000 }),
      makeInstrument({ class: 'ASSET', currentBalance: 3000 }),
    ];
    const result = computeNetWorth(items);
    expect(result.assets).toBe(8000);
    expect(result.liabilities).toBe(0);
    expect(result.netWorth).toBe(8000);
    expect(result.count.asset).toBe(2);
    expect(result.count.liability).toBe(0);
  });

  it('sums liabilities correctly when only LIABILITY class present', () => {
    const items = [
      makeInstrument({ class: 'LIABILITY', currentBalance: 1000 }),
      makeInstrument({ class: 'LIABILITY', currentBalance: 500 }),
    ];
    const result = computeNetWorth(items);
    expect(result.assets).toBe(0);
    expect(result.liabilities).toBe(1500);
    expect(result.netWorth).toBe(-1500);
    expect(result.count.liability).toBe(2);
  });

  it('computes net worth correctly with mixed assets + liabilities', () => {
    // Golden case da design doc: 10000 + 5000 - 2000 = 13000
    const items = [
      makeInstrument({ class: 'ASSET', currentBalance: 10000, name: 'Checking' }),
      makeInstrument({ class: 'ASSET', currentBalance: 5000, name: 'Savings' }),
      makeInstrument({ class: 'LIABILITY', currentBalance: 2000, name: 'BNPL' }),
    ];
    const result = computeNetWorth(items);
    expect(result.assets).toBe(15000);
    expect(result.liabilities).toBe(2000);
    expect(result.netWorth).toBe(13000);
    expect(result.count).toEqual({ asset: 2, liability: 1 });
  });

  it('handles negative net worth (more liabilities than assets)', () => {
    const items = [
      makeInstrument({ class: 'ASSET', currentBalance: 500 }),
      makeInstrument({ class: 'LIABILITY', currentBalance: 3000 }),
    ];
    const result = computeNetWorth(items);
    expect(result.netWorth).toBe(-2500);
    expect(result.assets).toBe(500);
    expect(result.liabilities).toBe(3000);
  });

  it('handles zero-balance items without skipping them in count', () => {
    const items = [
      makeInstrument({ class: 'ASSET', currentBalance: 0 }),
      makeInstrument({ class: 'LIABILITY', currentBalance: 0 }),
    ];
    const result = computeNetWorth(items);
    expect(result.netWorth).toBe(0);
    expect(result.count.asset).toBe(1);
    expect(result.count.liability).toBe(1);
  });

  it('coerces string-number balances via Number()', () => {
    // Edge: Supabase VIEW ritorna numeric come string in alcuni scenari
    const items = [
      makeInstrument({ class: 'ASSET', currentBalance: '1000.50' as unknown as number }),
      makeInstrument({ class: 'LIABILITY', currentBalance: '200.25' as unknown as number }),
    ];
    const result = computeNetWorth(items);
    expect(result.assets).toBeCloseTo(1000.5, 2);
    expect(result.liabilities).toBeCloseTo(200.25, 2);
    expect(result.netWorth).toBeCloseTo(800.25, 2);
  });

  it('preserves EUR currency as default (multi-currency Fase 3)', () => {
    const result = computeNetWorth([makeInstrument({ currency: 'USD' })]);
    // Fase 2.1: ignora currency per item, assume EUR aggregato
    expect(result.currency).toBe('EUR');
  });
});
