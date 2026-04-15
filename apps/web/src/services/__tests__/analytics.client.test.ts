/**
 * Analytics Client Unit Tests
 *
 * Tests for dashboard analytics API client.
 * Uses Vitest with mocked Supabase client.
 *
 * @module services/__tests__/analytics.client.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyticsClient,
  AnalyticsApiError,
  AuthenticationError,
  ServerError,
} from '../analytics.client';
import type {
  DashboardStats,
  CategorySpending,
  Transaction,
  TrendData,
} from '@/types/dashboard.types';

// Mock the Supabase client module
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}));

describe('Analytics Client', () => {
  const mockStats: DashboardStats = {
    totalBalance: 5000,
    monthlyIncome: 3000,
    monthlyExpenses: 2000,
    savingsRate: 33.3,
    balanceTrend: 5.2,
    incomeTrend: 10.0,
    expensesTrend: -5.0,
  };

  const mockCategorySpendingRows = [
    {
      category_id: 'cat-1',
      category_name: 'Food & Groceries',
      total_amount: 500,
      category_color: '#22c55e',
      percentage: 50,
      transaction_count: 15,
    },
    {
      category_id: 'cat-2',
      category_name: 'Transportation',
      total_amount: 300,
      category_color: '#3b82f6',
      percentage: 30,
      transaction_count: 8,
    },
  ];

  const expectedCategorySpending: CategorySpending[] = [
    {
      id: 'cat-1',
      name: 'Food & Groceries',
      amount: 500,
      color: '#22c55e',
      percentage: 50,
      count: 15,
    },
    {
      id: 'cat-2',
      name: 'Transportation',
      amount: 300,
      color: '#3b82f6',
      percentage: 30,
      count: 8,
    },
  ];

  const mockTransactionRows = [
    {
      id: 'tx-1',
      description: 'Grocery Store',
      amount: -85.5,
      date: '2024-01-15',
      type: 'DEBIT',
      categories: { name: 'Food & Groceries' },
      accounts: { name: 'Checking' },
    },
    {
      id: 'tx-2',
      description: 'Salary',
      amount: 3000,
      date: '2024-01-14',
      type: 'CREDIT',
      categories: { name: 'Income' },
      accounts: { name: 'Checking' },
    },
  ];

  const expectedTransactions: Transaction[] = [
    {
      id: 'tx-1',
      description: 'Grocery Store',
      amount: -85.5,
      date: '2024-01-15',
      category: 'Food & Groceries',
      type: 'expense',
      accountName: 'Checking',
    },
    {
      id: 'tx-2',
      description: 'Salary',
      amount: 3000,
      date: '2024-01-14',
      category: 'Income',
      type: 'income',
      accountName: 'Checking',
    },
  ];

  const mockTrendRows = [
    { period_date: '2024-01-08', income: 1500, expenses: 800 },
    { period_date: '2024-01-15', income: 1500, expenses: 1200 },
  ];

  const expectedTrends: TrendData[] = [
    { date: '2024-01-08', income: 1500, expenses: 800 },
    { date: '2024-01-15', income: 1500, expenses: 1200 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the from().select().order().limit() chain
    mockLimit.mockReturnValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe('Error Classes', () => {
    it('should create AnalyticsApiError', () => {
      const error = new AnalyticsApiError('Test error', 500, 'TestError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AnalyticsApiError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.errorType).toBe('TestError');
      expect(error.name).toBe('AnalyticsApiError');
    });

    it('should create AnalyticsApiError with details', () => {
      const details = { field: 'period', issue: 'invalid value' };
      const error = new AnalyticsApiError('Validation error', 400, 'ValidationError', details);
      expect(error.details).toEqual(details);
    });

    it('should create AuthenticationError', () => {
      const error = new AuthenticationError();
      expect(error).toBeInstanceOf(AnalyticsApiError);
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toContain('Authentication failed');
    });

    it('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Custom auth error');
      expect(error.message).toBe('Custom auth error');
    });

    it('should create ServerError', () => {
      const error = new ServerError();
      expect(error).toBeInstanceOf(AnalyticsApiError);
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ServerError');
      expect(error.message).toContain('Internal server error');
    });

    it('should create ServerError with custom message', () => {
      const error = new ServerError('Database unavailable');
      expect(error.message).toBe('Database unavailable');
    });
  });

  describe('getStats', () => {
    it('should fetch stats with default period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockStats, error: null });

      const result = await analyticsClient.getStats();

      expect(result).toEqual(mockStats);
      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { period: 'monthly' });
    });

    it('should fetch stats with weekly period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockStats, error: null });

      await analyticsClient.getStats('weekly');

      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { period: 'weekly' });
    });

    it('should fetch stats with yearly period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockStats, error: null });

      await analyticsClient.getStats('yearly');

      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { period: 'yearly' });
    });

    it('should throw ServerError on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(ServerError);
    });

    it('should include error message from Supabase in ServerError', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(analyticsClient.getStats()).rejects.toThrow('Database error');
    });
  });

  describe('getSpendingByCategory', () => {
    it('should fetch spending by category with default period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockCategorySpendingRows, error: null });

      const result = await analyticsClient.getSpendingByCategory();

      expect(result).toEqual(expectedCategorySpending);
      expect(mockRpc).toHaveBeenCalledWith('get_category_spending', expect.objectContaining({
        parent_only: true,
      }));
    });

    it('should fetch spending by category with specified period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockCategorySpendingRows, error: null });

      await analyticsClient.getSpendingByCategory('yearly');

      expect(mockRpc).toHaveBeenCalledWith('get_category_spending', expect.objectContaining({
        parent_only: true,
      }));
    });

    it('should return empty array when no spending data', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await analyticsClient.getSpendingByCategory();

      expect(result).toEqual([]);
    });

    it('should handle null data gracefully', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await analyticsClient.getSpendingByCategory();

      expect(result).toEqual([]);
    });

    it('should throw ServerError on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not authenticated' },
      });

      await expect(analyticsClient.getSpendingByCategory()).rejects.toThrow(ServerError);
    });

    it('should use default color when category_color is null', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ ...mockCategorySpendingRows[0], category_color: null }],
        error: null,
      });

      const result = await analyticsClient.getSpendingByCategory();

      expect(result[0].color).toBe('#6b7280');
    });
  });

  describe('getRecentTransactions', () => {
    it('should fetch recent transactions with default limit', async () => {
      mockLimit.mockReturnValueOnce({ data: mockTransactionRows, error: null });

      const result = await analyticsClient.getRecentTransactions();

      expect(result).toEqual(expectedTransactions);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, description, amount, date, type, categories(name), accounts(name)'
      );
      expect(mockOrder).toHaveBeenCalledWith('date', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should fetch recent transactions with custom limit', async () => {
      mockLimit.mockReturnValueOnce({ data: mockTransactionRows, error: null });

      await analyticsClient.getRecentTransactions(25);

      expect(mockLimit).toHaveBeenCalledWith(25);
    });

    it('should return empty array when no transactions', async () => {
      mockLimit.mockReturnValueOnce({ data: [], error: null });

      const result = await analyticsClient.getRecentTransactions();

      expect(result).toEqual([]);
    });

    it('should handle null data gracefully', async () => {
      mockLimit.mockReturnValueOnce({ data: null, error: null });

      const result = await analyticsClient.getRecentTransactions();

      expect(result).toEqual([]);
    });

    it('should throw ServerError on query error', async () => {
      mockLimit.mockReturnValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(analyticsClient.getRecentTransactions()).rejects.toThrow(ServerError);
    });

    it('should map CREDIT type to income', async () => {
      mockLimit.mockReturnValueOnce({
        data: [mockTransactionRows[1]], // CREDIT type
        error: null,
      });

      const result = await analyticsClient.getRecentTransactions();

      expect(result[0].type).toBe('income');
    });

    it('should map DEBIT type to expense', async () => {
      mockLimit.mockReturnValueOnce({
        data: [mockTransactionRows[0]], // DEBIT type
        error: null,
      });

      const result = await analyticsClient.getRecentTransactions();

      expect(result[0].type).toBe('expense');
    });

    it('should handle null categories and accounts', async () => {
      mockLimit.mockReturnValueOnce({
        data: [{
          ...mockTransactionRows[0],
          categories: null,
          accounts: null,
        }],
        error: null,
      });

      const result = await analyticsClient.getRecentTransactions();

      expect(result[0].category).toBe('Uncategorized');
      expect(result[0].accountName).toBeUndefined();
    });
  });

  describe('getTrends', () => {
    it('should fetch trends with default period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockTrendRows, error: null });

      const result = await analyticsClient.getTrends();

      expect(result).toEqual(expectedTrends);
      expect(mockRpc).toHaveBeenCalledWith('get_spending_trends', {
        period: 'monthly',
        num_periods: 6,
      });
    });

    it('should fetch trends with weekly period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockTrendRows, error: null });

      await analyticsClient.getTrends('weekly');

      expect(mockRpc).toHaveBeenCalledWith('get_spending_trends', {
        period: 'weekly',
        num_periods: 12,
      });
    });

    it('should fetch trends with yearly period', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockTrendRows, error: null });

      await analyticsClient.getTrends('yearly');

      expect(mockRpc).toHaveBeenCalledWith('get_spending_trends', {
        period: 'yearly',
        num_periods: 5,
      });
    });

    it('should return empty array when no trends', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await analyticsClient.getTrends();

      expect(result).toEqual([]);
    });

    it('should handle null data gracefully', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await analyticsClient.getTrends();

      expect(result).toEqual([]);
    });

    it('should throw ServerError on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Token expired' },
      });

      await expect(analyticsClient.getTrends()).rejects.toThrow(ServerError);
    });
  });

  describe('Error Handling', () => {
    it('should propagate error message from Supabase', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Custom database error' },
      });

      await expect(analyticsClient.getStats()).rejects.toThrow('Custom database error');
    });

    it('should throw ServerError for all Supabase errors', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Any error' },
      });

      try {
        await analyticsClient.getStats();
      } catch (e) {
        expect(e).toBeInstanceOf(ServerError);
        expect((e as ServerError).statusCode).toBe(500);
      }
    });
  });
});
