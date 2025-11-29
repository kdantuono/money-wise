/**
 * Analytics Client Unit Tests
 *
 * Tests for dashboard analytics API client.
 * Uses Vitest with mocked fetch.
 *
 * @module services/__tests__/analytics.client.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

// Mock console methods (intentionally accessing console for test mocking)
/* eslint-disable no-console */
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
/* eslint-enable no-console */

// Mock fetch globally
global.fetch = vi.fn();

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

  const mockCategorySpending: CategorySpending[] = [
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

  const mockTransactions: Transaction[] = [
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

  const mockTrends: TrendData[] = [
    { date: '2024-01-08', income: 1500, expenses: 800 },
    { date: '2024-01-15', income: 1500, expenses: 1200 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console to avoid cluttering test output
    // eslint-disable-next-line no-console
    console.log = vi.fn();
    // eslint-disable-next-line no-console
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore console
    // eslint-disable-next-line no-console
    console.log = originalConsoleLog;
    // eslint-disable-next-line no-console
    console.error = originalConsoleError;
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
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      const result = await analyticsClient.getStats();

      expect(result).toEqual(mockStats);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/stats?period=monthly'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should fetch stats with weekly period', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      await analyticsClient.getStats('weekly');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/stats?period=weekly'),
        expect.any(Object)
      );
    });

    it('should fetch stats with yearly period', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      await analyticsClient.getStats('yearly');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/stats?period=yearly'),
        expect.any(Object)
      );
    });

    it('should handle authentication error (401)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          JSON.stringify({
            statusCode: 401,
            message: 'Authentication required',
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(AuthenticationError);
    });

    it('should handle server error (500)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () =>
          JSON.stringify({
            statusCode: 500,
            message: 'Server error',
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(ServerError);
    });
  });

  describe('getSpendingByCategory', () => {
    it('should fetch spending by category with default period', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCategorySpending,
      });

      const result = await analyticsClient.getSpendingByCategory();

      expect(result).toEqual(mockCategorySpending);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/spending-by-category?period=monthly'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should fetch spending by category with specified period', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCategorySpending,
      });

      await analyticsClient.getSpendingByCategory('yearly');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/spending-by-category?period=yearly'),
        expect.any(Object)
      );
    });

    it('should return empty array when no spending data', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const result = await analyticsClient.getSpendingByCategory();

      expect(result).toEqual([]);
    });

    it('should handle authentication error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            statusCode: 401,
            message: 'Not authenticated',
          }),
      });

      await expect(analyticsClient.getSpendingByCategory()).rejects.toThrow(
        AuthenticationError
      );
    });
  });

  describe('getRecentTransactions', () => {
    it('should fetch recent transactions with default limit', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransactions,
      });

      const result = await analyticsClient.getRecentTransactions();

      expect(result).toEqual(mockTransactions);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/transactions/recent?limit=10'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should fetch recent transactions with custom limit', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransactions,
      });

      await analyticsClient.getRecentTransactions(25);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/transactions/recent?limit=25'),
        expect.any(Object)
      );
    });

    it('should return empty array when no transactions', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const result = await analyticsClient.getRecentTransactions();

      expect(result).toEqual([]);
    });

    it('should handle server error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () =>
          JSON.stringify({
            statusCode: 500,
            message: 'Database error',
          }),
      });

      await expect(analyticsClient.getRecentTransactions()).rejects.toThrow(
        ServerError
      );
    });
  });

  describe('getTrends', () => {
    it('should fetch trends with default period', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTrends,
      });

      const result = await analyticsClient.getTrends();

      expect(result).toEqual(mockTrends);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/trends?period=monthly'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should fetch trends with weekly period', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTrends,
      });

      await analyticsClient.getTrends('weekly');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/trends?period=weekly'),
        expect.any(Object)
      );
    });

    it('should fetch trends with yearly period', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTrends,
      });

      await analyticsClient.getTrends('yearly');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/trends?period=yearly'),
        expect.any(Object)
      );
    });

    it('should return empty array when no trends', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const result = await analyticsClient.getTrends();

      expect(result).toEqual([]);
    });

    it('should handle authentication error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            statusCode: 401,
            message: 'Token expired',
          }),
      });

      await expect(analyticsClient.getTrends()).rejects.toThrow(
        AuthenticationError
      );
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle error with array message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            statusCode: 400,
            message: ['Error 1', 'Error 2'],
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow('Error 1, Error 2');
    });

    it('should handle error with empty response body', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '',
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(ServerError);
    });

    it('should handle error with invalid JSON', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Invalid JSON',
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(ServerError);
    });

    it('should handle unknown status code', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 418, // I'm a teapot
        text: async () =>
          JSON.stringify({
            statusCode: 418,
            message: 'Unknown error',
            error: 'TeapotError',
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(AnalyticsApiError);
    });

    it('should handle error without statusText', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
        text: async () => '',
      });

      await expect(analyticsClient.getStats()).rejects.toThrow('An error occurred');
    });

    it('should use statusText when no error message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Custom Status Text',
        text: async () => JSON.stringify({ statusCode: 500 }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow('Custom Status Text');
    });

    it('should handle bad gateway error (502)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () =>
          JSON.stringify({
            statusCode: 502,
            message: 'Bad gateway',
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(ServerError);
    });

    it('should handle service unavailable error (503)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({
            statusCode: 503,
            message: 'Service unavailable',
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(ServerError);
    });

    it('should handle gateway timeout error (504)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 504,
        text: async () =>
          JSON.stringify({
            statusCode: 504,
            message: 'Gateway timeout',
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow(ServerError);
    });
  });

  describe('Request Logging', () => {
    it('should log requests in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      await analyticsClient.getStats();

      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });

    it('should log errors in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () =>
          JSON.stringify({
            statusCode: 500,
            message: 'Error',
          }),
      });

      await expect(analyticsClient.getStats()).rejects.toThrow();

      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });
  });

  describe('API Base URL Configuration', () => {
    it('should use NEXT_PUBLIC_API_URL when set', async () => {
      vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      await analyticsClient.getStats();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com/api/analytics/stats'),
        expect.any(Object)
      );

      vi.unstubAllEnvs();
    });

    it('should handle trailing slash in API URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/');

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      await analyticsClient.getStats();

      // Should not have double slash
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/api\.example\.com\/api\/analytics/),
        expect.any(Object)
      );

      vi.unstubAllEnvs();
    });
  });
});
