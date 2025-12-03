import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BankingService, BankingProviderFactory } from '../../../src/banking/services/banking.service';
import { MockBankingProvider } from '../../../src/banking/providers/__mocks__/mock-banking.provider';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { setupTestDatabase, teardownTestDatabase } from '../../../src/core/database/tests/database-test.config';
import {
  BankingProvider,
  BankingConnectionStatus,
  BankingSyncStatus,
  AccountSource,
  PrismaClient,
  UserRole,
} from '../../../generated/prisma';

/**
 * BankingService Integration Tests
 *
 * Purpose: Test banking service business logic with real database operations
 * Pattern: Integration tests with MockBankingProvider (no external API calls)
 *
 * Coverage Target: 14.51% → 80%+
 *
 * Test Structure:
 * 1. BankingProviderFactory - provider creation and management
 * 2. initiateBankingLink() - OAuth flow initiation
 * 3. completeBankingLink() - OAuth completion and account retrieval
 * 4. storeLinkedAccounts() - Account storage in database
 * 5. getLinkedAccounts() - Account retrieval
 * 6. syncAccount() - Account synchronization
 * 7. revokeBankingConnection() - Connection revocation
 * 8. Helper methods - getAvailableProviders(), isBankingEnabled()
 */
describe('BankingService (Integration)', () => {
  let service: BankingService;
  let providerFactory: BankingProviderFactory;
  let mockProvider: MockBankingProvider;
  let prisma: PrismaClient;
  let configService: ConfigService;
  let testUserId: string;
  let testFamilyId: string;

  beforeAll(async () => {
    // Setup test database
    prisma = await setupTestDatabase();

    // Create mock provider instance
    mockProvider = new MockBankingProvider();

    // Create mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'BANKING_INTEGRATION_ENABLED') {
          return true;
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BankingProviderFactory,
          useFactory: (config: ConfigService) => {
            // Cast to any to avoid type mismatch with SaltEdgeProvider
            return new BankingProviderFactory(config, mockProvider as any);
          },
          inject: [ConfigService],
        },
      ],
    }).compile();

    service = module.get<BankingService>(BankingService);
    providerFactory = module.get<BankingProviderFactory>(BankingProviderFactory);
    configService = module.get<ConfigService>(ConfigService);

    // Create test family
    const family = await prisma.family.create({
      data: {
        name: 'Test Banking Family',
      },
    });
    testFamilyId = family.id;
  });

  beforeEach(async () => {
    // Create unique test user for each test
    const user = await prisma.user.create({
      data: {
        email: `test-banking-${Date.now()}@example.com`,
        passwordHash: 'hash123',
        firstName: 'Test',
        lastName: 'Banking',
        role: UserRole.MEMBER,
        status: 'ACTIVE',
        familyId: testFamilyId,
      },
    });
    testUserId = user.id;

    // Reset mock provider state
    mockProvider.reset();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.bankingConnection.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.account.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });

    // Restore all mocks/spies to clean state for next test
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // ======================
  // BankingProviderFactory
  // ======================

  describe('BankingProviderFactory', () => {
    it('should create provider instance for SALTEDGE', () => {
      const provider = providerFactory.createProvider(BankingProvider.SALTEDGE);

      expect(provider).toBeDefined();
      expect(provider.getProviderType()).toBe(BankingProvider.SALTEDGE);
    });

    it('should throw error for unimplemented provider', () => {
      expect(() => {
        providerFactory.createProvider(BankingProvider.TINK);
      }).toThrow('Banking provider not implemented: TINK');
    });

    it('should check if provider is available', () => {
      const saltEdgeAvailable = providerFactory.isProviderAvailable(BankingProvider.SALTEDGE);
      const tinkAvailable = providerFactory.isProviderAvailable(BankingProvider.TINK);

      expect(saltEdgeAvailable).toBe(true);
      expect(tinkAvailable).toBe(false);
    });

    it('should return list of available providers', () => {
      const providers = providerFactory.getAvailableProviders();

      expect(providers).toEqual([BankingProvider.SALTEDGE]);
      expect(providers.length).toBe(1);
    });
  });

  // ======================
  // initiateBankingLink
  // ======================

  describe('initiateBankingLink', () => {
    it('should initiate banking link successfully', async () => {
      const result = await service.initiateBankingLink(testUserId, BankingProvider.SALTEDGE);

      expect(result).toHaveProperty('redirectUrl');
      expect(result).toHaveProperty('connectionId');
      expect(result.redirectUrl).toContain('mock-bank.test');

      // Verify connection was stored in database
      const connection = await prisma.bankingConnection.findUnique({
        where: { id: result.connectionId },
      });

      expect(connection).toBeDefined();
      expect(connection?.userId).toBe(testUserId);
      expect(connection?.provider).toBe(BankingProvider.SALTEDGE);
      expect(connection?.status).toBe(BankingConnectionStatus.PENDING);
      expect(connection?.saltEdgeConnectionId).toBeDefined();
    });

    it('should throw error when banking integration is disabled', async () => {
      // Create a new service with disabled banking integration
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'BANKING_INTEGRATION_ENABLED') {
            return false;
          }
          return undefined;
        }),
      };

      const disabledService = new BankingService(
        prisma as any,
        disabledConfigService as any,
        providerFactory,
      );

      await expect(
        disabledService.initiateBankingLink(testUserId, BankingProvider.SALTEDGE),
      ).rejects.toThrow('Banking integration is not enabled');
    });

    it('should throw error when provider fails authentication', async () => {
      jest.spyOn(mockProvider, 'authenticate').mockRejectedValueOnce(
        new Error('Authentication failed'),
      );

      await expect(
        service.initiateBankingLink(testUserId, BankingProvider.SALTEDGE),
      ).rejects.toThrow('Failed to initiate banking link');
    });

    it('should use SALTEDGE as default provider', async () => {
      const result = await service.initiateBankingLink(testUserId);

      const connection = await prisma.bankingConnection.findUnique({
        where: { id: result.connectionId },
      });

      expect(connection?.provider).toBe(BankingProvider.SALTEDGE);
    });
  });

  // ======================
  // completeBankingLink
  // ======================

  describe('completeBankingLink', () => {
    let connectionId: string;

    beforeEach(async () => {
      const result = await service.initiateBankingLink(testUserId, BankingProvider.SALTEDGE);
      connectionId = result.connectionId;
    });

    it('should complete banking link and retrieve accounts', async () => {
      const accounts = await service.completeBankingLink(testUserId, connectionId);

      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0]).toHaveProperty('id');
      expect(accounts[0]).toHaveProperty('name');
      expect(accounts[0]).toHaveProperty('iban');
      expect(accounts[0]).toHaveProperty('balance');

      // Verify connection status updated
      const connection = await prisma.bankingConnection.findUnique({
        where: { id: connectionId },
      });

      expect(connection?.status).toBe(BankingConnectionStatus.AUTHORIZED);
      expect(connection?.authorizedAt).toBeDefined();
    });

    it('should throw NotFoundException for invalid connection ID', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.completeBankingLink(testUserId, invalidId),
      ).rejects.toThrow('Banking connection not found');
    });

    it('should throw error when user does not own connection (unauthorized)', async () => {
      const otherUserId = 'other-user-id';

      await expect(
        service.completeBankingLink(otherUserId, connectionId),
      ).rejects.toThrow('Unauthorized');
    });

    it('should mark connection as FAILED on error', async () => {
      jest.spyOn(mockProvider, 'completeLinkAndGetAccounts').mockRejectedValueOnce(
        new Error('Provider failed'),
      );

      await expect(
        service.completeBankingLink(testUserId, connectionId),
      ).rejects.toThrow('Failed to complete banking link');

      // Verify connection marked as failed
      const connection = await prisma.bankingConnection.findUnique({
        where: { id: connectionId },
      });

      expect(connection?.status).toBe(BankingConnectionStatus.FAILED);
    });
  });

  // ======================
  // storeLinkedAccounts
  // ======================

  describe('storeLinkedAccounts', () => {
    let connectionId: string;
    let accounts: any[];

    beforeEach(async () => {
      const result = await service.initiateBankingLink(testUserId, BankingProvider.SALTEDGE);
      connectionId = result.connectionId;
      accounts = await service.completeBankingLink(testUserId, connectionId);
    });

    it('should store linked accounts in database', async () => {
      const storedCount = await service.storeLinkedAccounts(testUserId, connectionId, accounts);

      expect(storedCount).toBe(accounts.length);

      // Verify accounts in database
      const dbAccounts = await prisma.account.findMany({
        where: { userId: testUserId },
      });

      expect(dbAccounts.length).toBe(accounts.length);
      expect(dbAccounts[0].source).toBe(AccountSource.SALTEDGE);
      expect(dbAccounts[0].syncStatus).toBe(BankingSyncStatus.PENDING);
      expect(dbAccounts[0].saltEdgeAccountId).toBeDefined();
    });

    it('should throw NotFoundException for invalid connection ID', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.storeLinkedAccounts(testUserId, invalidId, accounts),
      ).rejects.toThrow('Banking connection not found');
    });

    it('should throw error when user does not own connection', async () => {
      const otherUserId = 'other-user-id';

      await expect(
        service.storeLinkedAccounts(otherUserId, connectionId, accounts),
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle partial failures and continue storing other accounts', async () => {
      // Create first account to cause duplicate error
      await service.storeLinkedAccounts(testUserId, connectionId, [accounts[0]]);

      // Try to store all accounts (first will fail due to duplicate)
      const storedCount = await service.storeLinkedAccounts(testUserId, connectionId, accounts);

      // Should store all except the duplicate
      expect(storedCount).toBe(accounts.length - 1);
    });

    it('should store banking metadata in account settings', async () => {
      await service.storeLinkedAccounts(testUserId, connectionId, accounts);

      const dbAccount = await prisma.account.findFirst({
        where: { userId: testUserId },
      });

      const settings = dbAccount?.settings as any;
      expect(settings).toHaveProperty('bankCountry');
      expect(settings).toHaveProperty('accountHolderName');
      expect(settings).toHaveProperty('accountType');
      expect(settings).toHaveProperty('provider');
    });
  });

  // ======================
  // getLinkedAccounts
  // ======================

  describe('getLinkedAccounts', () => {
    beforeEach(async () => {
      const result = await service.initiateBankingLink(testUserId, BankingProvider.SALTEDGE);
      const accounts = await service.completeBankingLink(testUserId, result.connectionId);
      await service.storeLinkedAccounts(testUserId, result.connectionId, accounts);
    });

    it('should retrieve all linked accounts for user', async () => {
      const linkedAccounts = await service.getLinkedAccounts(testUserId);

      expect(linkedAccounts.length).toBeGreaterThan(0);
      expect(linkedAccounts[0]).toHaveProperty('id');
      expect(linkedAccounts[0]).toHaveProperty('name');
      expect(linkedAccounts[0]).toHaveProperty('bankName');
      expect(linkedAccounts[0]).toHaveProperty('balance');
      expect(linkedAccounts[0]).toHaveProperty('currency');
      expect(linkedAccounts[0]).toHaveProperty('syncStatus');
      expect(linkedAccounts[0]).toHaveProperty('linkedAt');
    });

    it('should return empty array when user has no linked accounts', async () => {
      // Create a new user with no linked accounts
      const emptyUser = await prisma.user.create({
        data: {
          email: `empty-${Date.now()}@example.com`,
          passwordHash: 'hash123',
          firstName: 'Empty',
          lastName: 'User',
          role: UserRole.MEMBER,
          status: 'ACTIVE',
          familyId: testFamilyId,
        },
      });

      const linkedAccounts = await service.getLinkedAccounts(emptyUser.id);

      expect(linkedAccounts).toEqual([]);

      // Cleanup
      await prisma.user.delete({ where: { id: emptyUser.id } });
    });

    it('should include banking metadata from settings', async () => {
      const linkedAccounts = await service.getLinkedAccounts(testUserId);

      expect(linkedAccounts[0]).toHaveProperty('bankCountry');
      expect(linkedAccounts[0]).toHaveProperty('accountHolderName');
      expect(linkedAccounts[0]).toHaveProperty('accountType');
    });

    it('should include latest sync log information', async () => {
      const linkedAccounts = await service.getLinkedAccounts(testUserId);

      // lastSynced should be null for accounts that haven't been synced
      expect(linkedAccounts[0].lastSynced).toBeNull();
      expect(linkedAccounts[0].syncStatus).toBe(BankingSyncStatus.PENDING);
    });

    it('should only return accounts with banking provider', async () => {
      // Create manual account (no banking provider)
      await prisma.account.create({
        data: {
          userId: testUserId,
          name: 'Manual Account',
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          type: 'CHECKING',
          status: 'ACTIVE',
        },
      });

      const linkedAccounts = await service.getLinkedAccounts(testUserId);

      // Should only return banking accounts
      expect(linkedAccounts.every(acc => acc.bankName !== null)).toBe(true);
    });
  });

  // ======================
  // syncAccount
  // ======================

  describe('syncAccount', () => {
    let accountId: string;

    beforeEach(async () => {
      const result = await service.initiateBankingLink(testUserId, BankingProvider.SALTEDGE);
      const accounts = await service.completeBankingLink(testUserId, result.connectionId);
      await service.storeLinkedAccounts(testUserId, result.connectionId, accounts);

      const dbAccount = await prisma.account.findFirst({
        where: { userId: testUserId },
      });
      accountId = dbAccount!.id;
    });

    it('should sync account successfully', async () => {
      const syncResult = await service.syncAccount(testUserId, accountId);

      expect(syncResult).toHaveProperty('syncLogId');
      expect(syncResult).toHaveProperty('status');
      expect(syncResult).toHaveProperty('transactionsSynced');
      expect(syncResult).toHaveProperty('balanceUpdated');
      expect(syncResult.status).toBe(BankingSyncStatus.SYNCED);
      expect(syncResult.balanceUpdated).toBe(true);

      // Verify sync log created
      const syncLog = await prisma.bankingSyncLog.findUnique({
        where: { id: syncResult.syncLogId },
      });

      expect(syncLog).toBeDefined();
      expect(syncLog?.status).toBe(BankingSyncStatus.SYNCED);
      expect(syncLog?.transactionsSynced).toBeGreaterThanOrEqual(0);
    });

    it('should throw NotFoundException for invalid account ID', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.syncAccount(testUserId, invalidId),
      ).rejects.toThrow('Account not found');
    });

    it('should throw error when user does not own account', async () => {
      const otherUserId = 'other-user-id';

      await expect(
        service.syncAccount(otherUserId, accountId),
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error for non-banking account', async () => {
      // Create manual account
      const manualAccount = await prisma.account.create({
        data: {
          userId: testUserId,
          name: 'Manual Account',
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          type: 'CHECKING',
          status: 'ACTIVE',
        },
      });

      await expect(
        service.syncAccount(testUserId, manualAccount.id),
      ).rejects.toThrow('Account is not linked to a banking provider');
    });

    it('should update account sync status to SYNCED', async () => {
      const syncResult = await service.syncAccount(testUserId, accountId);

      expect(syncResult.status).toBe(BankingSyncStatus.SYNCED);

      // Verify account status updated
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      expect(account?.syncStatus).toBe(BankingSyncStatus.SYNCED);
    });

    it('should create error sync log on failure', async () => {
      // Wait for any pending auto-sync from storeLinkedAccounts to complete
      // The storeLinkedAccounts method triggers an auto-sync via setTimeout
      await new Promise(resolve => setTimeout(resolve, 200));

      const syncSpy = jest.spyOn(mockProvider, 'syncAccount').mockRejectedValue(
        new Error('Sync failed'),
      );

      let syncError: Error | null = null;
      try {
        await service.syncAccount(testUserId, accountId);
      } catch (err) {
        syncError = err as Error;
      }

      // Ensure the service threw an error
      expect(syncError).not.toBeNull();
      expect(syncError?.message).toContain('Failed to sync account');

      // Verify error sync log created
      const syncLog = await prisma.bankingSyncLog.findFirst({
        where: {
          accountId,
          status: BankingSyncStatus.ERROR,
          error: { contains: 'Sync failed' },
        },
        orderBy: { startedAt: 'desc' },
      });

      expect(syncLog).toBeDefined();
      expect(syncLog?.error).toContain('Sync failed');
      expect(syncLog?.errorCode).toBe('SYNC_ERROR');

      // Verify account marked as ERROR
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      expect(account?.syncStatus).toBe(BankingSyncStatus.ERROR);

      // Restore the spy to avoid affecting other tests
      syncSpy.mockRestore();
    });

    it('should create sync logs with proper timestamps', async () => {
      // First sync
      const firstSync = await service.syncAccount(testUserId, accountId);
      expect(firstSync.status).toBe(BankingSyncStatus.SYNCED);
      expect(firstSync.syncLogId).toBeDefined();

      // Verify first sync log was created
      const firstSyncLog = await prisma.bankingSyncLog.findUnique({
        where: { id: firstSync.syncLogId },
      });
      expect(firstSyncLog).toBeDefined();
      expect(firstSyncLog?.completedAt).toBeDefined();
      expect(firstSyncLog?.startedAt).toBeDefined();

      // Second sync
      const secondSync = await service.syncAccount(testUserId, accountId);
      expect(secondSync.status).toBe(BankingSyncStatus.SYNCED);
      expect(secondSync.syncLogId).toBeDefined();
      expect(secondSync.syncLogId).not.toBe(firstSync.syncLogId);

      // Verify second sync log was created with later timestamp
      const secondSyncLog = await prisma.bankingSyncLog.findUnique({
        where: { id: secondSync.syncLogId },
      });
      expect(secondSyncLog).toBeDefined();
      expect(secondSyncLog!.completedAt!.getTime()).toBeGreaterThanOrEqual(
        firstSyncLog!.completedAt!.getTime(),
      );

      // Verify both sync logs exist in database
      const allSyncLogs = await prisma.bankingSyncLog.findMany({
        where: { accountId },
        orderBy: { startedAt: 'desc' },
      });
      expect(allSyncLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ======================
  // revokeBankingConnection
  // ======================

  describe('revokeBankingConnection', () => {
    let connectionId: string;
    let accountId: string;

    beforeEach(async () => {
      const result = await service.initiateBankingLink(testUserId, BankingProvider.SALTEDGE);
      connectionId = result.connectionId;
      const accounts = await service.completeBankingLink(testUserId, connectionId);
      await service.storeLinkedAccounts(testUserId, connectionId, accounts);

      const dbAccount = await prisma.account.findFirst({
        where: { userId: testUserId },
      });
      accountId = dbAccount!.id;
    });

    it('should revoke banking connection successfully', async () => {
      // Wait for any pending auto-sync from storeLinkedAccounts to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      await service.revokeBankingConnection(testUserId, connectionId);

      // Verify connection marked as REVOKED
      const connection = await prisma.bankingConnection.findUnique({
        where: { id: connectionId },
      });

      expect(connection?.status).toBe(BankingConnectionStatus.REVOKED);

      // Verify linked accounts marked as DISCONNECTED
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      expect(account?.syncStatus).toBe(BankingSyncStatus.DISCONNECTED);
    });

    it('should throw NotFoundException for invalid connection ID', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.revokeBankingConnection(testUserId, invalidId),
      ).rejects.toThrow('Banking connection not found');
    });

    it('should throw error when user does not own connection', async () => {
      const otherUserId = 'other-user-id';

      await expect(
        service.revokeBankingConnection(otherUserId, connectionId),
      ).rejects.toThrow('Unauthorized');
    });

    it('should call provider revoke method', async () => {
      const revokeSpy = jest.spyOn(mockProvider, 'revokeConnection');

      await service.revokeBankingConnection(testUserId, connectionId);

      expect(revokeSpy).toHaveBeenCalled();
    });

    it('should handle provider revocation error gracefully', async () => {
      jest.spyOn(mockProvider, 'revokeConnection').mockRejectedValueOnce(
        new Error('Provider revoke failed'),
      );

      await expect(
        service.revokeBankingConnection(testUserId, connectionId),
      ).rejects.toThrow('Failed to revoke connection');
    });
  });

  // ======================
  // Helper Methods
  // ======================

  describe('Helper Methods', () => {
    it('should return available providers', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toEqual([BankingProvider.SALTEDGE]);
    });

    it('should check if banking is enabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);

      const isEnabled = service.isBankingEnabled();

      expect(isEnabled).toBe(true);
    });

    it('should return false when banking is disabled', () => {
      // Create a new service with disabled banking integration
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'BANKING_INTEGRATION_ENABLED') {
            return false;
          }
          return undefined;
        }),
      };

      const disabledService = new BankingService(
        prisma as any,
        disabledConfigService as any,
        providerFactory,
      );

      const isEnabled = disabledService.isBankingEnabled();

      expect(isEnabled).toBe(false);
    });
  });

  // ======================
  // Complete Flow Integration
  // ======================

  describe('Complete Banking Flow', () => {
    it('should complete full banking link flow', async () => {
      // 1. Initiate link
      const { connectionId, redirectUrl } = await service.initiateBankingLink(
        testUserId,
        BankingProvider.SALTEDGE,
      );

      expect(redirectUrl).toContain('mock-bank.test');

      // 2. Complete link
      const accounts = await service.completeBankingLink(testUserId, connectionId);

      expect(accounts.length).toBeGreaterThan(0);

      // 3. Store accounts
      const storedCount = await service.storeLinkedAccounts(testUserId, connectionId, accounts);

      expect(storedCount).toBe(accounts.length);

      // 4. Get linked accounts
      const linkedAccounts = await service.getLinkedAccounts(testUserId);

      expect(linkedAccounts.length).toBe(accounts.length);

      // 5. Sync account
      const syncResult = await service.syncAccount(testUserId, linkedAccounts[0].id);

      expect(syncResult.status).toBe(BankingSyncStatus.SYNCED);

      // 6. Revoke connection
      await service.revokeBankingConnection(testUserId, connectionId);

      const connection = await prisma.bankingConnection.findUnique({
        where: { id: connectionId },
      });

      expect(connection?.status).toBe(BankingConnectionStatus.REVOKED);
    });
  });
});
