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

/**
 * Caller-supplied fields for plan persistence.
 * `incomeAfterEssentials` is NOT accepted — it is derived inside persistPlan
 * to guarantee the stored snapshot is always internally consistent with the
 * supplied monthlyIncome + essentialsPct (per Copilot review PR #455: caller
 * could compute it differently and persist an inconsistent record).
 */
export interface PersistPlanInput {
  plan: {
    monthlyIncome: number;
    monthlySavingsTarget: number;
    essentialsPct: number;
  };
  goals: Array<{
    name: string;
    /** 'fixed' (has target) | 'openended' (receives surplus). Issue #464. */
    type: 'fixed' | 'openended';
    /** null when type='openended'. */
    target: number | null;
    deadline: string | null;
    priority: PriorityRank;
    monthlyAllocation: number;
    allocation: {
      monthlyAmount: number;
      deadlineFeasible: boolean;
      reasoning: string;
    };
  }>;
  aiPreferences: {
    enableAiCategorization: boolean;
    enableAiInsights: boolean;
  };
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
   * Persist a full onboarding plan (replace-on-exist semantics).
   *
   * Behavior:
   * 1. If user already has a plan, delete it first (cascades goal_allocations
   *    via FK) + cleanup orphan goals by user_id. This supports the "Modifica
   *    piano" flow: user re-runs wizard, previous plan is replaced.
   * 2. Insert new plan → get plan.id.
   * 3. Insert goals sequentially, capturing each returned id explicitly (avoids
   *    PostgREST bulk-insert order-guarantee assumptions — Copilot review PR #455).
   * 4. Insert goal_allocations bulk with properly-matched goal_id per-item.
   * 5. Best-effort rollback on any failure.
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

    // 0. Replace-on-exist: delete prior plan (cascades allocations) + orphan goals.
    // `plans.user_id` is UNIQUE so at most one plan per user; this gives "Modifica piano" semantics.
    const { data: existingPlan, error: existingErr } = await supabase
      .from('plans')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingErr) {
      throw new OnboardingPlanApiError(existingErr.message, 500, existingErr);
    }

    if (existingPlan) {
      // Cascade: plan.delete → goal_allocations deleted (FK ON DELETE CASCADE)
      // Check errors: if DELETE fails, subsequent INSERT would hit UNIQUE(user_id).
      const { error: planDelErr } = await supabase
        .from('plans')
        .delete()
        .eq('id', existingPlan.id);
      if (planDelErr) {
        throw new OnboardingPlanApiError(
          `Failed to delete existing plan: ${planDelErr.message}`,
          500,
          planDelErr,
        );
      }
      // Orphan goals cleanup (goals FK is to profiles, not plans)
      const { error: goalsDelErr } = await supabase
        .from('goals')
        .delete()
        .eq('user_id', userId);
      if (goalsDelErr) {
        throw new OnboardingPlanApiError(
          `Failed to cleanup existing goals: ${goalsDelErr.message}`,
          500,
          goalsDelErr,
        );
      }
    }

    // Derive incomeAfterEssentials internally (Copilot review PR #455 — caller
    // must not supply it; previous code accepted it and risked inconsistent
    // snapshot if caller's compute differed).
    const incomeAfterEssentials =
      input.plan.monthlyIncome * (1 - input.plan.essentialsPct / 100);

    // 1. Insert plan
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        monthly_income: input.plan.monthlyIncome,
        monthly_savings_target: input.plan.monthlySavingsTarget,
        essentials_pct: input.plan.essentialsPct,
        income_after_essentials: incomeAfterEssentials,
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

    // 2. Insert goals SEQUENTIALLY — capture each returned id explicitly.
    // Bulk .insert([arr]).select() response order is not part of PostgREST's
    // public guarantee; sequential insert + explicit id capture is the safe path.
    const insertedGoalIds: string[] = [];
    for (let i = 0; i < input.goals.length; i++) {
      const g = input.goals[i]!;
      const { data: goalRow, error: goalErr } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          name: g.name,
          type: g.type,
          // target: null is valid for openended goals (migration 20260420000000)
          target: g.target,
          current: 0,
          deadline: g.deadline,
          priority: g.priority,
          monthly_allocation: g.monthlyAllocation,
          status: 'ACTIVE' as const,
        })
        .select('id')
        .single();

      if (goalErr || !goalRow) {
        // Rollback: delete plan + any goals inserted so far
        await supabase.from('plans').delete().eq('id', plan.id);
        if (insertedGoalIds.length > 0) {
          await supabase.from('goals').delete().in('id', insertedGoalIds);
        }
        throw new OnboardingPlanApiError(
          goalErr?.message || `Failed to insert goal at index ${i}`,
          500,
          goalErr,
        );
      }
      insertedGoalIds.push(goalRow.id);
    }

    // 3. Insert goal_allocations bulk with explicitly-matched goal ids
    const allocRows = input.goals.map((g, idx) => ({
      plan_id: plan.id,
      goal_id: insertedGoalIds[idx]!,
      monthly_amount: g.allocation.monthlyAmount,
      deadline_feasible: g.allocation.deadlineFeasible,
      reasoning: g.allocation.reasoning,
    }));

    const { error: allocErr } = await supabase.from('goal_allocations').insert(allocRows);

    if (allocErr) {
      // Rollback: delete plan (cascades partial allocations) + inserted goals
      await supabase.from('plans').delete().eq('id', plan.id);
      await supabase.from('goals').delete().in('id', insertedGoalIds);
      throw new OnboardingPlanApiError(
        allocErr.message || 'Failed to insert goal_allocations',
        500,
        allocErr,
      );
    }

    // 4. Merge AI preferences into profiles.preferences, then flip onboarded = true.
    // Fetch existing preferences first to avoid clobbering other preference keys
    // (e.g. theme, notifications). Merge under the 'ai' sub-key, then UPDATE in
    // a single round-trip (Copilot review PR #459: two separate UPDATEs risk race).
    const { data: profileRow, error: profFetchErr } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (profFetchErr) {
      throw new OnboardingPlanApiError(
        `Failed to load preferences for merge: ${profFetchErr.message}`,
        500,
        profFetchErr,
      );
    }

    const mergedPreferences = {
      ...((profileRow?.preferences as Record<string, unknown>) || {}),
      ai: {
        enableAiCategorization: input.aiPreferences.enableAiCategorization,
        enableAiInsights: input.aiPreferences.enableAiInsights,
      },
    };

    const { error: onboardedErr } = await supabase
      .from('profiles')
      .update({ onboarded: true, preferences: mergedPreferences })
      .eq('id', userId);

    if (onboardedErr) {
      // Non-fatal from a data-integrity perspective (plan + goals already saved),
      // but the gate will redirect again on next visit. Throw so the caller can
      // surface the error and the user retries rather than silently ending up in
      // a redirect loop.
      throw new OnboardingPlanApiError(
        `Piano salvato ma impossibile aggiornare profilo: ${onboardedErr.message}`,
        500,
        onboardedErr,
      );
    }

    return {
      planId: plan.id,
      goalIds: insertedGoalIds,
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
      /** 'fixed' | 'openended'. Issue #464. */
      type: 'fixed' | 'openended';
      /** null when type='openended'. */
      target: number | null;
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
      .select('id, name, type, target, current, deadline, priority, monthly_allocation, status')
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
        type: (g.type ?? 'fixed') as 'fixed' | 'openended',
        target: g.target !== null ? Number(g.target) : null,
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
