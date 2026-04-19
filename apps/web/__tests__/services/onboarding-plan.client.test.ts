/**
 * Tests for onboarding-plan.client (Sprint 1.5 — Bug #3).
 *
 * Key behaviors covered:
 *  - persistPlan happy path (no existing plan)
 *  - persistPlan replace-on-exist (DELETE plan + orphan goals then INSERT)
 *  - persistPlan rollback on goal insert failure (plan + partial goals deleted)
 *  - persistPlan rollback on allocation insert failure (plan + goals deleted)
 *  - persistPlan validation: empty userId, empty goals
 *  - persistPlan DELETE error handling (Copilot review fix)
 *  - incomeAfterEssentials derived internally = monthlyIncome × (1 - pct/100)
 *  - loadPlan happy path returns {plan, goals, allocations}
 *  - loadPlan returns null when no plan exists
 *  - loadPlan wraps errors into OnboardingPlanApiError
 *
 * Mock strategy: per-table chain dispatcher. `from(table)` returns a table-specific
 * chain with queueable responses (.mockResolvedValueOnce). Each terminal method
 * (`.single`, `.maybeSingle`, or the insert/delete promise itself) is queued in
 * call order. `from()` call log is the source of truth for assertions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --------------------------------------------------------------------------
// Per-table chain factory
// --------------------------------------------------------------------------
type Resolvable = { data?: unknown; error?: unknown } | Error;

function makeChain() {
  const chain: any = {};
  // Terminal resolvers
  chain.single = vi.fn();
  chain.maybeSingle = vi.fn();

  // Pass-through chainables — default they return `chain` itself so calls compose
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);

  // Insert and delete in the client's call patterns:
  //   1) plans.insert(...).select('id').single()                 → .single terminal
  //   2) goals.insert(...).select('id').single()                  → .single terminal
  //   3) goal_allocations.insert(rows) — awaited directly (no .select)
  //   4) plans.delete().eq('id', x) — awaited directly
  //   5) goals.delete().eq('user_id', x) / .in('id', ids) — awaited directly
  //   6) plans.select('*').eq(...).maybeSingle()                  → .maybeSingle terminal
  //   7) goals.select(...).eq(...).eq(...).order(...) — awaited directly (array)
  //   8) goal_allocations.select(...).eq(...) — awaited directly (array)
  //
  // For cases (3), (4), (5), (7), (8): the last method in the chain must itself
  // be thenable. We track `_pendingResolutions` on insert/delete/select/eq/in
  // and attach .then at call time.

  const queues: Record<string, Resolvable[]> = {
    insert: [],
    delete: [],
    directSelect: [], // when select(...).eq(...) resolves directly
  };

  chain.insert = vi.fn((_payload: unknown) => {
    const next = queues.insert.shift();
    // Return a chainable that also has .then → resolves to next
    const thenable: any = {
      select: vi.fn(() => ({
        single: vi.fn().mockImplementation(() => {
          if (!next) throw new Error('insert queue empty in single()');
          if (next instanceof Error) return Promise.reject(next);
          return Promise.resolve(next);
        }),
      })),
      then: (onFulfilled: any, onRejected?: any) => {
        if (!next) return Promise.reject(new Error('insert queue empty in then()'));
        if (next instanceof Error) return Promise.reject(next).then(onFulfilled, onRejected);
        return Promise.resolve(next).then(onFulfilled, onRejected);
      },
    };
    return thenable;
  });

  chain.delete = vi.fn(() => {
    const next = queues.delete.shift();
    const thenable: any = {
      eq: vi.fn(() => thenable),
      in: vi.fn(() => thenable),
      then: (onFulfilled: any, onRejected?: any) => {
        if (!next) return Promise.reject(new Error('delete queue empty')).then(onFulfilled, onRejected);
        if (next instanceof Error) return Promise.reject(next).then(onFulfilled, onRejected);
        return Promise.resolve(next).then(onFulfilled, onRejected);
      },
    };
    return thenable;
  });

  // For plain array selects like loadPlan goals & allocations — chain.order and chain.eq
  // need to be thenable when no further method is called.
  chain.__queueDirectSelect = (r: Resolvable) => queues.directSelect.push(r);
  const applyDirectSelectThen = (obj: any) => {
    obj.then = (onFulfilled: any, onRejected?: any) => {
      const next = queues.directSelect.shift();
      if (!next) return Promise.reject(new Error('directSelect queue empty')).then(onFulfilled, onRejected);
      if (next instanceof Error) return Promise.reject(next).then(onFulfilled, onRejected);
      return Promise.resolve(next).then(onFulfilled, onRejected);
    };
    return obj;
  };
  chain.order = vi.fn(() => applyDirectSelectThen({ ...chain }));

  // Helpers to queue responses for tests
  chain.__queueInsert = (r: Resolvable) => queues.insert.push(r);
  chain.__queueDelete = (r: Resolvable) => queues.delete.push(r);

  return chain;
}

let plansChain: ReturnType<typeof makeChain>;
let goalsChain: ReturnType<typeof makeChain>;
let allocChain: ReturnType<typeof makeChain>;
let profilesChain: ReturnType<typeof makeChain>;

const fromMock = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

import { onboardingPlanClient, OnboardingPlanApiError } from '@/services/onboarding-plan.client';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const INPUT_BASE = {
  plan: {
    monthlyIncome: 3000,
    monthlySavingsTarget: 500,
    essentialsPct: 50,
  },
  goals: [
    {
      name: 'Fondo Emergenza',
      target: 5000,
      deadline: '2027-01-01',
      priority: 1 as const,
      monthlyAllocation: 300,
      allocation: {
        monthlyAmount: 300,
        deadlineFeasible: true,
        reasoning: 'Priorità 1 urgency',
      },
    },
    {
      name: 'Vacanza',
      target: 2000,
      deadline: null,
      priority: 2 as const,
      monthlyAllocation: 200,
      allocation: {
        monthlyAmount: 200,
        deadlineFeasible: true,
        reasoning: 'Priorità 2 base',
      },
    },
  ],
};

beforeEach(() => {
  plansChain = makeChain();
  goalsChain = makeChain();
  allocChain = makeChain();
  // profiles: used for UPDATE profiles SET onboarded=true after plan persisted.
  // Pattern: .update({...}).eq('id', userId) — same shape as delete chain.
  profilesChain = makeChain();
  // Default profilesChain update to succeed (no-error) for happy-path tests.
  // Tests that need to override can queue their own via profilesChain.__queueDelete.
  profilesChain.update = vi.fn(() => {
    const queued = profilesChain._defaultUpdateResult ?? { data: null, error: null };
    const thenable: any = {
      eq: vi.fn(() => ({
        then: (onFulfilled: any, onRejected?: any) =>
          Promise.resolve(queued).then(onFulfilled, onRejected),
      })),
    };
    return thenable;
  });
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) => {
    if (table === 'plans') return plansChain;
    if (table === 'goals') return goalsChain;
    if (table === 'goal_allocations') return allocChain;
    if (table === 'profiles') return profilesChain;
    throw new Error(`Unexpected table: ${table}`);
  });
});

// =============================================================================
// persistPlan — validation
// =============================================================================
describe('onboardingPlanClient.persistPlan — validation', () => {
  it('throws 400 when userId is empty', async () => {
    await expect(
      onboardingPlanClient.persistPlan('', INPUT_BASE)
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 400,
      message: expect.stringContaining('userId'),
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('throws 400 when goals array is empty', async () => {
    await expect(
      onboardingPlanClient.persistPlan(USER_ID, { ...INPUT_BASE, goals: [] })
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 400,
      message: expect.stringContaining('goal'),
    });
    expect(fromMock).not.toHaveBeenCalled();
  });
});

// =============================================================================
// persistPlan — happy path
// =============================================================================
describe('onboardingPlanClient.persistPlan — happy path', () => {
  it('inserts plan + goals + allocations when no existing plan, returning ids', async () => {
    // Pre-existence check: no plan
    plansChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Insert plan
    plansChain.__queueInsert({ data: { id: 'plan-uuid' }, error: null });
    // Insert 2 goals sequentially
    goalsChain.__queueInsert({ data: { id: 'goal-uuid-1' }, error: null });
    goalsChain.__queueInsert({ data: { id: 'goal-uuid-2' }, error: null });
    // Insert allocations (no .select, awaited directly)
    allocChain.__queueInsert({ data: null, error: null });

    const result = await onboardingPlanClient.persistPlan(USER_ID, INPUT_BASE);

    expect(result).toEqual({
      planId: 'plan-uuid',
      goalIds: ['goal-uuid-1', 'goal-uuid-2'],
    });

    // Plans insert payload contains derived incomeAfterEssentials
    const plansInsertArg = plansChain.insert.mock.calls[0]![0] as {
      monthly_income: number;
      essentials_pct: number;
      income_after_essentials: number;
    };
    expect(plansInsertArg.monthly_income).toBe(3000);
    expect(plansInsertArg.essentials_pct).toBe(50);
    // 3000 * (1 - 50/100) = 1500
    expect(plansInsertArg.income_after_essentials).toBe(1500);
  });

  it('derives incomeAfterEssentials from input regardless of caller math (25% → 2250)', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    plansChain.__queueInsert({ data: { id: 'plan-u2' }, error: null });
    goalsChain.__queueInsert({ data: { id: 'g1' }, error: null });
    goalsChain.__queueInsert({ data: { id: 'g2' }, error: null });
    allocChain.__queueInsert({ data: null, error: null });

    await onboardingPlanClient.persistPlan(USER_ID, {
      ...INPUT_BASE,
      plan: { monthlyIncome: 3000, monthlySavingsTarget: 500, essentialsPct: 25 },
    });

    const plansInsertArg = plansChain.insert.mock.calls[0]![0] as { income_after_essentials: number };
    expect(plansInsertArg.income_after_essentials).toBe(2250);
  });
});

// =============================================================================
// persistPlan — replace-on-exist
// =============================================================================
describe('onboardingPlanClient.persistPlan — replace-on-exist', () => {
  it('deletes existing plan and orphan goals, then inserts fresh', async () => {
    // Pre-existence check: plan EXISTS
    plansChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'old-plan' }, error: null });
    // DELETE plan succeeds
    plansChain.__queueDelete({ error: null });
    // DELETE orphan goals succeeds
    goalsChain.__queueDelete({ error: null });
    // Fresh insert pipeline
    plansChain.__queueInsert({ data: { id: 'new-plan-uuid' }, error: null });
    goalsChain.__queueInsert({ data: { id: 'new-g1' }, error: null });
    goalsChain.__queueInsert({ data: { id: 'new-g2' }, error: null });
    allocChain.__queueInsert({ data: null, error: null });

    const result = await onboardingPlanClient.persistPlan(USER_ID, INPUT_BASE);

    expect(result.planId).toBe('new-plan-uuid');
    expect(result.goalIds).toEqual(['new-g1', 'new-g2']);
    // delete was called on plans AND goals
    expect(plansChain.delete).toHaveBeenCalledTimes(1);
    expect(goalsChain.delete).toHaveBeenCalledTimes(1);
  });

  it('throws when DELETE of existing plan fails (Copilot review fix)', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'old-plan' }, error: null });
    plansChain.__queueDelete({ error: { message: 'FK violation' } });

    await expect(
      onboardingPlanClient.persistPlan(USER_ID, INPUT_BASE)
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 500,
      message: expect.stringContaining('delete existing plan'),
    });
    // INSERT must NOT have been attempted
    expect(plansChain.insert).not.toHaveBeenCalled();
  });

  it('throws when pre-existence SELECT fails', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS denied' },
    });

    await expect(
      onboardingPlanClient.persistPlan(USER_ID, INPUT_BASE)
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 500,
      message: expect.stringContaining('RLS denied'),
    });
  });
});

// =============================================================================
// persistPlan — rollback paths
// =============================================================================
describe('onboardingPlanClient.persistPlan — rollback', () => {
  it('rolls back (deletes plan + partial goals) when a goal insert fails mid-loop', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    plansChain.__queueInsert({ data: { id: 'plan-r1' }, error: null });
    // First goal OK, second FAILS
    goalsChain.__queueInsert({ data: { id: 'g-ok' }, error: null });
    goalsChain.__queueInsert({ data: null, error: { message: 'UNIQUE violation' } });
    // Rollback queue: delete plan, delete partial goals
    plansChain.__queueDelete({ error: null });
    goalsChain.__queueDelete({ error: null });

    await expect(
      onboardingPlanClient.persistPlan(USER_ID, INPUT_BASE)
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 500,
      message: expect.stringContaining('UNIQUE violation'),
    });

    expect(plansChain.delete).toHaveBeenCalledTimes(1);
    expect(goalsChain.delete).toHaveBeenCalledTimes(1);
  });

  it('rolls back when allocation insert fails', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    plansChain.__queueInsert({ data: { id: 'plan-r2' }, error: null });
    goalsChain.__queueInsert({ data: { id: 'g1' }, error: null });
    goalsChain.__queueInsert({ data: { id: 'g2' }, error: null });
    // Allocation insert FAILS
    allocChain.__queueInsert({ data: null, error: { message: 'FK plan_id' } });
    // Rollback: delete plan + all goals
    plansChain.__queueDelete({ error: null });
    goalsChain.__queueDelete({ error: null });

    await expect(
      onboardingPlanClient.persistPlan(USER_ID, INPUT_BASE)
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 500,
      message: expect.stringContaining('FK plan_id'),
    });

    expect(plansChain.delete).toHaveBeenCalledTimes(1);
    expect(goalsChain.delete).toHaveBeenCalledTimes(1);
  });

  it('throws when plan insert fails (no rollback needed — nothing was committed)', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    plansChain.__queueInsert({ data: null, error: { message: 'CHECK essentials_pct' } });

    await expect(
      onboardingPlanClient.persistPlan(USER_ID, INPUT_BASE)
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 500,
      message: expect.stringContaining('CHECK essentials_pct'),
    });
    // No goal or allocation inserts attempted
    expect(goalsChain.insert).not.toHaveBeenCalled();
    expect(allocChain.insert).not.toHaveBeenCalled();
  });
});

// =============================================================================
// loadPlan
// =============================================================================
describe('onboardingPlanClient.loadPlan', () => {
  it('returns null when no plan exists', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await onboardingPlanClient.loadPlan(USER_ID);
    expect(result).toBeNull();
  });

  it('returns {plan, goals, allocations} when plan exists', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'plan-L1',
        monthly_income: 3000,
        monthly_savings_target: 500,
        essentials_pct: 50,
        income_after_essentials: 1500,
      },
      error: null,
    });
    // goals.select(...).eq(...).eq(...).order(...) resolves array directly
    goalsChain.__queueDirectSelect({
      data: [
        {
          id: 'g-L1',
          name: 'Fondo',
          target: 5000,
          current: 0,
          deadline: '2027-01-01',
          priority: 1,
          monthly_allocation: 300,
          status: 'ACTIVE',
        },
      ],
      error: null,
    });
    // goal_allocations.select(...).eq(...) resolves array directly
    // The client calls chain.eq after select; chain.eq returns chain, which is not thenable by default.
    // Add thenable on chain.eq for allocChain here:
    (allocChain.eq as any).mockImplementationOnce(() => ({
      then: (onFulfilled: any, onRejected?: any) => {
        return Promise.resolve({
          data: [
            {
              goal_id: 'g-L1',
              monthly_amount: 300,
              deadline_feasible: true,
              reasoning: 'prio 1',
            },
          ],
          error: null,
        }).then(onFulfilled, onRejected);
      },
    }));

    const result = await onboardingPlanClient.loadPlan(USER_ID);
    expect(result).not.toBeNull();
    expect(result!.plan.id).toBe('plan-L1');
    expect(result!.plan.monthlyIncome).toBe(3000);
    expect(result!.plan.incomeAfterEssentials).toBe(1500);
    expect(result!.goals).toHaveLength(1);
    expect(result!.goals[0]!.name).toBe('Fondo');
    expect(result!.allocations).toHaveLength(1);
    expect(result!.allocations[0]!.goalId).toBe('g-L1');
  });

  it('throws OnboardingPlanApiError when SELECT plan errors', async () => {
    plansChain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection lost' },
    });

    await expect(
      onboardingPlanClient.loadPlan(USER_ID)
    ).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 500,
      message: expect.stringContaining('connection lost'),
    });
  });

  it('throws 400 when userId is empty', async () => {
    await expect(onboardingPlanClient.loadPlan('')).rejects.toMatchObject({
      name: 'OnboardingPlanApiError',
      statusCode: 400,
    });
    expect(fromMock).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Error class sanity
// =============================================================================
describe('OnboardingPlanApiError', () => {
  it('carries message, statusCode, details and is an Error instance', () => {
    const err = new OnboardingPlanApiError('boom', 500, { x: 1 });
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(500);
    expect(err.details).toEqual({ x: 1 });
    expect(err.name).toBe('OnboardingPlanApiError');
    expect(err).toBeInstanceOf(Error);
  });
});
