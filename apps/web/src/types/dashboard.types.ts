/**
 * Dashboard Types
 *
 * Type definitions for dashboard analytics data.
 * These types mirror the backend DTOs for type-safe data fetching.
 */

/**
 * Valid time periods for analytics queries
 */
export type TimePeriod = 'weekly' | 'monthly' | 'yearly';

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  /** Total balance across all accounts */
  totalBalance: number;
  /** Total income for the selected period */
  monthlyIncome: number;
  /** Total expenses for the selected period */
  monthlyExpenses: number;
  /** Savings rate as percentage */
  savingsRate: number;
  /** Balance trend compared to previous period */
  balanceTrend?: number;
  /** Income trend compared to previous period */
  incomeTrend?: number;
  /** Expenses trend compared to previous period */
  expensesTrend?: number;
}

/**
 * Category spending breakdown
 */
export interface CategorySpending {
  /** Category ID */
  id: string;
  /** Category name */
  name: string;
  /** Total amount spent in this category */
  amount: number;
  /** Category color for visualization */
  color: string;
  /** Percentage of total spending */
  percentage: number;
  /** Number of transactions in this category */
  count: number;
}

/**
 * Transaction for display
 */
export interface Transaction {
  /** Transaction ID */
  id: string;
  /** Transaction description */
  description: string;
  /** Transaction amount (negative for expenses) */
  amount: number;
  /** Transaction date (YYYY-MM-DD) */
  date: string;
  /** Category name */
  category: string;
  /** Transaction type */
  type: 'income' | 'expense';
  /** Account name */
  accountName?: string;
}

/**
 * Trend data point
 */
export interface TrendData {
  /** Date for this data point */
  date: string;
  /** Income for this period */
  income: number;
  /** Expenses for this period */
  expenses: number;
}

/**
 * Combined dashboard data from all endpoints
 */
export interface DashboardData {
  stats: DashboardStats | undefined;
  spending: CategorySpending[] | undefined;
  transactions: Transaction[] | undefined;
  trends: TrendData[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
