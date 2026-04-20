/**
 * Sprint 1.5.3 WP-Q3: performance benchmark for computeAllocation.
 * Target: < 10ms p95 per 20-goal input (realistic upper bound for user beta).
 *
 * Run with: `pnpm --filter @money-wise/web exec vitest bench`
 * Fails CI as regression alert only (not blocking PR at first hit).
 */

import { bench, describe, beforeAll, afterAll, vi } from 'vitest';
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

const INPUT_20_GOALS_LEGACY: AllocationInput = {
  monthlyIncome: 2250,
  monthlySavingsTarget: 300,
  essentialsPct: 80,
  goals: makeGoals(20),
};

const INPUT_20_GOALS_3POOL: AllocationInput = {
  ...INPUT_20_GOALS_LEGACY,
  lifestyleBuffer: 120,
  investmentsTarget: 20,
};

describe('computeAllocation — legacy single-pool path', () => {
  bench('20 goals — cold', () => {
    computeAllocation(INPUT_20_GOALS_LEGACY);
  });
});

describe('computeAllocation — 3-pool model', () => {
  beforeAll(() => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_3POOL_MODEL', 'true');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  bench('20 goals — cold', () => {
    computeAllocation(INPUT_20_GOALS_3POOL);
  });

  bench('20 goals warm with 5 overrides', () => {
    const overrides: Record<string, number> = {};
    for (let i = 0; i < 5; i++) {
      overrides[`bench-goal-${i}`] = 10 + i * 2;
    }
    computeAllocation({ ...INPUT_20_GOALS_3POOL, userOverrides: overrides });
  });
});
