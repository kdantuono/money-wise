/**
 * Onboarding Plan Client — Supabase
 *
 * Persists the Sprint 1.5 "Piano Generato" output (income + savings + goals +
 * allocations) into the `plans` + `goals` + `goal_allocations` tables.
 *
 * Transactional strategy (Sprint 1.5 MVP):
 *  1. INSERT plan → get plan.id
 *  2. INSERT goals[] bulk → get goal.ids in input order
 *  3. INSERT goal_allocations[] bulk using plan.id + goal.ids
 *  4. Best-effort rollback on any failure (DELETE plan cascades to allocations;
 *     orphan goals deleted by id list). For ACID-true atomicity, future work
 *     (Sprint 3) should wrap in a Postgres RPC function.
 *
 * @module services/onboarding-plan.client
 */

import { createClient } from '@/utils/supabase/client';
import type { PriorityRank } from '@/types/onboarding-plan';

// =============================================================================
// Error class
// =============================================================================

export class OnboardingPlanApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'OnboardingPlanApiError';
  }
}

// =============================================================================
// Input shape (decoupled from WizardState to allow caller to massage data)
// =============================================================================

export interface PersistPlanInput {
  plan: {
    monthlyIncome: number;
    monthlySavingsTarget: number;
    essentialsPct: number;
    incomeAfterEssentials: number;
  };
  goals: Array<{
    name: string;
    target: number;
    deadline: string | null;
    priority: PriorityRank;
    monthlyAllocation: number;
    allocation: {
      monthlyAmount: number;
      deadlineFeasible: boolean;
      reasoning: string;
    };
  }>;
}

export interface PersistPlanResult {
  planId: string;
  goalIds: string[];
}

// =============================================================================
// Client
// =============================================================================

export const onboardingPlanClient = {
  /**
   * Persist a full onboarding plan atomically (best-effort transaction).
   *
   * @throws {OnboardingPlanApiError} on validation or Supabase failure.
   */
  async persistPlan(userId: string, input: PersistPlanInput): Promise<PersistPlanResult> {
    if (!userId) {
      throw new OnboardingPlanApiError('userId is required', 400);
    }
    if (!input.goals || input.goals.length === 0) {
      throw new OnboardingPlanApiError('At least one goal is required', 400);
    }

    const supabase = createClient();

    // 1. Insert plan
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        monthly_income: input.plan.monthlyIncome,
        monthly_savings_target: input.plan.monthlySavingsTarget,
        essentials_pct: input.plan.essentialsPct,
        income_after_essentials: input.plan.incomeAfterEssentials,
      })
      .select('id')
      .single();

    if (planErr || !plan) {
      throw new OnboardingPlanApiError(
        planErr?.message || 'Failed to insert plan',
        500,
        planErr,
      );
    }

    // 2. Insert goals bulk (order preserved per PostgREST guarantee)
    const goalRows = input.goals.map((g) => ({
      user_id: userId,
      name: g.name,
      target: g.target,
      current: 0,
      deadline: g.deadline,
      priority: g.priority,
      monthly_allocation: g.monthlyAllocation,
      status: 'ACTIVE' as const,
    }));

    const { data: insertedGoals, error: goalsErr } = await supabase
      .from('goals')
      .insert(goalRows)
      .select('id');

    if (goalsErr || !insertedGoals || insertedGoals.length !== input.goals.length) {
      // Rollback plan (cascades via FK ON DELETE CASCADE to goal_allocations, but none yet)
      await supabase.from('plans').delete().eq('id', plan.id);
      throw new OnboardingPlanApiError(
        goalsErr?.message || 'Failed to insert goals (count mismatch)',
        500,
        goalsErr,
      );
    }

    // 3. Insert goal_allocations bulk
    const allocRows = input.goals.map((g, idx) => ({
      plan_id: plan.id,
      goal_id: insertedGoals[idx]!.id,
      monthly_amount: g.allocation.monthlyAmount,
      deadline_feasible: g.allocation.deadlineFeasible,
      reasoning: g.allocation.reasoning,
    }));

    const { error: allocErr } = await supabase.from('goal_allocations').insert(allocRows);

    if (allocErr) {
      // Rollback: delete plan (cascades any partial allocations) + delete inserted goals
      const insertedGoalIds = insertedGoals.map((g) => g.id);
      await supabase.from('plans').delete().eq('id', plan.id);
      await supabase.from('goals').delete().in('id', insertedGoalIds);
      throw new OnboardingPlanApiError(
        allocErr.message || 'Failed to insert goal_allocations',
        500,
        allocErr,
      );
    }

    return {
      planId: plan.id,
      goalIds: insertedGoals.map((g) => g.id),
    };
  },

  /**
   * Load the user's existing plan (for dashboard display + edit).
   * Returns null if no plan exists yet.
   */
  async loadPlan(userId: string): Promise<{
    plan: {
      id: string;
      monthlyIncome: number;
      monthlySavingsTarget: number;
      essentialsPct: number;
      incomeAfterEssentials: number;
    };
    goals: Array<{
      id: string;
      name: string;
      target: number;
      current: number;
      deadline: string | null;
      priority: PriorityRank;
      monthlyAllocation: number;
      status: string;
    }>;
    allocations: Array<{
      goalId: string;
      monthlyAmount: number;
      deadlineFeasible: boolean;
      reasoning: string | null;
    }>;
  } | null> {
    if (!userId) {
      throw new OnboardingPlanApiError('userId is required', 400);
    }

    const supabase = createClient();

    const { data: planRow, error: planErr } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (planErr) {
      throw new OnboardingPlanApiError(planErr.message, 500, planErr);
    }
    if (!planRow) return null;

    const { data: goalRows, error: goalsErr } = await supabase
      .from('goals')
      .select('id, name, target, current, deadline, priority, monthly_allocation, status')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('priority', { ascending: true });

    if (goalsErr || !goalRows) {
      throw new OnboardingPlanApiError(goalsErr?.message || 'Failed to load goals', 500, goalsErr);
    }

    const { data: allocRows, error: allocErr } = await supabase
      .from('goal_allocations')
      .select('goal_id, monthly_amount, deadline_feasible, reasoning')
      .eq('plan_id', planRow.id);

    if (allocErr || !allocRows) {
      throw new OnboardingPlanApiError(allocErr?.message || 'Failed to load allocations', 500, allocErr);
    }

    return {
      plan: {
        id: planRow.id,
        monthlyIncome: Number(planRow.monthly_income),
        monthlySavingsTarget: Number(planRow.monthly_savings_target),
        essentialsPct: Number(planRow.essentials_pct),
        incomeAfterEssentials: Number(planRow.income_after_essentials),
      },
      goals: goalRows.map((g) => ({
        id: g.id,
        name: g.name,
        target: Number(g.target),
        current: Number(g.current),
        deadline: g.deadline,
        priority: g.priority as PriorityRank,
        monthlyAllocation: Number(g.monthly_allocation),
        status: g.status,
      })),
      allocations: allocRows.map((a) => ({
        goalId: a.goal_id,
        monthlyAmount: Number(a.monthly_amount),
        deadlineFeasible: a.deadline_feasible,
        reasoning: a.reasoning,
      })),
    };
  },
};

export default onboardingPlanClient;
