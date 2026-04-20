/**
 * Goals Client — Supabase CRUD (Sprint 1.5.2 WP-G)
 *
 * Thin CRUD layer for the `goals` table. Independent from the onboarding-plan
 * client which handles the full plan+goals+allocations batch insert.
 * Used by /dashboard/goals page for inline add/edit/delete.
 */

import { createClient } from '@/utils/supabase/client';
import type { PriorityRank, GoalType } from '@/types/onboarding-plan';

// =============================================================================
// Types
// =============================================================================

export interface Goal {
  id: string;
  name: string;
  /** Null for openended goals (no hard target). WP-K. */
  target: number | null;
  current: number;
  deadline: string | null;
  priority: PriorityRank;
  monthlyAllocation: number;
  status: string;
  /** DB type field: 'fixed' | 'openended'. Defaults to 'fixed'. WP-K. */
  type: GoalType;
}

export interface GoalInput {
  name: string;
  /** Null for openended goals. */
  target: number | null;
  deadline: string | null;
  priority: PriorityRank;
  monthlyAllocation?: number;
  type?: GoalType;
}

export class GoalsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'GoalsApiError';
  }
}

// =============================================================================
// Client
// =============================================================================

export const goalsClient = {
  /**
   * Load all ACTIVE goals for a user.
   */
  async loadGoals(userId: string): Promise<Goal[]> {
    if (!userId) throw new GoalsApiError('userId is required', 400);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .select('id, name, target, current, deadline, priority, monthly_allocation, status, type')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('priority', { ascending: true });

    if (error) throw new GoalsApiError(error.message, 500, error);

    return (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      target: g.target !== null ? Number(g.target) : null,
      current: Number(g.current),
      deadline: g.deadline,
      priority: g.priority as PriorityRank,
      monthlyAllocation: Number(g.monthly_allocation),
      status: g.status,
      type: (g.type ?? 'fixed') as GoalType,
    }));
  },

  /**
   * Add a new goal for a user.
   */
  async addGoal(userId: string, goal: GoalInput): Promise<Goal> {
    if (!userId) throw new GoalsApiError('userId is required', 400);
    if (!goal.name?.trim()) throw new GoalsApiError('Goal name is required', 400);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        name: goal.name.trim(),
        target: goal.target,
        current: 0,
        deadline: goal.deadline,
        priority: goal.priority,
        monthly_allocation: goal.monthlyAllocation ?? 0,
        status: 'ACTIVE' as const,
        type: goal.type ?? 'fixed',
      })
      .select('id, name, target, current, deadline, priority, monthly_allocation, status, type')
      .single();

    if (error || !data) throw new GoalsApiError(error?.message ?? 'Failed to add goal', 500, error);

    return {
      id: data.id,
      name: data.name,
      target: data.target !== null ? Number(data.target) : null,
      current: Number(data.current),
      deadline: data.deadline,
      priority: data.priority as PriorityRank,
      monthlyAllocation: Number(data.monthly_allocation),
      status: data.status,
      type: (data.type ?? 'fixed') as GoalType,
    };
  },

  /**
   * Update fields on an existing goal.
   */
  async updateGoal(goalId: string, patch: Partial<GoalInput>): Promise<Goal> {
    if (!goalId) throw new GoalsApiError('goalId is required', 400);

    const supabase = createClient();

    const { data, error } = await supabase
      .from('goals')
      .update({
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.target !== undefined ? { target: patch.target } : {}),
        ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.monthlyAllocation !== undefined ? { monthly_allocation: patch.monthlyAllocation } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
      })
      .eq('id', goalId)
      .select('id, name, target, current, deadline, priority, monthly_allocation, status, type')
      .single();

    if (error || !data) throw new GoalsApiError(error?.message ?? 'Failed to update goal', 500, error);

    return {
      id: data.id,
      name: data.name,
      target: data.target !== null ? Number(data.target) : null,
      current: Number(data.current),
      deadline: data.deadline,
      priority: data.priority as PriorityRank,
      monthlyAllocation: Number(data.monthly_allocation),
      status: data.status,
      type: (data.type ?? 'fixed') as GoalType,
    };
  },

  /**
   * Soft-delete: set status to ARCHIVED.
   */
  async deleteGoal(goalId: string): Promise<void> {
    if (!goalId) throw new GoalsApiError('goalId is required', 400);

    const supabase = createClient();
    const { error } = await supabase
      .from('goals')
      .update({ status: 'ARCHIVED' as const })
      .eq('id', goalId);

    if (error) throw new GoalsApiError(error.message, 500, error);
  },
};
