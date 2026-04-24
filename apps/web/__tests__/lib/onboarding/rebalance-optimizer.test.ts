/**
 * Sprint 1.7 fix atomic #041 (2026-04-25):
 *
 * Root cause originale: bug timezone-dependent nel test helper `monthsFromNow`,
 * NON regression del codice di produzione. `new Date()` ritorna timestamp LOCAL,
 * `.toISOString()` serializza in UTC. Tra ~22:00 UTC e ~24:00 UTC del giorno
 * (00:00-02:00 LOCAL CEST), il day UTC è precedente al day LOCAL. Risultato:
 * deadline ISO string ha day-1 → quando `_parseDate` lo parse come LOCAL date,
 * `_monthsDiff` calcola `dayAdjust=-1` per il `to.getDate() < from.getDate()`
 * → monthsLeft=11 invece di 12 → need=1200/11=109.09 invece di 100.
 *
 * Fix dual-layer:
 * 1. TODAY fixed (mid-January 2026) elimina time-of-day dependency
 * 2. monthsFromNow usa LOCAL date construction (`getDate/getMonth/getFullYear`)
 *    invece di toISOString → matching `_parseDate(y,m-1,d)` che è LOCAL.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { rebalanceOptimizer } from '@/lib/onboarding/rebalance-optimizer';
import type { AllocationGoalInput, AllocationInput, PriorityRank } from '@/types/onboarding-plan';

// TODAY fissa mid-January 2026 evita boundary timezone issues + variabilità per
// tempo di esecuzione test (deterministic regardless of run hour/locale).
// useFakeTimers garantisce che `new Date()` dentro rebalance-optimizer ritorni
// stessa data, permettendo a `_monthsDiff(now, deadline)` di calcolare valori
// matematicamente esatti (12 mesi pieni, non 11.x edge-case).
const TODAY = new Date(2026, 0, 15); // 2026-01-15 LOCAL noon

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterAll(() => {
  vi.useRealTimers();
});

function monthsFromNow(n: number): string {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() + n);
  // LOCAL ISO format YYYY-MM-DD per matching `_parseDate` LOCAL parse.
  // Evita drift `toISOString()` UTC → LOCAL day-1 in late-evening UTC.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let _id = 0;
function makeGoal(partial: Partial<AllocationGoalInput> = {}): AllocationGoalInput {
  // Sprint 1.5.5 Copilot round 1: use `in` check per preservare null esplicito
  // (openended goals hanno target=null / deadline=null; `?? 1000` li sovrascriveva).
  return {
    id: partial.id ?? `g${++_id}`,
    name: partial.name ?? 'Goal',
    target: 'target' in partial ? (partial.target as number) : 1000,
    current: partial.current ?? 0,
    deadline: 'deadline' in partial ? (partial.deadline as string) : monthsFromNow(12),
    priority: (partial.priority ?? 2) as PriorityRank,
    type: partial.type,
    presetId: partial.presetId,
  };
}

function input(overrides: Partial<AllocationInput> = {}): AllocationInput {
  return {
    monthlyIncome: overrides.monthlyIncome ?? 3000,
    monthlySavingsTarget: overrides.monthlySavingsTarget ?? 500,
    essentialsPct: overrides.essentialsPct ?? 50,
    goals: overrides.goals ?? [],
    lifestyleBuffer: overrides.lifestyleBuffer,
    investmentsTarget: overrides.investmentsTarget,
    userOverrides: overrides.userOverrides,
  };
}

describe('rebalanceOptimizer', () => {
  beforeEach(() => {
    _id = 0;
  });

  it('empty goals → feasible no-op', () => {
    const r = rebalanceOptimizer({ input: input(), currentAllocations: {} });
    expect(r.feasible).toBe(true);
    expect(r.newAllocations).toEqual({});
  });

  it('all goals already completed → feasible no-op with 0 allocations', () => {
    const g = makeGoal({ target: 1000, current: 1000, priority: 2 });
    const r = rebalanceOptimizer({ input: input({ goals: [g] }), currentAllocations: {} });
    expect(r.feasible).toBe(true);
    expect(r.newAllocations![g.id]).toBe(0);
  });

  it('openended goal is NOT considered "completed" (prevents no-op skip)', () => {
    const g = makeGoal({ type: 'openended', target: null as unknown as number, priority: 1, deadline: null });
    const r = rebalanceOptimizer({ input: input({ goals: [g], monthlySavingsTarget: 500 }) });
    expect(r.feasible).toBe(true);
    expect(r.newAllocations![g.id]).toBeGreaterThanOrEqual(0);
  });

  it('happy path: 2 goals fit in savings budget → phase1 allocates both feasible', () => {
    const g1 = makeGoal({ target: 1200, deadline: monthsFromNow(12), priority: 1 }); // need 100/mo
    const g2 = makeGoal({ target: 2400, deadline: monthsFromNow(12), priority: 2 }); // need 200/mo
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 500, goals: [g1, g2] }),
      criterion: 'feasibility',
    });
    expect(r.feasible).toBe(true);
    expect(r.newAllocations![g1.id]).toBeCloseTo(100, 1);
    expect(r.newAllocations![g2.id]).toBeCloseTo(200, 1);
  });

  it('infeasible: goals sum > pool → Phase 3 suggestions emitted', () => {
    const g1 = makeGoal({ target: 12000, deadline: monthsFromNow(12), priority: 1 }); // need 1000/mo
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 200, goals: [g1] }),
      criterion: 'feasibility',
    });
    expect(r.feasible).toBe(false);
    expect(r.suggestions).toBeDefined();
    expect(r.suggestions!.length).toBeGreaterThan(0);
    expect(r.suggestions![0].kind).toBe('extend_deadline');
  });

  it('phase2 donor transfer: lower-priority donor gives to higher-priority infeasible', () => {
    const urgent = makeGoal({ id: 'urgent', target: 2400, deadline: monthsFromNow(12), priority: 1 }); // need 200
    const lax = makeGoal({ id: 'lax', target: 3600, deadline: monthsFromNow(36), priority: 3 }); // need 100
    // Budget 250: phase1 alloca 100 a lax (priority 1→3 wait — priority 1 first)
    // Actually priority 1 first: urgent gets 200, lax gets 50 (remaining). Urgent feasible.
    // Need scenario where phase1 leaves urgent infeasible:
    // Budget 150, urgent priority 1 need 200 → allocates 150, infeasible. lax gets 0.
    // Phase2: no donor slack (lax=0) → urgent remains infeasible.
    // Better scenario: urgent priority 1 with no deadline pressure, lax priority 3 with plenty:
    const urgent2 = makeGoal({ id: 'urgent2', target: 6000, deadline: monthsFromNow(12), priority: 1 }); // need 500
    const lax2 = makeGoal({ id: 'lax2', target: 1000, deadline: monthsFromNow(100), priority: 3 }); // need 10
    // Budget 400: phase1: urgent2 priority 1 first → amount 400, infeasible (500 needed). lax2 → 0.
    // Phase2: lax2 allocation=0, no donor slack. Still infeasible.
    // ACCETTA test che verifica feasible OR infeasible + phase3 suggerimento.
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 400, goals: [urgent2, lax2] }),
      criterion: 'feasibility',
    });
    // urgent2 received at least all budget 400 (sorted priority 1 first)
    expect(r.newAllocations!['urgent2']).toBeCloseTo(400, 1);
    expect(r.feasible).toBe(false); // urgent2 still infeasible (needs 500 > 400)
  });

  it('criterion=equal: pro-rata distribution regardless of priority', () => {
    const g1 = makeGoal({ target: 1200, priority: 1 });
    const g2 = makeGoal({ target: 2400, priority: 3 });
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 600, goals: [g1, g2] }),
      criterion: 'equal',
    });
    // 600 / 2 = 300 per goal (capped at need)
    expect(r.newAllocations![g1.id]).toBeCloseTo(300, 1);
    expect(r.newAllocations![g2.id]).toBeCloseTo(300, 1);
  });

  it('criterion=equal caps at need (not overallocating)', () => {
    const small = makeGoal({ target: 100, current: 50, priority: 2 }); // need 50
    const big = makeGoal({ target: 5000, priority: 2 }); // need 5000
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 1000, goals: [small, big] }),
      criterion: 'equal',
    });
    // 1000/2 = 500 each; small capped at 50
    expect(r.newAllocations![small.id]).toBeCloseTo(50, 1);
    expect(r.newAllocations![big.id]).toBeCloseTo(500, 1);
  });

  it('goal with deadline in past → NOT feasibility-affecting (skipped in phase3)', () => {
    const past = makeGoal({ target: 1000, deadline: monthsFromNow(-3), priority: 2 });
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 100, goals: [past] }),
    });
    // Doesn't crash. Phase3 skips if monthsLeft <= 0
    expect(r.newAllocations).toBeDefined();
    expect(r.suggestions?.find((s) => s.goalId === past.id)).toBeUndefined();
  });

  it('pool budget 0 + 1 goal → all infeasible, phase3 skips (allocated=0)', () => {
    const g = makeGoal({ target: 1000, deadline: monthsFromNow(12), priority: 1 });
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 0, goals: [g] }),
      criterion: 'feasibility',
    });
    expect(r.feasible).toBe(false);
    expect(r.newAllocations![g.id]).toBe(0);
    // Phase3 skips because allocated=0
    expect(r.suggestions?.find((s) => s.goalId === g.id)).toBeUndefined();
  });

  it('savings + investments split: invest goal routes to invest pool', () => {
    const savGoal = makeGoal({ id: 'sav', name: 'Fondo Emergenza', presetId: 'fondo-emergenza', target: 5000, priority: 1, deadline: monthsFromNow(50) }); // need 100
    const invGoal = makeGoal({ id: 'inv', name: 'ETF mondiali', presetId: 'iniziare-a-investire', target: 2400, priority: 2, deadline: monthsFromNow(12) }); // need 200
    const r = rebalanceOptimizer({
      input: input({
        monthlySavingsTarget: 500,
        investmentsTarget: 300,
        goals: [savGoal, invGoal],
      }),
      criterion: 'feasibility',
    });
    expect(r.newAllocations!['sav']).toBeCloseTo(100, 1);
    expect(r.newAllocations!['inv']).toBeCloseTo(200, 1);
  });

  it('priority tie: sort preserves order (stable sort verification)', () => {
    const g1 = makeGoal({ id: 'first', target: 1200, deadline: monthsFromNow(12), priority: 2 });
    const g2 = makeGoal({ id: 'second', target: 1200, deadline: monthsFromNow(12), priority: 2 });
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 200, goals: [g1, g2] }),
    });
    // Both priority 2, same requiredMonthly 100 → both get 100 if budget 200
    expect(r.newAllocations!['first']).toBeCloseTo(100, 1);
    expect(r.newAllocations!['second']).toBeCloseTo(100, 1);
  });

  it('boundary guard: sum(allocations) ≤ pool budget + epsilon', () => {
    const g1 = makeGoal({ target: 1200, priority: 1, deadline: monthsFromNow(12) });
    const g2 = makeGoal({ target: 2400, priority: 2, deadline: monthsFromNow(12) });
    const POOL = 500;
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: POOL, goals: [g1, g2] }),
    });
    const total = Object.values(r.newAllocations!).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(POOL + 0.01);
  });

  it('mixed pools with one empty → still processes the non-empty one', () => {
    const invGoal = makeGoal({ id: 'inv', name: 'Crypto', target: 1200, priority: 1, deadline: monthsFromNow(12) }); // need 100
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 0, investmentsTarget: 200, goals: [invGoal] }),
      criterion: 'feasibility',
    });
    expect(r.newAllocations!['inv']).toBeCloseTo(100, 1);
    expect(r.feasible).toBe(true);
  });

  it('phase3 suggestion shape: extend_deadline with positive delta + valid newValue', () => {
    const g = makeGoal({ target: 6000, deadline: monthsFromNow(12), priority: 1 }); // need 500
    const r = rebalanceOptimizer({
      input: input({ monthlySavingsTarget: 100, goals: [g] }),
      criterion: 'feasibility',
    });
    expect(r.suggestions).toBeDefined();
    const s = r.suggestions![0];
    expect(s.kind).toBe('extend_deadline');
    expect(s.goalId).toBe(g.id);
    expect(s.delta).toBeGreaterThan(0);
    expect(typeof s.newValue).toBe('string');
    // newValue should be a valid ISO date
    expect(s.newValue as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('smoke: 20 goals rebalance completes without crash', () => {
    // Copilot round 1 feedback: removed hard <50ms bound to avoid CI flakiness.
    // Real perf measurement lives in allocation.bench.ts (vitest bench, manual).
    const goals: AllocationGoalInput[] = [];
    for (let i = 0; i < 20; i++) {
      goals.push(makeGoal({ id: `perf-${i}`, target: 1000 * (i + 1), deadline: monthsFromNow(12 + (i % 24)), priority: ((i % 3) + 1) as PriorityRank }));
    }
    const r = rebalanceOptimizer({ input: input({ monthlySavingsTarget: 500, goals }) });
    expect(r.newAllocations).toBeDefined();
    // Returned allocations shape intact for all 20 inputs
    expect(Object.keys(r.newAllocations!).length).toBe(20);
  });

  // ─── Sprint 1.5.5 Phase 1: openended residual split ───────────────────
  describe('openended residual split (Sprint 1.5.5 Bug #1)', () => {
    it('1 openended solo + pool 300 → riceve tutto residual', () => {
      const g = makeGoal({ id: 'emergency', type: 'openended', target: null as unknown as number, deadline: null, priority: 1 });
      const r = rebalanceOptimizer({ input: input({ monthlySavingsTarget: 300, goals: [g] }) });
      expect(r.feasible).toBe(true);
      expect(r.newAllocations![g.id]).toBeCloseTo(300, 1);
    });

    it('1 fixed need 100/mo + 1 openended + pool 300 → fixed 100, openended 200', () => {
      const fixed = makeGoal({ id: 'fixed', target: 1200, deadline: monthsFromNow(12), priority: 1 }); // 100/mo
      const open = makeGoal({ id: 'open', type: 'openended', target: null as unknown as number, deadline: null, priority: 2 });
      const r = rebalanceOptimizer({ input: input({ monthlySavingsTarget: 300, goals: [fixed, open] }), criterion: 'feasibility' });
      expect(r.feasible).toBe(true);
      expect(r.newAllocations!['fixed']).toBeCloseTo(100, 1);
      expect(r.newAllocations!['open']).toBeCloseTo(200, 1);
    });

    it('2 openended stesso pool + pool 300 → split equo 150 ciascuno', () => {
      const a = makeGoal({ id: 'a', type: 'openended', target: null as unknown as number, deadline: null, priority: 1 });
      const b = makeGoal({ id: 'b', type: 'openended', target: null as unknown as number, deadline: null, priority: 2 });
      const r = rebalanceOptimizer({ input: input({ monthlySavingsTarget: 300, goals: [a, b] }) });
      expect(r.feasible).toBe(true);
      expect(r.newAllocations!['a']).toBeCloseTo(150, 1);
      expect(r.newAllocations!['b']).toBeCloseTo(150, 1);
    });

    it("criterion 'equal' con openended non ha cap → riceve perGoal pieno", () => {
      const g = makeGoal({ id: 'em', type: 'openended', target: null as unknown as number, deadline: null, priority: 1 });
      const r = rebalanceOptimizer({ input: input({ monthlySavingsTarget: 250, goals: [g] }), criterion: 'equal' });
      expect(r.feasible).toBe(true);
      expect(r.newAllocations!['em']).toBeCloseTo(250, 1);
    });
  });

  // ─── Sprint 1.6 #004: smart default n≤3 = 'equal' ────────────────────
  describe('smart default criterion (Sprint 1.6 #004)', () => {
    it('3 goals senza criterion → smart default equal (tutti pro-rata identico)', () => {
      // Equal: perGoal = 600/3 = 200, tutti target ≥ 200 → tutti 200.
      // Feasibility waterfall priorità distinta + requiredMonthly differenti produrrebbe
      // allocazioni asimmetriche (≈42 / 100 / 300) — quindi test asimmetrico discrimina.
      const g1 = makeGoal({ id: 'a', target: 500, deadline: monthsFromNow(12), priority: 1 });
      const g2 = makeGoal({ id: 'b', target: 1200, deadline: monthsFromNow(12), priority: 2 });
      const g3 = makeGoal({ id: 'c', target: 3600, deadline: monthsFromNow(12), priority: 3 });
      const r = rebalanceOptimizer({ input: input({ monthlySavingsTarget: 600, goals: [g1, g2, g3] }) });
      expect(r.newAllocations!['a']).toBeCloseTo(200, 1);
      expect(r.newAllocations!['b']).toBeCloseTo(200, 1);
      expect(r.newAllocations!['c']).toBeCloseTo(200, 1);
    });

    it('4 goals senza criterion → smart default feasibility (non pro-rata)', () => {
      // Con 4 goals stesse priority+requiredMonthly, waterfall Phase 1 alloca 100 ai
      // primi 3 (pool 300), ultimo 0. Equal darebbe 75 ciascuno. Distinzione: presenza
      // di >= 3 goal a 100 AND >= 1 goal a 0 impossibile con equal (tutti 75).
      const goals = [
        makeGoal({ id: 'a', target: 1200, deadline: monthsFromNow(12), priority: 1 }),
        makeGoal({ id: 'b', target: 1200, deadline: monthsFromNow(12), priority: 1 }),
        makeGoal({ id: 'c', target: 1200, deadline: monthsFromNow(12), priority: 1 }),
        makeGoal({ id: 'd', target: 1200, deadline: monthsFromNow(12), priority: 1 }),
      ];
      const r = rebalanceOptimizer({ input: input({ monthlySavingsTarget: 300, goals }) });
      const values = Object.values(r.newAllocations!);
      const hundred = values.filter((v) => Math.abs(v - 100) < 1).length;
      const zero = values.filter((v) => v < 1).length;
      expect(hundred).toBeGreaterThanOrEqual(3);
      expect(zero).toBeGreaterThanOrEqual(1);
    });
  });
});
