/**
 * Dashboard Data Fetching Hooks
 *
 * React Query hooks for fetching dashboard analytics data.
 * These hooks provide caching, automatic refetching, and error handling.
 *
 * @module hooks/useDashboardStats
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsClient } from '@/services/analytics.client';
import type {
  DashboardStats,
  CategorySpending,
  Transaction,
  TrendData,
  TimePeriod,
} from '@/types/dashboard.types';

/**
 * Hook to fetch dashboard statistics
 *
 * @param period - Time period for calculations (default: monthly)
 * @returns Query result with dashboard stats
 *
 * @example
 * ```typescript
 * const { data: stats, isLoading, error } = useDashboardStats('monthly');
 * ```
 */
export function useDashboardStats(period: TimePeriod = 'monthly') {
  return useQuery<DashboardStats, Error>({
    queryKey: ['dashboard-stats', period],
    queryFn: () => analyticsClient.getStats(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always refetch on navigation back to dashboard
  });
}

/**
 * Hook to fetch spending breakdown by category
 *
 * @param period - Time period for calculations (default: monthly)
 * @returns Query result with category spending data
 *
 * @example
 * ```typescript
 * const { data: spending, isLoading } = useSpendingByCategory('monthly');
 * ```
 */
export function useSpendingByCategory(period: TimePeriod = 'monthly') {
  return useQuery<CategorySpending[], Error>({
    queryKey: ['spending-by-category', period],
    queryFn: () => analyticsClient.getSpendingByCategory(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always refetch on navigation back to dashboard
  });
}

/**
 * Hook to fetch recent transactions
 *
 * @param limit - Number of transactions to fetch (default: 10)
 * @returns Query result with recent transactions
 *
 * @example
 * ```typescript
 * const { data: transactions, isLoading } = useRecentTransactions(5);
 * ```
 */
export function useRecentTransactions(limit: number = 10) {
  return useQuery<Transaction[], Error>({
    queryKey: ['recent-transactions', limit],
    queryFn: () => analyticsClient.getRecentTransactions(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes (transactions change more often)
    refetchOnMount: 'always', // Always refetch on navigation back to dashboard
  });
}

/**
 * Hook to fetch spending trends
 *
 * @param period - Time period for calculations (default: monthly)
 * @returns Query result with trend data
 *
 * @example
 * ```typescript
 * const { data: trends, isLoading } = useTrends('yearly');
 * ```
 */
export function useTrends(period: TimePeriod = 'monthly') {
  return useQuery<TrendData[], Error>({
    queryKey: ['trends', period],
    queryFn: () => analyticsClient.getTrends(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always refetch on navigation back to dashboard
  });
}

/**
 * Combined hook for fetching all dashboard data
 *
 * Fetches stats, spending by category, recent transactions, and trends
 * in parallel using React Query.
 *
 * @param period - Time period for calculations (default: monthly)
 * @returns Combined dashboard data with loading and error states
 *
 * @example
 * ```typescript
 * const { stats, spending, transactions, isLoading, error, refetch } = useDashboardData('monthly');
 * ```
 */
export function useDashboardData(period: TimePeriod = 'monthly') {
  const statsQuery = useDashboardStats(period);
  const spendingQuery = useSpendingByCategory(period);
  const transactionsQuery = useRecentTransactions(10);
  const trendsQuery = useTrends(period);

  const isLoading =
    statsQuery.isLoading ||
    spendingQuery.isLoading ||
    transactionsQuery.isLoading ||
    trendsQuery.isLoading;

  const error =
    statsQuery.error ||
    spendingQuery.error ||
    transactionsQuery.error ||
    trendsQuery.error;

  const refetch = () => {
    statsQuery.refetch();
    spendingQuery.refetch();
    transactionsQuery.refetch();
    trendsQuery.refetch();
  };

  return {
    stats: statsQuery.data,
    spending: spendingQuery.data,
    transactions: transactionsQuery.data,
    trends: trendsQuery.data,
    isLoading,
    error,
    refetch,
  };
}
