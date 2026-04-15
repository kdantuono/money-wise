/**
 * Banking Integration API Client
 *
 * Provides type-safe client for banking provider integration via Supabase Edge Functions.
 * Uses supabase.functions.invoke() for Edge Function calls and direct Supabase queries
 * where RLS policies handle authorization.
 *
 * @module services/banking.client
 *
 * @example
 * ```typescript
 * // Initialize banking link
 * const { redirectUrl, connectionId } = await initiateLink('SALTEDGE');
 * window.location.href = redirectUrl;
 *
 * // After OAuth redirect, complete the link
 * const { accounts } = await completeLink(connectionId);
 *
 * // Get all linked accounts
 * const { accounts } = await getAccounts();
 *
 * // Sync a specific account
 * const syncResult = await syncAccount(accountId);
 *
 * // Revoke a connection
 * await revokeConnection(connectionId);
 * ```
 */

import { createClient } from '@/utils/supabase/client';
import { FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

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
// Error Handling
// =============================================================================

/**
 * Handle Edge Function error and throw the appropriate typed error.
 *
 * supabase.functions.invoke() returns { data, error } where error is one of:
 * - FunctionsHttpError: HTTP error from the function (has context with status)
 * - FunctionsRelayError: relay/network error
 * - FunctionsFetchError: fetch-level failure
 *
 * Edge Functions return { error: "message" } in their response body for errors.
 */
async function handleEdgeFunctionError(error: Error): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    // The function returned an HTTP error — parse the response body
    let statusCode = 500;
    let message = 'An error occurred';

    try {
      const errorBody = await error.context.json();
      message = errorBody?.error || errorBody?.message || message;
      statusCode = error.context.status || statusCode;
    } catch {
      // If we can't parse the body, use the status from context
      statusCode = error.context?.status || statusCode;
      message = error.message || message;
    }

    switch (statusCode) {
      case 400:
        throw new ValidationError(message);
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
        throw new BankingApiError(message, statusCode);
    }
  }

  if (error instanceof FunctionsRelayError) {
    throw new ServerError(
      error.message || 'Edge Function relay error. Please try again later.'
    );
  }

  // FunctionsFetchError or unknown error
  throw new ServerError(
    error.message || 'Failed to reach the server. Please check your connection.'
  );
}

// =============================================================================
// Database Row Mapper
// =============================================================================

/**
 * Supabase accounts table row shape (snake_case fields from the database).
 * Kept minimal — only the columns we SELECT.
 */
interface AccountRow {
  id: string;
  name: string;
  current_balance: number;
  currency: string;
  institution_name: string | null;
  sync_status: SyncStatus;
  last_sync_at: string | null;
  created_at: string;
  account_number: string | null;
  type: string | null;
  account_holder_name?: string | null;
}

/**
 * Map a Supabase accounts row (snake_case) to the BankingAccount interface (camelCase).
 */
function mapRowToBankingAccount(row: AccountRow): BankingAccount {
  return {
    id: row.id,
    name: row.name,
    balance: row.current_balance,
    currency: row.currency,
    bankName: row.institution_name ?? undefined,
    syncStatus: row.sync_status,
    lastSynced: row.last_sync_at,
    linkedAt: row.created_at,
    accountNumber: row.account_number,
    accountType: row.type,
    bankCountry: null,
    accountHolderName: null,
  };
}

// =============================================================================
// Banking API Functions
// =============================================================================

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
 * const { redirectUrl, connectionId } = await initiateLink('SALTEDGE');
 * sessionStorage.setItem('banking_connection_id', connectionId);
 * window.location.href = redirectUrl;
 * ```
 */
export async function initiateLink(
  provider?: BankingProvider
): Promise<InitiateLinkResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(
    'banking-initiate-link',
    { body: { provider } }
  );

  if (error) {
    await handleEdgeFunctionError(error);
  }

  return data as InitiateLinkResponse;
}

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
 * const connectionId = searchParams.get('connectionId');
 * const saltEdgeConnectionId = searchParams.get('connection_id');
 * if (connectionId) {
 *   const { accounts } = await completeLink(connectionId, saltEdgeConnectionId);
 *   console.log(`Linked ${accounts.length} accounts`);
 * }
 * ```
 */
export async function completeLink(
  connectionId: string,
  saltEdgeConnectionId?: string
): Promise<CompleteLinkResponse> {
  const supabase = createClient();
  const body: { connectionId: string; saltEdgeConnectionId?: string } = {
    connectionId,
  };
  if (saltEdgeConnectionId) {
    body.saltEdgeConnectionId = saltEdgeConnectionId;
  }

  const { data, error } = await supabase.functions.invoke(
    'banking-complete-link',
    { body }
  );

  if (error) {
    await handleEdgeFunctionError(error);
  }

  return data as CompleteLinkResponse;
}

/**
 * Get linked accounts
 *
 * Retrieves all banking accounts linked by the authenticated user.
 * Uses a direct Supabase query with RLS policies for authorization.
 *
 * @returns Array of linked accounts with sync status
 * @throws {AuthenticationError} If not authenticated
 * @throws {ServerError} If server error occurs
 *
 * @example
 * ```typescript
 * const { accounts } = await getAccounts();
 * accounts.forEach(account => {
 *   console.log(`${account.name}: ${account.balance} ${account.currency}`);
 * });
 * ```
 */
export async function getAccounts(): Promise<GetAccountsResponse> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounts')
    .select(
      'id, name, current_balance, currency, institution_name, sync_status, last_sync_at, created_at, account_number, type'
    )
    .in('source', ['SALTEDGE', 'TINK', 'YAPILY', 'PLAID']);

  if (error) {
    if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
      throw new AuthenticationError();
    }
    throw new ServerError(error.message || 'Failed to fetch banking accounts.');
  }

  const accounts = (data ?? []).map((row) =>
    mapRowToBankingAccount(row as unknown as AccountRow)
  );

  return { accounts };
}

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
 * const result = await syncAccount('acc-123');
 * if (result.status === 'SYNCED') {
 *   console.log(`Synced ${result.transactionsSynced} transactions`);
 * }
 * ```
 */
export async function syncAccount(accountId: string): Promise<SyncResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke('banking-sync', {
    body: { accountId },
  });

  if (error) {
    await handleEdgeFunctionError(error);
  }

  return data as SyncResponse;
}

/**
 * Revoke banking connection
 *
 * Disconnects a banking provider connection and marks all associated accounts
 * as disconnected. The user will need to re-authorize to link accounts again.
 *
 * @param connectionId Connection ID to revoke
 * @throws {AuthenticationError} If not authenticated
 * @throws {ValidationError} If connectionId is invalid
 * @throws {NotFoundError} If connection not found
 * @throws {ServerError} If server error occurs
 *
 * @example
 * ```typescript
 * await revokeConnection('conn-789');
 * console.log('Connection revoked successfully');
 * ```
 */
export async function revokeConnection(connectionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.functions.invoke('banking-revoke', {
    body: { connectionId },
  });

  if (error) {
    await handleEdgeFunctionError(error);
  }
}

/**
 * Revoke banking connection by account ID
 *
 * Alternative method that accepts an Account ID instead of BankingConnection ID.
 * The Edge Function looks up the BankingConnection using the account's saltEdgeConnectionId.
 *
 * @param accountId Account ID whose banking connection to revoke
 * @throws {AuthenticationError} If not authenticated
 * @throws {ValidationError} If account is not linked to banking
 * @throws {NotFoundError} If account not found
 * @throws {ServerError} If server error occurs
 *
 * @example
 * ```typescript
 * await revokeConnectionByAccountId('acc-123');
 * console.log('Banking connection revoked successfully');
 * ```
 */
export async function revokeConnectionByAccountId(
  accountId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.functions.invoke('banking-revoke', {
    body: { accountId },
  });

  if (error) {
    await handleEdgeFunctionError(error);
  }
}

/**
 * Get available banking providers
 *
 * Returns the list of supported banking providers. This is a hardcoded list
 * since there is no Edge Function for provider discovery.
 *
 * @returns Array of available provider types and enabled status
 *
 * @example
 * ```typescript
 * const { providers, enabled } = await getProviders();
 * if (enabled) {
 *   console.log(`Available providers: ${providers.join(', ')}`);
 * }
 * ```
 */
export async function getProviders(): Promise<AvailableProvidersResponse> {
  return {
    providers: ['SALTEDGE'] as BankingProvider[],
    enabled: true,
  };
}

// =============================================================================
// Legacy Compatibility — bankingClient object
// =============================================================================

/**
 * Banking client object for backward compatibility with existing imports.
 *
 * @deprecated Prefer importing individual functions directly:
 * `import { initiateLink, completeLink, getAccounts } from '@/services/banking.client'`
 */
export const bankingClient = {
  initiateLink,
  completeLink,
  getAccounts,
  syncAccount,
  revokeConnection,
  revokeConnectionByAccountId,
  getProviders,
};

export default bankingClient;
