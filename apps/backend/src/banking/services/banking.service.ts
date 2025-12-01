import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import {
  BankingProvider,
  BankingConnectionStatus,
  BankingSyncStatus,
  AccountType,
  AccountStatus,
  AccountSource,
  TransactionType,
  TransactionStatus,
  TransactionSource,
  Account,
  BankingConnection,
  BankingCustomer,
  Prisma,
} from '../../../generated/prisma';
import { AccountSettings } from '../../common/types/domain-types';
import {
  IBankingProvider,
  IBankingProviderFactory,
  BankingAccountData,
  BankingTransactionData,
} from '../interfaces/banking-provider.interface';
import { SaltEdgeProvider } from '../providers/saltedge.provider';
import * as crypto from 'crypto';

/**
 * Provider Factory Implementation
 * Creates and manages banking provider instances
 */
@Injectable()
export class BankingProviderFactory implements IBankingProviderFactory {
  private providers: Map<BankingProvider, IBankingProvider> = new Map();
  private logger = new Logger(BankingProviderFactory.name);

  constructor(
    private configService: ConfigService,
    provider: IBankingProvider,
  ) {
    // Register available providers
    this.registerProvider(BankingProvider.SALTEDGE, provider);
    // TODO: Register other providers as they're implemented
    // this.registerProvider(BankingProvider.TINK, tinkProvider);
    // this.registerProvider(BankingProvider.YAPILY, yapilyProvider);
  }

  /**
   * Register a provider implementation
   */
  private registerProvider(type: BankingProvider, provider: IBankingProvider): void {
    this.providers.set(type, provider);
    this.logger.log(`Provider registered: ${type}`);
  }

  /**
   * Create or get provider instance
   */
  createProvider(type: BankingProvider): IBankingProvider {
    const provider = this.providers.get(type);

    if (!provider) {
      throw new Error(`Banking provider not implemented: ${type}`);
    }

    return provider;
  }

  /**
   * Get SaltEdge provider with v6 specific methods
   */
  getSaltEdgeProvider(): SaltEdgeProvider {
    const provider = this.providers.get(BankingProvider.SALTEDGE);
    if (!provider) {
      throw new Error('SaltEdge provider not available');
    }
    return provider as SaltEdgeProvider;
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(type: BankingProvider): boolean {
    return this.providers.has(type);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): BankingProvider[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * BankingService - Provider-agnostic business logic for v6 API
 * Routes requests to appropriate provider based on account/connection configuration
 *
 * v6 Flow:
 * 1. Create/get customer (once per user per provider)
 * 2. Create connect session with customer ID
 * 3. User completes OAuth
 * 4. Webhook receives connection_id
 * 5. Complete link and store accounts
 */
@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);
  private readonly bankingIntegrationEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private providerFactory: BankingProviderFactory,
  ) {
    this.bankingIntegrationEnabled = this.configService.get<boolean>(
      'BANKING_INTEGRATION_ENABLED',
      false,
    );
  }

  /**
   * Get provider instance for a specific banking connection
   */
  private getProviderForConnection(provider: BankingProvider): IBankingProvider {
    if (!this.bankingIntegrationEnabled) {
      throw new BadRequestException('Banking integration is not enabled');
    }

    return this.providerFactory.createProvider(provider);
  }

  /**
   * Generate a unique identifier for SaltEdge customer
   * Uses SHA256 hash of user ID for privacy
   */
  private generateCustomerIdentifier(userId: string): string {
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 32);
  }

  // ============ Customer Management (v6) ============

  /**
   * Get or create a banking customer for a user
   * v6 API requires customer to exist before creating connections
   */
  async getOrCreateBankingCustomer(
    userId: string,
    provider: BankingProvider = BankingProvider.SALTEDGE,
  ): Promise<BankingCustomer> {
    // Check if customer already exists
    let customer = await this.prisma.bankingCustomer.findUnique({
      where: {
        uq_banking_customer_user_provider: {
          userId,
          provider,
        },
      },
    });

    if (customer) {
      this.logger.debug(`Found existing customer: ${customer.id}`);
      return customer;
    }

    // Create new customer in provider
    const identifier = this.generateCustomerIdentifier(userId);

    if (provider === BankingProvider.SALTEDGE) {
      const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();
      const saltEdgeCustomer = await saltEdgeProvider.createCustomer(identifier);

      // Store customer in database
      customer = await this.prisma.bankingCustomer.create({
        data: {
          userId,
          provider,
          identifier,
          saltEdgeCustomerId: saltEdgeCustomer.id,
        },
      });

      this.logger.log(`Created new customer: ${customer.id} (SaltEdge: ${saltEdgeCustomer.id})`);
    } else {
      throw new BadRequestException(`Provider ${provider} not yet supported for customer creation`);
    }

    return customer;
  }

  // ============ Connection Flow (v6) ============

  /**
   * Initiate banking link for user
   * v6 flow: Create customer -> Create connect session -> Return OAuth URL
   *
   * The return_to URL will include our internal connectionId so the frontend
   * callback can identify which pending connection to complete.
   */
  async initiateBankingLink(
    userId: string,
    provider: BankingProvider = BankingProvider.SALTEDGE,
    options?: {
      providerCode?: string;
      countryCode?: string;
      returnTo?: string;
    },
  ): Promise<{ redirectUrl: string; connectionId: string }> {
    this.logger.log(`Initiating banking link for user ${userId} with provider ${provider}`);

    if (!this.bankingIntegrationEnabled) {
      throw new BadRequestException('Banking integration is not enabled');
    }

    // Step 0: Provider authentication/health check (as tests expect)
    try {
      const providerInstance = this.providerFactory.createProvider(provider);
      await providerInstance.authenticate();
    } catch (err: unknown) {
      this.logger.error('Provider authentication failed', err instanceof Error ? err.message : String(err));
      throw new BadRequestException('Failed to initiate banking link');
    }

    // Step 1: Get or create customer
    const customer = await this.getOrCreateBankingCustomer(userId, provider);

    // Step 2: Create pending connection record FIRST so we have an ID
    const connection = await this.prisma.bankingConnection.create({
      data: {
        userId,
        customerId: customer.id,
        provider,
        status: BankingConnectionStatus.PENDING,
        providerCode: options?.providerCode || null,
        countryCode: options?.countryCode || null,
        metadata: {
          initiatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Banking connection created: ${connection.id}`);

    // Step 3: Build the return_to URL with our internal connectionId
    // SaltEdge will redirect here after OAuth, appending their connection_id
    const frontendUrlConfig = this.configService.get('FRONTEND_URL');
    let frontendBase = 'http://localhost:3000'; // default fallback

    if (frontendUrlConfig) {
      if (typeof frontendUrlConfig === 'string') {
        frontendBase = frontendUrlConfig;
      } else if (typeof (frontendUrlConfig as Record<string, unknown>)?.toString === 'function') {
        frontendBase = String(frontendUrlConfig);
      }
    }

    // Ensure frontendBase is an absolute URL
    if (!frontendBase.match(/^https?:\/\//)) {
      frontendBase = `http://${frontendBase}`;
    }

    // Build absolute returnTo URL
    let baseReturnTo: string;
    if (options?.returnTo) {
      // If returnTo is already absolute (starts with http/https), use it; else resolve against frontendBase
      try {
        new URL(options.returnTo);
        baseReturnTo = options.returnTo;
      } catch {
        baseReturnTo = new URL(options.returnTo, frontendBase).toString();
      }
    } else {
      baseReturnTo = `${frontendBase.replace(/\/+$/, '')}/banking/callback`;
    }

    const returnToUrl = new URL(baseReturnTo);
    returnToUrl.searchParams.set('connectionId', connection.id);
    const returnTo = returnToUrl.toString();
    // Step 4: Create connect session with our callback URL
    let connectUrl: string;
    let expiresAt: Date;

    try {
      if (provider === BankingProvider.SALTEDGE) {
        const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();
        const session = await saltEdgeProvider.createConnectSession(
          customer.saltEdgeCustomerId!,
          {
            returnTo,
            providerCode: options?.providerCode,
            countryCode: options?.countryCode,
          },
        );
        connectUrl = session.connectUrl;
        expiresAt = session.expiresAt;
      } else {
        throw new BadRequestException(`Provider ${provider} not yet supported`);
      }
    } catch (err: unknown) {
      this.logger.error('Failed to create connect session', err instanceof Error ? err.message : String(err));
      throw new BadRequestException('Failed to initiate banking link');
    }

    // Step 5: Update connection with redirect URL, expiry, and pre-known SaltEdge connection id (mock/dev)
    // In real v6, the connection_id arrives via webhook after OAuth. For local/dev mocks,
    // we embed connection_id in the connectUrl to enable end-to-end tests without webhooks.
    let saltEdgeConnectionIdFromUrl: string | null = null;
    try {
      const urlObj = new URL(connectUrl);
      saltEdgeConnectionIdFromUrl = urlObj.searchParams.get('connection_id');
    } catch {
      // ignore URL parse errors
    }

    await this.prisma.bankingConnection.update({
      where: { id: connection.id },
      data: {
        redirectUrl: connectUrl,
        expiresAt,
        ...(saltEdgeConnectionIdFromUrl && { saltEdgeConnectionId: saltEdgeConnectionIdFromUrl }),
      },
    });

    this.logger.log(`Banking connection initiated: ${connection.id}, redirect URL: ${connectUrl}`);

    return {
      redirectUrl: connectUrl,
      connectionId: connection.id,
    };
  }

  /**
   * Handle webhook callback from SaltEdge after OAuth completion
   * Updates connection with actual SaltEdge connection ID
   */
  async handleWebhookCallback(
    customerId: string,
    saltEdgeConnectionId: string,
    stage: 'start' | 'finish' | 'fail',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    this.logger.log(`Webhook callback: customer=${customerId}, connection=${saltEdgeConnectionId}, stage=${stage}`);

    // Find the customer
    const customer = await this.prisma.bankingCustomer.findFirst({
      where: { saltEdgeCustomerId: customerId },
    });

    if (!customer) {
      this.logger.warn(`Customer not found for SaltEdge ID: ${customerId}`);
      return;
    }

    // Find pending connection for this customer
    let connection = await this.prisma.bankingConnection.findFirst({
      where: {
        customerId: customer.id,
        status: BankingConnectionStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Or find existing connection by SaltEdge ID
    if (!connection) {
      connection = await this.prisma.bankingConnection.findFirst({
        where: { saltEdgeConnectionId },
      });
    }

    if (!connection) {
      this.logger.warn(`No connection found for customer: ${customer.id}`);
      return;
    }

    // Update connection based on stage
    switch (stage) {
      case 'start':
        await this.prisma.bankingConnection.update({
          where: { id: connection.id },
          data: {
            status: BankingConnectionStatus.IN_PROGRESS,
            saltEdgeConnectionId,
          },
        });
        break;

      case 'finish': {
        // Fetch connection details from SaltEdge
        const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();
        const connectionData = await saltEdgeProvider.getConnection(saltEdgeConnectionId);

        await this.prisma.bankingConnection.update({
          where: { id: connection.id },
          data: {
            status: BankingConnectionStatus.AUTHORIZED,
            saltEdgeConnectionId,
            providerCode: connectionData.provider_code,
            providerName: connectionData.provider_name,
            countryCode: connectionData.country_code,
            authorizedAt: new Date(),
            lastSuccessAt: connectionData.last_success_at
              ? new Date(connectionData.last_success_at)
              : null,
            metadata: metadata as Prisma.InputJsonValue || {},
          },
        });

        // Auto-fetch and store accounts
        await this.fetchAndStoreAccounts(connection.userId, connection.id, saltEdgeConnectionId);
        break;
      }

      case 'fail':
        await this.prisma.bankingConnection.update({
          where: { id: connection.id },
          data: {
            status: BankingConnectionStatus.FAILED,
            saltEdgeConnectionId,
            metadata: metadata as Prisma.InputJsonValue || {},
          },
        });
        break;
    }
  }

  /**
   * Fetch accounts from provider and store in database
   */
  private async fetchAndStoreAccounts(
    userId: string,
    connectionId: string,
    saltEdgeConnectionId: string,
  ): Promise<void> {
    const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();
    const accounts = await saltEdgeProvider.getAccounts(saltEdgeConnectionId);
    const connectionData = await saltEdgeProvider.getConnection(saltEdgeConnectionId);

    for (const account of accounts) {
      try {
        // Check if account already exists
        const existing = await this.prisma.account.findFirst({
          where: { saltEdgeAccountId: account.id },
        });

        if (existing) {
          // Update existing account
          await this.prisma.account.update({
            where: { id: existing.id },
            data: {
              currentBalance: account.balance,
              syncStatus: BankingSyncStatus.SYNCED,
              lastSyncAt: new Date(),
            },
          });
        } else {
          // Create new account
          await this.prisma.account.create({
            data: {
              userId,
              name: account.name,
              accountNumber: account.iban,
              bankingProvider: BankingProvider.SALTEDGE,
              saltEdgeAccountId: account.id,
              saltEdgeConnectionId,
              syncStatus: BankingSyncStatus.SYNCED,
              institutionName: connectionData.provider_name,
              currentBalance: account.balance,
              currency: account.currency,
              source: AccountSource.SALTEDGE,
              type: this.mapAccountType(account.type),
              status: AccountStatus.ACTIVE,
              lastSyncAt: new Date(),
              settings: {
                bankCountry: connectionData.country_code,
                accountHolderName: account.accountHolderName,
                accountType: account.type,
                provider: BankingProvider.SALTEDGE,
              },
            },
          });
        }

        this.logger.log(`Stored/updated account: ${account.id}`);
      } catch (error) {
        this.logger.warn(`Failed to store account ${account.id}: ${error.message}`);
      }
    }
  }

  /**
   * Complete banking link after user authorization (manual callback)
   * Used when webhook is not available or for manual completion.
   *
   * This method now handles both cases:
   * 1. When saltEdgeConnectionId is already set (via webhook)
   * 2. When saltEdgeConnectionId is provided as a parameter (via frontend redirect)
   *
   * @param userId - The user ID
   * @param connectionId - Our internal connection UUID
   * @param saltEdgeConnectionId - Optional: SaltEdge's connection_id from redirect params
   */
  async completeBankingLink(
    userId: string,
    connectionId: string,
    saltEdgeConnectionId?: string,
  ): Promise<BankingAccountData[]> {
    this.logger.log(`Completing banking link for user ${userId}, connection ${connectionId}, saltEdge: ${saltEdgeConnectionId || 'not provided'}`);

    const connection = await this.prisma.bankingConnection.findUnique({
      where: { id: connectionId },
      include: { customer: true },
    });

    if (!connection) {
      throw new NotFoundException(`Banking connection not found: ${connectionId}`);
    }

    if (connection.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Use provided saltEdgeConnectionId or the one already stored
    let effectiveSaltEdgeId = saltEdgeConnectionId || connection.saltEdgeConnectionId;

    // Fallback: Poll SaltEdge for the latest connection if ID not available
    // This handles local development where webhooks don't work
    if (!effectiveSaltEdgeId && connection.customer?.saltEdgeCustomerId) {
      this.logger.log('SaltEdge connection ID not in redirect URL, polling for latest connection...');

      const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();
      const latestConnection = await saltEdgeProvider.findLatestActiveConnection(
        connection.customer.saltEdgeCustomerId,
      );

      if (latestConnection) {
        effectiveSaltEdgeId = latestConnection.id;
        this.logger.log(`Found active connection via polling: ${effectiveSaltEdgeId}`);
      }
    }

    if (!effectiveSaltEdgeId) {
      throw new BadRequestException(
        'SaltEdge connection ID not available. The OAuth process may not have completed successfully. ' +
        'For local development without webhooks, ensure the connection was fully authorized in the SaltEdge widget.',
      );
    }

    try {
      const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();

      // Update connection with SaltEdge ID if not already set
      if (saltEdgeConnectionId && !connection.saltEdgeConnectionId) {
        await this.prisma.bankingConnection.update({
          where: { id: connectionId },
          data: {
            saltEdgeConnectionId,
            status: BankingConnectionStatus.IN_PROGRESS,
          },
        });
      }

      // Fetch accounts from SaltEdge
      const accounts = await saltEdgeProvider.completeLinkAndGetAccounts(effectiveSaltEdgeId);

      // Get connection details for provider info
      const connectionData = await saltEdgeProvider.getConnection(effectiveSaltEdgeId);

      // Update connection status to authorized
      await this.prisma.bankingConnection.update({
        where: { id: connectionId },
        data: {
          status: BankingConnectionStatus.AUTHORIZED,
          saltEdgeConnectionId: effectiveSaltEdgeId,
          providerCode: connectionData.provider_code,
          providerName: connectionData.provider_name,
          countryCode: connectionData.country_code,
          authorizedAt: new Date(),
          lastSuccessAt: connectionData.last_success_at
            ? new Date(connectionData.last_success_at)
            : new Date(),
        },
      });

      this.logger.log(`Banking link completed: ${accounts.length} accounts retrieved`);

      return accounts;
    } catch (error) {
      this.logger.error('Failed to complete banking link', error);

      await this.prisma.bankingConnection.update({
        where: { id: connectionId },
        data: { status: BankingConnectionStatus.FAILED },
      });

      throw new BadRequestException(`Failed to complete banking link: ${error.message}`);
    }
  }

  /**
   * Store linked accounts in the database
   */
  async storeLinkedAccounts(
    userId: string,
    connectionId: string,
    accounts: BankingAccountData[],
  ): Promise<number> {
    const connection = await this.prisma.bankingConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException(`Banking connection not found: ${connectionId}`);
    }

    if (connection.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    let storedCount = 0;

    for (const account of accounts) {
      try {
        const createdAccount = await this.prisma.account.create({
          data: {
            userId,
            name: account.name,
            accountNumber: account.iban,
            bankingProvider: connection.provider,
            saltEdgeAccountId: account.id,
            saltEdgeConnectionId: connection.saltEdgeConnectionId,
            syncStatus: BankingSyncStatus.PENDING,
            institutionName: account.bankName,
            currentBalance: account.balance,
            currency: account.currency,
            source: AccountSource.SALTEDGE,
            type: this.mapAccountType(account.type),
            status: AccountStatus.ACTIVE,
            settings: {
              bankCountry: account.bankCountry,
              accountHolderName: account.accountHolderName,
              accountType: account.type,
              provider: connection.provider,
            },
          },
        });

        storedCount++;
        this.logger.log(`Stored account: ${account.id}`);

        // Auto-sync transactions for newly linked account (non-blocking)
        // Defer to next tick to avoid test race conditions with spies
        setTimeout(() => {
          this.syncAccount(userId, createdAccount.id)
            .then((result) => {
              this.logger.log(
                `Initial sync completed for account ${createdAccount.id}: ${result.transactionsSynced} transactions`,
              );
            })
            .catch((syncError) => {
              this.logger.warn(
                `Initial sync failed for account ${createdAccount.id}: ${syncError.message}`,
              );
            });
        }, 0);
      } catch (error) {
        this.logger.warn(`Failed to store account ${account.id}: ${error.message}`);
      }
    }

    this.logger.log(`Stored ${storedCount} accounts from ${accounts.length} retrieved`);

    return storedCount;
  }

  /**
   * Get all linked banking accounts for a user
   */
  async getLinkedAccounts(userId: string): Promise<Array<{
    id: string;
    name: string;
    bankName: string | null;
    balance: number;
    currency: string;
    syncStatus: BankingSyncStatus;
    lastSynced: string | null;
    linkedAt: string;
    accountNumber: string | null;
    bankCountry?: string;
    accountHolderName?: string;
    accountType?: string;
  }>> {
    this.logger.log(`Fetching linked accounts for user ${userId}`);

    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        bankingProvider: {
          not: null,
        },
      },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      bankName: account.institutionName,
      balance: account.currentBalance.toNumber(),
      currency: account.currency,
      syncStatus: account.syncStatus,
      lastSynced: account.syncLogs[0]?.completedAt?.toISOString() ?? null,
      linkedAt: account.createdAt.toISOString(),
      accountNumber: account.accountNumber,
      ...(account.settings && typeof account.settings === 'object' && {
        bankCountry: (account.settings as AccountSettings)?.banking?.bankCountry,
        accountHolderName: (account.settings as AccountSettings)?.banking?.accountHolderName,
        accountType: (account.settings as AccountSettings)?.banking?.accountType,
      }),
    }));
  }

  /**
   * Sync an account with its banking provider
   */
  async syncAccount(userId: string, accountId: string): Promise<{
    syncLogId: string;
    status: BankingSyncStatus;
    transactionsSynced: number;
    balanceUpdated: boolean;
    error?: string;
  }> {
    this.logger.log(`Syncing account ${accountId} for user ${userId}`);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Account not found: ${accountId}`);
    }

    if (account.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    if (!account.bankingProvider || !account.saltEdgeConnectionId) {
      throw new BadRequestException('Account is not linked to a banking provider');
    }

    try {
      // Mark sync as started
      await this.prisma.account.update({
        where: { id: accountId },
        data: { syncStatus: BankingSyncStatus.SYNCING },
      });

      const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();

      const fromDate = account.syncLogs[0]?.completedAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const syncResult = await saltEdgeProvider.syncAccount(
        account.saltEdgeConnectionId,
        account.saltEdgeAccountId!,
        fromDate,
      );

      // Handle deleted external resources (permanent 404 from SaltEdge)
      // This indicates the account/connection was deleted on SaltEdge's side
      // and we need to clean up our stale references
      if (syncResult.isResourceDeleted) {
        this.logger.warn(
          `SaltEdge resource deleted for account ${accountId}, cleaning up stale references`,
          { saltEdgeAccountId: account.saltEdgeAccountId, saltEdgeConnectionId: account.saltEdgeConnectionId },
        );

        // Clear stale SaltEdge references and set status to ERROR
        await this.prisma.account.update({
          where: { id: accountId },
          data: {
            saltEdgeAccountId: null,
            saltEdgeConnectionId: null,
            syncStatus: BankingSyncStatus.ERROR,
          },
        });

        // Also update the associated BankingConnection to REVOKED
        // (external resource deleted = connection effectively revoked)
        if (account.saltEdgeConnectionId) {
          await this.prisma.bankingConnection.updateMany({
            where: { saltEdgeConnectionId: account.saltEdgeConnectionId },
            data: { status: BankingConnectionStatus.REVOKED },
          });
        }

        // Store sync log with resource deletion info
        const syncLog = await this.prisma.bankingSyncLog.create({
          data: {
            accountId,
            provider: account.bankingProvider,
            status: BankingSyncStatus.ERROR,
            startedAt: syncResult.startedAt,
            completedAt: syncResult.completedAt,
            accountsSynced: 0,
            transactionsSynced: 0,
            balanceUpdated: false,
            error: 'External banking connection no longer exists. Please re-link your account.',
            errorCode: 'RESOURCE_DELETED',
          },
        });

        return {
          syncLogId: syncLog.id,
          status: BankingSyncStatus.ERROR,
          transactionsSynced: 0,
          balanceUpdated: false,
          error: 'External banking connection no longer exists. Please re-link your account.',
        };
      }

      // Store transactions
      let storedTransactionsCount = 0;
      if (syncResult.transactions && syncResult.transactions.length > 0) {
        storedTransactionsCount = await this.storeTransactions(
          accountId,
          account.userId,
          syncResult.transactions,
        );
      }

      // Store sync log
      const syncLog = await this.prisma.bankingSyncLog.create({
        data: {
          accountId,
          provider: account.bankingProvider,
          status: syncResult.status,
          startedAt: syncResult.startedAt,
          completedAt: syncResult.completedAt,
          accountsSynced: syncResult.accountsSynced,
          transactionsSynced: storedTransactionsCount,
          balanceUpdated: syncResult.balanceUpdated,
          error: syncResult.error,
          errorCode: syncResult.errorCode,
        },
      });

      // Update account sync status and balance
      await this.prisma.account.update({
        where: { id: accountId },
        data: {
          syncStatus: syncResult.status,
          lastSyncAt: new Date(),
          ...(syncResult.balance !== undefined && { currentBalance: syncResult.balance }),
        },
      });

      this.logger.log(
        `Account sync completed: ${storedTransactionsCount} transactions stored, status: ${syncResult.status}`,
      );

      return {
        syncLogId: syncLog.id,
        status: syncResult.status,
        transactionsSynced: storedTransactionsCount,
        balanceUpdated: syncResult.balanceUpdated,
        error: syncResult.error,
      };
    } catch (error) {
      this.logger.error('Account sync failed', error);

      await this.prisma.bankingSyncLog.create({
        data: {
          accountId,
          provider: account.bankingProvider,
          status: BankingSyncStatus.ERROR,
          startedAt: new Date(),
          completedAt: new Date(),
          error: error.message,
          errorCode: 'SYNC_ERROR',
          accountsSynced: 0,
          transactionsSynced: 0,
        },
      });

      await this.prisma.account.update({
        where: { id: accountId },
        data: { syncStatus: BankingSyncStatus.ERROR },
      });

      throw new BadRequestException(`Failed to sync account: ${error.message}`);
    }
  }

  /**
   * Map account type string to enum
   */
  private mapAccountType(type: string): AccountType {
    const typeMap: Record<string, AccountType> = {
      checking: AccountType.CHECKING,
      savings: AccountType.SAVINGS,
      credit: AccountType.CREDIT_CARD,
      credit_card: AccountType.CREDIT_CARD,
      loan: AccountType.LOAN,
      mortgage: AccountType.MORTGAGE,
      investment: AccountType.INVESTMENT,
    };
    return typeMap[type?.toLowerCase()] || AccountType.OTHER;
  }

  /**
   * Store transactions from a sync operation
   * Uses upsert pattern to handle duplicates
   */
  private async storeTransactions(
    accountId: string,
    userId: string,
    transactions: BankingTransactionData[],
  ): Promise<number> {
    let storedCount = 0;

    for (const tx of transactions) {
      try {
        // Check if transaction already exists
        const existing = await this.prisma.transaction.findFirst({
          where: { saltEdgeTransactionId: tx.id },
        });

        if (existing) {
          // Update existing transaction
          await this.prisma.transaction.update({
            where: { id: existing.id },
            data: {
              amount: Math.abs(tx.amount),
              status: this.mapTransactionStatus(tx.status),
              description: tx.description,
              merchantName: tx.merchant,
              reference: tx.reference,
              isPending: tx.status === 'pending',
            },
          });
        } else {
          // Create new transaction
          await this.prisma.transaction.create({
            data: {
              accountId,
              amount: Math.abs(tx.amount),
              type: tx.type === 'DEBIT' ? TransactionType.DEBIT : TransactionType.CREDIT,
              status: this.mapTransactionStatus(tx.status),
              source: TransactionSource.SALTEDGE,
              currency: 'EUR', // Default for SaltEdge, should be from account
              date: new Date(tx.date),
              description: tx.description,
              merchantName: tx.merchant,
              reference: tx.reference,
              isPending: tx.status === 'pending',
              saltEdgeTransactionId: tx.id,
            },
          });
          storedCount++;
        }
      } catch (error) {
        this.logger.warn(`Failed to store transaction ${tx.id}: ${error.message}`);
      }
    }

    this.logger.log(`Stored ${storedCount} new transactions out of ${transactions.length}`);
    return storedCount;
  }

  /**
   * Map transaction status from provider to Prisma enum
   */
  private mapTransactionStatus(status: 'pending' | 'completed' | 'cancelled'): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      pending: TransactionStatus.PENDING,
      completed: TransactionStatus.POSTED,
      cancelled: TransactionStatus.CANCELLED,
    };
    return statusMap[status] || TransactionStatus.POSTED;
  }

  /**
   * Get provider-specific connection ID from banking connection
   */
  private getProviderConnectionId(connection: BankingConnection): string | null {
    switch (connection.provider) {
      case BankingProvider.SALTEDGE:
        return connection.saltEdgeConnectionId;
      default:
        return null;
    }
  }

  /**
   * Get provider-specific account ID from account
   */
  private getProviderAccountId(account: Account): string | null {
    switch (account.bankingProvider) {
      case BankingProvider.SALTEDGE:
        return account.saltEdgeAccountId;
      default:
        return null;
    }
  }

  /**
   * Revoke banking connection
   */
  async revokeBankingConnection(userId: string, connectionId: string): Promise<void> {
    this.logger.log(`Revoking banking connection ${connectionId} for user ${userId}`);

    const connection = await this.prisma.bankingConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException(`Banking connection not found: ${connectionId}`);
    }

    if (connection.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    try {
      const bankingProvider = this.getProviderForConnection(connection.provider);
      const providerConnectionId = this.getProviderConnectionId(connection);

      if (providerConnectionId) {
        await bankingProvider.revokeConnection(providerConnectionId);
      }

      // Update connection status
      await this.prisma.bankingConnection.update({
        where: { id: connectionId },
        data: { status: BankingConnectionStatus.REVOKED },
      });

      // Mark accounts from this connection as disconnected
      const primaryUpdate = await this.prisma.account.updateMany({
        where: {
          userId,
          saltEdgeConnectionId: providerConnectionId ?? undefined,
        },
        data: { syncStatus: BankingSyncStatus.DISCONNECTED },
      });

      // Fallback: if no accounts matched (e.g., provider connection id cleared earlier),
      // disconnect any SALTEDGE accounts for this user that have no connection id
      if (primaryUpdate.count === 0) {
        await this.prisma.account.updateMany({
          where: {
            userId,
            bankingProvider: connection.provider,
            saltEdgeConnectionId: null,
          },
          data: { syncStatus: BankingSyncStatus.DISCONNECTED },
        });
      }

      this.logger.log(`Banking connection revoked: ${connectionId}`);
    } catch (error) {
      this.logger.error('Failed to revoke banking connection', error);
      throw new BadRequestException(`Failed to revoke connection: ${error.message}`);
    }
  }

  /**
   * Get available banking providers
   */
  getAvailableProviders(): BankingProvider[] {
    return this.providerFactory.getAvailableProviders();
  }

  /**
   * Check if banking integration is enabled
   */
  isBankingEnabled(): boolean {
    return this.bankingIntegrationEnabled;
  }

  /**
   * Get fake providers for testing (country XF)
   */
  async getFakeProviders(): Promise<unknown[]> {
    if (!this.bankingIntegrationEnabled) {
      throw new BadRequestException('Banking integration is not enabled');
    }

    const saltEdgeProvider = this.providerFactory.getSaltEdgeProvider();
    return saltEdgeProvider.getFakeProviders();
  }
}
