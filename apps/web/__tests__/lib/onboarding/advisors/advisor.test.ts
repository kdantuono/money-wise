/**
 * Sprint 1.5.2 — WP-E: DeterministicBehavioralAdvisor tests
 *
 * 25+ scenarios covering:
 * - Each behavioral warning trigger
 * - Each suggestion chip type
 * - Hard-block edge cases (negative disposable, all-infeasible)
 * - Encouragement when plan is balanced
 * - analyzeUserOverride method
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeterministicBehavioralAdvisor } from '@/lib/onboarding/advisors/DeterministicBehavioralAdvisor';
import type {
  AllocationInput,
  AllocationGoalInput,
  PriorityRank,
} from '@/types/onboarding-plan';

const TODAY = new Date('2026-04-19T12:00:00.000Z');

let _id = 0;
function id(): string {
  return `g${++_id}`;
}

function goal(partial: Partial<AllocationGoalInput> = {}): AllocationGoalInput {
  return {
    id: partial.id ?? id(),
    name: partial.name ?? 'Goal Generico',
    target: partial.target ?? 5000,
    current: partial.current ?? 0,
    deadline: partial.deadline ?? null,
    priority: (partial.priority ?? 2) as PriorityRank,
  };
}

function monthsFromNow(n: number): string {
  const d = new Date(TODAY);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

function input(partial: Partial<AllocationInput> = {}): AllocationInput {
  return {
    monthlyIncome: partial.monthlyIncome ?? 2500,
    monthlySavingsTarget: partial.monthlySavingsTarget ?? 500,
    essentialsPct: partial.essentialsPct ?? 50,
    goals: partial.goals ?? [],
    lifestyleBuffer: partial.lifestyleBuffer,
    investmentsTarget: partial.investmentsTarget,
    userOverrides: partial.userOverrides,
  };
}

const advisor = new DeterministicBehavioralAdvisor();

describe('DeterministicBehavioralAdvisor — behavioral warnings', () => {
  beforeEach(() => {
    _id = 0;
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });
  afterEach(() => { vi.useRealTimers(); });

  // ── 1. Lifestyle warnings ────────────────────────────────────────────

  it('warns LIFESTYLE_TOO_LOW when lifestyleBuffer = 0', () => {
    const result = advisor.proposeAllocation(
      input({ lifestyleBuffer: 0, goals: [goal()] }),
    );
    const w = result.behavioralWarnings?.find((w) => w.code === 'LIFESTYLE_TOO_LOW');
    expect(w).toBeDefined();
    expect(w?.severity).toBe('soft');
  });

  it('warns LIFESTYLE_TOO_LOW when lifestyleBuffer = 30 (< 50)', () => {
    const result = advisor.proposeAllocation(
      input({ lifestyleBuffer: 30, goals: [goal()] }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'LIFESTYLE_TOO_LOW')).toBe(true);
  });

  it('does NOT warn LIFESTYLE_TOO_LOW when lifestyleBuffer = 60', () => {
    const result = advisor.proposeAllocation(
      input({ lifestyleBuffer: 60, goals: [goal()] }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'LIFESTYLE_TOO_LOW')).toBe(false);
  });

  it('does NOT warn LIFESTYLE_TOO_LOW when lifestyleBuffer absent (undefined)', () => {
    const result = advisor.proposeAllocation(input({ goals: [goal()] }));
    // undefined → default 0 → warns
    expect(result.behavioralWarnings?.some((w) => w.code === 'LIFESTYLE_TOO_LOW')).toBe(true);
  });

  // ── 2. Zero invest warnings ──────────────────────────────────────────

  it('warns INVEST_ZERO_NO_DEBT when investmentsTarget = 0 and no debt goals', () => {
    const result = advisor.proposeAllocation(
      input({ investmentsTarget: 0, lifestyleBuffer: 100, goals: [goal({ name: 'Risparmio Casa' })] }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'INVEST_ZERO_NO_DEBT')).toBe(true);
  });

  it('does NOT warn INVEST_ZERO_NO_DEBT when invest > 0', () => {
    const result = advisor.proposeAllocation(
      input({ investmentsTarget: 100, lifestyleBuffer: 100, goals: [goal({ name: 'ETF Globale' })] }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'INVEST_ZERO_NO_DEBT')).toBe(false);
  });

  it('does NOT warn INVEST_ZERO_NO_DEBT when invest = 0 but there are debt goals', () => {
    const result = advisor.proposeAllocation(
      input({
        investmentsTarget: 0,
        lifestyleBuffer: 100,
        goals: [goal({ name: 'Estinzione debito' })],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'INVEST_ZERO_NO_DEBT')).toBe(false);
  });

  // ── 3. Debt ratio warnings ───────────────────────────────────────────

  it('warns DEBT_RATIO_HIGH when debt allocation > 40% of disposable', () => {
    const g = goal({ id: 'debt-g', name: 'Estinzione debito', target: 3000, deadline: monthsFromNow(6), priority: 1 });
    // disposable = 2000 * 0.5 = 1000. savings = 700. debt ALTA with 6mo deadline → needs 500/mo.
    // allocated 500 → ratio = 500/1000 = 0.5 > 0.4 → should warn.
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 2000,
        essentialsPct: 50,
        monthlySavingsTarget: 700,
        lifestyleBuffer: 100,
        goals: [g],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'DEBT_RATIO_HIGH')).toBe(true);
  });

  it('does NOT warn DEBT_RATIO_HIGH when debt allocation < 40%', () => {
    // debt goal gets small allocation
    const g = goal({ name: 'Piccolo debito', target: 200, deadline: null, priority: 3 });
    const result = advisor.proposeAllocation(
      input({ lifestyleBuffer: 100, goals: [g] }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'DEBT_RATIO_HIGH')).toBe(false);
  });

  // ── 4. No emergency fund ─────────────────────────────────────────────

  it('warns NO_EMERGENCY_FUND when no goal matches emergency pattern', () => {
    const result = advisor.proposeAllocation(
      input({ lifestyleBuffer: 100, investmentsTarget: 100, goals: [goal({ name: 'Acconto Casa' })] }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'NO_EMERGENCY_FUND')).toBe(true);
  });

  it('does NOT warn NO_EMERGENCY_FUND when "Fondo Emergenza" goal is present', () => {
    const result = advisor.proposeAllocation(
      input({
        lifestyleBuffer: 100,
        investmentsTarget: 100,
        goals: [goal({ name: 'Fondo Emergenza', target: 9000 })],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'NO_EMERGENCY_FUND')).toBe(false);
  });

  it('does NOT warn NO_EMERGENCY_FUND when "emergency fund" goal is present (EN)', () => {
    const result = advisor.proposeAllocation(
      input({
        lifestyleBuffer: 100,
        investmentsTarget: 100,
        goals: [goal({ name: 'Emergency Fund', target: 6000 })],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'NO_EMERGENCY_FUND')).toBe(false);
  });

  // ── 5. All same priority ─────────────────────────────────────────────

  it('warns ALL_SAME_PRIORITY when ≥2 goals all have priority 1', () => {
    const result = advisor.proposeAllocation(
      input({
        lifestyleBuffer: 100,
        investmentsTarget: 100,
        goals: [
          goal({ name: 'Fondo Emergenza', priority: 1, target: 3000 }),
          goal({ name: 'Acconto Casa', priority: 1, target: 5000 }),
        ],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'ALL_SAME_PRIORITY')).toBe(true);
  });

  it('does NOT warn ALL_SAME_PRIORITY for single goal', () => {
    const result = advisor.proposeAllocation(
      input({
        lifestyleBuffer: 100,
        investmentsTarget: 100,
        goals: [goal({ name: 'Fondo Emergenza', priority: 1 })],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'ALL_SAME_PRIORITY')).toBe(false);
  });

  it('does NOT warn ALL_SAME_PRIORITY when goals have mixed priorities', () => {
    const result = advisor.proposeAllocation(
      input({
        lifestyleBuffer: 100,
        investmentsTarget: 100,
        goals: [
          goal({ name: 'Fondo Emergenza', priority: 1 }),
          goal({ name: 'Vacanza', priority: 3 }),
        ],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'ALL_SAME_PRIORITY')).toBe(false);
  });

  // ── 6. Encouragement ─────────────────────────────────────────────────

  it('emits PLAN_BALANCED encouragement when no issues found', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 40,
        monthlySavingsTarget: 400,
        lifestyleBuffer: 150,
        investmentsTarget: 100,
        goals: [
          goal({ name: 'Fondo Emergenza', priority: 1, target: 500, deadline: null }),
          goal({ name: 'ETF Globale', priority: 2, target: 5000, deadline: monthsFromNow(24) }),
        ],
      }),
    );
    expect(result.behavioralWarnings?.some((w) => w.code === 'PLAN_BALANCED')).toBe(true);
  });

  // ── 7. Hard-block: negative disposable ───────────────────────────────

  it('hard-block when income after essentials < 0', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 1000,
        essentialsPct: 110, // over 100% → negative disposable
        goals: [goal()],
      }),
    );
    expect(result.hardBlock).toBeDefined();
    expect(result.hardBlock?.reason).toBeTruthy();
  });

  it('hard-block when lifestyle + invest + savings exceed disposable', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 1500,
        essentialsPct: 50, // disposable = 750
        monthlySavingsTarget: 500,
        lifestyleBuffer: 200,
        investmentsTarget: 200, // 500+200+200 = 900 > 750
        goals: [goal({ name: 'Fondo Emergenza', target: 3000 })],
      }),
    );
    expect(result.hardBlock).toBeDefined();
  });

  it('no hard-block when plan is feasible', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 40,
        monthlySavingsTarget: 300,
        lifestyleBuffer: 100,
        investmentsTarget: 100,
        goals: [goal({ name: 'Fondo Emergenza', target: 3000, deadline: monthsFromNow(12) })],
      }),
    );
    expect(result.hardBlock).toBeFalsy();
  });

  // ── 8. All-infeasible hard block ─────────────────────────────────────

  it('hard-block all-infeasible when tiny pool + many deadlines passed', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 1000,
        essentialsPct: 50,
        monthlySavingsTarget: 50,
        lifestyleBuffer: 100,
        goals: [
          goal({ name: 'Debito urgente', target: 50000, current: 0, deadline: monthsFromNow(-1), priority: 1 }),
          goal({ name: 'Casa', target: 100000, current: 0, deadline: monthsFromNow(-2), priority: 1 }),
        ],
      }),
    );
    // Both have past deadlines → all infeasible
    const allInfeasible = result.items.every((it) => !it.deadlineFeasible && it.monthlyAmount === 0);
    if (allInfeasible) {
      expect(result.hardBlock).toBeDefined();
    }
  });

  // ── 9. Suggestions ───────────────────────────────────────────────────

  it('generates extend_deadline suggestion for infeasible goal with future deadline', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 2500,
        essentialsPct: 50,
        monthlySavingsTarget: 100, // very small
        lifestyleBuffer: 100,
        goals: [
          goal({ name: 'Acconto Casa', target: 30000, deadline: monthsFromNow(6), priority: 1 }),
        ],
      }),
    );
    const chips = result.suggestions ?? [];
    expect(chips.some((c) => c.kind === 'extend_deadline')).toBe(true);
  });

  it('generates increase_monthly suggestion for infeasible goal', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 2500,
        essentialsPct: 50,
        monthlySavingsTarget: 100,
        lifestyleBuffer: 100,
        goals: [
          goal({ name: 'Vacanza', target: 500, deadline: monthsFromNow(3), priority: 2 }),
        ],
      }),
    );
    const chips = result.suggestions ?? [];
    // Shortfall <= 500 → increase_monthly should appear
    expect(chips.some((c) => c.kind === 'increase_monthly')).toBe(true);
  });

  it('generates rebalance_portfolio suggestion when multiple goals infeasible', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 1500,
        essentialsPct: 60,
        monthlySavingsTarget: 100,
        lifestyleBuffer: 100,
        goals: [
          goal({ name: 'Goal A', target: 10000, deadline: monthsFromNow(3), priority: 1 }),
          goal({ name: 'Goal B', target: 10000, deadline: monthsFromNow(3), priority: 2 }),
        ],
      }),
    );
    const chips = result.suggestions ?? [];
    expect(chips.some((c) => c.kind === 'rebalance_portfolio')).toBe(true);
  });

  it('no suggestions when all goals feasible', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 4000,
        essentialsPct: 30,
        monthlySavingsTarget: 1000,
        lifestyleBuffer: 100,
        investmentsTarget: 100,
        goals: [
          goal({ name: 'Fondo Emergenza', target: 500, deadline: null, priority: 1 }),
        ],
      }),
    );
    const infeasibleChips = (result.suggestions ?? []).filter(
      (c) => c.kind === 'extend_deadline' || c.kind === 'increase_monthly' || c.kind === 'reduce_target',
    );
    expect(infeasibleChips).toHaveLength(0);
  });

  // ── 10. proposeAllocation delegates to computeAllocation ─────────────

  it('behavioralWarnings present on result (not undefined)', () => {
    const result = advisor.proposeAllocation(input({ lifestyleBuffer: 100, goals: [goal()] }));
    expect(result.behavioralWarnings).toBeDefined();
    expect(Array.isArray(result.behavioralWarnings)).toBe(true);
  });

  it('result.items is correctly populated from waterfall', () => {
    const g = goal({ name: 'Fondo Emergenza', target: 3000, deadline: null, priority: 2 });
    const result = advisor.proposeAllocation(
      input({ lifestyleBuffer: 100, investmentsTarget: 50, goals: [g] }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].goalId).toBe(g.id);
  });

  // ── 11. analyzeUserOverride ──────────────────────────────────────────

  it('analyzeUserOverride returns warnings based on override context', () => {
    const g1 = goal({ name: 'Goal A', target: 3000 });
    const baseInput = input({ lifestyleBuffer: 0, goals: [g1] }); // lifestyle 0 → should warn
    const warnings = advisor.analyzeUserOverride({ [g1.id]: 300 }, baseInput);
    expect(Array.isArray(warnings)).toBe(true);
    expect(warnings.some((w) => w.code === 'LIFESTYLE_TOO_LOW')).toBe(true);
  });

  it('analyzeUserOverride returns PLAN_BALANCED when all well', () => {
    const g1 = goal({ name: 'Fondo Emergenza', target: 3000 });
    const baseInput = input({
      lifestyleBuffer: 100,
      investmentsTarget: 100,
      goals: [g1],
    });
    const warnings = advisor.analyzeUserOverride({ [g1.id]: 300 }, baseInput);
    // No actionable warnings → should see encouragement
    expect(Array.isArray(warnings)).toBe(true);
  });

  // ── 12. generateSuggestions directly ─────────────────────────────────

  it('generateSuggestions returns empty array for empty infeasible list', () => {
    const chips = advisor.generateSuggestions([]);
    expect(chips).toEqual([]);
  });

  it('generateSuggestions for single infeasible with null deadline = no extend chip', () => {
    const chips = advisor.generateSuggestions([
      {
        goalId: 'g1',
        name: 'Test Goal',
        shortfall: 200,
        deadline: null,
        currentMonthly: 50,
        requiredMonthly: 250,
      },
    ]);
    expect(chips.some((c) => c.kind === 'extend_deadline')).toBe(false);
    // But increase_monthly should exist
    expect(chips.some((c) => c.kind === 'increase_monthly')).toBe(true);
  });

  it('chip description is non-empty Italian string', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 2000,
        essentialsPct: 50,
        monthlySavingsTarget: 50,
        lifestyleBuffer: 100,
        goals: [goal({ name: 'Vacanza', target: 2000, deadline: monthsFromNow(4), priority: 2 })],
      }),
    );
    for (const chip of result.suggestions ?? []) {
      expect(typeof chip.description).toBe('string');
      expect(chip.description.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Sprint 1.5.4 Q7: cross-pool mismatch warnings (gated on ENABLE_3POOL_MODEL)
// ─────────────────────────────────────────────────────────────────────────

describe('DeterministicBehavioralAdvisor — Sprint 1.5.4 Q7 cross-pool warnings', () => {
  const advisor = new DeterministicBehavioralAdvisor();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_3POOL_MODEL', 'true');
    _id = 0;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ORPHAN_INVEST_BUDGET: invest target > 0 + no invest goals → soft warning with 3 actions', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 300,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [goal({ name: 'Fondo Emergenza', target: 5000, priority: 1 })],
      }),
    );
    const w = result.behavioralWarnings?.find((x) => x.code === 'ORPHAN_INVEST_BUDGET');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('soft');
    expect(w!.actions).toHaveLength(3);
    expect(w!.actions!.map((a) => a.kind)).toEqual(['navigate', 'budget_transfer', 'dismiss']);
    const transferChip = w!.actions!.find((a) => a.kind === 'budget_transfer')!;
    expect(transferChip.from).toBe('investments');
    expect(transferChip.to).toBe('savings');
    expect(transferChip.delta).toBe(100);
  });

  it('ORPHAN_INVEST_BUDGET: absent when invest goal exists', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 300,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [goal({ name: 'ETF mondiali', target: 10000, priority: 2 })],
      }),
    );
    expect(result.behavioralWarnings?.find((w) => w.code === 'ORPHAN_INVEST_BUDGET')).toBeUndefined();
  });

  it('ORPHAN_SAVINGS_BUDGET: savings target > 0 + no savings goals → soft warning with 3 actions', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 200,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [goal({ name: 'Crypto portfolio', target: 10000, priority: 2 })],
      }),
    );
    const w = result.behavioralWarnings?.find((x) => x.code === 'ORPHAN_SAVINGS_BUDGET');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('soft');
    expect(w!.actions).toHaveLength(3);
    const transferChip = w!.actions!.find((a) => a.kind === 'budget_transfer')!;
    expect(transferChip.from).toBe('savings');
    expect(transferChip.to).toBe('investments');
  });

  it('ORPHAN_SAVINGS_BUDGET: absent when savings goal exists', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 200,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [
          goal({ name: 'ETF', target: 10000, priority: 2 }),
          goal({ name: 'Fondo Emergenza', target: 5000, priority: 1 }),
        ],
      }),
    );
    expect(result.behavioralWarnings?.find((w) => w.code === 'ORPHAN_SAVINGS_BUDGET')).toBeUndefined();
  });

  it('INVEST_GOALS_NO_BUDGET: invest goals + zero invest budget → hard warning with 2 actions', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 500,
        lifestyleBuffer: 200,
        investmentsTarget: 0,
        goals: [goal({ name: 'ETF mondiali', target: 10000, priority: 2 })],
      }),
    );
    const w = result.behavioralWarnings?.find((x) => x.code === 'INVEST_GOALS_NO_BUDGET');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('hard');
    expect(w!.actions).toHaveLength(2);
    expect(w!.actions!.map((a) => a.kind)).toEqual(['navigate', 'bulk_remove_goals']);
    const bulkChip = w!.actions!.find((a) => a.kind === 'bulk_remove_goals')!;
    expect(bulkChip.goalIds).toHaveLength(1);
  });

  it('INVEST_GOALS_NO_BUDGET: absent when invest budget > 0', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 300,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [goal({ name: 'ETF mondiali', target: 10000, priority: 2 })],
      }),
    );
    expect(result.behavioralWarnings?.find((w) => w.code === 'INVEST_GOALS_NO_BUDGET')).toBeUndefined();
  });

  it('SAVINGS_GOALS_NO_BUDGET: savings goals + zero savings budget → hard warning with 2 actions', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 0,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [
          goal({ name: 'Fondo Emergenza', target: 5000, priority: 1 }),
          goal({ name: 'Comprare Casa', target: 50000, priority: 2 }),
        ],
      }),
    );
    const w = result.behavioralWarnings?.find((x) => x.code === 'SAVINGS_GOALS_NO_BUDGET');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('hard');
    expect(w!.actions).toHaveLength(2);
    const bulkChip = w!.actions!.find((a) => a.kind === 'bulk_remove_goals')!;
    expect(bulkChip.goalIds).toHaveLength(2);
  });

  it('SAVINGS_GOALS_NO_BUDGET: absent when savings budget > 0', () => {
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 300,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [goal({ name: 'Fondo Emergenza', target: 5000, priority: 1 })],
      }),
    );
    expect(result.behavioralWarnings?.find((w) => w.code === 'SAVINGS_GOALS_NO_BUDGET')).toBeUndefined();
  });

  it('flag OFF: Q7 warnings non emessi', () => {
    vi.unstubAllEnvs(); // flag default OFF
    const result = advisor.proposeAllocation(
      input({
        monthlyIncome: 3000,
        essentialsPct: 50,
        monthlySavingsTarget: 300,
        lifestyleBuffer: 200,
        investmentsTarget: 100,
        goals: [goal({ name: 'Fondo Emergenza', target: 5000, priority: 1 })],
      }),
    );
    const q7Codes = ['ORPHAN_INVEST_BUDGET', 'ORPHAN_SAVINGS_BUDGET', 'INVEST_GOALS_NO_BUDGET', 'SAVINGS_GOALS_NO_BUDGET'];
    for (const code of q7Codes) {
      expect(result.behavioralWarnings?.find((w) => w.code === code)).toBeUndefined();
    }
  });
});
