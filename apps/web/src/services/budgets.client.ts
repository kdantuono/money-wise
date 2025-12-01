/**
 * Budgets API Client
 *
 * Provides type-safe HTTP client for budget management endpoints.
 * Handles authentication, error handling, and request/response formatting.
 *
 * @module services/budgets.client
 *
 * @example
 * ```typescript
 * // Get all budgets
 * const { budgets } = await budgetsClient.getAll();
 *
 * // Create a new budget
 * const newBudget = await budgetsClient.create({
 *   name: 'Groceries',
 *   categoryId: 'uuid',
 *   amount: 500,
 *   period: 'MONTHLY',
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-31',
 * });
 *
 * // Update a budget
 * const updated = await budgetsClient.update('budget-id', { amount: 600 });
 *
 * // Delete a budget
 * await budgetsClient.delete('budget-id');
 * ```
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Budget period type
 */
export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

/**
 * Budget status
 */
export type BudgetStatus = 'ACTIVE' | 'COMPLETED' | 'DRAFT';

/**
 * Progress status for UI color coding:
 * - safe: 0-79% spent (green)
 * - warning: 80-99% spent (orange)
 * - maxed: exactly 100% spent (yellow)
 * - over: 100%+ spent (red)
 */
export type ProgressStatus = 'safe' | 'warning' | 'maxed' | 'over';

/**
 * Category summary in budget response
 */
export interface CategorySummary {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

/**
 * Budget entity with calculated fields
 */
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
  /** Whether the budget period has expired (endDate has passed) */
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from list budgets endpoint
 */
export interface BudgetListResponse {
  budgets: Budget[];
  total: number;
  overBudgetCount: number;
}

/**
 * Data for creating a new budget
 */
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

/**
 * Data for updating a budget
 */
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

/**
 * HTTP error response structure
 */
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

/**
 * Base error class for budgets API errors
 */
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

/**
 * Authentication error (401)
 */
export class AuthenticationError extends BudgetsApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends BudgetsApiError {
  constructor(
    message: string = 'You do not have permission to perform this action.'
  ) {
    super(message, 403, 'AuthorizationError');
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends BudgetsApiError {
  constructor(message: string = 'Budget not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends BudgetsApiError {
  constructor(message: string = 'Invalid request data.', details?: unknown) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Server error (500)
 */
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
function logRequest(method: string, url: string, data?: unknown): void {
  if (isDevelopment()) {
     
    console.log(`[Budgets API] ${method} ${url}`, data ? { body: data } : '');
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
     
    console.log(`[Budgets API] ${method} ${url} → ${status}`, data || '');
  }
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
    console.error(`[Budgets API] Error ${statusCode}:`, errorData || message);
  }

  // Throw appropriate error type
  switch (statusCode) {
    case 400:
      throw new ValidationError(message, errorData);
    case 401:
      throw new AuthenticationError(message);
    case 403:
      throw new AuthorizationError(message);
    case 404:
      throw new NotFoundError(message);
    case 500:
    case 502:
    case 503:
    case 504:
      throw new ServerError(message);
    default:
      throw new BudgetsApiError(
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
  logRequest(options.method || 'GET', url, options.body);

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

  // Handle 204 No Content
  if (response.status === 204) {
    logResponse(options.method || 'GET', url, response.status);
    return undefined as T;
  }

  // Parse JSON response
  const data = await response.json();
  logResponse(options.method || 'GET', url, response.status, data);

  return data as T;
}

// =============================================================================
// Budgets API Client
// =============================================================================

/**
 * Budgets API Client
 *
 * Provides methods for interacting with budget management endpoints.
 * All methods are authenticated and include proper error handling.
 */
export const budgetsClient = {
  /**
   * Get all budgets for the user's family
   *
   * @returns List of budgets with spent amounts and progress
   * @throws {AuthenticationError} If not authenticated
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const { budgets, total, overBudgetCount } = await budgetsClient.getAll();
   * budgets.forEach(budget => {
   *   console.log(`${budget.name}: ${budget.percentage}% used`);
   * });
   * ```
   */
  async getAll(): Promise<BudgetListResponse> {
    return request<BudgetListResponse>('/api/budgets', {
      method: 'GET',
    });
  },

  /**
   * Get a specific budget by ID
   *
   * @param id - Budget ID
   * @returns Budget with spent amount and progress
   * @throws {AuthenticationError} If not authenticated
   * @throws {NotFoundError} If budget not found
   * @throws {AuthorizationError} If budget belongs to different family
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const budget = await budgetsClient.getOne('budget-id');
   * console.log(`${budget.name}: $${budget.spent} of $${budget.amount}`);
   * ```
   */
  async getOne(id: string): Promise<Budget> {
    return request<Budget>(`/api/budgets/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create a new budget
   *
   * @param data - Budget creation data
   * @returns Created budget with calculated fields
   * @throws {AuthenticationError} If not authenticated
   * @throws {ValidationError} If data is invalid
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const budget = await budgetsClient.create({
   *   name: 'Groceries',
   *   categoryId: 'category-uuid',
   *   amount: 500,
   *   period: 'MONTHLY',
   *   startDate: '2025-01-01',
   *   endDate: '2025-01-31',
   * });
   * console.log(`Created budget: ${budget.id}`);
   * ```
   */
  async create(data: CreateBudgetData): Promise<Budget> {
    return request<Budget>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a budget
   *
   * @param id - Budget ID
   * @param data - Update data (only provided fields are modified)
   * @returns Updated budget with calculated fields
   * @throws {AuthenticationError} If not authenticated
   * @throws {ValidationError} If data is invalid
   * @throws {NotFoundError} If budget not found
   * @throws {AuthorizationError} If budget belongs to different family
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const budget = await budgetsClient.update('budget-id', {
   *   amount: 600,
   *   notes: 'Increased for holidays',
   * });
   * console.log(`Updated budget: ${budget.amount}`);
   * ```
   */
  async update(id: string, data: UpdateBudgetData): Promise<Budget> {
    return request<Budget>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a budget
   *
   * @param id - Budget ID
   * @throws {AuthenticationError} If not authenticated
   * @throws {NotFoundError} If budget not found
   * @throws {AuthorizationError} If budget belongs to different family
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * await budgetsClient.delete('budget-id');
   * console.log('Budget deleted');
   * ```
   */
  async delete(id: string): Promise<void> {
    return request<void>(`/api/budgets/${id}`, {
      method: 'DELETE',
    });
  },
};

// =============================================================================
// Exports
// =============================================================================

export default budgetsClient;
