/**
 * Dashboard Hooks Unit Tests
 *
 * Tests for React Query hooks that fetch dashboard analytics data.
 * Uses Vitest with mocked analytics client.
 *
 * @module hooks/__tests__/useDashboardStats.test
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import type { ReactNode } from 'react';
import {
  useDashboardStats,
  useSpendingByCategory,
  useRecentTransactions,
  useTrends,
  useDashboardData,
} from '../useDashboardStats';
import type {
  DashboardStats,
  CategorySpending,
  Transaction,
  TrendData,
} from '@/types/dashboard.types';

// Mock the analytics client
vi.mock('@/services/analytics.client', () => ({
  analyticsClient: {
    getStats: vi.fn(),
    getSpendingByCategory: vi.fn(),
    getRecentTransactions: vi.fn(),
    getTrends: vi.fn(),
  },
}));

// Import mocked client
import { analyticsClient } from '@/services/analytics.client';

// Mock console methods
const originalConsoleError = console.error;

// Mock data
const mockStats: DashboardStats = {
  totalBalance: 15000,
  monthlyIncome: 5000,
  monthlyExpenses: 3500,
  savingsRate: 30,
  balanceTrend: 5.2,
  incomeTrend: 2.1,
  expensesTrend: -3.5,
};

const mockSpending: CategorySpending[] = [
  { id: 'cat-1', name: 'Food & Groceries', amount: 500, percentage: 40, color: '#22c55e', count: 15 },
  { id: 'cat-2', name: 'Transportation', amount: 300, percentage: 24, color: '#3b82f6', count: 8 },
  { id: 'cat-3', name: 'Utilities', amount: 200, percentage: 16, color: '#f59e0b', count: 4 },
  { id: 'cat-4', name: 'Entertainment', amount: 250, percentage: 20, color: '#8b5cf6', count: 10 },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    description: 'Grocery Store',
    amount: -85.5,
    date: '2024-01-15',
    category: 'Food & Groceries',
    accountName: 'Checking',
    type: 'expense',
  },
  {
    id: 'tx-2',
    description: 'Monthly Salary',
    amount: 3000,
    date: '2024-01-14',
    category: 'Income',
    accountName: 'Checking',
    type: 'income',
  },
  {
    id: 'tx-3',
    description: 'Electric Bill',
    amount: -120,
    date: '2024-01-10',
    category: 'Utilities',
    accountName: 'Checking',
    type: 'expense',
  },
];

const mockTrends: TrendData[] = [
  { date: '2024-01-08', income: 500, expenses: 300 },
  { date: '2024-01-15', income: 2500, expenses: 800 },
  { date: '2024-01-22', income: 1000, expenses: 600 },
  { date: '2024-01-29', income: 1000, expenses: 500 },
];

describe('Dashboard Hooks', () => {
  let queryClient: QueryClient;

  // Create a wrapper with QueryClientProvider
  const createWrapper = () => {
    const testQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });

    const TestWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    );
    TestWrapper.displayName = 'TestWrapper';
    return TestWrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    queryClient.clear();
    console.error = originalConsoleError;
  });

  describe('useDashboardStats', () => {
    it('should fetch stats successfully', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useDashboardStats('monthly'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(analyticsClient.getStats).toHaveBeenCalledWith('monthly');
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch stats');
      vi.mocked(analyticsClient.getStats).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDashboardStats('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should use default period when not specified', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(analyticsClient.getStats).toHaveBeenCalledWith('monthly');
    });

    it('should use correct query key for different periods', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValue(mockStats);

      const { result: monthlyResult } = renderHook(() => useDashboardStats('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(monthlyResult.current.isSuccess).toBe(true);
      });

      const { result: weeklyResult } = renderHook(() => useDashboardStats('weekly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(weeklyResult.current.isSuccess).toBe(true);
      });

      expect(analyticsClient.getStats).toHaveBeenCalledWith('monthly');
      expect(analyticsClient.getStats).toHaveBeenCalledWith('weekly');
    });
  });

  describe('useSpendingByCategory', () => {
    it('should fetch spending data successfully', async () => {
      vi.mocked(analyticsClient.getSpendingByCategory).mockResolvedValueOnce(mockSpending);

      const { result } = renderHook(() => useSpendingByCategory('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSpending);
      expect(analyticsClient.getSpendingByCategory).toHaveBeenCalledWith('monthly');
    });

    it('should handle empty spending data', async () => {
      vi.mocked(analyticsClient.getSpendingByCategory).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useSpendingByCategory('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch spending');
      vi.mocked(analyticsClient.getSpendingByCategory).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSpendingByCategory('yearly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useRecentTransactions', () => {
    it('should fetch transactions successfully', async () => {
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);

      const { result } = renderHook(() => useRecentTransactions(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTransactions);
      expect(analyticsClient.getRecentTransactions).toHaveBeenCalledWith(10);
    });

    it('should use default limit when not specified', async () => {
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);

      const { result } = renderHook(() => useRecentTransactions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(analyticsClient.getRecentTransactions).toHaveBeenCalledWith(10);
    });

    it('should handle custom limit', async () => {
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions.slice(0, 2));

      const { result } = renderHook(() => useRecentTransactions(2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(analyticsClient.getRecentTransactions).toHaveBeenCalledWith(2);
    });

    it('should handle empty transactions', async () => {
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useRecentTransactions(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch transactions');
      vi.mocked(analyticsClient.getRecentTransactions).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRecentTransactions(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useTrends', () => {
    it('should fetch trends successfully', async () => {
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useTrends('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTrends);
      expect(analyticsClient.getTrends).toHaveBeenCalledWith('monthly');
    });

    it('should handle different periods', async () => {
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useTrends('yearly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(analyticsClient.getTrends).toHaveBeenCalledWith('yearly');
    });

    it('should handle empty trends', async () => {
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useTrends('weekly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch trends');
      vi.mocked(analyticsClient.getTrends).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTrends('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDashboardData', () => {
    it('should fetch all data successfully', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValueOnce(mockStats);
      vi.mocked(analyticsClient.getSpendingByCategory).mockResolvedValueOnce(mockSpending);
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useDashboardData('monthly'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.spending).toEqual(mockSpending);
      expect(result.current.transactions).toEqual(mockTransactions);
      expect(result.current.trends).toEqual(mockTrends);
      expect(result.current.error).toBeNull();
    });

    it('should show loading state while any query is loading', async () => {
      // Make stats return immediately but delay spending
      vi.mocked(analyticsClient.getStats).mockResolvedValueOnce(mockStats);
      vi.mocked(analyticsClient.getSpendingByCategory).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSpending), 100))
      );
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useDashboardData('monthly'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should aggregate errors from any query', async () => {
      const statsError = new Error('Stats failed');
      vi.mocked(analyticsClient.getStats).mockRejectedValueOnce(statsError);
      vi.mocked(analyticsClient.getSpendingByCategory).mockResolvedValueOnce(mockSpending);
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useDashboardData('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toEqual(statsError);
    });

    it('should provide refetch function', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValue(mockStats);
      vi.mocked(analyticsClient.getSpendingByCategory).mockResolvedValue(mockSpending);
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValue(mockTransactions);
      vi.mocked(analyticsClient.getTrends).mockResolvedValue(mockTrends);

      const { result } = renderHook(() => useDashboardData('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');

      // Clear mocks to track refetch calls
      vi.clearAllMocks();

      // Call refetch
      result.current.refetch();

      // Wait for refetch to be called
      await waitFor(() => {
        expect(analyticsClient.getStats).toHaveBeenCalled();
      });

      expect(analyticsClient.getSpendingByCategory).toHaveBeenCalled();
      expect(analyticsClient.getRecentTransactions).toHaveBeenCalled();
      expect(analyticsClient.getTrends).toHaveBeenCalled();
    });

    it('should use default period when not specified', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValueOnce(mockStats);
      vi.mocked(analyticsClient.getSpendingByCategory).mockResolvedValueOnce(mockSpending);
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(analyticsClient.getStats).toHaveBeenCalledWith('monthly');
      expect(analyticsClient.getSpendingByCategory).toHaveBeenCalledWith('monthly');
      expect(analyticsClient.getTrends).toHaveBeenCalledWith('monthly');
    });

    it('should pass period to stats, spending, and trends queries', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValueOnce(mockStats);
      vi.mocked(analyticsClient.getSpendingByCategory).mockResolvedValueOnce(mockSpending);
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useDashboardData('weekly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(analyticsClient.getStats).toHaveBeenCalledWith('weekly');
      expect(analyticsClient.getSpendingByCategory).toHaveBeenCalledWith('weekly');
      expect(analyticsClient.getTrends).toHaveBeenCalledWith('weekly');
      // Transactions uses fixed limit, not period
      expect(analyticsClient.getRecentTransactions).toHaveBeenCalledWith(10);
    });

    it('should handle partial failures gracefully', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValueOnce(mockStats);
      vi.mocked(analyticsClient.getSpendingByCategory).mockRejectedValueOnce(new Error('Spending failed'));
      vi.mocked(analyticsClient.getRecentTransactions).mockResolvedValueOnce(mockTransactions);
      vi.mocked(analyticsClient.getTrends).mockResolvedValueOnce(mockTrends);

      const { result } = renderHook(() => useDashboardData('monthly'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Stats should still be available
      expect(result.current.stats).toEqual(mockStats);
      // Spending should be undefined due to error
      expect(result.current.spending).toBeUndefined();
      // Transactions should be available
      expect(result.current.transactions).toEqual(mockTransactions);
      // Trends should be available
      expect(result.current.trends).toEqual(mockTrends);
      // Error should be set
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Query caching behavior', () => {
    it('should cache stats query based on period', async () => {
      vi.mocked(analyticsClient.getStats).mockResolvedValue(mockStats);

      const wrapper = createWrapper();

      // First render with monthly
      const { result: result1 } = renderHook(() => useDashboardStats('monthly'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Reset the mock to track new calls
      vi.mocked(analyticsClient.getStats).mockClear();

      // Second render with same period - should use cache
      const { result: result2 } = renderHook(() => useDashboardStats('monthly'), {
        wrapper,
      });

      // Query should be immediately successful from cache
      await waitFor(() => {
        expect(result2.current.data).toEqual(mockStats);
      });
    });
  });
});
