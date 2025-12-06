/**
 * Accounts API Client
 *
 * Provides type-safe HTTP client for account management endpoints.
 * Handles all account types (manual, linked banking, etc.)
 *
 * @module services/accounts.client
 */

import {
  AccountType,
  AccountStatus,
  AccountSource,
  FinancialSummary,
  DeletionEligibilityResponse,
  RestoreEligibilityResponse,
} from '../types/account.types';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Account settings for display customization
 */
export interface AccountSettings {
  autoSync?: boolean;
  syncFrequency?: 'daily' | 'hourly' | 'manual';
  notifications?: boolean;
  budgetIncluded?: boolean;
  /** Account display icon identifier */
  icon?: string;
  /** Account display color identifier */
  color?: string;
}

/**
 * Account data returned from API
 */
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  source: AccountSource;
  currentBalance: number;
  availableBalance?: number;
  creditLimit?: number;
  currency: string;
  institutionName?: string;
  maskedAccountNumber?: string;
  displayName: string;
  isPlaidAccount: boolean;
  isManualAccount: boolean;
  /** Whether account can be synced with banking provider (has valid connection) */
  isSyncable: boolean;
  needsSync: boolean;
  isActive: boolean;
  syncEnabled: boolean;
  lastSyncAt?: string;
  syncError?: string;
  saltEdgeConnectionId?: string;
  /** Account display settings */
  settings?: AccountSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Account summary statistics
 */
export interface AccountSummary {
  totalAccounts: number;
  totalBalance: number;
  activeAccounts: number;
  accountsNeedingSync: number;
  byType: {
    [key in AccountType]?: {
      count: number;
      totalBalance: number;
    };
  };
}

/**
 * Data required to create a new manual account
 */
export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  source: AccountSource;
  currentBalance: number;
  currency?: string;
  institutionName?: string;
  accountNumber?: string;
  creditLimit?: number;
}

/**
 * Data for updating an existing account
 */
export interface UpdateAccountRequest {
  name?: string;
  status?: AccountStatus;
  currentBalance?: number;
  availableBalance?: number;
  creditLimit?: number;
  institutionName?: string;
  syncEnabled?: boolean;
  /** Account display settings */
  settings?: {
    icon?: string;
    color?: string;
  };
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

export class AccountsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'AccountsApiError';
    Object.setPrototypeOf(this, AccountsApiError.prototype);
  }
}

export class AuthenticationError extends AccountsApiError {
  constructor(message: string = 'Authentication required. Please log in.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ValidationError extends AccountsApiError {
  constructor(message: string = 'Invalid request data.') {
    super(message, 400, 'ValidationError');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AccountsApiError {
  constructor(message: string = 'Account not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class LinkedTransfersError extends AccountsApiError {
  constructor(
    message: string = 'Cannot delete account with linked transfers.',
    public linkedTransferCount: number = 0
  ) {
    super(message, 400, 'LINKED_TRANSFERS_EXIST');
    this.name = 'LinkedTransfersError';
    Object.setPrototypeOf(this, LinkedTransfersError.prototype);
  }
}

export class RelinkRequiredError extends AccountsApiError {
  constructor(
    message: string = 'Banking connection is revoked. Re-linking required.',
    public siblingAccountCount: number = 0,
    public providerName?: string,
    public suggestion?: string
  ) {
    super(message, 409, 'RELINK_REQUIRED');
    this.name = 'RelinkRequiredError';
    Object.setPrototypeOf(this, RelinkRequiredError.prototype);
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
      throw new AccountsApiError(message, statusCode, errorData?.error);
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
// Accounts API Client
// =============================================================================

export const accountsClient = {
  /**
   * Get all accounts for the current user
   * @param includeHidden - Include hidden accounts in results (default: true for accounts page visibility)
   */
  async getAccounts(includeHidden: boolean = true): Promise<Account[]> {
    const url = includeHidden ? '/api/accounts?includeHidden=true' : '/api/accounts';
    return request<Account[]>(url, { method: 'GET' });
  },

  /**
   * Get a single account by ID
   */
  async getAccount(accountId: string): Promise<Account> {
    return request<Account>(`/api/accounts/${accountId}`, { method: 'GET' });
  },

  /**
   * Get account summary statistics
   */
  async getAccountSummary(): Promise<AccountSummary> {
    return request<AccountSummary>('/api/accounts/summary', { method: 'GET' });
  },

  /**
   * Get financial summary with net worth calculation
   */
  async getFinancialSummary(): Promise<FinancialSummary> {
    return request<FinancialSummary>('/api/accounts/financial-summary', {
      method: 'GET',
    });
  },

  /**
   * Create a new manual account
   */
  async createAccount(data: CreateAccountRequest): Promise<Account> {
    return request<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing account
   */
  async updateAccount(
    accountId: string,
    data: UpdateAccountRequest
  ): Promise<Account> {
    return request<Account>(`/api/accounts/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an account
   */
  async deleteAccount(accountId: string): Promise<void> {
    return request<void>(`/api/accounts/${accountId}`, { method: 'DELETE' });
  },

  /**
   * Get account balance only
   */
  async getAccountBalance(
    accountId: string
  ): Promise<{ currentBalance: number; availableBalance?: number }> {
    return request<{ currentBalance: number; availableBalance?: number }>(
      `/api/accounts/${accountId}/balance`,
      { method: 'GET' }
    );
  },

  /**
   * Check if an account can be deleted
   * Returns eligibility status and any blocking transfers
   */
  async checkDeletionEligibility(
    accountId: string
  ): Promise<DeletionEligibilityResponse> {
    return request<DeletionEligibilityResponse>(
      `/api/accounts/${accountId}/deletion-eligibility`,
      { method: 'GET' }
    );
  },

  /**
   * Hide an account (soft delete)
   * Preserves all transactions but excludes from active views
   */
  async hideAccount(accountId: string): Promise<Account> {
    return request<Account>(`/api/accounts/${accountId}/hide`, {
      method: 'PATCH',
    });
  },

  /**
   * Check if a hidden account can be restored
   * Returns eligibility status and re-linking requirements for banking accounts
   */
  async checkRestoreEligibility(
    accountId: string
  ): Promise<RestoreEligibilityResponse> {
    return request<RestoreEligibilityResponse>(
      `/api/accounts/${accountId}/restore-eligibility`,
      { method: 'GET' }
    );
  },

  /**
   * Restore a hidden account
   * Sets status back to ACTIVE
   * @throws RelinkRequiredError if banking connection is revoked
   */
  async restoreAccount(accountId: string): Promise<Account> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/accounts/${accountId}/restore`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      // Check for RELINK_REQUIRED error (409)
      if (response.status === 409) {
        const errorData = await response.json();
        if (errorData?.error === 'RELINK_REQUIRED') {
          throw new RelinkRequiredError(
            errorData.message,
            errorData.siblingAccountCount,
            errorData.providerName,
            errorData.suggestion
          );
        }
      }

      // Fall through to generic error handling
      let errorData: ApiErrorResponse | null = null;
      try {
        const text = await response.text();
        if (text) errorData = JSON.parse(text);
      } catch {
        // Failed to parse
      }

      const message = errorData?.message
        ? Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message
        : response.statusText || 'An error occurred';

      switch (response.status) {
        case 400:
          throw new ValidationError(message);
        case 401:
          throw new AuthenticationError(message);
        case 404:
          throw new NotFoundError(message);
        default:
          throw new AccountsApiError(message, response.status, errorData?.error);
      }
    }

    return response.json();
  },
};

export default accountsClient;
