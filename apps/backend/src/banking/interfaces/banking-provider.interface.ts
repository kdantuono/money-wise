import { BankingProvider, BankingConnectionStatus, BankingSyncStatus } from '../../../generated/prisma';

/**
 * Response from initiating a banking link (OAuth flow)
 */
export interface InitiateLinkResponse {
  /** Unique connection identifier for this OAuth session */
  connectionId: string;
  /** URL to redirect user to for bank selection and authorization */
  redirectUrl: string;
  /** Optional provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Account data returned from a linked banking connection
 */
export interface BankingAccountData {
  /** Provider-specific account identifier */
  id: string;
  /** Account name/display name */
  name: string;
  /** Account IBAN */
  iban: string;
  /** Account currency (ISO 4217 code) */
  currency: string;
  /** Current balance in the account's currency */
  balance: number;
  /** Account type (checking, savings, credit, etc.) */
  type: string;
  /** Bank name */
  bankName: string;
  /** Bank country (ISO 3166-1 alpha-2) */
  bankCountry: string;
  /** Account holder name */
  accountHolderName?: string;
  /** Account status */
  status: 'active' | 'inactive' | 'closed';
  /** Optional provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Transaction data returned from banking provider
 */
export interface BankingTransactionData {
  /** Provider-specific transaction identifier */
  id: string;
  /** Transaction date */
  date: Date;
  /** Amount (always positive, use type field for direction) */
  amount: number;
  /** Transaction type */
  type: 'DEBIT' | 'CREDIT';
  /** Transaction description/purpose */
  description: string;
  /** Merchant/counterparty name */
  merchant?: string;
  /** Reference/memo field */
  reference?: string;
  /** Transaction status */
  status: 'pending' | 'completed' | 'cancelled';
  /** Optional provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of a sync operation
 */
export interface BankingSyncResult {
  /** Overall sync status */
  status: BankingSyncStatus;
  /** Number of accounts synced */
  accountsSynced: number;
  /** Number of transactions synced */
  transactionsSynced: number;
  /** Whether balance was updated */
  balanceUpdated: boolean;
  /** Error message if sync failed */
  error?: string;
  /** Error code for categorization */
  errorCode?: string;
  /** When sync started */
  startedAt: Date;
  /** When sync completed */
  completedAt?: Date;
}

/**
 * Connection status from provider
 */
export interface ConnectionStatusData {
  /** Connection status */
  status: BankingConnectionStatus;
  /** When authorized (if applicable) */
  authorizedAt?: Date;
  /** When expires (if applicable) */
  expiresAt?: Date;
  /** Accounts available from this connection */
  accounts?: BankingAccountData[];
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Provider-agnostic banking integration interface
 * All banking providers must implement this contract
 */
export interface IBankingProvider {
  /**
   * Get provider type identifier
   */
  getProviderType(): BankingProvider;

  /**
   * Authenticate with provider API
   * Called once during initialization to ensure credentials are valid
   *
   * @throws Error if authentication fails
   */
  authenticate(): Promise<void>;

  /**
   * Initiate OAuth flow for user to authorize banking access
   * Creates a banking connection and returns OAuth redirect URL
   *
   * @param userId - MoneyWise user ID
   * @returns InitiateLinkResponse with OAuth URL and connection ID
   * @throws Error if initiation fails
   */
  initiateLink(userId: string): Promise<InitiateLinkResponse>;

  /**
   * Complete the OAuth flow after user authorization
   * Fetches accounts from the completed connection
   *
   * @param connectionId - Connection ID from initiateLink
   * @returns Array of linked accounts
   * @throws Error if completion fails or user denied access
   */
  completeLinkAndGetAccounts(connectionId: string): Promise<BankingAccountData[]>;

  /**
   * Get accounts from an authorized connection
   *
   * @param connectionId - Connection ID
   * @returns Array of accounts
   * @throws Error if fetch fails
   */
  getAccounts(connectionId: string): Promise<BankingAccountData[]>;

  /**
   * Get transactions for a specific account
   *
   * @param connectionId - Connection ID
   * @param accountId - Provider-specific account ID
   * @param fromDate - Fetch transactions from this date (provider may limit history)
   * @param toDate - Fetch transactions until this date (optional)
   * @returns Array of transactions
   * @throws Error if fetch fails
   */
  getTransactions(
    connectionId: string,
    accountId: string,
    fromDate: Date,
    toDate?: Date,
  ): Promise<BankingTransactionData[]>;

  /**
   * Get current balance for a specific account
   *
   * @param connectionId - Connection ID
   * @param accountId - Provider-specific account ID
   * @returns Current balance in account's native currency
   * @throws Error if fetch fails
   */
  getBalance(connectionId: string, accountId: string): Promise<number>;

  /**
   * Get current status of a connection
   *
   * @param connectionId - Connection ID
   * @returns Connection status data
   * @throws Error if fetch fails
   */
  getConnectionStatus(connectionId: string): Promise<ConnectionStatusData>;

  /**
   * Revoke/disconnect a banking connection
   * User has withdrawn authorization, clean up provider-side resources
   *
   * @param connectionId - Connection ID
   * @throws Error if revocation fails
   */
  revokeConnection(connectionId: string): Promise<void>;

  /**
   * Refresh connection status and verify it's still valid
   *
   * @param connectionId - Connection ID
   * @returns Updated connection status
   * @throws Error if refresh fails
   */
  refreshConnection(connectionId: string): Promise<ConnectionStatusData>;

  /**
   * Check if a connection is still authorized and valid
   *
   * @param connectionId - Connection ID
   * @returns true if valid, false if revoked/expired
   */
  isConnectionValid(connectionId: string): Promise<boolean>;

  /**
   * Perform a full sync for an account
   * Fetch latest transactions, balance, and metadata
   *
   * @param connectionId - Connection ID
   * @param accountId - Provider-specific account ID
   * @param fromDate - Sync transactions from this date
   * @returns Sync result with metadata
   * @throws Error if sync fails
   */
  syncAccount(
    connectionId: string,
    accountId: string,
    fromDate: Date,
  ): Promise<BankingSyncResult>;
}

/**
 * Encryption service for storing sensitive provider data
 */
export interface IEncryptionService {
  /**
   * Encrypt sensitive data (connection secrets, tokens)
   */
  encrypt(data: string): Promise<string>;

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): Promise<string>;
}

/**
 * Provider factory for creating provider instances
 */
export interface IBankingProviderFactory {
  /**
   * Create provider instance for given type
   */
  createProvider(type: BankingProvider): IBankingProvider;

  /**
   * Check if provider is available/implemented
   */
  isProviderAvailable(type: BankingProvider): boolean;
}
