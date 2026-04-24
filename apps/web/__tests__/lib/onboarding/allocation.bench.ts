/**
 * Sprint 1.5.3 WP-Q3 / Sprint 1.6.6 #055+#008: performance benchmark per
 * computeAllocation (3-pool unified post flag removal).
 * Target: < 10ms p95 per 20-goal input (realistic upper bound user beta).
 *
 * Run: `pnpm --filter @money-wise/web exec vitest bench`
 * Fails CI as regression alert only (not blocking PR at first hit).
 */

import { bench, describe } from 'vitest';
import { computeAllocation } from '@/lib/onboarding/allocation';
import type { AllocationGoalInput, AllocationInput, PriorityRank } from '@/types/onboarding-plan';

const BASE_DATE = new Date('2026-04-19T00:00:00.000Z');

function isoDate(offsetMonths: number): string {
  const d = new Date(BASE_DATE);
  d.setUTCMonth(d.getUTCMonth() + offsetMonths);
  return d.toISOString().slice(0, 10);
}

function makeGoals(count: number): AllocationGoalInput[] {
  const goals: AllocationGoalInput[] = [];
  for (let i = 0; i < count; i++) {
    goals.push({
      id: `bench-goal-${i}`,
      name: i === 0 ? 'Fondo Emergenza' : i % 3 === 0 ? `ETF ${i}` : `Goal ${i}`,
      target: 1000 * (i + 1),
      current: 0,
      deadline: isoDate(12 + (i % 36)),
      priority: ((i % 3) + 1) as PriorityRank,
      type: i === 0 ? 'openended' : 'fixed',
    });
  }
  return goals;
}

const INPUT_20_GOALS: AllocationInput = {
  monthlyIncome: 2250,
  monthlySavingsTarget: 300,
  essentialsPct: 80,
  lifestyleBuffer: 120,
  investmentsTarget: 20,
  goals: makeGoals(20),
};

describe('computeAllocation — 3-pool unified', () => {
  bench('20 goals — cold', () => {
    computeAllocation(INPUT_20_GOALS);
  });

  bench('20 goals warm with 5 overrides', () => {
    const overrides: Record<string, number> = {};
    for (let i = 0; i < 5; i++) {
      overrides[`bench-goal-${i}`] = 50;
    }
    computeAllocation({ ...INPUT_20_GOALS, userOverrides: overrides });
  });
});
