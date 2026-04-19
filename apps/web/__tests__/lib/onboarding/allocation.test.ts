/**
 * Sprint 1.5 — Onboarding Piano Generato / Stream C (test-specialist)
 *
 * TDD test suite for the allocation algorithm owned by Stream B
 * (`apps/web/src/lib/onboarding/allocation.ts`). Written AGAINST the
 * type contract at `apps/web/src/types/onboarding-plan.ts`.
 *
 * Coverage matrix (≥6 mandatory edge cases + 2 bonus):
 *   1. Happy path — 3 goals varied priority, savings 500, income 2500.
 *   2. target=0 skip — goal with target 0 → monthlyAmount 0 + reasoning hint.
 *   3. Deadline passed — deadline < today → deadlineFeasible false + warning.
 *   4. Priority duplicate order preserved — stable sort vs input order.
 *   5. Emergency fund override — priority 1 "Fondo Emergenza" gets ≥40%.
 *   6. Deadline <12mo urgency boost — closer deadline wins more monthly.
 *   7. (Bonus) savings target > income_after_essentials → global warning.
 *   8. (Bonus) empty goals array → items [] + unallocated full + warning.
 *
 * NOTE: If Stream B has not yet committed
 * `apps/web/src/lib/onboarding/allocation.ts`, this suite pre-fails at
 * import resolution. That is the expected TDD handshake and resolves
 * once Stream B merges.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeAllocation } from '@/lib/onboarding/allocation';
import type {
  AllocationGoalInput,
  AllocationInput,
  AllocationResult,
  PriorityRank,
} from '@/types/onboarding-plan';

// ─────────────────────────────────────────────────────────────────────────
// Test fixtures / helpers
// ─────────────────────────────────────────────────────────────────────────

/** Deterministic "today" reference to build deadline fixtures around. */
const TODAY = new Date('2026-04-19T00:00:00Z');

/** Format a Date as ISO date-only string (YYYY-MM-DD), as stored in DB. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Offset "today" by N months (UTC). */
function monthsFromToday(n: number): string {
  const d = new Date(TODAY);
  d.setUTCMonth(d.getUTCMonth() + n);
  return isoDate(d);
}

/** Offset "today" by N days (UTC). */
function daysFromToday(n: number): string {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

function makeGoal(partial: Partial<AllocationGoalInput>): AllocationGoalInput {
  return {
    id: partial.id ?? `goal-${Math.random().toString(36).slice(2, 10)}`,
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
    emergencyFundMonths: partial.emergencyFundMonths,
  };
}

/** Sum of per-goal monthlyAmount. */
function sumAllocated(result: AllocationResult): number {
  return result.items.reduce((acc, it) => acc + it.monthlyAmount, 0);
}

// Floating-point-safe comparison tolerance for currency sums.
const EPS = 0.01;

// ─────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────

describe('computeAllocation (Stream B algorithm contract)', () => {
  // Freeze system time to TODAY so deadline/urgency calculations in the
  // algorithm (which internally uses `new Date()`) are deterministic across
  // CI runs and local execution. Addresses Copilot review on PR #455.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });


  // ───────────────────────────────────────────────────────────────────────
  // 1. Happy path
  // ───────────────────────────────────────────────────────────────────────
  describe('happy path', () => {
    it('distributes savings target across 3 varied-priority goals', () => {
      const input = makeInput({
        monthlyIncome: 2500,
        monthlySavingsTarget: 500,
        essentialsPct: 50,
        goals: [
          makeGoal({
            id: 'g-high',
            name: 'Acconto Casa',
            target: 20000,
            priority: 1,
            deadline: monthsFromToday(36),
          }),
          makeGoal({
            id: 'g-mid',
            name: 'Auto',
            target: 8000,
            priority: 2,
            deadline: monthsFromToday(24),
          }),
          makeGoal({
            id: 'g-low',
            name: 'Viaggio',
            target: 2000,
            priority: 3,
            deadline: monthsFromToday(18),
          }),
        ],
      });

      const result = computeAllocation(input);

      expect(result.items).toHaveLength(3);
      // income 2500 × 50% essentials = 1250 available → 500 savings target fits.
      expect(result.incomeAfterEssentials).toBeCloseTo(1250, 2);
      // totalAllocated must not exceed the requested savings target.
      expect(result.totalAllocated).toBeLessThanOrEqual(500 + EPS);
      // Sum consistency with items.
      expect(sumAllocated(result)).toBeCloseTo(result.totalAllocated, 2);
      // unallocated = savingsTarget - totalAllocated (non-negative).
      expect(result.unallocated).toBeGreaterThanOrEqual(0);
      expect(result.unallocated).toBeCloseTo(500 - result.totalAllocated, 2);
      // Every goal must receive positive allocation in happy path.
      for (const item of result.items) {
        expect(item.monthlyAmount).toBeGreaterThan(0);
        expect(typeof item.reasoning).toBe('string');
        expect(item.reasoning.length).toBeGreaterThan(0);
        expect(Array.isArray(item.warnings)).toBe(true);
      }
      // No global warning under these nominal conditions.
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. target=0 skip
  // ───────────────────────────────────────────────────────────────────────
  describe('target=0 skip', () => {
    it('allocates 0 to a goal with target=0 and adds reasoning', () => {
      const input = makeInput({
        monthlySavingsTarget: 300,
        goals: [
          makeGoal({
            id: 'g-zero',
            name: 'Placeholder',
            target: 0,
            priority: 2,
          }),
        ],
      });

      const result = computeAllocation(input);
      expect(result.items).toHaveLength(1);
      const [item] = result.items;
      expect(item.goalId).toBe('g-zero');
      expect(item.monthlyAmount).toBe(0);
      // Reasoning must explicitly flag missing target.
      expect(item.reasoning.toLowerCase()).toMatch(
        /target|nessun.*importo|non specificato|obiettivo vuoto/,
      );
      // Because nothing was allocated, unallocated must equal savings target.
      expect(result.unallocated).toBeCloseTo(300, 2);
      expect(result.totalAllocated).toBeCloseTo(0, 2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. Deadline passed flag
  // ───────────────────────────────────────────────────────────────────────
  describe('deadline passed', () => {
    it('marks deadlineFeasible=false and adds warning when deadline < today', () => {
      const input = makeInput({
        monthlySavingsTarget: 400,
        goals: [
          makeGoal({
            id: 'g-past',
            name: 'Obiettivo Scaduto',
            target: 1000,
            priority: 2,
            // 30 days in the past.
            deadline: daysFromToday(-30),
          }),
        ],
      });

      const result = computeAllocation(input);
      expect(result.items).toHaveLength(1);
      const [item] = result.items;
      expect(item.deadlineFeasible).toBe(false);
      // At least one warning must mention the deadline.
      expect(item.warnings.length).toBeGreaterThan(0);
      expect(
        item.warnings.some((w) =>
          /deadline|scadenz|scadut|trascors|passat|passed/i.test(w),
        ),
      ).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 4. Priority duplicate — stable order preserved
  // ───────────────────────────────────────────────────────────────────────
  describe('priority duplicate stable order', () => {
    it('preserves input order when two goals share the same priority', () => {
      const input = makeInput({
        monthlySavingsTarget: 200,
        goals: [
          makeGoal({
            id: 'g-first',
            name: 'Primo',
            target: 1000,
            priority: 2,
            deadline: monthsFromToday(12),
          }),
          makeGoal({
            id: 'g-second',
            name: 'Secondo',
            target: 1000,
            priority: 2,
            deadline: monthsFromToday(12),
          }),
        ],
      });

      const result = computeAllocation(input);
      expect(result.items).toHaveLength(2);
      // Stable sort: identical priority + deadline + target → input order wins.
      expect(result.items[0].goalId).toBe('g-first');
      expect(result.items[1].goalId).toBe('g-second');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 5. Emergency fund override (priority 1 + name "Fondo Emergenza")
  // ───────────────────────────────────────────────────────────────────────
  describe('emergency fund override', () => {
    it('allocates ≥40% of savings target to "Fondo Emergenza" priority 1', () => {
      const savings = 500;
      const input = makeInput({
        monthlyIncome: 3000,
        monthlySavingsTarget: savings,
        essentialsPct: 50,
        goals: [
          makeGoal({
            id: 'g-emergency',
            name: 'Fondo Emergenza',
            target: 15000,
            priority: 1,
            deadline: monthsFromToday(36),
          }),
          makeGoal({
            id: 'g-vacation',
            name: 'Vacanza',
            target: 2000,
            priority: 3,
            deadline: monthsFromToday(18),
          }),
        ],
      });

      const result = computeAllocation(input);
      expect(result.items).toHaveLength(2);
      const emergency = result.items.find((it) => it.goalId === 'g-emergency');
      const vacation = result.items.find((it) => it.goalId === 'g-vacation');
      expect(emergency).toBeDefined();
      expect(vacation).toBeDefined();

      // Emergency gets at least 40% of the savings target.
      expect(emergency!.monthlyAmount / savings).toBeGreaterThanOrEqual(0.4);
      // And must be strictly greater than the low-priority vacation goal.
      expect(emergency!.monthlyAmount).toBeGreaterThan(vacation!.monthlyAmount);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 6. Deadline <12mo urgency boost
  // ───────────────────────────────────────────────────────────────────────
  describe('deadline urgency boost', () => {
    it('allocates more monthly to a closer-deadline twin of the same goal', () => {
      const input = makeInput({
        monthlyIncome: 2500,
        monthlySavingsTarget: 400,
        essentialsPct: 50,
        goals: [
          makeGoal({
            id: 'g-soon',
            name: 'Viaggio Breve',
            target: 1500,
            priority: 2,
            deadline: monthsFromToday(6), // <12mo → urgency boost expected
          }),
          makeGoal({
            id: 'g-later',
            name: 'Viaggio Breve',
            target: 1500,
            priority: 2,
            deadline: monthsFromToday(36), // 3 years away → no boost
          }),
        ],
      });

      const result = computeAllocation(input);
      const soon = result.items.find((it) => it.goalId === 'g-soon');
      const later = result.items.find((it) => it.goalId === 'g-later');
      expect(soon).toBeDefined();
      expect(later).toBeDefined();
      // The urgent one must win strictly more monthly allocation.
      expect(soon!.monthlyAmount).toBeGreaterThan(later!.monthlyAmount);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 7. (Bonus) savings target > income_after_essentials → global warning
  // ───────────────────────────────────────────────────────────────────────
  describe('savings target exceeds income after essentials', () => {
    it('surfaces a global warning when savings target > income_after_essentials', () => {
      // income 2000, essentials 80% → 400 available → target 800 impossible.
      const input = makeInput({
        monthlyIncome: 2000,
        essentialsPct: 80,
        monthlySavingsTarget: 800,
        goals: [
          makeGoal({
            id: 'g-any',
            name: 'Qualsiasi',
            target: 1000,
            priority: 2,
            deadline: monthsFromToday(12),
          }),
        ],
      });

      const result = computeAllocation(input);
      expect(result.incomeAfterEssentials).toBeCloseTo(400, 2);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) =>
          /savings|obiettivo di risparmio|eccede|exceed|reddito|income/i.test(
            w,
          ),
        ),
      ).toBe(true);
      // totalAllocated cannot exceed incomeAfterEssentials.
      expect(result.totalAllocated).toBeLessThanOrEqual(400 + EPS);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 8. (Bonus) empty goals array
  // ───────────────────────────────────────────────────────────────────────
  describe('empty goals array', () => {
    it('returns items=[], full unallocated, and a "no goals" warning', () => {
      const input = makeInput({
        monthlySavingsTarget: 250,
        goals: [],
      });

      const result = computeAllocation(input);
      expect(result.items).toEqual([]);
      expect(result.totalAllocated).toBeCloseTo(0, 2);
      expect(result.unallocated).toBeCloseTo(250, 2);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) =>
          /nessun.*obiettivo|no goals|empty|vuot/i.test(w),
        ),
      ).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Aggregate invariants (cross-cutting sanity)
  // ───────────────────────────────────────────────────────────────────────
  describe('aggregate invariants', () => {
    it('never allocates more than min(savingsTarget, incomeAfterEssentials)', () => {
      const input = makeInput({
        monthlyIncome: 2500,
        monthlySavingsTarget: 500,
        essentialsPct: 50,
        goals: [
          makeGoal({ id: 'a', target: 1000, priority: 1 }),
          makeGoal({ id: 'b', target: 1000, priority: 2 }),
          makeGoal({ id: 'c', target: 1000, priority: 3 }),
        ],
      });
      const result = computeAllocation(input);
      const cap = Math.min(500, result.incomeAfterEssentials);
      expect(result.totalAllocated).toBeLessThanOrEqual(cap + EPS);
      expect(sumAllocated(result)).toBeCloseTo(result.totalAllocated, 2);
    });

    it('returns one item per input goal (no duplicates, no drops)', () => {
      const ids = ['p', 'q', 'r', 's'];
      const input = makeInput({
        monthlySavingsTarget: 400,
        goals: ids.map((id, idx) =>
          makeGoal({
            id,
            target: 500 + idx * 100,
            priority: ((idx % 3) + 1) as PriorityRank,
            deadline: monthsFromToday(12 + idx),
          }),
        ),
      });
      const result = computeAllocation(input);
      expect(result.items.map((it) => it.goalId).sort()).toEqual(
        [...ids].sort(),
      );
    });
  });
});
