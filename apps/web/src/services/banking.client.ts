/**
 * Banking Integration API Client
 *
 * Provides type-safe HTTP client for banking provider integration endpoints.
 * Handles authentication, error handling, and request/response interceptors.
 *
 * @module services/banking.client
 *
 * @example
 * ```typescript
 * // Initialize banking link
 * const { redirectUrl, connectionId } = await bankingClient.initiateLink('SALTEDGE');
 * window.location.href = redirectUrl;
 *
 * // After OAuth redirect, complete the link
 * const { accounts } = await bankingClient.completeLink(connectionId);
 *
 * // Get all linked accounts
 * const { accounts } = await bankingClient.getAccounts();
 *
 * // Sync a specific account
 * const syncResult = await bankingClient.syncAccount(accountId);
 *
 * // Revoke a connection
 * await bankingClient.revokeConnection(connectionId);
 * ```
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Banking provider identifier
 */
export type BankingProvider = 'SALTEDGE' | 'TINK' | 'YAPILY';

/**
 * Account sync status
 */
export type SyncStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'ERROR'
  | 'DISCONNECTED';

/**
 * Banking account information
 *
 * Represents a linked banking account with sync status and metadata.
 */
export interface BankingAccount {
  /** MoneyWise account ID (UUID) */
  id: string;

  /** Account display name (e.g., "Conto Corrente") */
  name: string;

  /** Current account balance */
  balance: number;

  /** ISO 4217 currency code (e.g., "EUR", "USD") */
  currency: string;

  /** Bank/Institution name (e.g., "Intesa Sanpaolo") */
  bankName?: string;

  /** Current synchronization status */
  syncStatus: SyncStatus;

  /** Last successful sync timestamp (ISO 8601) */
  lastSynced?: string | null;

  /** When account was linked (ISO 8601) */
  linkedAt: string;

  /** Account number (usually IBAN) */
  accountNumber?: string | null;

  /** Account type (e.g., "CHECKING", "SAVINGS") */
  accountType?: string | null;

  /** Bank country code (ISO 3166-1 alpha-2) */
  bankCountry?: string | null;

  /** Account holder name */
  accountHolderName?: string | null;
}

/**
 * Account synchronization result
 *
 * Contains the outcome of a banking account sync operation.
 */
export interface SyncResponse {
  /** Sync log ID for tracking */
  syncLogId: string;

  /** Current sync status */
  status: 'SYNCED' | 'PENDING' | 'ERROR';

  /** Number of transactions synchronized */
  transactionsSynced: number;

  /** Whether account balance was updated */
  balanceUpdated: boolean;

  /** Error message if sync failed */
  error?: string | null;
}

/**
 * Response from initiate-link endpoint
 */
export interface InitiateLinkResponse {
  /** OAuth redirect URL for bank authorization */
  redirectUrl: string;

  /** MoneyWise connection ID (use in complete-link) */
  connectionId: string;
}

/**
 * Response from complete-link endpoint
 */
export interface CompleteLinkResponse {
  /** Array of linked banking accounts */
  accounts: BankingAccount[];
}

/**
 * Response from get accounts endpoint
 */
export interface GetAccountsResponse {
  /** Array of linked banking accounts */
  accounts: BankingAccount[];
}

/**
 * Available banking provider information
 */
export interface AvailableProvidersResponse {
  /** List of available provider identifiers */
  providers: BankingProvider[];

  /** Whether banking integration is enabled */
  enabled: boolean;
}

/**
 * HTTP error response structure
 */
export interface ApiErrorResponse {
  /** HTTP status code */
  statusCode: number;

  /** Error message */
  message: string | string[];

  /** Error type/category */
  error?: string;

  /** Timestamp of error */
  timestamp?: string;

  /** Request path */
  path?: string;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error class for banking API errors
 */
export class BankingApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BankingApiError';
    Object.setPrototypeOf(this, BankingApiError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends BankingApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends BankingApiError {
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
export class NotFoundError extends BankingApiError {
  constructor(message: string = 'Resource not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends BankingApiError {
  constructor(message: string = 'Invalid request data.', details?: unknown) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Server error (500)
 */
export class ServerError extends BankingApiError {
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
 *
 * @returns Base URL for API requests
 */
function getApiBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}


/**
 * Check if code is running in development mode
 *
 * @returns True if in development
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Log request details in development mode
 *
 * @param method HTTP method
 * @param url Request URL
 * @param data Request body (optional)
 */
function logRequest(method: string, url: string, data?: unknown): void {
  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.log(`[Banking API] ${method} ${url}`, data ? { body: data } : '');
  }
}

/**
 * Log response details in development mode
 *
 * @param method HTTP method
 * @param url Request URL
 * @param status HTTP status code
 * @param data Response data
 */
function logResponse(
  method: string,
  url: string,
  status: number,
  data?: unknown
): void {
  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.log(`[Banking API] ${method} ${url} → ${status}`, data || '');
  }
}

/**
 * Parse error response and throw appropriate error
 *
 * @param response Fetch Response object
 * @throws {BankingApiError} Typed error based on status code
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: ApiErrorResponse | null = null;

  try {
    const text = await response.text();
    if (text) {
      errorData = JSON.parse(text);
    }
  } catch (parseError) {
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
    console.error(`[Banking API] Error ${statusCode}:`, errorData || message);
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
      throw new BankingApiError(
        message,
        statusCode,
        errorData?.error,
        errorData
      );
  }
}

/**
 * Make HTTP request with authentication and error handling
 *
 * @param endpoint API endpoint (without base URL)
 * @param options Fetch options
 * @returns Parsed response data
 * @throws {BankingApiError} On HTTP error
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
    credentials: 'include', // Enable cookie sending for authentication
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
// Banking API Client
// =============================================================================

/**
 * Banking Integration API Client
 *
 * Provides methods for interacting with banking provider integration endpoints.
 * All methods are authenticated and include proper error handling.
 */
export const bankingClient = {
  /**
   * Initiate banking link
   *
   * Starts the OAuth flow to link a bank account.
   * Returns a redirect URL that the user should navigate to for authorization.
   *
   * @param provider Banking provider (defaults to SALTEDGE)
   * @returns Redirect URL and connection ID
   * @throws {AuthenticationError} If not authenticated
   * @throws {ValidationError} If provider is invalid
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const { redirectUrl, connectionId } = await bankingClient.initiateLink('SALTEDGE');
   * // Store connectionId for later use
   * sessionStorage.setItem('banking_connection_id', connectionId);
   * // Redirect user to bank authorization
   * window.location.href = redirectUrl;
   * ```
   */
  async initiateLink(
    provider?: BankingProvider
  ): Promise<InitiateLinkResponse> {
    return request<InitiateLinkResponse>('/banking/initiate-link', {
      method: 'POST',
      body: JSON.stringify(provider ? { provider } : {}),
    });
  },

  /**
   * Complete banking link
   *
   * Called after user completes OAuth authorization.
   * Fetches the linked accounts and stores them in the database.
   *
   * @param connectionId Connection ID from initiate-link response (our internal UUID)
   * @param saltEdgeConnectionId Optional SaltEdge connection_id from redirect URL
   * @returns Array of linked accounts
   * @throws {AuthenticationError} If not authenticated
   * @throws {ValidationError} If connectionId is invalid
   * @throws {NotFoundError} If connection not found
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * // After OAuth redirect back to app
   * const connectionId = searchParams.get('connectionId');
   * const saltEdgeConnectionId = searchParams.get('connection_id');
   * if (connectionId) {
   *   const { accounts } = await bankingClient.completeLink(connectionId, saltEdgeConnectionId);
   *   console.log(`Linked ${accounts.length} accounts`);
   * }
   * ```
   */
  async completeLink(connectionId: string, saltEdgeConnectionId?: string): Promise<CompleteLinkResponse> {
    const body: { connectionId: string; saltEdgeConnectionId?: string } = { connectionId };
    if (saltEdgeConnectionId) {
      body.saltEdgeConnectionId = saltEdgeConnectionId;
    }
    return request<CompleteLinkResponse>('/banking/complete-link', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Get linked accounts
   *
   * Retrieves all banking accounts linked by the authenticated user.
   *
   * @returns Array of linked accounts with sync status
   * @throws {AuthenticationError} If not authenticated
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const { accounts } = await bankingClient.getAccounts();
   * accounts.forEach(account => {
   *   console.log(`${account.name}: ${account.balance} ${account.currency}`);
   * });
   * ```
   */
  async getAccounts(): Promise<GetAccountsResponse> {
    return request<GetAccountsResponse>('/banking/accounts', {
      method: 'GET',
    });
  },

  /**
   * Sync banking account
   *
   * Triggers a synchronization of transactions and balance for a specific account.
   * This operation may take a few moments as it fetches data from the banking provider.
   *
   * @param accountId Account ID to sync
   * @returns Sync result with transaction count and balance update status
   * @throws {AuthenticationError} If not authenticated
   * @throws {ValidationError} If accountId is invalid
   * @throws {NotFoundError} If account not found
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const result = await bankingClient.syncAccount('acc-123');
   * if (result.status === 'SYNCED') {
   *   console.log(`Synced ${result.transactionsSynced} transactions`);
   * } else if (result.status === 'ERROR') {
   *   console.error(`Sync failed: ${result.error}`);
   * }
   * ```
   */
  async syncAccount(accountId: string): Promise<SyncResponse> {
    return request<SyncResponse>(`/banking/sync/${accountId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /**
   * Revoke banking connection
   *
   * Disconnects a banking provider connection and marks all associated accounts
   * as disconnected. The user will need to re-authorize to link accounts again.
   *
   * @param connectionId Connection ID to revoke
   * @returns void (204 No Content)
   * @throws {AuthenticationError} If not authenticated
   * @throws {ValidationError} If connectionId is invalid
   * @throws {NotFoundError} If connection not found
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * await bankingClient.revokeConnection('conn-789');
   * console.log('Connection revoked successfully');
   * ```
   */
  async revokeConnection(connectionId: string): Promise<void> {
    return request<void>(`/banking/revoke/${connectionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get available banking providers
   *
   * Retrieves a list of banking providers currently available in the system.
   *
   * @returns Array of available provider types and enabled status
   * @throws {AuthenticationError} If not authenticated
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const { providers, enabled } = await bankingClient.getProviders();
   * if (enabled) {
   *   console.log(`Available providers: ${providers.join(', ')}`);
   * }
   * ```
   */
  async getProviders(): Promise<AvailableProvidersResponse> {
    return request<AvailableProvidersResponse>('/banking/providers', {
      method: 'GET',
    });
  },
};

// =============================================================================
// Exports
// =============================================================================

export default bankingClient;
