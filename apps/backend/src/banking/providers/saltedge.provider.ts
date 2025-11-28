import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { BankingProvider, BankingConnectionStatus, BankingSyncStatus } from '../../../generated/prisma';
import {
  IBankingProvider,
  InitiateLinkResponse,
  BankingAccountData,
  BankingTransactionData,
  BankingSyncResult,
  ConnectionStatusData,
} from '../interfaces/banking-provider.interface';

/**
 * SaltEdge API v6 types
 * Based on https://docs.saltedge.com/v6/api_reference/
 */
interface SaltEdgeAccount {
  id: string;
  name: string;
  nature: string;
  balance: number;
  currency_code: string;
  extra?: {
    iban?: string;
    cards?: string[];
    available_amount?: number;
    holder_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SaltEdgeTransaction {
  id: string;
  duplicated: boolean;
  mode: string;
  status: string;
  made_on: string;
  amount: number;
  currency_code: string;
  description: string;
  category?: string;
  extra?: {
    merchant_name?: string;
    mcc?: string;
    original_amount?: number;
    original_currency_code?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SaltEdgeCustomer {
  id?: string;           // v5 API response field
  customer_id?: string;  // v6 API response field
  identifier: string;
  secret?: string;
}

interface SaltEdgeConnection {
  id: string;
  secret: string;
  provider_id: string;
  provider_code: string;
  provider_name: string;
  country_code: string;
  status: string;
  categorization?: string;
  created_at: string;
  updated_at: string;
  last_success_at?: string;
  next_refresh_possible_at?: string;
  show_consent_confirmation?: boolean;
  last_consent_id?: string;
}

/**
 * SaltEdge Provider Implementation (v6 API)
 * Integrates with SaltEdge API v6 for secure open banking integration
 *
 * Documentation: https://docs.saltedge.com/v6/
 * API Reference: https://docs.saltedge.com/v6/api_reference/
 *
 * Key v6 changes from v5:
 * - RSA signature required for all requests
 * - Customer management required (create customer first)
 * - Connect sessions instead of direct connections
 * - Different authentication headers
 */
@Injectable()
export class SaltEdgeProvider implements IBankingProvider {
  private readonly logger = new Logger(SaltEdgeProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly appId: string;
  private readonly secret: string;
  private readonly privateKey: string;
  private readonly apiUrl: string;
  private readonly callbackUrl: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('SALTEDGE_APP_ID', '');
    this.secret = this.configService.get<string>('SALTEDGE_SECRET', '');
    this.apiUrl = this.configService.get<string>(
      'SALTEDGE_API_URL',
      'https://www.saltedge.com/api/v6',
    );
    // OAuth redirect URL (user is redirected here after authorization)
    // This should point to the FRONTEND callback page, not the backend webhook
    this.callbackUrl = this.configService.get<string>(
      'SALTEDGE_CALLBACK_URL',
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000') + '/banking/callback',
    );

    // Load private key for RSA signature
    const privateKeyPath = this.configService.get<string>('SALTEDGE_PRIVATE_KEY_PATH');
    if (privateKeyPath) {
      try {
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        this.logger.log('✅ Loaded SaltEdge private key for RSA signing');
      } catch (error) {
        this.logger.warn(`⚠️ Could not load private key from ${privateKeyPath}: ${error.message}`);
        this.privateKey = '';
      }
    } else {
      this.privateKey = '';
      this.logger.warn('⚠️ SALTEDGE_PRIVATE_KEY_PATH not configured');
    }

    if (!this.appId || !this.secret) {
      throw new Error('SaltEdge credentials not configured (SALTEDGE_APP_ID, SALTEDGE_SECRET required)');
    }

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status code
    });
  }

  /**
   * Get provider type identifier
   */
  getProviderType(): BankingProvider {
    return BankingProvider.SALTEDGE;
  }

  /**
   * Generate RSA signature for v6 API requests
   *
   * Signature format: expiresAt|method|url|body
   * Where:
   * - expiresAt: Unix timestamp (1 hour from now)
   * - method: HTTP method in uppercase
   * - url: Full request URL
   * - body: Request body as JSON string (empty string for GET)
   */
  private generateSignature(method: string, url: string, body: string = ''): {
    signature: string;
    expiresAt: number;
  } {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry
    const signatureData = `${expiresAt}|${method.toUpperCase()}|${url}|${body}`;

    if (!this.privateKey) {
      throw new Error('Private key not configured for RSA signing');
    }

    const sign = crypto.createSign('SHA256');
    sign.update(signatureData);
    const signature = sign.sign(this.privateKey, 'base64');

    return { signature, expiresAt };
  }

  /**
   * Make authenticated request to SaltEdge v6 API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: object,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const bodyStr = body ? JSON.stringify(body) : '';

    const { signature, expiresAt } = this.generateSignature(method, url, bodyStr);

    const headers: Record<string, string> = {
      'App-id': this.appId,
      'Secret': this.secret,
      'Expires-at': expiresAt.toString(),
      'Signature': signature,
      'Content-Type': 'application/json',
    };

    this.logger.debug(`SaltEdge API: ${method} ${path}`);

    const response = await this.httpClient.request({
      method,
      url: path,
      data: body,
      headers,
    });

    if (response.status >= 400) {
      // Handle SaltEdge v6 error format: { error: { class, message } }
      const errorData = response.data?.error;
      const errorMessage = errorData?.message || response.data?.error_message || response.statusText;
      const errorClass = errorData?.class || response.data?.error_class || 'UnknownError';
      this.logger.error(`SaltEdge API error: ${errorClass} - ${errorMessage}`, {
        status: response.status,
        path,
        response: response.data,
      });
      throw new Error(`SaltEdge API error (${errorClass}): ${errorMessage}`);
    }

    return response.data;
  }

  /**
   * Authenticate with SaltEdge API
   * Verifies that credentials and signature are valid
   */
  async authenticate(): Promise<void> {
    try {
      this.logger.debug('Authenticating with SaltEdge v6...');

      // Test authentication by listing countries (lightweight call)
      await this.request<{ data: unknown[] }>('GET', '/countries');

      this.logger.log('✅ SaltEdge v6 authentication successful');
    } catch (error) {
      this.logger.error('SaltEdge authentication failed', error);
      throw error;
    }
  }

  // ============ Customer Management (v6 Required) ============

  /**
   * Create a customer in SaltEdge (or get existing one if duplicate)
   * Required before creating connections in v6
   *
   * @param identifier Unique identifier for customer (e.g., hashed user ID)
   */
  async createCustomer(identifier: string): Promise<SaltEdgeCustomer> {
    this.logger.debug(`Creating SaltEdge customer: ${identifier}`);

    try {
      const response = await this.request<{ data: SaltEdgeCustomer }>('POST', '/customers', {
        data: { identifier },
      });

      const customerId = response.data.customer_id || response.data.id;
      this.logger.log(`Customer created: ${customerId}`);
      // Normalize to use 'id' field for consistency
      return { ...response.data, id: customerId };
    } catch (error) {
      // If customer already exists, look it up
      if (error.message?.includes('DuplicatedCustomer')) {
        this.logger.log(`Customer already exists, looking up by identifier: ${identifier}`);
        const existing = await this.getCustomerByIdentifier(identifier);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Look up customer by identifier
   * v6 API: GET /customers/{customer_identifier}
   */
  async getCustomerByIdentifier(identifier: string): Promise<SaltEdgeCustomer | null> {
    try {
      const response = await this.request<{ data: SaltEdgeCustomer }>(
        'GET',
        `/customers/${encodeURIComponent(identifier)}`,
      );
      this.logger.debug(`Customer lookup response: ${JSON.stringify(response)}`);
      if (response.data) {
        const customerId = response.data.customer_id || response.data.id;
        this.logger.log(`Found existing customer: ${customerId}`);
        // Normalize to use 'id' field for consistency
        return { ...response.data, id: customerId };
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to lookup customer by identifier: ${error.message}`);
      return null;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<SaltEdgeCustomer | null> {
    try {
      const response = await this.request<{ data: SaltEdgeCustomer }>(
        'GET',
        `/customers/${customerId}`,
      );
      return response.data;
    } catch (error) {
      if (error.message?.includes('CustomerNotFound')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete customer and all associated data
   */
  async deleteCustomer(customerId: string): Promise<void> {
    this.logger.debug(`Deleting SaltEdge customer: ${customerId}`);
    await this.request('DELETE', `/customers/${customerId}`);
    this.logger.log(`Customer deleted: ${customerId}`);
  }

  // ============ Connect Sessions (v6 OAuth Flow) ============

  /**
   * Create a connect session for OAuth flow
   * v6 uses connect_sessions instead of direct connection creation
   *
   * @param customerId SaltEdge customer ID
   * @param options Optional provider/country filters
   */
  async createConnectSession(
    customerId: string,
    options?: {
      returnTo?: string;
      providerCode?: string;
      countryCode?: string;
    },
  ): Promise<{ connectUrl: string; expiresAt: Date }> {
    this.logger.debug(`Creating connect session for customer: ${customerId}`);

    // v6 API uses /connections/connect instead of /connect_sessions/create
    // Scopes must be one of: accounts, holder_info, transactions
    const response = await this.request<{ data: { connect_url: string; expires_at: string } }>(
      'POST',
      '/connections/connect',
      {
        data: {
          customer_id: customerId,
          consent: {
            scopes: ['accounts', 'transactions'],
            from_date: this.getDateDaysAgo(90), // 90 days history
          },
          attempt: {
            return_to: options?.returnTo || this.callbackUrl,
            fetch_scopes: ['accounts', 'transactions'],
          },
          // For testing with fake providers
          ...(options?.providerCode && { provider_code: options.providerCode }),
          ...(options?.countryCode && { country_code: options.countryCode }),
        },
      },
    );

    this.logger.log(`Connect session created: ${response.data.connect_url}`);

    return {
      connectUrl: response.data.connect_url,
      expiresAt: new Date(response.data.expires_at),
    };
  }

  /**
   * Create reconnect session for expired connections
   */
  async createReconnectSession(
    connectionId: string,
    returnTo?: string,
  ): Promise<{ reconnectUrl: string }> {
    this.logger.debug(`Creating reconnect session for connection: ${connectionId}`);

    const response = await this.request<{ data: { connect_url: string } }>(
      'POST',
      `/connections/${connectionId}/reconnect`,
      {
        data: {
          return_to: returnTo || this.callbackUrl,
          consent: {
            scopes: ['account_details', 'transactions_details'],
            from_date: this.getDateDaysAgo(90),
          },
        },
      },
    );

    return { reconnectUrl: response.data.connect_url };
  }

  // ============ Connection Management ============

  /**
   * Initiate OAuth flow for user to authorize banking access
   * For v6, this creates a connect session instead of direct connection
   *
   * NOTE: In v6, the customer must exist first. The calling service
   * should ensure the customer is created before calling this.
   */
  async initiateLink(userId: string): Promise<InitiateLinkResponse> {
    // For backward compatibility, we'll use userId as customer identifier
    // The calling service should manage customer creation
    this.logger.warn(
      'initiateLink called directly - v6 requires customer to be created first. ' +
      'Use createCustomer + createConnectSession for proper v6 flow.',
    );

    // Create customer if not exists (simplified flow)
    const customer = await this.createCustomer(userId);

    const { connectUrl, expiresAt } = await this.createConnectSession(customer.id, {
      returnTo: this.callbackUrl,
    });

    return {
      connectionId: customer.id, // Return customer ID, actual connection ID comes from callback
      redirectUrl: connectUrl,
      metadata: {
        customerId: customer.id,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  /**
   * Complete the OAuth flow after user authorization
   * Called when user returns from SaltEdge with connection_id
   */
  async completeLinkAndGetAccounts(connectionId: string): Promise<BankingAccountData[]> {
    this.logger.debug(`Completing link for connection ${connectionId}`);

    // Verify connection is active
    const connection = await this.getConnection(connectionId);

    if (connection.status !== 'active') {
      throw new Error(
        `Connection is not active. Status: ${connection.status}. User may have declined authorization.`,
      );
    }

    // Fetch accounts
    return await this.getAccounts(connectionId);
  }

  /**
   * Get connection details
   */
  async getConnection(connectionId: string): Promise<SaltEdgeConnection> {
    const response = await this.request<{ data: SaltEdgeConnection }>(
      'GET',
      `/connections/${connectionId}`,
    );
    return response.data;
  }

  /**
   * List connections for a customer
   * Used as fallback when webhook doesn't arrive (e.g., local development)
   */
  async listConnectionsForCustomer(customerId: string): Promise<SaltEdgeConnection[]> {
    this.logger.debug(`Listing connections for customer: ${customerId}`);

    const response = await this.request<{ data: SaltEdgeConnection[] }>(
      'GET',
      `/connections?customer_id=${customerId}`,
    );

    const connections = response.data || [];
    this.logger.log(`Found ${connections.length} connections for customer ${customerId}`);

    // Log connection details for debugging
    if (connections.length > 0) {
      this.logger.debug(`Connection details: ${JSON.stringify(
        connections.map(c => ({ id: c.id, status: c.status, created_at: c.created_at }))
      )}`);
    }

    return connections;
  }

  /**
   * Find the most recent active connection for a customer
   * Useful for local development when webhooks aren't available
   *
   * Prioritizes recently created connections (within 5 minutes) regardless of status,
   * since connections may not be immediately "active" after OAuth completion.
   */
  async findLatestActiveConnection(customerId: string): Promise<SaltEdgeConnection | null> {
    const connections = await this.listConnectionsForCustomer(customerId);

    // Sort by created_at descending
    const sortedConnections = connections
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // First try to find a connection created in the last 5 minutes (regardless of status)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentConnection = sortedConnections.find(c =>
      new Date(c.created_at) > fiveMinutesAgo
    );

    if (recentConnection) {
      this.logger.log(`Found recent connection (status: ${recentConnection.status}): ${recentConnection.id}`);
      return recentConnection;
    }

    // Fallback: find most recent active connection
    const activeConnection = sortedConnections.find(c => c.status === 'active');
    if (activeConnection) {
      this.logger.log(`Found active connection: ${activeConnection.id}`);
      return activeConnection;
    }

    this.logger.warn(`No suitable connections found for customer ${customerId}`);
    return null;
  }

  /**
   * Refresh connection to get latest data
   */
  async refreshConnection(connectionId: string): Promise<ConnectionStatusData> {
    this.logger.debug(`Refreshing connection ${connectionId}`);

    await this.request('POST', `/connections/${connectionId}/refresh`);

    // Return updated status
    return await this.getConnectionStatus(connectionId);
  }

  /**
   * Get accounts from a connection
   */
  async getAccounts(connectionId: string): Promise<BankingAccountData[]> {
    this.logger.debug(`Fetching accounts for connection ${connectionId}`);

    const response = await this.request<{ data: SaltEdgeAccount[] }>(
      'GET',
      `/accounts?connection_id=${connectionId}`,
    );

    const accounts = response.data || [];
    this.logger.log(`Fetched ${accounts.length} accounts`);

    return accounts.map((account) => this.mapSaltEdgeAccountToMoneyWise(account, connectionId));
  }

  /**
   * Get transactions for an account
   */
  async getTransactions(
    _connectionId: string,
    accountId: string,
    fromDate: Date,
    toDate?: Date,
  ): Promise<BankingTransactionData[]> {
    this.logger.debug(`Fetching transactions for account ${accountId} from ${fromDate.toISOString()}`);

    const allTransactions: BankingTransactionData[] = [];
    let nextId: string | undefined;

    // Paginate through all transactions
    do {
      const params = new URLSearchParams({
        account_id: accountId,
        from_date: this.formatDateForSaltEdge(fromDate),
      });

      if (toDate) {
        params.append('to_date', this.formatDateForSaltEdge(toDate));
      }

      if (nextId) {
        params.append('from_id', nextId);
      }

      const response = await this.request<{
        data: SaltEdgeTransaction[];
        meta: { next_id?: string };
      }>('GET', `/transactions?${params}`);

      const transactions = response.data || [];
      allTransactions.push(
        ...transactions.map((tx) => this.mapSaltEdgeTransactionToMoneyWise(tx)),
      );

      nextId = response.meta?.next_id;
    } while (nextId);

    this.logger.log(`Fetched ${allTransactions.length} transactions`);
    return allTransactions;
  }

  /**
   * Get balance for an account
   */
  async getBalance(connectionId: string, accountId: string): Promise<number> {
    this.logger.debug(`Fetching balance for account ${accountId}`);

    // Get account which includes balance
    const response = await this.request<{ data: SaltEdgeAccount }>(
      'GET',
      `/accounts/${accountId}`,
    );

    return response.data.balance;
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(connectionId: string): Promise<ConnectionStatusData> {
    this.logger.debug(`Fetching connection status for ${connectionId}`);

    const connection = await this.getConnection(connectionId);
    const accounts = await this.getAccounts(connectionId);

    return {
      status: this.mapSaltEdgeStatusToMoneyWise(connection.status),
      authorizedAt: connection.last_success_at
        ? new Date(connection.last_success_at)
        : undefined,
      expiresAt: connection.next_refresh_possible_at
        ? new Date(connection.next_refresh_possible_at)
        : undefined,
      accounts,
      metadata: {
        saltedgeStatus: connection.status,
        providerCode: connection.provider_code,
        providerName: connection.provider_name,
        countryCode: connection.country_code,
        lastRefresh: connection.last_success_at,
      },
    };
  }

  /**
   * Revoke/disconnect a banking connection
   */
  async revokeConnection(connectionId: string): Promise<void> {
    this.logger.debug(`Revoking connection ${connectionId}`);

    await this.request('DELETE', `/connections/${connectionId}`);

    this.logger.log(`Connection ${connectionId} revoked`);
  }

  /**
   * Check if connection is valid
   */
  async isConnectionValid(connectionId: string): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(connectionId);
      return status.status === BankingConnectionStatus.AUTHORIZED;
    } catch (error) {
      this.logger.warn(`Error checking connection validity: ${error.message}`);
      return false;
    }
  }

  /**
   * Sync account - fetch latest transactions and balance
   */
  async syncAccount(
    connectionId: string,
    accountId: string,
    fromDate: Date,
  ): Promise<BankingSyncResult> {
    const startedAt = new Date();

    try {
      this.logger.debug(`Starting sync for account ${accountId}`);

      // Get current account data
      const balance = await this.getBalance(connectionId, accountId);

      // Get transactions
      const transactions = await this.getTransactions(
        connectionId,
        accountId,
        fromDate,
      );

      this.logger.log(
        `Sync completed: ${transactions.length} transactions, balance: ${balance}`,
      );

      return {
        status: BankingSyncStatus.SYNCED,
        accountsSynced: 1,
        transactionsSynced: transactions.length,
        balanceUpdated: true,
        balance,
        transactions,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Sync failed', error);

      return {
        status: BankingSyncStatus.ERROR,
        accountsSynced: 0,
        transactionsSynced: 0,
        balanceUpdated: false,
        error: error.message,
        errorCode: error.code || 'SYNC_ERROR',
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  // ============ Provider/Institution Listing ============

  /**
   * Get providers (banks) for a country
   */
  async getProviders(countryCode: string = 'IT'): Promise<unknown[]> {
    const response = await this.request<{ data: unknown[] }>(
      'GET',
      `/providers?country_code=${countryCode}`,
    );
    return response.data;
  }

  /**
   * Get fake providers for testing
   * Country code 'XF' returns fake test providers
   */
  async getFakeProviders(): Promise<unknown[]> {
    return this.getProviders('XF');
  }

  // ============ Helper Methods ============

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  private formatDateForSaltEdge(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private mapSaltEdgeAccountToMoneyWise(
    account: SaltEdgeAccount,
    connectionId?: string,
  ): BankingAccountData {
    return {
      id: account.id,
      name: account.name,
      iban: account.extra?.iban || '',
      currency: account.currency_code || 'EUR',
      balance: account.balance || 0,
      type: this.mapAccountType(account.nature),
      bankName: '', // Will be populated from connection data
      bankCountry: '', // Will be populated from connection data
      accountHolderName: account.extra?.holder_name,
      status: 'active',
      metadata: {
        saltedgeId: account.id,
        nature: account.nature,
        connectionId,
        availableAmount: account.extra?.available_amount,
      },
    };
  }

  private mapSaltEdgeTransactionToMoneyWise(
    transaction: SaltEdgeTransaction,
  ): BankingTransactionData {
    const amount = Math.abs(transaction.amount);
    const type = transaction.amount >= 0 ? 'CREDIT' : 'DEBIT';

    return {
      id: transaction.id,
      date: new Date(transaction.made_on),
      amount,
      type,
      description: transaction.description || '',
      merchant: transaction.extra?.merchant_name,
      reference: undefined,
      status: transaction.status === 'posted' ? 'completed' : 'pending',
      metadata: {
        saltedgeId: transaction.id,
        category: transaction.category,
        mcc: transaction.extra?.mcc,
        duplicated: transaction.duplicated,
        mode: transaction.mode,
      },
    };
  }

  private mapSaltEdgeStatusToMoneyWise(status: string): BankingConnectionStatus {
    switch (status) {
      case 'pending':
        return BankingConnectionStatus.PENDING;
      case 'active':
        return BankingConnectionStatus.AUTHORIZED;
      case 'inactive':
      case 'disabled':
        return BankingConnectionStatus.REVOKED;
      case 'expired':
        return BankingConnectionStatus.EXPIRED;
      case 'failed':
        return BankingConnectionStatus.FAILED;
      default:
        return BankingConnectionStatus.PENDING;
    }
  }

  private mapAccountType(nature: string): string {
    const typeMap: Record<string, string> = {
      account: 'checking',
      checking: 'checking',
      savings: 'savings',
      credit_card: 'credit',
      card: 'credit',
      loan: 'loan',
      mortgage: 'loan',
      investment: 'investment',
      bonus: 'savings',
      insurance: 'investment',
    };

    return typeMap[nature?.toLowerCase()] || nature || 'unknown';
  }
}
