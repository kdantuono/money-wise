/**
 * Analytics API Client
 *
 * Provides type-safe HTTP client for dashboard analytics endpoints.
 * Handles authentication, error handling, and request/response interceptors.
 *
 * @module services/analytics.client
 *
 * @example
 * ```typescript
 * // Get dashboard stats
 * const stats = await analyticsClient.getStats('monthly');
 *
 * // Get spending by category
 * const spending = await analyticsClient.getSpendingByCategory('monthly');
 *
 * // Get recent transactions
 * const transactions = await analyticsClient.getRecentTransactions(10);
 *
 * // Get trends
 * const trends = await analyticsClient.getTrends('monthly');
 * ```
 */

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

/**
 * Base error class for analytics API errors
 */
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

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AnalyticsApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Server error (500)
 */
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
// HTTP Client Configuration
// =============================================================================

/**
 * Get the API base URL from environment variables
 */
function getApiBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * Check if code is running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Log request details in development mode
 */
function logRequest(method: string, url: string): void {
  if (isDevelopment()) {
     
    console.log(`[Analytics API] ${method} ${url}`);
  }
}

/**
 * Log response details in development mode
 */
function logResponse(
  method: string,
  url: string,
  status: number,
  data?: unknown
): void {
  if (isDevelopment()) {
     
    console.log(`[Analytics API] ${method} ${url} → ${status}`, data || '');
  }
}

/**
 * HTTP error response structure
 */
interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/**
 * Parse error response and throw appropriate error
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: ApiErrorResponse | null = null;

  try {
    const text = await response.text();
    if (text) {
      errorData = JSON.parse(text);
    }
  } catch {
    // Failed to parse error response
  }

  const statusCode = response.status;
  const message = errorData?.message
    ? Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message
    : response.statusText || 'An error occurred';

  // Log error in development
  if (isDevelopment()) {
    console.error(`[Analytics API] Error ${statusCode}:`, errorData || message);
  }

  // Throw appropriate error type
  switch (statusCode) {
    case 401:
      throw new AuthenticationError(message);
    case 500:
    case 502:
    case 503:
    case 504:
      throw new ServerError(message);
    default:
      throw new AnalyticsApiError(
        message,
        statusCode,
        errorData?.error,
        errorData
      );
  }
}

/**
 * Make HTTP request with authentication and error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Log request in development
  logRequest(options.method || 'GET', url);

  // Make request with cookies (authentication handled by HttpOnly cookies)
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle errors
  if (!response.ok) {
    await handleErrorResponse(response);
  }

  // Parse JSON response
  const data = await response.json();
  logResponse(options.method || 'GET', url, response.status, data);

  return data as T;
}

// =============================================================================
// Analytics API Client
// =============================================================================

/**
 * Analytics API Client
 *
 * Provides methods for fetching dashboard analytics data.
 * All methods are authenticated and include proper error handling.
 */
export const analyticsClient = {
  /**
   * Get dashboard statistics
   *
   * Returns aggregated stats including total balance, income, expenses,
   * and savings rate for the selected time period.
   *
   * @param period - Time period (weekly, monthly, yearly)
   * @returns Dashboard statistics
   */
  async getStats(period: TimePeriod = 'monthly'): Promise<DashboardStats> {
    return request<DashboardStats>(`/api/analytics/stats?period=${period}`, {
      method: 'GET',
    });
  },

  /**
   * Get spending breakdown by category
   *
   * Returns spending aggregated by category with amounts and percentages.
   *
   * @param period - Time period (weekly, monthly, yearly)
   * @returns Array of category spending data
   */
  async getSpendingByCategory(
    period: TimePeriod = 'monthly'
  ): Promise<CategorySpending[]> {
    return request<CategorySpending[]>(
      `/api/analytics/spending-by-category?period=${period}`,
      { method: 'GET' }
    );
  },

  /**
   * Get recent transactions
   *
   * Returns the most recent transactions across all accounts.
   *
   * @param limit - Number of transactions to return (default: 10)
   * @returns Array of recent transactions
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return request<Transaction[]>(
      `/api/analytics/transactions/recent?limit=${limit}`,
      { method: 'GET' }
    );
  },

  /**
   * Get spending trends over time
   *
   * Returns income and expense trends grouped by time intervals.
   *
   * @param period - Time period (weekly, monthly, yearly)
   * @returns Array of trend data points
   */
  async getTrends(period: TimePeriod = 'monthly'): Promise<TrendData[]> {
    return request<TrendData[]>(`/api/analytics/trends?period=${period}`, {
      method: 'GET',
    });
  },
};

export default analyticsClient;
