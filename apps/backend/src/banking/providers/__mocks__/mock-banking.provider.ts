import { Injectable, Logger } from '@nestjs/common';
import { BankingProvider, BankingConnectionStatus, BankingSyncStatus } from '../../../../generated/prisma';
import {
  IBankingProvider,
  InitiateLinkResponse,
  BankingAccountData,
  BankingTransactionData,
  BankingSyncResult,
  ConnectionStatusData,
} from '../../interfaces/banking-provider.interface';

/**
 * Mock Banking Provider
 * Provides realistic test data for integration tests without requiring SaltEdge credentials
 *
 * @usage
 * Set USE_MOCK_BANKING=true in test environment
 * This provider will be automatically selected via dependency injection
 *
 * @note
 * When SaltEdge credentials become available:
 * 1. Keep this mock for unit tests
 * 2. Create saltedge-real.integration.spec.ts for real API tests
 * 3. Use feature flags to toggle between mock and real provider
 */
@Injectable()
export class MockBankingProvider implements IBankingProvider {
  private readonly logger = new Logger(MockBankingProvider.name);

  // In-memory storage for mock connections (test isolation)
  private connections: Map<string, ConnectionStatusData> = new Map();
  private accounts: Map<string, BankingAccountData[]> = new Map();
  private transactions: Map<string, BankingTransactionData[]> = new Map();
  // SaltEdge v6 specific mock state
  private saltedgeConnections: Map<string, {
    id: string;
    secret?: string;
    provider_id?: string;
    provider_code: string;
    provider_name: string;
    country_code: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_success_at?: string;
    next_refresh_possible_at?: string;
    show_consent_confirmation?: boolean;
    last_consent_id?: string;
    customer_id?: string;
  }> = new Map();
  private customerConnections: Map<string, string[]> = new Map();

  /**
   * Get provider type
   */
  getProviderType(): BankingProvider {
    return BankingProvider.SALTEDGE;
  }

  /**
   * Mock authentication - always succeeds
   */
  async authenticate(): Promise<void> {
    this.logger.log('🧪 Mock: Authentication successful');
  }

  // ============ SaltEdge v6 specific helpers (mocked) ============
  async createCustomer(identifier: string): Promise<{ id: string; identifier: string }> {
    const id = `mock-customer-${identifier}`;
    this.logger.log(`🧪 Mock: Created SaltEdge customer ${id}`);
    return { id, identifier };
  }

  async createConnectSession(
    customerId: string,
    options?: { returnTo?: string; providerCode?: string; countryCode?: string },
  ): Promise<{ connectUrl: string; expiresAt: Date }> {
    // Create a mock SaltEdge connection immediately (simplified flow)
    const seConnectionId = `se-conn-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const provider_code = options?.providerCode || 'fake_bank_xf';
    const country_code = options?.countryCode || 'XF';
    const provider_name = 'Mock Bank (SaltEdge)';

    this.saltedgeConnections.set(seConnectionId, {
      id: seConnectionId,
      provider_code,
      provider_name,
      country_code,
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
      last_success_at: nowIso,
      customer_id: customerId,
    });

    const list = this.customerConnections.get(customerId) || [];
    list.push(seConnectionId);
    this.customerConnections.set(customerId, list);

    const returnTo = options?.returnTo || 'http://localhost:3000/banking/callback';
    const connectUrl = `https://mock-bank.test/connect?session=${seConnectionId}&connection_id=${seConnectionId}&return_to=${encodeURIComponent(returnTo)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    this.logger.log(`🧪 Mock: Created connect session for customer ${customerId} -> ${seConnectionId}`);
    return { connectUrl, expiresAt };
  }

  async getConnection(connectionId: string): Promise<{
    id: string;
    secret?: string;
    provider_id?: string;
    provider_code: string;
    provider_name: string;
    country_code: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_success_at?: string;
    next_refresh_possible_at?: string;
    show_consent_confirmation?: boolean;
    last_consent_id?: string;
  }> {
    let conn = this.saltedgeConnections.get(connectionId);
    if (!conn) {
      const nowIso = new Date().toISOString();
      conn = {
        id: connectionId,
        provider_code: 'fake_bank_xf',
        provider_name: 'Mock Bank (SaltEdge)',
        country_code: 'XF',
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
        last_success_at: nowIso,
      };
      this.saltedgeConnections.set(connectionId, conn);
    }
    return conn;
  }

  async listConnectionsForCustomer(customerId: string): Promise<Array<{
    id: string;
    secret?: string;
    provider_id?: string;
    provider_code: string;
    provider_name: string;
    country_code: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_success_at?: string;
    next_refresh_possible_at?: string;
  }>> {
    const ids = this.customerConnections.get(customerId) || [];
    return ids.map(id => this.saltedgeConnections.get(id)!).filter(Boolean);
  }

  async findLatestActiveConnection(customerId: string): Promise<{
    id: string;
    secret?: string;
    provider_id?: string;
    provider_code: string;
    provider_name: string;
    country_code: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_success_at?: string;
  } | null> {
    const conns = await this.listConnectionsForCustomer(customerId);
    if (!conns.length) return null;
    const sorted = conns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted[0] || null;
  }

  /**
   * Initiate OAuth flow - returns mock connection ID and redirect URL
   */
  async initiateLink(userId: string): Promise<InitiateLinkResponse> {
    const connectionId = `mock-connection-${userId}-${Date.now()}`;

    this.logger.log(`🧪 Mock: Initiated link for user ${userId}`);

    // Store mock connection
    this.connections.set(connectionId, {
      status: BankingConnectionStatus.PENDING,
      metadata: { mock: true, userId }
    });

    return {
      connectionId,
      redirectUrl: `https://mock-bank.test/authorize?connection=${connectionId}`,
      metadata: {
        mock: true,
        environment: 'test',
        provider: 'MockBankingProvider'
      }
    };
  }

  /**
   * Complete OAuth and return mock accounts
   */
  async completeLinkAndGetAccounts(connectionId: string): Promise<BankingAccountData[]> {
    this.logger.log(`🧪 Mock: Completing link for connection ${connectionId}`);

    // Update connection status
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = BankingConnectionStatus.AUTHORIZED;
      connection.authorizedAt = new Date();
      connection.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
    }

    // Ensure SaltEdge mock connection exists and is active
    await this.getConnection(connectionId);

    // Generate mock accounts
    const mockAccounts: BankingAccountData[] = [
      {
        id: `${connectionId}-account-1`,
        name: 'Mock Checking Account',
        iban: 'GB29NWBK60161331926819',
        currency: 'EUR',
        balance: 2500.75,
        type: 'checking',
        bankName: 'Mock Bank International',
        bankCountry: 'GB',
        accountHolderName: 'Test User',
        status: 'active',
        metadata: { mock: true, accountNumber: '****6819' }
      },
      {
        id: `${connectionId}-account-2`,
        name: 'Mock Savings Account',
        iban: 'GB29NWBK60161331926820',
        currency: 'EUR',
        balance: 10500.00,
        type: 'savings',
        bankName: 'Mock Bank International',
        bankCountry: 'GB',
        accountHolderName: 'Test User',
        status: 'active',
        metadata: { mock: true, accountNumber: '****6820', interestRate: 1.5 }
      }
    ];

    // Store accounts for this connection
    this.accounts.set(connectionId, mockAccounts);

    // Generate mock transactions for each account
    mockAccounts.forEach(account => {
      this.transactions.set(account.id, this.generateMockTransactions(account.id));
    });

    return mockAccounts;
  }

  /**
   * Get accounts for a connection
   */
  async getAccounts(connectionId: string): Promise<BankingAccountData[]> {
    this.logger.log(`🧪 Mock: Getting accounts for connection ${connectionId}`);

    const accounts = this.accounts.get(connectionId);
    if (!accounts) {
      throw new Error(`No accounts found for connection ${connectionId}`);
    }

    return accounts;
  }

  /**
   * Get transactions for an account
   */
  async getTransactions(
    connectionId: string,
    accountId: string,
    fromDate: Date,
    toDate?: Date
  ): Promise<BankingTransactionData[]> {
    this.logger.log(`🧪 Mock: Getting transactions for account ${accountId}`);

    const transactions = this.transactions.get(accountId) || [];

    // Filter by date range
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const matchesFrom = txDate >= fromDate;
      const matchesTo = !toDate || txDate <= toDate;
      return matchesFrom && matchesTo;
    });
  }

  /**
   * Get current balance for an account
   */
  async getBalance(connectionId: string, accountId: string): Promise<number> {
    this.logger.log(`🧪 Mock: Getting balance for account ${accountId}`);

    const accounts = this.accounts.get(connectionId) || [];
    const account = accounts.find(acc => acc.id === accountId);

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    return account.balance;
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(connectionId: string): Promise<ConnectionStatusData> {
    this.logger.log(`🧪 Mock: Getting status for connection ${connectionId}`);

    const connection = this.connections.get(connectionId);
    if (!connection) {
      return {
        status: BankingConnectionStatus.REVOKED,
        metadata: { mock: true, reason: 'Connection not found' }
      };
    }

    // Add accounts to status
    connection.accounts = this.accounts.get(connectionId);

    return connection;
  }

  /**
   * Revoke a connection
   */
  async revokeConnection(connectionId: string): Promise<void> {
    this.logger.log(`🧪 Mock: Revoking connection ${connectionId}`);

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = BankingConnectionStatus.REVOKED;
    }

    // Clean up stored data
    this.connections.delete(connectionId);
    this.accounts.delete(connectionId);
  }

  /**
   * Refresh connection status
   */
  async refreshConnection(connectionId: string): Promise<ConnectionStatusData> {
    this.logger.log(`🧪 Mock: Refreshing connection ${connectionId}`);

    // Mock: connection is always valid after refresh
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = BankingConnectionStatus.AUTHORIZED;
      connection.authorizedAt = new Date();
    }

    return this.getConnectionStatus(connectionId);
  }

  /**
   * Check if connection is valid
   */
  async isConnectionValid(connectionId: string): Promise<boolean> {
    this.logger.log(`🧪 Mock: Checking validity of connection ${connectionId}`);

    const connection = this.connections.get(connectionId);
    return connection?.status === BankingConnectionStatus.AUTHORIZED;
  }

  /**
   * Perform account sync
   */
  async syncAccount(
    connectionId: string,
    accountId: string,
    fromDate: Date
  ): Promise<BankingSyncResult> {
    this.logger.log(`🧪 Mock: Syncing account ${accountId}`);

    const startedAt = new Date();

    // Mock: Get fresh transactions
    const transactions = await this.getTransactions(connectionId, accountId, fromDate);

    // Mock: Balance is updated (we don't return the value, just indicate success)
    await this.getBalance(connectionId, accountId);

    return {
      status: BankingSyncStatus.SYNCED,
      accountsSynced: 1,
      transactionsSynced: transactions.length,
      balanceUpdated: true,
      startedAt,
      completedAt: new Date()
    };
  }

  /**
   * Generate realistic mock transactions
   */
  private generateMockTransactions(accountId: string): BankingTransactionData[] {
    const now = new Date();
    const transactions: BankingTransactionData[] = [];

    // Generate 30 days of mock transactions
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));

      // Random number of transactions per day (0-3)
      const dailyCount = Math.floor(Math.random() * 4);

      for (let j = 0; j < dailyCount; j++) {
        const isCredit = Math.random() > 0.7; // 30% income, 70% expense

        transactions.push({
          id: `${accountId}-tx-${i}-${j}`,
          date,
          amount: Number((Math.random() * 200 + 10).toFixed(2)),
          type: isCredit ? 'CREDIT' : 'DEBIT',
          description: isCredit
            ? this.getMockIncomeDescription()
            : this.getMockExpenseDescription(),
          merchant: isCredit ? 'Mock Employer Ltd' : this.getMockMerchant(),
          reference: `REF-${Date.now()}-${i}-${j}`,
          status: 'completed',
          metadata: { mock: true }
        });
      }
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Generate mock expense description
   */
  private getMockExpenseDescription(): string {
    const descriptions = [
      'Grocery Shopping',
      'Restaurant Payment',
      'Online Purchase',
      'Fuel Station',
      'Pharmacy',
      'Coffee Shop',
      'Subscription Service',
      'Utility Bill Payment',
      'Transportation',
      'Entertainment'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Generate mock income description
   */
  private getMockIncomeDescription(): string {
    const descriptions = [
      'Salary Payment',
      'Freelance Income',
      'Investment Return',
      'Refund',
      'Cashback'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Generate mock merchant name
   */
  private getMockMerchant(): string {
    const merchants = [
      'Mock Supermarket',
      'Mock Coffee Co',
      'Mock Restaurant',
      'Mock Gas Station',
      'Mock Pharmacy',
      'Mock Bookstore',
      'Mock Cinema',
      'Mock Gym',
      'Mock Electronics Store',
      'Mock Clothing Store'
    ];
    return merchants[Math.floor(Math.random() * merchants.length)];
  }

  /**
   * Reset mock data (for test isolation)
   * Call this in beforeEach hooks to ensure clean state
   */
  reset(): void {
    this.connections.clear();
    this.accounts.clear();
    this.transactions.clear();
    this.logger.log('🧪 Mock: Data reset for test isolation');
  }
}
