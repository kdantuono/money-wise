/**
 * Transactions API Client
 *
 * Provides type-safe HTTP client for transactions endpoints.
 * Handles authentication, error handling, and request/response interceptors.
 *
 * @module services/transactions.client
 *
 * @example
 * ```typescript
 * // Get all transactions
 * const transactions = await transactionsClient.getTransactions();
 *
 * // Get transactions with filters
 * const filtered = await transactionsClient.getTransactions({
 *   accountId: 'account-uuid',
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 * });
 *
 * // Get a single transaction
 * const transaction = await transactionsClient.getTransaction('tx-uuid');
 * ```
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Transaction type (DEBIT = expense, CREDIT = income)
 */
export type TransactionType = 'DEBIT' | 'CREDIT';

/**
 * Transaction status
 */
export type TransactionStatus = 'PENDING' | 'POSTED' | 'CANCELLED';

/**
 * Transaction source
 */
export type TransactionSource = 'MANUAL' | 'PLAID' | 'SALTEDGE' | 'IMPORT';

/**
 * Transaction data from API
 */
export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string | null;
  amount: number;
  displayAmount: number;
  type: TransactionType;
  status: TransactionStatus;
  source: TransactionSource;
  date: string;
  authorizedDate?: string | null;
  description: string;
  merchantName?: string | null;
  originalDescription?: string | null;
  currency: string;
  reference?: string | null;
  checkNumber?: string | null;
  notes?: string | null;
  isPending: boolean;
  isRecurring: boolean;
  isHidden: boolean;
  includeInBudget: boolean;
  plaidTransactionId?: string | null;
  plaidAccountId?: string | null;
  saltedgeTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  isDebit: boolean;
  isCredit: boolean;
  isPlaidTransaction: boolean;
  isManualTransaction: boolean;
}

/**
 * Transaction filter options
 */
export interface TransactionFilters {
  accountId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Create transaction request data
 * Required fields: accountId, amount, type, source, date, description
 */
export interface CreateTransactionData {
  accountId: string;
  categoryId?: string;
  amount: number;
  type: TransactionType;
  status?: TransactionStatus;
  source: TransactionSource;
  date: string;
  authorizedDate?: string;
  description: string;
  merchantName?: string;
  originalDescription?: string;
  currency?: string;
  reference?: string;
  checkNumber?: string;
  notes?: string;
  isPending?: boolean;
  isRecurring?: boolean;
  isHidden?: boolean;
  includeInBudget?: boolean;
}

/**
 * Update transaction request data
 * All fields are optional (PATCH semantics)
 * Note: accountId and plaidTransactionId cannot be changed
 */
export interface UpdateTransactionData {
  categoryId?: string;
  amount?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  source?: TransactionSource;
  date?: string;
  authorizedDate?: string;
  description?: string;
  merchantName?: string;
  originalDescription?: string;
  currency?: string;
  reference?: string;
  checkNumber?: string;
  notes?: string;
  isPending?: boolean;
  isRecurring?: boolean;
  isHidden?: boolean;
  includeInBudget?: boolean;
}

/**
 * HTTP error response structure
 */
interface ApiErrorResponse {
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
 * Base error class for transactions API errors
 */
export class TransactionsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TransactionsApiError';
    Object.setPrototypeOf(this, TransactionsApiError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends TransactionsApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends TransactionsApiError {
  constructor(message: string = 'Transaction not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends TransactionsApiError {
  constructor(
    message: string = 'You do not have permission to perform this action.'
  ) {
    super(message, 403, 'AuthorizationError');
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends TransactionsApiError {
  constructor(message: string = 'Invalid request data.', details?: unknown) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// =============================================================================
// HTTP Client Configuration
// =============================================================================

const API_BASE_URL = '/api/transactions';

/**
 * Handle error response from API
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: ApiErrorResponse | null = null;

  try {
    const text = await response.text();
    errorData = text ? JSON.parse(text) : null;
  } catch {
    // Ignore parsing errors
  }

  const message =
    errorData?.message instanceof Array
      ? errorData.message.join(', ')
      : errorData?.message || `Request failed with status ${response.status}`;

  switch (response.status) {
    case 400:
      throw new ValidationError(message, errorData);
    case 401:
      throw new AuthenticationError(message);
    case 403:
      throw new AuthorizationError(message);
    case 404:
      throw new NotFoundError(message);
    default:
      throw new TransactionsApiError(message, response.status, errorData?.error);
  }
}

/**
 * Make authenticated request to transactions API
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

// =============================================================================
// Transactions Client API
// =============================================================================

/**
 * Transactions API Client
 *
 * Provides methods for fetching and managing transactions.
 */
export const transactionsClient = {
  /**
   * Get all transactions for the current user
   *
   * @param filters - Optional filters for transactions
   * @returns Array of transactions
   *
   * @example
   * ```typescript
   * const allTransactions = await transactionsClient.getTransactions();
   *
   * const filtered = await transactionsClient.getTransactions({
   *   accountId: 'account-uuid',
   *   type: 'DEBIT',
   *   startDate: '2024-01-01',
   * });
   * ```
   */
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const params = new URLSearchParams();

    if (filters?.accountId && filters.accountId !== 'all') {
      params.append('accountId', filters.accountId);
    }
    if (filters?.type) {
      params.append('type', filters.type);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return request<Transaction[]>(endpoint);
  },

  /**
   * Get a single transaction by ID
   *
   * @param id - Transaction ID (UUID)
   * @returns Transaction data
   * @throws NotFoundError if transaction doesn't exist
   *
   * @example
   * ```typescript
   * const transaction = await transactionsClient.getTransaction('tx-uuid');
   * ```
   */
  async getTransaction(id: string): Promise<Transaction> {
    return request<Transaction>(`/${id}`);
  },

  /**
   * Create a new transaction
   *
   * @param data - Transaction data
   * @returns Created transaction
   * @throws AuthenticationError if not authenticated
   * @throws ValidationError if data is invalid
   *
   * @example
   * ```typescript
   * const transaction = await transactionsClient.createTransaction({
   *   accountId: 'account-uuid',
   *   amount: 125.50,
   *   type: 'DEBIT',
   *   source: 'MANUAL',
   *   date: '2024-01-15',
   *   description: 'Groceries at Whole Foods',
   * });
   * ```
   */
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    return request<Transaction>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing transaction
   *
   * @param id - Transaction ID (UUID)
   * @param data - Partial transaction data to update
   * @returns Updated transaction
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if transaction belongs to different family
   * @throws NotFoundError if transaction doesn't exist
   * @throws ValidationError if data is invalid
   *
   * @example
   * ```typescript
   * const updated = await transactionsClient.updateTransaction('tx-uuid', {
   *   categoryId: 'new-category-uuid',
   *   notes: 'Updated notes',
   * });
   * ```
   */
  async updateTransaction(
    id: string,
    data: UpdateTransactionData
  ): Promise<Transaction> {
    return request<Transaction>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a transaction
   *
   * @param id - Transaction ID (UUID)
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if transaction belongs to different family
   * @throws NotFoundError if transaction doesn't exist
   *
   * @example
   * ```typescript
   * await transactionsClient.deleteTransaction('tx-uuid');
   * ```
   */
  async deleteTransaction(id: string): Promise<void> {
    await request<void>(`/${id}`, {
      method: 'DELETE',
    });
  },
};

export default transactionsClient;
