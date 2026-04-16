/**
 * Budgets Client — Supabase
 *
 * Direct Supabase queries replacing BFF fetch calls.
 * RLS policies handle family/user isolation automatically.
 *
 * @module services/budgets.client
 */

import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/utils/supabase/database.types'

type BudgetRow = Database['public']['Tables']['budgets']['Row']
type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
type CategoryRow = Database['public']['Tables']['categories']['Row']

// =============================================================================
// Type Definitions (preserved for component compatibility)
// =============================================================================

export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type BudgetStatus = 'ACTIVE' | 'COMPLETED' | 'DRAFT';

/**
 * Progress status for UI color coding:
 * - safe: 0-79% spent (green)
 * - warning: 80-99% spent (orange)
 * - maxed: exactly 100% spent (yellow)
 * - over: 100%+ spent (red)
 */
export type ProgressStatus = 'safe' | 'warning' | 'maxed' | 'over';

export interface CategorySummary {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  category: CategorySummary;
  alertThresholds: number[];
  notes?: string | null;
  isOverBudget: boolean;
  progressStatus: ProgressStatus;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetListResponse {
  budgets: Budget[];
  total: number;
  overBudgetCount: number;
}

export interface CreateBudgetData {
  name: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  alertThresholds?: number[];
  notes?: string;
}

export interface UpdateBudgetData {
  name?: string;
  categoryId?: string;
  amount?: number;
  period?: BudgetPeriod;
  startDate?: string;
  endDate?: string;
  alertThresholds?: number[];
  notes?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

// =============================================================================
// Error Classes
// =============================================================================

export class BudgetsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BudgetsApiError';
    Object.setPrototypeOf(this, BudgetsApiError.prototype);
  }
}

export class AuthenticationError extends BudgetsApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends BudgetsApiError {
  constructor(
    message: string = 'You do not have permission to perform this action.'
  ) {
    super(message, 403, 'AuthorizationError');
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends BudgetsApiError {
  constructor(message: string = 'Budget not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends BudgetsApiError {
  constructor(message: string = 'Invalid request data.', details?: unknown) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ServerError extends BudgetsApiError {
  constructor(
    message: string = 'Internal server error. Please try again later.'
  ) {
    super(message, 500, 'ServerError');
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function computeProgressStatus(percentage: number): ProgressStatus {
  if (percentage > 100) return 'over';
  if (percentage === 100) return 'maxed';
  if (percentage >= 80) return 'warning';
  return 'safe';
}

type BudgetWithCategory = BudgetRow & {
  categories: Pick<CategoryRow, 'id' | 'name' | 'icon' | 'color'> | null;
}

function rowToBudget(row: BudgetWithCategory, spent: number): Budget {
  const amount = Number(row.amount);
  const remaining = Math.max(0, amount - spent);
  const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const now = new Date();
  const endDate = new Date(row.end_date);

  return {
    id: row.id,
    name: row.name,
    amount,
    spent,
    remaining,
    percentage,
    status: row.status as BudgetStatus,
    period: row.period as BudgetPeriod,
    startDate: row.start_date,
    endDate: row.end_date,
    category: row.categories
      ? { id: row.categories.id, name: row.categories.name, icon: row.categories.icon, color: row.categories.color }
      : { id: row.category_id, name: 'Unknown' },
    alertThresholds: row.alert_thresholds ?? [],
    notes: row.notes,
    isOverBudget: spent > amount,
    progressStatus: computeProgressStatus(percentage),
    isExpired: endDate < now,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Compute total spent for a budget by summing DEBIT transactions
 * within the budget's date range and category.
 */
async function computeSpent(
  supabase: ReturnType<typeof createClient>,
  categoryId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('category_id', categoryId)
    .eq('type', 'DEBIT')
    .eq('include_in_budget', true)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) return 0;
  return (data ?? []).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
}

/**
 * Look up the current user's family_id from their profile.
 */
async function getUserFamilyId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthenticationError();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) throw new BudgetsApiError('Could not resolve family', 500);
  return profile.family_id;
}

// =============================================================================
// Budgets Client
// =============================================================================

export const budgetsClient = {
  async getAll(): Promise<BudgetListResponse> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(id, name, icon, color)')
      .order('created_at', { ascending: false });

    if (error) throw new BudgetsApiError(error.message, 500);

    const rows = (data ?? []) as BudgetWithCategory[];
    const budgets: Budget[] = await Promise.all(
      rows.map(async (row) => {
        const spent = await computeSpent(supabase, row.category_id, row.start_date, row.end_date);
        return rowToBudget(row, spent);
      })
    );

    const overBudgetCount = budgets.filter((b) => b.isOverBudget).length;

    return {
      budgets,
      total: budgets.length,
      overBudgetCount,
    };
  },

  async getOne(id: string): Promise<Budget> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(id, name, icon, color)')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundError();

    const row = data as BudgetWithCategory;
    const spent = await computeSpent(supabase, row.category_id, row.start_date, row.end_date);
    return rowToBudget(row, spent);
  },

  async create(data: CreateBudgetData): Promise<Budget> {
    const supabase = createClient();
    const familyId = await getUserFamilyId(supabase);

    const insert: BudgetInsert = {
      name: data.name,
      category_id: data.categoryId,
      amount: data.amount,
      period: data.period as Database['public']['Enums']['budget_period'],
      start_date: data.startDate,
      end_date: data.endDate,
      alert_thresholds: data.alertThresholds ?? [],
      notes: data.notes ?? null,
      family_id: familyId,
    };

    // Type-safe insert with explicit casting to avoid Next.js build type inference issues
    const { data: created, error } = await (supabase
      .from('budgets')
      .insert as any)(insert)
      .select('*, categories(id, name, icon, color)')
      .single();

    if (error) throw new ValidationError(error.message);
    return rowToBudget(created as BudgetWithCategory, 0);
  },

  async update(id: string, data: UpdateBudgetData): Promise<Budget> {
    const supabase = createClient();
    const update: Database['public']['Tables']['budgets']['Update'] = {};

    if (data.name !== undefined) update.name = data.name;
    if (data.categoryId !== undefined) update.category_id = data.categoryId;
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.period !== undefined) update.period = data.period as Database['public']['Enums']['budget_period'];
    if (data.startDate !== undefined) update.start_date = data.startDate;
    if (data.endDate !== undefined) update.end_date = data.endDate;
    if (data.alertThresholds !== undefined) update.alert_thresholds = data.alertThresholds;
    if (data.notes !== undefined) update.notes = data.notes;

    // Type-safe update with explicit casting to avoid Next.js build type inference issues
    const { data: updated, error } = await (supabase
      .from('budgets')
      .update as any)(update)
      .eq('id', id)
      .select('*, categories(id, name, icon, color)')
      .single();

    if (error) throw new BudgetsApiError(error.message, 400);

    const row = updated as BudgetWithCategory;
    const spent = await computeSpent(supabase, row.category_id, row.start_date, row.end_date);
    return rowToBudget(row, spent);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) throw new BudgetsApiError(error.message, 400);
  },
};

export default budgetsClient;
