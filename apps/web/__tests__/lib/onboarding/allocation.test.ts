/**
 * Sprint 1.5.1 - Issue #458: beta+gamma waterfall algorithm
 *
 * Full rewrite. Previous proportional-distribution tests INTENTIONALLY deleted.
 * Test count: 21 cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeAllocation } from '@/lib/onboarding/allocation';
import type {
  AllocationGoalInput,
  AllocationInput,
  AllocationResult,
  PriorityRank,
} from '@/types/onboarding-plan';

const TODAY = new Date('2026-04-19T00:00:00.000Z');

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function monthsFromToday(n: number): string {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() + n);
  return isoDate(d);
}

function daysFromToday(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function makeGoal(partial: Partial<AllocationGoalInput>): AllocationGoalInput {
  return {
    id: partial.id ?? `goal-${Math.random().toString(36).slice(2, 8)}`,
    name: partial.name ?? 'Generic Goal',
    target: partial.target ?? 1000,
    current: partial.current ?? 0,
    deadline: partial.deadline ?? null,
    priority: (partial.priority ?? 2) as PriorityRank,
  };
}

function makeInput(partial: Partial<AllocationInput>): AllocationInput {
  return {
    monthlyIncome: partial.monthlyIncome ?? 2500,
    monthlySavingsTarget: partial.monthlySavingsTarget ?? 500,
    essentialsPct: partial.essentialsPct ?? 50,
    goals: partial.goals ?? [],
  };
}

function sumAllocated(result: AllocationResult): number {
  return Math.round(result.items.reduce((acc, it) => acc + it.monthlyAmount, 0) * 100) / 100;
}

const EPS = 0.02;

describe('computeAllocation -- beta+gamma waterfall (issue #458)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(TODAY); });
  afterEach(() => { vi.useRealTimers(); });

  it('single ALTA goal with deadline 24mo consumes entire pool', () => {
    const input = makeInput({
      monthlyIncome: 2000, essentialsPct: 50, monthlySavingsTarget: 500,
      goals: [makeGoal({ id: 'g-alta', name: 'Acconto Casa', target: 12000, current: 0, deadline: monthsFromToday(24), priority: 1 })],
    });
    const result = computeAllocation(input);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].goalId).toBe('g-alta');
    expect(result.items[0].monthlyAmount).toBeCloseTo(500, 2);
    expect(result.items[0].deadlineFeasible).toBe(true);
    expect(result.totalAllocated).toBeCloseTo(500, 2);
    expect(result.unallocated).toBeCloseTo(0, 2);
  });

  it('2 goals ALTA+MEDIA sufficient budget -- both fully funded', () => {
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: 500,
      goals: [
        makeGoal({ id: 'g-alta', name: 'Risparmio Alta', target: 4800, current: 0, deadline: monthsFromToday(24), priority: 1 }),
        makeGoal({ id: 'g-media', name: 'Risparmio Media', target: 3000, current: 0, deadline: monthsFromToday(20), priority: 2 }),
      ],
    });
    const result = computeAllocation(input);
    const alta = result.items.find((it) => it.goalId === 'g-alta');
    const media = result.items.find((it) => it.goalId === 'g-media');
    expect(alta!.monthlyAmount).toBeCloseTo(200, 2);
    expect(alta!.deadlineFeasible).toBe(true);
    expect(media!.monthlyAmount).toBeCloseTo(150, 2);
    expect(media!.deadlineFeasible).toBe(true);
    expect(result.totalAllocated).toBeLessThanOrEqual(500 + EPS);
  });

  it('2 goals insufficient pool -- ALTA partial, MEDIA 0 + warning', () => {
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: 500,
      goals: [
        makeGoal({ id: 'g-alta', name: 'Investimento casa', target: 18000, current: 0, deadline: monthsFromToday(30), priority: 1 }),
        makeGoal({ id: 'g-media', name: 'Vacanza MEDIA', target: 6000, current: 0, deadline: monthsFromToday(30), priority: 2 }),
      ],
    });
    const result = computeAllocation(input);
    const alta = result.items.find((it) => it.goalId === 'g-alta');
    const media = result.items.find((it) => it.goalId === 'g-media');
    expect(alta!.monthlyAmount).toBeCloseTo(500, 2);
    expect(alta!.deadlineFeasible).toBe(false);
    expect(alta!.warnings.some((w) => /insufficienti|savings|necessari/i.test(w))).toBe(true);
    expect(media!.monthlyAmount).toBeCloseTo(0, 2);
    expect(media!.deadlineFeasible).toBe(false);
    expect(media!.warnings.length).toBeGreaterThan(0);
  });

  it('3 goals ALTA+ALTA+MEDIA -- items in INPUT order', () => {
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: 300,
      goals: [
        makeGoal({ id: 'g-a1', name: 'Goal A ALTA', target: 4500, current: 0, deadline: monthsFromToday(30), priority: 1 }),
        makeGoal({ id: 'g-a2', name: 'Goal B ALTA', target: 4500, current: 0, deadline: monthsFromToday(30), priority: 1 }),
        makeGoal({ id: 'g-media', name: 'Goal C MEDIA', target: 6000, current: 0, deadline: monthsFromToday(30), priority: 2 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items[0].goalId).toBe('g-a1');
    expect(result.items[1].goalId).toBe('g-a2');
    expect(result.items[2].goalId).toBe('g-media');
    expect(result.items[0].monthlyAmount).toBeCloseTo(150, 2);
    expect(result.items[1].monthlyAmount).toBeCloseTo(150, 2);
    expect(result.items[2].monthlyAmount).toBeCloseTo(0, 2);
  });

  it('350e pool: emerg floor 140 + debt 210 + gamma warning (issue #458 scenario)', () => {
    const input = makeInput({
      monthlyIncome: 3000, essentialsPct: 50, monthlySavingsTarget: 350,
      goals: [
        makeGoal({ id: 'g-debt', name: 'Estinzione debito', target: 7000, current: 0, deadline: monthsFromToday(20), priority: 1 }),
        makeGoal({ id: 'g-emerg', name: 'Fondo Emergenza', target: 1000, current: 0, deadline: null, priority: 2 }),
      ],
    });
    const result = computeAllocation(input);
    const debt = result.items.find((it) => it.goalId === 'g-debt');
    const emerg = result.items.find((it) => it.goalId === 'g-emerg');
    expect(emerg!.monthlyAmount).toBeCloseTo(140, 2);
    expect(debt!.monthlyAmount).toBeCloseTo(210, 2);
    expect(debt!.deadlineFeasible).toBe(false);
    expect(debt!.warnings.some((w) => /insufficienti|savings|necessari/i.test(w))).toBe(true);
    expect(result.warnings.some((w) => /waterfall puro|senza protezione/i.test(w))).toBe(true);
    expect(result.totalAllocated).toBeCloseTo(350, 2);
    expect(result.unallocated).toBeCloseTo(0, 2);
  });

  it('"Fondo Emergenza" priority BASSA still gets emergency floor (name trumps priority)', () => {
    const pool = 500;
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: pool,
      goals: [
        makeGoal({ id: 'g-alta', name: 'Casa', target: 15000, current: 0, deadline: monthsFromToday(30), priority: 1 }),
        makeGoal({ id: 'g-emerg', name: 'Fondo Emergenza', target: 3000, current: 0, deadline: null, priority: 3 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items.find((it) => it.goalId === 'g-emerg')!.monthlyAmount).toBeGreaterThanOrEqual(pool * 0.4 - EPS);
  });

  it('empty goals -> items=[], full unallocated, warning', () => {
    const result = computeAllocation(makeInput({ monthlySavingsTarget: 250, goals: [] }));
    expect(result.items).toEqual([]);
    expect(result.totalAllocated).toBeCloseTo(0, 2);
    expect(result.unallocated).toBeCloseTo(250, 2);
    expect(result.warnings.some((w) => /nessun.*obiettivo|no goals|vuot/i.test(w))).toBe(true);
  });

  it('goal with target=0 -> monthlyAmount=0, deadlineFeasible=true', () => {
    const input = makeInput({
      monthlySavingsTarget: 300,
      goals: [makeGoal({ id: 'g-zero', name: 'Placeholder', target: 0, priority: 2 })],
    });
    const result = computeAllocation(input);
    expect(result.items[0].monthlyAmount).toBe(0);
    expect(result.items[0].deadlineFeasible).toBe(true);
    expect(result.items[0].reasoning.toLowerCase()).toMatch(/target|non specificato/);
  });

  it('past deadline -> deadlineFeasible=false + deadline warning', () => {
    const input = makeInput({
      monthlySavingsTarget: 400,
      goals: [makeGoal({ id: 'g-past', name: 'Scaduto', target: 1000, current: 0, deadline: daysFromToday(-30), priority: 2 })],
    });
    const result = computeAllocation(input);
    expect(result.items[0].deadlineFeasible).toBe(false);
    expect(result.items[0].warnings.some((w) => /scadenz|trascors|passat|superata/i.test(w))).toBe(true);
  });

  it('all BASSA goals -> waterfall sequential by input order', () => {
    const input = makeInput({
      monthlyIncome: 2000, essentialsPct: 50, monthlySavingsTarget: 300,
      goals: [
        makeGoal({ id: 'b1', name: 'Bassa 1', target: 1000, current: 0, deadline: monthsFromToday(10), priority: 3 }),
        makeGoal({ id: 'b2', name: 'Bassa 2', target: 1000, current: 0, deadline: monthsFromToday(10), priority: 3 }),
        makeGoal({ id: 'b3', name: 'Bassa 3', target: 2000, current: 0, deadline: monthsFromToday(10), priority: 3 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items[0].goalId).toBe('b1');
    expect(result.items[1].goalId).toBe('b2');
    expect(result.items[2].goalId).toBe('b3');
    expect(result.items[0].monthlyAmount).toBeCloseTo(100, 2);
    expect(result.items[1].monthlyAmount).toBeCloseTo(100, 2);
    expect(result.items[2].monthlyAmount).toBeCloseTo(100, 2);
  });

  it('gamma warning NOT emitted when emergency floor impact < 5%', () => {
    const input = makeInput({
      monthlyIncome: 4000, essentialsPct: 50, monthlySavingsTarget: 1000,
      goals: [
        makeGoal({ id: 'g-alta', name: 'Investimento', target: 19200, current: 0, deadline: monthsFromToday(20), priority: 1 }),
        makeGoal({ id: 'g-emerg', name: 'Fondo Emergenza', target: 40, current: 0, deadline: null, priority: 2 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items.find((it) => it.goalId === 'g-emerg')!.monthlyAmount).toBeCloseTo(40, 2);
    expect(result.warnings.some((w) => /waterfall puro|senza protezione/i.test(w))).toBe(false);
  });

  it('gamma warning emitted when emergency floor impact >= 5%', () => {
    const input = makeInput({
      monthlyIncome: 4000, essentialsPct: 50, monthlySavingsTarget: 1000,
      goals: [
        makeGoal({ id: 'g-alta', name: 'Investimento', target: 50000, current: 0, deadline: monthsFromToday(50), priority: 1 }),
        makeGoal({ id: 'g-emerg', name: 'Fondo Emergenza', target: 60, current: 0, deadline: null, priority: 2 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items.find((it) => it.goalId === 'g-alta')!.monthlyAmount).toBeCloseTo(940, 2);
    expect(result.warnings.some((w) => /waterfall puro|senza protezione/i.test(w))).toBe(true);
  });

  it('savings target > income after essentials -> global warning, pool capped', () => {
    const input = makeInput({
      monthlyIncome: 2000, essentialsPct: 80, monthlySavingsTarget: 800,
      goals: [makeGoal({ id: 'g', name: 'Qualsiasi', target: 1000, priority: 2, deadline: monthsFromToday(20) })],
    });
    const result = computeAllocation(input);
    expect(result.incomeAfterEssentials).toBeCloseTo(400, 2);
    expect(result.warnings.some((w) => /target|reddito|risparmio|superato|essenziali|essentials/i.test(w))).toBe(true);
    expect(result.totalAllocated).toBeLessThanOrEqual(400 + EPS);
  });

  it('totalAllocated always equals sum of items monthlyAmount', () => {
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: 500,
      goals: [
        makeGoal({ id: 'a', name: 'A', target: 1000, priority: 1, deadline: monthsFromToday(20) }),
        makeGoal({ id: 'b', name: 'Fondo Emergenza', target: 5000, priority: 2, deadline: null }),
        makeGoal({ id: 'c', name: 'C', target: 2000, priority: 3, deadline: monthsFromToday(20) }),
      ],
    });
    const result = computeAllocation(input);
    expect(sumAllocated(result)).toBeCloseTo(result.totalAllocated, 2);
    expect(result.totalAllocated + result.unallocated).toBeCloseTo(500, 2);
  });

  it('returns exactly one item per input goal', () => {
    const ids = ['p', 'q', 'r', 's'];
    const input = makeInput({
      monthlySavingsTarget: 400,
      goals: ids.map((id, idx) =>
        makeGoal({ id, name: `Goal ${id}`, target: 500 + idx * 100, priority: ((idx % 3) + 1) as PriorityRank, deadline: monthsFromToday(20 + idx) }),
      ),
    });
    const result = computeAllocation(input);
    expect(result.items.map((it) => it.goalId).sort()).toEqual([...ids].sort());
  });

  it('never over-allocates beyond savings pool cap', () => {
    const input = makeInput({
      monthlyIncome: 2500, monthlySavingsTarget: 500, essentialsPct: 50,
      goals: [
        makeGoal({ id: 'a', name: 'A', target: 10000, priority: 1, deadline: monthsFromToday(20) }),
        makeGoal({ id: 'b', name: 'B', target: 10000, priority: 2, deadline: monthsFromToday(20) }),
        makeGoal({ id: 'c', name: 'C', target: 10000, priority: 3, deadline: monthsFromToday(20) }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.totalAllocated).toBeLessThanOrEqual(Math.min(500, result.incomeAfterEssentials) + EPS);
  });

  it('emergency alone receives min(pool*0.4, need), rest unallocated', () => {
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: 500,
      goals: [makeGoal({ id: 'g-emerg', name: 'Fondo Emergenza', target: 100, current: 0, deadline: null, priority: 2 })],
    });
    const result = computeAllocation(input);
    expect(result.items[0].monthlyAmount).toBeCloseTo(100, 2);
    expect(result.unallocated).toBeCloseTo(400, 2);
  });

  it('emergency fully funded -> floor=0, all pool to waterfall', () => {
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: 500,
      goals: [
        makeGoal({ id: 'g-emerg', name: 'Fondo Emergenza', target: 1000, current: 1000, deadline: null, priority: 2 }),
        makeGoal({ id: 'g-alta', name: 'Investimento', target: 10000, current: 0, deadline: monthsFromToday(20), priority: 1 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items.find((it) => it.goalId === 'g-emerg')!.monthlyAmount).toBeCloseTo(0, 2);
    expect(result.items.find((it) => it.goalId === 'g-alta')!.monthlyAmount).toBeCloseTo(500, 2);
  });

  it('ALTA allocated before MEDIA and BASSA in constrained budget', () => {
    const input = makeInput({
      monthlyIncome: 2000, essentialsPct: 50, monthlySavingsTarget: 200,
      goals: [
        makeGoal({ id: 'bassa', name: 'Bassa', target: 4000, current: 0, deadline: monthsFromToday(20), priority: 3 }),
        makeGoal({ id: 'media', name: 'Media', target: 4000, current: 0, deadline: monthsFromToday(20), priority: 2 }),
        makeGoal({ id: 'alta', name: 'Alta', target: 4000, current: 0, deadline: monthsFromToday(20), priority: 1 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items.find((it) => it.goalId === 'alta')!.monthlyAmount).toBeCloseTo(200, 2);
    expect(result.items.find((it) => it.goalId === 'media')!.monthlyAmount).toBeCloseTo(0, 2);
    expect(result.items.find((it) => it.goalId === 'bassa')!.monthlyAmount).toBeCloseTo(0, 2);
    expect(result.items[0].goalId).toBe('bassa');
    expect(result.items[1].goalId).toBe('media');
    expect(result.items[2].goalId).toBe('alta');
  });

  it('open-ended goal with 0 allocation -> deadlineFeasible=true + exhausted warning', () => {
    const input = makeInput({
      monthlyIncome: 2000, essentialsPct: 50, monthlySavingsTarget: 100,
      goals: [
        makeGoal({ id: 'g-alta', name: 'Alta openended', target: 500, current: 0, deadline: null, priority: 1 }),
        makeGoal({ id: 'g-media', name: 'Media openended', target: 500, current: 0, deadline: null, priority: 2 }),
      ],
    });
    const result = computeAllocation(input);
    const alta = result.items.find((it) => it.goalId === 'g-alta');
    const media = result.items.find((it) => it.goalId === 'g-media');
    expect(alta!.monthlyAmount).toBeCloseTo(100, 2);
    expect(alta!.deadlineFeasible).toBe(true);
    expect(media!.monthlyAmount).toBeCloseTo(0, 2);
    expect(media!.deadlineFeasible).toBe(true);
    expect(media!.warnings.some((w) => /esaurit|allocazione|savings/i.test(w))).toBe(true);
  });

  it('priority=1 goal with deadline > 12mo and no emergency name: NOT treated as emergency', () => {
    const input = makeInput({
      monthlyIncome: 2500, essentialsPct: 50, monthlySavingsTarget: 300,
      goals: [
        makeGoal({ id: 'g-casa', name: 'Acconto Casa', target: 7200, current: 0, deadline: monthsFromToday(24), priority: 1 }),
        makeGoal({ id: 'g-viaggio', name: 'Viaggio', target: 3000, current: 0, deadline: monthsFromToday(24), priority: 3 }),
      ],
    });
    const result = computeAllocation(input);
    expect(result.items.find((it) => it.goalId === 'g-casa')!.monthlyAmount).toBeCloseTo(300, 2);
    expect(result.items.find((it) => it.goalId === 'g-viaggio')!.monthlyAmount).toBeCloseTo(0, 2);
    expect(result.totalAllocated).toBeCloseTo(300, 2);
  });
});
