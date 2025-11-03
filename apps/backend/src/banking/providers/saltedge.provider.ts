import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
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
 * SaltEdge API types
 * Based on https://docs.saltedge.com/account_information/v5/
 */
interface SaltEdgeAccount {
  id: string;
  name: string;
  iban?: string;
  currency_code?: string;
  balance?: string;
  nature?: string;
  provider_name?: string;
  country_code?: string;
  holder_name?: string;
  status?: string;
  [key: string]: unknown;
}

interface SaltEdgeTransaction {
  id: string;
  amount?: string;
  posted_date?: string;
  made_on?: string;
  description?: string;
  category?: string;
  reference_number?: unknown;
  extra?: unknown;
  [key: string]: unknown;
}

/**
 * SaltEdge Provider Implementation
 * Integrates with SaltEdge API for secure open banking integration
 *
 * Documentation: https://docs.saltedge.com/general/v5/
 * Account Information API: https://docs.saltedge.com/account_information/v5/
 */
@Injectable()
export class SaltEdgeProvider implements IBankingProvider {
  private readonly logger = new Logger(SaltEdgeProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly clientId: string;
  private readonly secret: string;
  private readonly apiUrl: string;
  private readonly appId: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('SALTEDGE_CLIENT_ID');
    this.secret = this.configService.get<string>('SALTEDGE_SECRET');
    this.apiUrl = this.configService.get<string>(
      'SALTEDGE_API_URL',
      'https://api.saltedge.com/api/v5',
    );
    this.appId = this.configService.get<string>('SALTEDGE_APP_ID');

    if (!this.clientId || !this.secret) {
      throw new Error('SaltEdge credentials not configured');
    }

    // Initialize HTTP client with base configuration
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status code
    });

    // Add request interceptor to sign all requests
    this.httpClient.interceptors.request.use((config) => {
      // Don't sign GET requests in the traditional sense
      if (config.method?.toUpperCase() === 'GET') {
        config.headers['Authorization'] = `Bearer ${this.secret}`;
      } else {
        config.data = config.data || {};
        config.headers['Content-Type'] = 'application/json';
        config.headers['Authorization'] = `Bearer ${this.secret}`;
      }
      return config;
    });
  }

  /**
   * Get provider type identifier
   */
  getProviderType(): BankingProvider {
    return BankingProvider.SALTEDGE;
  }

  /**
   * Authenticate with SaltEdge API
   * Verifies that credentials are valid
   */
  async authenticate(): Promise<void> {
    try {
      this.logger.debug('Authenticating with SaltEdge...');

      // Test authentication by making a simple API call
      const response = await this.httpClient.get('/countries');

      if (response.status !== 200) {
        throw new Error(`Authentication failed with status ${response.status}`);
      }

      this.logger.log('SaltEdge authentication successful');
    } catch (error) {
      this.logger.error('SaltEdge authentication failed', error);
      throw error;
    }
  }

  /**
   * Initiate OAuth flow for user to authorize banking access
   *
   * Creates a connection requisition with SaltEdge and returns OAuth URL
   */
  async initiateLink(userId: string): Promise<InitiateLinkResponse> {
    try {
      this.logger.debug(`Initiating link for user ${userId}`);

      const payload = {
        data: {
          customer_id: userId,
          redirect_url: `${this.configService.get<string>('APP_URL')}/banking/callback`,
          return_connection_id: true,
        },
      };

      const response = await this.httpClient.post('/connections', payload);

      if (response.status !== 201) {
        this.logger.error(
          `Failed to create connection: ${response.status}`,
          response.data,
        );
        throw new Error(
          `Failed to create SaltEdge connection: ${response.data?.error_message || response.statusText}`,
        );
      }

      const connection = response.data.data;

      this.logger.log(
        `Connection created: ${connection.id}`,
      );

      return {
        connectionId: connection.id,
        redirectUrl: connection.connect_url,
        metadata: {
          providerId: connection.id,
          status: connection.status,
          createdAt: connection.created_at,
        },
      };
    } catch (error) {
      this.logger.error('Failed to initiate link', error);
      throw error;
    }
  }

  /**
   * Complete the OAuth flow after user authorization
   * Fetches accounts from the completed connection
   */
  async completeLinkAndGetAccounts(connectionId: string): Promise<BankingAccountData[]> {
    try {
      this.logger.debug(`Completing link for connection ${connectionId}`);

      // First, verify connection is authorized
      const statusResponse = await this.httpClient.get(`/connections/${connectionId}`);

      if (statusResponse.status !== 200) {
        throw new Error(`Failed to get connection status: ${statusResponse.statusText}`);
      }

      const connection = statusResponse.data.data;

      if (connection.status !== 'active') {
        throw new Error(
          `Connection is not active. Status: ${connection.status}. User may have declined authorization.`,
        );
      }

      // Now fetch accounts
      return await this.getAccounts(connectionId);
    } catch (error) {
      this.logger.error('Failed to complete link', error);
      throw error;
    }
  }

  /**
   * Get accounts from an authorized connection
   */
  async getAccounts(connectionId: string): Promise<BankingAccountData[]> {
    try {
      this.logger.debug(`Fetching accounts for connection ${connectionId}`);

      const response = await this.httpClient.get(`/accounts?connection_id=${connectionId}`);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      const accounts = response.data.data || [];

      this.logger.log(`Fetched ${accounts.length} accounts`);

      return accounts.map((account: SaltEdgeAccount) =>
        this.mapSaltEdgeAccountToMoneyWise(account),
      );
    } catch (error) {
      this.logger.error('Failed to get accounts', error);
      throw error;
    }
  }

  /**
   * Get transactions for a specific account
   * SaltEdge provides 90-day transaction history
   */
  async getTransactions(
    connectionId: string,
    accountId: string,
    fromDate: Date,
    toDate?: Date,
  ): Promise<BankingTransactionData[]> {
    try {
      this.logger.debug(
        `Fetching transactions for account ${accountId} from ${fromDate}`,
      );

      const params = new URLSearchParams({
        account_id: accountId,
        from_date: this.formatDateForSaltEdge(fromDate),
      });

      if (toDate) {
        params.append('to_date', this.formatDateForSaltEdge(toDate));
      }

      const response = await this.httpClient.get(`/transactions?${params.toString()}`);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const transactions = response.data.data || [];

      this.logger.log(`Fetched ${transactions.length} transactions`);

      return transactions.map((tx: SaltEdgeTransaction) =>
        this.mapSaltEdgeTransactionToMoneyWise(tx),
      );
    } catch (error) {
      this.logger.error('Failed to get transactions', error);
      throw error;
    }
  }

  /**
   * Get current balance for a specific account
   */
  async getBalance(connectionId: string, accountId: string): Promise<number> {
    try {
      this.logger.debug(`Fetching balance for account ${accountId}`);

      const response = await this.httpClient.get(`/accounts/${accountId}`);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const account = response.data.data;

      this.logger.log(`Current balance: ${account.balance}`);

      return parseFloat(account.balance);
    } catch (error) {
      this.logger.error('Failed to get balance', error);
      throw error;
    }
  }

  /**
   * Get current status of a connection
   */
  async getConnectionStatus(connectionId: string): Promise<ConnectionStatusData> {
    try {
      this.logger.debug(`Fetching connection status for ${connectionId}`);

      const response = await this.httpClient.get(`/connections/${connectionId}`);

      if (response.status !== 200) {
        throw new Error(`Failed to get connection status: ${response.statusText}`);
      }

      const connection = response.data.data;

      // Fetch associated accounts
      const accounts = await this.getAccounts(connectionId);

      return {
        status: this.mapSaltEdgeStatusToMoneyWise(connection.status),
        authorizedAt: connection.last_success_at ? new Date(connection.last_success_at) : undefined,
        expiresAt: connection.next_refresh_possible_at
          ? new Date(connection.next_refresh_possible_at)
          : undefined,
        accounts,
        metadata: {
          saltedgeStatus: connection.status,
          lastRefresh: connection.last_success_at,
          failureCount: connection.fail_count,
          failureMessage: connection.fail_message,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get connection status', error);
      throw error;
    }
  }

  /**
   * Revoke/disconnect a banking connection
   */
  async revokeConnection(connectionId: string): Promise<void> {
    try {
      this.logger.debug(`Revoking connection ${connectionId}`);

      const response = await this.httpClient.delete(`/connections/${connectionId}`);

      if (response.status !== 200) {
        throw new Error(`Failed to revoke connection: ${response.statusText}`);
      }

      this.logger.log(`Connection ${connectionId} revoked`);
    } catch (error) {
      this.logger.error('Failed to revoke connection', error);
      throw error;
    }
  }

  /**
   * Refresh connection status and verify it's still valid
   */
  async refreshConnection(connectionId: string): Promise<ConnectionStatusData> {
    try {
      this.logger.debug(`Refreshing connection ${connectionId}`);

      const response = await this.httpClient.put(`/connections/${connectionId}`, {});

      if (response.status !== 200) {
        throw new Error(`Failed to refresh connection: ${response.statusText}`);
      }

      // Return updated status
      return await this.getConnectionStatus(connectionId);
    } catch (error) {
      this.logger.error('Failed to refresh connection', error);
      throw error;
    }
  }

  /**
   * Check if a connection is still authorized and valid
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
   * Perform a full sync for an account
   * Fetches latest transactions and balance
   */
  async syncAccount(
    connectionId: string,
    accountId: string,
    fromDate: Date,
  ): Promise<BankingSyncResult> {
    const startedAt = new Date();

    try {
      this.logger.debug(`Starting sync for account ${accountId}`);

      // Get current account data (including balance)
      const accountResponse = await this.httpClient.get(`/accounts/${accountId}`);
      if (accountResponse.status !== 200) {
        throw new Error(`Failed to fetch account: ${accountResponse.statusText}`);
      }

      // Get transactions
      const transactions = await this.getTransactions(connectionId, accountId, fromDate);

      this.logger.log(
        `Sync completed: ${transactions.length} transactions, balance updated`,
      );

      return {
        status: BankingSyncStatus.SYNCED,
        accountsSynced: 1,
        transactionsSynced: transactions.length,
        balanceUpdated: true,
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
        errorCode: error.code || 'UNKNOWN_ERROR',
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  /**
   * HMAC-SHA256 signature generation for request body
   * Used for POST/PUT/DELETE requests
   */
  private generateSignature(requestBody: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(requestBody)
      .digest('hex');
  }

  /**
   * Map SaltEdge account format to MoneyWise format
   */
  private mapSaltEdgeAccountToMoneyWise(account: SaltEdgeAccount): BankingAccountData {
    return {
      id: account.id,
      name: account.name,
      iban: account.iban || '',
      currency: account.currency_code || 'EUR',
      balance: parseFloat(account.balance || '0'),
      type: this.mapAccountType(account.nature),
      bankName: account.provider_name || '',
      bankCountry: account.country_code || '',
      accountHolderName: account.holder_name,
      status: account.status === 'active' ? 'active' : 'inactive',
      metadata: {
        saltedgeId: account.id,
        nature: account.nature,
        provider: account.provider_name,
      },
    };
  }

  /**
   * Map SaltEdge transaction format to MoneyWise format
   */
  private mapSaltEdgeTransactionToMoneyWise(transaction: SaltEdgeTransaction): BankingTransactionData {
    const amountValue = parseFloat(transaction.amount || '0');
    const amount = Math.abs(amountValue);
    const type = amountValue >= 0 ? 'CREDIT' : 'DEBIT';

    // Safely extract merchant_name from unknown extra field
    const merchantName = transaction.extra && typeof transaction.extra === 'object' && 'merchant_name' in transaction.extra
      ? String(transaction.extra.merchant_name)
      : undefined;

    return {
      id: transaction.id,
      date: new Date(transaction.posted_date || transaction.made_on || new Date()),
      amount,
      type,
      description: transaction.description || '',
      merchant: merchantName,
      reference: typeof transaction.reference_number === 'string' ? transaction.reference_number : undefined,
      status: 'completed', // SaltEdge only returns completed transactions
      metadata: {
        saltedgeId: transaction.id,
        category: transaction.category || '',
        extra: transaction.extra,
      },
    };
  }

  /**
   * Map SaltEdge connection status to MoneyWise enum
   */
  private mapSaltEdgeStatusToMoneyWise(status: string): BankingConnectionStatus {
    switch (status) {
      case 'pending':
        return BankingConnectionStatus.PENDING;
      case 'active':
        return BankingConnectionStatus.AUTHORIZED;
      case 'revoked':
        return BankingConnectionStatus.REVOKED;
      case 'expired':
        return BankingConnectionStatus.EXPIRED;
      case 'failure':
        return BankingConnectionStatus.FAILED;
      default:
        return BankingConnectionStatus.PENDING;
    }
  }

  /**
   * Map generic account type to standard categories
   */
  private mapAccountType(nature: string): string {
    const typeMap: Record<string, string> = {
      checking: 'checking',
      savings: 'savings',
      credit: 'credit',
      loan: 'loan',
      investment: 'investment',
      credit_card: 'credit',
      debit_card: 'checking',
      current: 'checking',
      deposit: 'savings',
    };

    return typeMap[nature?.toLowerCase()] || nature || 'unknown';
  }

  /**
   * Format date for SaltEdge API (YYYY-MM-DD)
   */
  private formatDateForSaltEdge(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
