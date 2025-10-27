/**
 * Banking Integration Type Definitions
 * Frontend types for banking components
 *
 * These types are shared with the backend for consistency.
 * See: apps/backend/src/banking/interfaces/banking-provider.interface.ts
 */

// ============================================================================
// ENUMS - Banking Status
// ============================================================================

/**
 * Banking provider types
 */
export enum BankingProvider {
  MANUAL = 'MANUAL',
  SALTEDGE = 'SALTEDGE',
  TINK = 'TINK',
  YAPILY = 'YAPILY',
  TRUELAYER = 'TRUELAYER',
}

/**
 * Connection status throughout OAuth flow
 */
export enum BankingConnectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AUTHORIZED = 'AUTHORIZED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

/**
 * Sync status for account data
 */
export enum BankingSyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

// ============================================================================
// INTERFACES - Component Props & Data
// ============================================================================

/**
 * Bank account linked through OAuth
 */
export interface BankingAccount {
  id: string;
  userId: string;
  connectionId: string;
  provider: BankingProvider;
  providerAccountId: string;
  name: string;
  iban: string;
  currency: string;
  balance: number;
  availableBalance?: number;
  bankName: string;
  bankCountry?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolderName?: string;
  creditLimit?: number;
  syncStatus: BankingSyncStatus;
  connectionStatus: BankingConnectionStatus;
  linkedAt: Date | string;
  lastSyncedAt?: Date | string;
  expiresAt?: Date | string;
  metadata?: Record<string, unknown>;
}

/**
 * Transaction from linked account
 */
export interface BankingTransaction {
  id: string;
  accountId: string;
  providerTransactionId: string;
  date: Date | string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  merchant?: string;
  reference?: string;
  status: 'pending' | 'completed' | 'cancelled';
  category?: string;
  currency: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response from initiating OAuth link
 */
export interface InitiateLinkResponse {
  connectionId: string;
  redirectUrl: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a sync operation
 */
export interface BankingSyncResult {
  status: BankingSyncStatus;
  accountsSynced: number;
  transactionsSynced: number;
  balanceUpdated: boolean;
  error?: string;
  errorCode?: string;
  startedAt: Date | string;
  completedAt?: Date | string;
}

/**
 * Connection status from provider
 */
export interface ConnectionStatusData {
  status: BankingConnectionStatus;
  authorizedAt?: Date | string;
  expiresAt?: Date | string;
  accounts?: BankingAccount[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// INTERFACES - API Responses
// ============================================================================

/**
 * Standard API response for banking endpoints
 */
export interface BankingApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
  timestamp?: string;
}

/**
 * Paginated response for lists
 */
export interface PaginatedBankingResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if object is a BankingAccount
 */
export function isBankingAccount(value: unknown): value is BankingAccount {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.balance === 'number' &&
    typeof obj.currency === 'string'
  );
}

/**
 * Type guard to check if object is a BankingTransaction
 */
export function isBankingTransaction(value: unknown): value is BankingTransaction {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.accountId === 'string' &&
    typeof obj.amount === 'number' &&
    (obj.type === 'DEBIT' || obj.type === 'CREDIT')
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Supported banking providers
 */
export const SUPPORTED_PROVIDERS = [
  BankingProvider.SALTEDGE,
  BankingProvider.TINK,
  BankingProvider.YAPILY,
  BankingProvider.TRUELAYER,
] as const;

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<BankingProvider, string> = {
  [BankingProvider.MANUAL]: 'Manual Entry',
  [BankingProvider.SALTEDGE]: 'SaltEdge',
  [BankingProvider.TINK]: 'Tink',
  [BankingProvider.YAPILY]: 'Yapily',
  [BankingProvider.TRUELAYER]: 'TrueLayer',
};

/**
 * Sync status descriptions
 */
export const SYNC_STATUS_DESCRIPTIONS: Record<BankingSyncStatus, string> = {
  [BankingSyncStatus.PENDING]: 'Waiting to sync',
  [BankingSyncStatus.SYNCING]: 'Syncing in progress',
  [BankingSyncStatus.SYNCED]: 'Successfully synced',
  [BankingSyncStatus.ERROR]: 'Sync failed',
  [BankingSyncStatus.DISCONNECTED]: 'Account disconnected',
};

/**
 * Connection status descriptions
 */
export const CONNECTION_STATUS_DESCRIPTIONS: Record<BankingConnectionStatus, string> = {
  [BankingConnectionStatus.PENDING]: 'Waiting for authorization',
  [BankingConnectionStatus.IN_PROGRESS]: 'Authorization in progress',
  [BankingConnectionStatus.AUTHORIZED]: 'Connected and authorized',
  [BankingConnectionStatus.REVOKED]: 'Access revoked',
  [BankingConnectionStatus.EXPIRED]: 'Connection expired',
  [BankingConnectionStatus.FAILED]: 'Connection failed',
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Transaction filter options
 */
export interface TransactionFilter {
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
  type?: 'DEBIT' | 'CREDIT';
  status?: 'pending' | 'completed' | 'cancelled';
}

/**
 * Account sort options
 */
export type AccountSortBy = 'name' | 'balance' | 'lastSynced' | 'linkedAt';

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: AccountSortBy;
  sortOrder?: 'asc' | 'desc';
}
