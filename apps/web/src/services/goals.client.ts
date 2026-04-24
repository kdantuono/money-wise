/**
 * Goals Client — Supabase CRUD (Sprint 1.5.2 WP-G)
 *
 * Thin CRUD layer for the `goals` table. Independent from the onboarding-plan
 * client which handles the full plan+goals+allocations batch insert.
 * Used by /dashboard/goals page for inline add/edit/delete.
 */

import { createClient } from '@/utils/supabase/client';
import type { PriorityRank, GoalType, GoalStatus } from '@/types/onboarding-plan';

// =============================================================================
// Types
// =============================================================================

export interface Goal {
  id: string;
  name: string;
  /** Null for openended goals (no hard target). WP-K. */
  target: number | null;
  /**
   * Manual baseline (editable via GoalEditModal). Persisted in `goals.current`.
   * Per goal non-linked a account/liability = unico source of progress (fallback
   * Fase 2C). Per goal linked = offset manuale (es. "aggiungi €500 già
   * risparmiati fuori dal conto").
   */
  current: number;
  /**
   * Sprint 1.6.6 Fase 3a (#043): computed effective progress.
   * Formula (via VIEW `goals_with_progress`):
   *   current + SUM(accounts.current_balance WHERE goal_id=g.id)
   *           - SUM(liabilities.current_balance WHERE goal_id=g.id)
   * UI usa questo per progress bar + "a che punto sei". Manual edit aggiorna
   * `current`; effective si ricalcola automaticamente post-balance change.
   */
  currentEffective: number;
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
  /** Sprint 1.6 Fase 2C: current progress editable manual. Fallback quando
   * goal non è linked a account (auto-sync da balance). Validation
   * UI-side: 0 <= current <= target (se target non-null).
   */
  current?: number;
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
   * Load goals for a user, filtered by status.
   *
   * Default filter = ['ACTIVE'] per backward-compat con caller legacy.
   * Per #058 archive/completed flow: pass ['ACTIVE','COMPLETED'] per mostrare
   * entrambi nella dashboard principale, o ['ARCHIVED'] per view archivio.
   */
  async loadGoals(
    userId: string,
    opts?: { statuses?: GoalStatus[] },
  ): Promise<Goal[]> {
    if (!userId) throw new GoalsApiError('userId is required', 400);

    const statuses = opts?.statuses ?? ['ACTIVE'];

    const supabase = createClient();
    // Sprint 1.6.6 Fase 3a (#043): query goals_with_progress VIEW per ottenere
    // effective_current (manual + linked accounts - linked liabilities).
    // Cast VIEW non presente in Database types (da rigenerare post-merge via
    // `supabase gen types`). Cast esplicito tipizzato per row shape.
    type GoalWithProgressRow = {
      id: string;
      name: string;
      target: number | null;
      current: number;
      effective_current: number;
      deadline: string | null;
      priority: number;
      monthly_allocation: number;
      status: string;
      type: string | null;
    };
    // Copilot review #536 fix: cast esplicito tipizzato sul result preserva
    // sia `data: GoalWithProgressRow[]` che `error`. `.from as any` è
    // limitato a bypass string name check (VIEW non in schema types), il
    // result è tipizzato.
    const { data, error } = (await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any)('goals_with_progress')
        .select('id, name, target, current, effective_current, deadline, priority, monthly_allocation, status, type')
        .eq('user_id', userId)
        .in('status', statuses)
        .order('priority', { ascending: true })
    )) as {
      data: GoalWithProgressRow[] | null;
      error: { message: string; code?: string } | null;
    };

    if (error) throw new GoalsApiError(error.message, 500, error);

    return ((data ?? []) as GoalWithProgressRow[]).map((g) => ({
      id: g.id,
      name: g.name,
      target: g.target !== null ? Number(g.target) : null,
      current: Number(g.current),
      currentEffective: Number(g.effective_current),
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
        // Sprint 1.6 Fase 2C Copilot round 1: persist user-entered current (default 0
        // per backward-compat). Clamp UI-side [0, target] già applicato in GoalEditModal.
        current: Math.max(0, goal.current ?? 0),
        deadline: goal.deadline,
        priority: goal.priority,
        monthly_allocation: goal.monthlyAllocation ?? 0,
        status: 'ACTIVE' as const,
        type: goal.type ?? 'fixed',
      })
      .select('id, name, target, current, deadline, priority, monthly_allocation, status, type')
      .single();

    if (error || !data) throw new GoalsApiError(error?.message ?? 'Failed to add goal', 500, error);

    // #043: goal appena creato non ha ancora linked accounts/liabilities,
    // currentEffective === current. Evita re-query VIEW per latency.
    return {
      id: data.id,
      name: data.name,
      target: data.target !== null ? Number(data.target) : null,
      current: Number(data.current),
      currentEffective: Number(data.current),
      deadline: data.deadline,
      priority: data.priority as PriorityRank,
      monthlyAllocation: Number(data.monthly_allocation),
      status: data.status,
      type: (data.type ?? 'fixed') as GoalType,
    };
  },

  /**
   * Update fields on an existing goal.
   *
   * #058: auto-completion detection — se patch causes `current >= target` e
   * status era ACTIVE e target non-null → mark COMPLETED. Trigger lato client
   * (no DB trigger richiesto). L'utente può poi archiviare manualmente.
   */
  async updateGoal(goalId: string, patch: Partial<GoalInput>): Promise<Goal> {
    if (!goalId) throw new GoalsApiError('goalId is required', 400);

    const supabase = createClient();

    // Fetch current state per evaluate auto-completion
    const { data: existing, error: fetchErr } = await supabase
      .from('goals')
      .select('status, target, current')
      .eq('id', goalId)
      .single();

    if (fetchErr || !existing) throw new GoalsApiError(fetchErr?.message ?? 'Goal not found', 404, fetchErr);

    const updatePayload: Record<string, unknown> = {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.target !== undefined ? { target: patch.target } : {}),
      ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.monthlyAllocation !== undefined ? { monthly_allocation: patch.monthlyAllocation } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      // Sprint 1.6 Fase 2C: current editable manual
      ...(patch.current !== undefined ? { current: patch.current } : {}),
    };

    // #058: auto-completion — trigger solo se ACTIVE + target fixed + nuovo current >= target
    const newCurrent = patch.current ?? (existing.current as number);
    const newTarget = patch.target !== undefined ? patch.target : existing.target;
    if (
      existing.status === 'ACTIVE' &&
      newTarget !== null &&
      (newTarget as number) > 0 &&
      newCurrent >= (newTarget as number)
    ) {
      updatePayload.status = 'COMPLETED';
    }

    // Type-safe update with explicit cast (mirror pattern accounts.client.ts)
    const { data, error } = await (supabase
      .from('goals')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update as any)(updatePayload)
      .eq('id', goalId)
      .select('id, name, target, current, deadline, priority, monthly_allocation, status, type')
      .single();

    if (error || !data) throw new GoalsApiError(error?.message ?? 'Failed to update goal', 500, error);

    // #043: re-query VIEW per ottenere effective_current aggiornato (goal può
    // avere linked accounts/liabilities — dopo update `current`, effective cambia).
    // Copilot review #536 fix: capture + log error (non throw: UPDATE riuscito,
    // re-query miss è fallback accettabile a `data.current`). Il caller può
    // re-caricare manualmente via loadGoals se effective stale.
    const { data: viewData, error: viewError } = (await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any)('goals_with_progress')
        .select('effective_current')
        .eq('id', goalId)
        .single()
    )) as {
      data: { effective_current: number } | null;
      error: { message: string; code?: string } | null;
    };

    if (viewError) {
      console.warn('[goalsClient.updateGoal] VIEW re-query failed, falling back to manual current:', viewError.message);
    }

    return {
      id: data.id,
      name: data.name,
      target: data.target !== null ? Number(data.target) : null,
      current: Number(data.current),
      currentEffective: viewData ? Number(viewData.effective_current) : Number(data.current),
      deadline: data.deadline,
      priority: data.priority as PriorityRank,
      monthlyAllocation: Number(data.monthly_allocation),
      status: data.status,
      type: (data.type ?? 'fixed') as GoalType,
    };
  },

  /**
   * Soft-delete: set status to ARCHIVED.
   * #058: kept as primary "delete" — semantically equivalent to archive.
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

  /**
   * #058: Archive a goal (typically used per goal COMPLETED → ARCHIVED
   * transition, o user click "Archivia").
   */
  async archiveGoal(goalId: string): Promise<void> {
    if (!goalId) throw new GoalsApiError('goalId is required', 400);

    const supabase = createClient();
    const { error } = await supabase
      .from('goals')
      .update({ status: 'ARCHIVED' as const })
      .eq('id', goalId);

    if (error) throw new GoalsApiError(error.message, 500, error);
  },

  /**
   * #058: Reactivate an archived goal → ACTIVE.
   */
  async reactivateGoal(goalId: string): Promise<void> {
    if (!goalId) throw new GoalsApiError('goalId is required', 400);

    const supabase = createClient();
    const { error } = await supabase
      .from('goals')
      .update({ status: 'ACTIVE' as const })
      .eq('id', goalId);

    if (error) throw new GoalsApiError(error.message, 500, error);
  },

  /**
   * #058: Archive all COMPLETED goals for a user in bulk.
   * Returns count archived.
   */
  async archiveAllCompleted(userId: string): Promise<number> {
    if (!userId) throw new GoalsApiError('userId is required', 400);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .update({ status: 'ARCHIVED' as const })
      .eq('user_id', userId)
      .eq('status', 'COMPLETED')
      .select('id');

    if (error) throw new GoalsApiError(error.message, 500, error);

    return (data ?? []).length;
  },
};
