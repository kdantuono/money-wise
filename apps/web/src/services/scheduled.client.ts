/**
 * Scheduled Transactions API Client
 *
 * Provides type-safe HTTP client for scheduled transaction endpoints.
 * Handles recurring bills, subscriptions, and scheduled payments.
 *
 * @module services/scheduled.client
 */

// =============================================================================
// Type Definitions
// =============================================================================

export type TransactionType = 'DEBIT' | 'CREDIT';
export type FlowType =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER'
  | 'LIABILITY_PAYMENT'
  | 'REFUND'
  | 'ADJUSTMENT';
export type ScheduledTransactionStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';
export type RecurrenceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

/**
 * Recurrence rule for scheduled transactions
 */
export interface RecurrenceRule {
  id: string;
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  endDate?: string;
  endCount?: number;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Scheduled transaction data returned from API
 */
export interface ScheduledTransaction {
  id: string;
  familyId: string;
  accountId: string;
  status: ScheduledTransactionStatus;
  amount: number;
  type: TransactionType;
  flowType?: FlowType;
  currency: string;
  description: string;
  merchantName?: string;
  categoryId?: string;
  nextDueDate: string;
  lastExecutedAt?: string;
  autoCreate: boolean;
  reminderDaysBefore: number;
  metadata?: Record<string, unknown>;
  recurrenceRule?: RecurrenceRule;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  isOverdue: boolean;
  daysUntilDue: number;
  recurrenceDescription?: string;
}

/**
 * Upcoming scheduled transaction occurrence
 */
export interface UpcomingScheduled {
  scheduledTransactionId: string;
  dueDate: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  flowType?: FlowType;
  merchantName?: string;
  categoryId?: string;
  accountId: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

/**
 * Calendar event for scheduled transactions
 */
export interface CalendarEvent {
  id: string;
  scheduledTransactionId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  flowType?: FlowType;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  account?: {
    id: string;
    name: string;
  };
  isOverdue: boolean;
  status: ScheduledTransactionStatus;
}

/**
 * Create recurrence rule request
 */
export interface CreateRecurrenceRuleRequest {
  frequency: RecurrenceFrequency;
  interval?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  endDate?: string;
  endCount?: number;
}

/**
 * Create scheduled transaction request
 */
export interface CreateScheduledTransactionRequest {
  accountId: string;
  amount: number;
  type: TransactionType;
  flowType?: FlowType;
  currency?: string;
  description: string;
  merchantName?: string;
  categoryId?: string;
  nextDueDate: string;
  autoCreate?: boolean;
  reminderDaysBefore?: number;
  status?: ScheduledTransactionStatus;
  recurrenceRule?: CreateRecurrenceRuleRequest;
  metadata?: Record<string, unknown>;
}

/**
 * Update scheduled transaction request
 */
export interface UpdateScheduledTransactionRequest {
  accountId?: string;
  amount?: number;
  type?: TransactionType;
  flowType?: FlowType;
  currency?: string;
  description?: string;
  merchantName?: string;
  categoryId?: string;
  nextDueDate?: string;
  autoCreate?: boolean;
  reminderDaysBefore?: number;
  status?: ScheduledTransactionStatus;
  recurrenceRule?: CreateRecurrenceRuleRequest | null;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for listing scheduled transactions
 */
export interface ScheduledFilterOptions {
  status?: ScheduledTransactionStatus;
  type?: TransactionType;
  flowType?: FlowType;
  accountId?: string;
  categoryId?: string;
  skip?: number;
  take?: number;
}

/**
 * Paginated response
 */
export interface PaginatedScheduledResponse {
  data: ScheduledTransaction[];
  total: number;
  hasMore: boolean;
  skip: number;
  take: number;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// =============================================================================
// Error Classes
// =============================================================================

export class ScheduledApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'ScheduledApiError';
    Object.setPrototypeOf(this, ScheduledApiError.prototype);
  }
}

export class AuthenticationError extends ScheduledApiError {
  constructor(message: string = 'Authentication required. Please log in.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ValidationError extends ScheduledApiError {
  constructor(message: string = 'Invalid request data.') {
    super(message, 400, 'ValidationError');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends ScheduledApiError {
  constructor(message: string = 'Scheduled transaction not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// =============================================================================
// HTTP Client
// =============================================================================

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

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

  switch (statusCode) {
    case 400:
      throw new ValidationError(message);
    case 401:
      throw new AuthenticationError(message);
    case 404:
      throw new NotFoundError(message);
    default:
      throw new ScheduledApiError(message, statusCode, errorData?.error);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// =============================================================================
// Scheduled Transactions API Client
// =============================================================================

export const scheduledClient = {
  /**
   * Get all scheduled transactions for the current user
   */
  async getScheduledTransactions(
    options?: ScheduledFilterOptions
  ): Promise<ScheduledTransaction[] | PaginatedScheduledResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.type) params.append('type', options.type);
    if (options?.flowType) params.append('flowType', options.flowType);
    if (options?.accountId) params.append('accountId', options.accountId);
    if (options?.categoryId) params.append('categoryId', options.categoryId);
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/scheduled?${queryString}`
      : '/api/scheduled';

    return request<ScheduledTransaction[] | PaginatedScheduledResponse>(
      endpoint,
      { method: 'GET' }
    );
  },

  /**
   * Get a single scheduled transaction by ID
   */
  async getScheduledTransaction(id: string): Promise<ScheduledTransaction> {
    return request<ScheduledTransaction>(`/api/scheduled/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Get upcoming scheduled transactions
   */
  async getUpcoming(days: number = 30): Promise<UpcomingScheduled[]> {
    return request<UpcomingScheduled[]>(`/api/scheduled/upcoming?days=${days}`, {
      method: 'GET',
    });
  },

  /**
   * Get calendar events for a date range
   */
  async getCalendarEvents(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    return request<CalendarEvent[]>(`/api/scheduled/calendar?${params}`, {
      method: 'GET',
    });
  },

  /**
   * Create a new scheduled transaction
   */
  async createScheduledTransaction(
    data: CreateScheduledTransactionRequest
  ): Promise<ScheduledTransaction> {
    return request<ScheduledTransaction>('/api/scheduled', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing scheduled transaction
   */
  async updateScheduledTransaction(
    id: string,
    data: UpdateScheduledTransactionRequest
  ): Promise<ScheduledTransaction> {
    return request<ScheduledTransaction>(`/api/scheduled/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a scheduled transaction
   */
  async deleteScheduledTransaction(id: string): Promise<void> {
    return request<void>(`/api/scheduled/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Skip the next occurrence of a recurring transaction
   */
  async skipNextOccurrence(id: string): Promise<ScheduledTransaction> {
    return request<ScheduledTransaction>(`/api/scheduled/${id}/skip`, {
      method: 'POST',
    });
  },

  /**
   * Mark current occurrence as completed
   */
  async markCompleted(
    id: string,
    transactionId?: string
  ): Promise<ScheduledTransaction> {
    return request<ScheduledTransaction>(`/api/scheduled/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    });
  },

  /**
   * Generate scheduled transactions from active liabilities
   */
  async generateFromLiabilities(): Promise<ScheduledTransaction[]> {
    return request<ScheduledTransaction[]>(
      '/api/scheduled/generate-from-liabilities',
      { method: 'POST' }
    );
  },
};

export default scheduledClient;
