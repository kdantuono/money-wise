import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { BankingProvider, BankingConnectionStatus, BankingSyncStatus, Prisma } from '../../../generated/prisma';
import {
  IBankingProvider,
  IBankingProviderFactory,
  BankingAccountData,
} from '../interfaces/banking-provider.interface';
import { SaltEdgeProvider } from '../providers/saltedge.provider';

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
    saltEdgeProvider: SaltEdgeProvider,
  ) {
    // Register available providers
    this.registerProvider(BankingProvider.SALTEDGE, saltEdgeProvider);
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
 * BankingService - Provider-agnostic business logic
 * Routes requests to appropriate provider based on account/connection configuration
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
   * Initiate banking link for user
   * Returns OAuth URL to redirect user to bank selection
   */
  async initiateBankingLink(
    userId: string,
    provider: BankingProvider = BankingProvider.SALTEDGE,
  ): Promise<{ redirectUrl: string; connectionId: string }> {
    this.logger.log(`Initiating banking link for user ${userId} with provider ${provider}`);

    const bankingProvider = this.getProviderForConnection(provider);

    try {
      // Authenticate with provider first
      await bankingProvider.authenticate();

      // Initiate the link
      const result = await bankingProvider.initiateLink(userId);

      // Store banking connection in database
      const connection = await this.prisma.bankingConnection.create({
        data: {
          userId,
          provider,
          status: BankingConnectionStatus.PENDING,
          // Store provider-specific connection ID based on provider
          ...(provider === BankingProvider.SALTEDGE && {
            saltEdgeConnectionId: result.connectionId,
          }),
          // Other providers would follow similar pattern
          redirectUrl: result.redirectUrl,
          metadata: (result.metadata || {}) as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Banking connection created: ${connection.id} (provider: ${connection.saltEdgeConnectionId})`,
      );

      return {
        redirectUrl: result.redirectUrl,
        connectionId: connection.id, // Return MoneyWise connection ID, not provider's
      };
    } catch (error) {
      this.logger.error('Failed to initiate banking link', error);
      throw new BadRequestException(`Failed to initiate banking link: ${error.message}`);
    }
  }

  /**
   * Complete banking link after user authorization
   * Fetches linked accounts and stores them
   */
  async completeBankingLink(
    userId: string,
    connectionId: string,
  ): Promise<BankingAccountData[]> {
    this.logger.log(`Completing banking link for user ${userId}, connection ${connectionId}`);

    // Find the banking connection
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

      // Get provider-specific connection ID
      const providerConnectionId = this.getProviderConnectionId(connection);

      if (!providerConnectionId) {
        throw new Error('No provider connection ID found');
      }

      // Complete the link and get accounts
      const accounts = await bankingProvider.completeLinkAndGetAccounts(providerConnectionId);

      // Update connection status
      await this.prisma.bankingConnection.update({
        where: { id: connectionId },
        data: {
          status: BankingConnectionStatus.AUTHORIZED,
          authorizedAt: new Date(),
        },
      });

      this.logger.log(
        `Banking link completed: ${accounts.length} accounts retrieved`,
      );

      return accounts;
    } catch (error) {
      this.logger.error('Failed to complete banking link', error);

      // Mark connection as failed
      await this.prisma.bankingConnection.update({
        where: { id: connectionId },
        data: { status: BankingConnectionStatus.FAILED },
      });

      throw new BadRequestException(
        `Failed to complete banking link: ${error.message}`,
      );
    }
  }

  /**
   * Store linked accounts in the database
   * Called after completing the banking link
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
        await this.prisma.account.create({
          data: {
            userId,
            name: account.name,
            accountNumber: account.iban,
            bankingProvider: connection.provider as any,
            // Store provider-specific account ID
            ...(connection.provider === BankingProvider.SALTEDGE && {
              saltEdgeAccountId: account.id,
            }),
            syncStatus: BankingSyncStatus.PENDING as any,
            // Banking metadata
            institutionName: account.bankName,
            currentBalance: account.balance,
            currency: account.currency,
            source: 'SALTEDGE' as any, // Will be dynamic based on provider in future
            type: 'CHECKING' as any, // Default type, can be refined from account.type
            status: 'ACTIVE' as any,
            // Store additional banking metadata in settings JSON
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
      } catch (error) {
        this.logger.warn(
          `Failed to store account ${account.id}: ${error.message}`,
        );
        // Continue with other accounts even if one fails
      }
    }

    this.logger.log(`Stored ${storedCount} accounts from ${accounts.length} retrieved`);

    return storedCount;
  }

  /**
   * Get all linked banking accounts for a user
   */
  async getLinkedAccounts(userId: string): Promise<any[]> {
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
          take: 1, // Latest sync log
        },
      },
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      bankName: account.institutionName,
      balance: account.currentBalance,
      currency: account.currency,
      syncStatus: account.syncStatus,
      lastSynced: account.syncLogs[0]?.completedAt,
      linkedAt: account.createdAt,
      accountNumber: account.accountNumber,
      // Extract metadata from settings if available
      ...(account.settings && typeof account.settings === 'object' && {
        bankCountry: (account.settings as any)?.bankCountry,
        accountHolderName: (account.settings as any)?.accountHolderName,
        accountType: (account.settings as any)?.accountType,
      }),
    }));
  }

  /**
   * Sync an account with its banking provider
   * Fetches latest transactions and balance
   */
  async syncAccount(userId: string, accountId: string): Promise<any> {
    this.logger.log(`Syncing account ${accountId} for user ${userId}`);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        user: true,
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

    if (!account.bankingProvider) {
      throw new BadRequestException('Account is not linked to a banking provider');
    }

    try {
      // Mark sync as started
      await this.prisma.account.update({
        where: { id: accountId },
        data: { syncStatus: BankingSyncStatus.SYNCING },
      });

      // Get provider and connection
      const bankingProvider = this.getProviderForConnection(account.bankingProvider);
      const connection = await this.prisma.bankingConnection.findFirst({
        where: {
          userId,
          provider: account.bankingProvider,
        },
      });

      if (!connection) {
        throw new Error('Banking connection not found');
      }

      const providerConnectionId = this.getProviderConnectionId(connection);
      const providerAccountId = this.getProviderAccountId(account);

      if (!providerConnectionId || !providerAccountId) {
        throw new Error('Provider IDs not found');
      }

      // Perform sync
      const fromDate = account.syncLogs[0]?.completedAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const syncResult = await bankingProvider.syncAccount(
        providerConnectionId,
        providerAccountId,
        fromDate,
      );

      // Store sync log
      const syncLog = await this.prisma.bankingSyncLog.create({
        data: {
          accountId,
          provider: account.bankingProvider,
          status: syncResult.status,
          startedAt: syncResult.startedAt,
          completedAt: syncResult.completedAt,
          accountsSynced: syncResult.accountsSynced,
          transactionsSynced: syncResult.transactionsSynced,
          balanceUpdated: syncResult.balanceUpdated,
          error: syncResult.error,
          errorCode: syncResult.errorCode,
        },
      });

      // Update account sync status
      await this.prisma.account.update({
        where: { id: accountId },
        data: { syncStatus: syncResult.status },
      });

      this.logger.log(
        `Account sync completed: ${syncResult.transactionsSynced} transactions, status: ${syncResult.status}`,
      );

      return {
        syncLogId: syncLog.id,
        status: syncResult.status,
        transactionsSynced: syncResult.transactionsSynced,
        balanceUpdated: syncResult.balanceUpdated,
        error: syncResult.error,
      };
    } catch (error) {
      this.logger.error('Account sync failed', error);

      // Mark account sync as failed
      const _syncLog = await this.prisma.bankingSyncLog.create({
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
   * Get provider-specific connection ID from banking connection
   */
  private getProviderConnectionId(connection: any): string | null {
    switch (connection.provider) {
      case BankingProvider.SALTEDGE:
        return connection.saltEdgeConnectionId;
      // Add other providers as implemented
      default:
        return null;
    }
  }

  /**
   * Get provider-specific account ID from account
   */
  private getProviderAccountId(account: any): string | null {
    switch (account.bankingProvider) {
      case BankingProvider.SALTEDGE:
        return account.saltEdgeAccountId;
      // Add other providers as implemented
      default:
        return null;
    }
  }

  /**
   * Revoke banking connection
   * Called when user wants to disconnect a bank
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

      // Update connection status and linked accounts
      await this.prisma.bankingConnection.update({
        where: { id: connectionId },
        data: { status: BankingConnectionStatus.REVOKED },
      });

      // Mark accounts from this connection as disconnected
      await this.prisma.account.updateMany({
        where: {
          userId,
          bankingProvider: connection.provider,
        },
        data: { syncStatus: BankingSyncStatus.DISCONNECTED },
      });

      this.logger.log(`Banking connection revoked: ${connectionId}`);
    } catch (error) {
      this.logger.error('Failed to revoke banking connection', error);
      throw new BadRequestException(
        `Failed to revoke connection: ${error.message}`,
      );
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
}
