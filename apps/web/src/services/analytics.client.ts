/**
 * Analytics Client — Supabase
 *
 * Direct Supabase RPC and queries replacing BFF fetch calls.
 * RLS policies handle family/user isolation automatically.
 *
 * @module services/analytics.client
 */

import { createClient } from '@/utils/supabase/client'
import type {
  DashboardStats,
  CategorySpending,
  Transaction,
  TrendData,
  TimePeriod,
} from '@/types/dashboard.types';

// =============================================================================
// Error Classes
// =============================================================================

export class AnalyticsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AnalyticsApiError';
    Object.setPrototypeOf(this, AnalyticsApiError.prototype);
  }
}

export class AuthenticationError extends AnalyticsApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ServerError extends AnalyticsApiError {
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

/**
 * Convert a TimePeriod to date_from / date_to for RPC calls.
 */
function periodToDateRange(period: TimePeriod): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().split('T')[0];
  let dateFrom: string;

  switch (period) {
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      dateFrom = d.toISOString().split('T')[0];
      break;
    }
    case 'yearly': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      dateFrom = d.toISOString().split('T')[0];
      break;
    }
    case 'monthly':
    default: {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      dateFrom = d.toISOString().split('T')[0];
      break;
    }
  }

  return { dateFrom, dateTo };
}

/**
 * Map a transaction row (snake_case) to the dashboard Transaction type.
 */
function rowToTransaction(row: {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  categories: { name: string } | null;
  accounts: { name: string } | null;
}): Transaction {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    category: row.categories?.name ?? 'Uncategorized',
    type: row.type === 'CREDIT' ? 'income' : 'expense',
    accountName: row.accounts?.name ?? undefined,
  };
}

// =============================================================================
// Analytics Client
// =============================================================================

export const analyticsClient = {
  /**
   * Get dashboard statistics via RPC.
   * The RPC returns Json so we cast to DashboardStats.
   */
  async getStats(period: TimePeriod = 'monthly'): Promise<DashboardStats> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_dashboard_stats', { period });

    if (error) throw new ServerError(error.message);
    return data as unknown as DashboardStats;
  },

  /**
   * Get spending breakdown by category via RPC.
   */
  async getSpendingByCategory(
    period: TimePeriod = 'monthly'
  ): Promise<CategorySpending[]> {
    const supabase = createClient();
    const { dateFrom, dateTo } = periodToDateRange(period);

    const { data, error } = await supabase.rpc('get_category_spending', {
      date_from: dateFrom,
      date_to: dateTo,
      parent_only: true,
    });

    if (error) throw new ServerError(error.message);

    return (data ?? []).map((row) => ({
      id: row.category_id,
      name: row.category_name,
      amount: Number(row.total_amount),
      color: row.category_color ?? '#6b7280',
      percentage: Number(row.percentage),
      count: Number(row.transaction_count),
    }));
  },

  /**
   * Get recent transactions via direct query.
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('id, description, amount, date, type, categories(name), accounts(name)')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw new ServerError(error.message);

    return (data ?? []).map((row) => rowToTransaction({
      id: row.id,
      description: row.description,
      amount: row.amount,
      date: row.date,
      type: row.type,
      categories: row.categories as { name: string } | null,
      accounts: row.accounts as { name: string } | null,
    }));
  },

  /**
   * Get spending trends over time via RPC.
   */
  async getTrends(period: TimePeriod = 'monthly'): Promise<TrendData[]> {
    const supabase = createClient();
    const numPeriods = period === 'yearly' ? 5 : period === 'weekly' ? 12 : 6;

    const { data, error } = await supabase.rpc('get_spending_trends', {
      period,
      num_periods: numPeriods,
    });

    if (error) throw new ServerError(error.message);

    return (data ?? []).map((row) => ({
      date: row.period_date,
      income: Number(row.income),
      expenses: Number(row.expenses),
    }));
  },
};

export default analyticsClient;
