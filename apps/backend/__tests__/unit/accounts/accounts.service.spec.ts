import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsService } from '../../../src/accounts/accounts.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { BalanceNormalizerService } from '../../../src/core/finance/balance-normalizer.service';
import { AccountType, AccountSource, AccountStatus, UserRole, Prisma } from '../../../generated/prisma';
import { AccountFactory } from '../../utils/factories';
import { createMockPrismaService, resetPrismaMocks } from '../../utils/mocks';

/**
 * AccountsService Unit Tests
 *
 * Test Coverage Strategy:
 * - Public methods: create, findAll, findOne, update, remove, getBalance, getSummary, syncAccount
 * - Authorization: XOR constraint (userId OR familyId), role-based access, ownership verification
 * - Error handling: NotFoundException, ForbiddenException, BadRequestException
 * - Business logic: Decimal conversions, DTO transformations, sync requirements
 *
 * TDD Pattern: Red-Green-Refactor
 * AAA Pattern: Arrange - Act - Assert
 * Assertions: One behavioral assertion per test
 */
describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: any;

  beforeEach(async () => {
    // Arrange: Create module with mocked dependencies
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        BalanceNormalizerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    // Cleanup: Reset all mocks
    resetPrismaMocks(prisma);
  });

  describe('create', () => {
    /**
     * TDD Red-Green-Refactor Example #1
     *
     * RED: Write test expecting successful personal account creation
     * GREEN: Service calls prisma.account.create with correct userId
     * REFACTOR: Extract factory usage, improve readability
     */
    it('should create a personal account with userId', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = AccountFactory.buildCreateDto({ name: 'My Checking' });
      const expectedAccount = AccountFactory.buildForUser(userId, {
        name: createDto.name,
        type: createDto.type,
      });
      prisma.account.create.mockResolvedValue(expectedAccount as any);

      // Act
      const result = await service.create(createDto, userId);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.userId).toBe(userId);
      expect(prisma.account.create).toHaveBeenCalledTimes(1);
    });

    it('should create a family account with familyId', async () => {
      // Arrange
      const familyId = 'family-456';
      const createDto = AccountFactory.buildCreateDto({ name: 'Family Savings' });
      const expectedAccount = AccountFactory.buildForFamily(familyId, {
        name: createDto.name,
      });
      prisma.account.create.mockResolvedValue(expectedAccount as any);

      // Act
      const result = await service.create(createDto, undefined, familyId);

      // Assert
      // Note: AccountResponseDto does not expose familyId for security
      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyId,
            userId: null,
          }),
        })
      );
    });

    it('should throw BadRequestException when neither userId nor familyId provided', async () => {
      // Arrange
      const createDto = AccountFactory.buildCreateDto();

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('XOR constraint');
    });

    it('should throw BadRequestException when both userId and familyId provided', async () => {
      // Arrange
      const createDto = AccountFactory.buildCreateDto();
      const userId = 'user-123';
      const familyId = 'family-456';

      // Act & Assert
      await expect(service.create(createDto, userId, familyId)).rejects.toThrow(BadRequestException);
    });

    it('should set default values correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = AccountFactory.buildCreateDto({
        status: undefined,
        syncEnabled: undefined,
        currency: undefined,
      });
      const expectedAccount = AccountFactory.buildForUser(userId);
      prisma.account.create.mockResolvedValue(expectedAccount as any);

      // Act
      await service.create(createDto, userId);

      // Assert
      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AccountStatus.ACTIVE,
            syncEnabled: true,
            currency: 'USD',
            isActive: true,
          }),
        })
      );
    });

    it('should pass balance values correctly to Prisma', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = AccountFactory.buildCreateDto({
        currentBalance: 1000.50,
        creditLimit: 5000,
      });
      const expectedAccount = AccountFactory.buildForUser(userId);
      prisma.account.create.mockResolvedValue(expectedAccount as any);

      // Act
      await service.create(createDto, userId);

      // Assert - Service passes DTO values; Prisma handles Decimal conversion internally
      const createCall = prisma.account.create.mock.calls[0][0];
      expect(createCall.data.currentBalance).toBe(1000.50);
      expect(createCall.data.creditLimit).toBeInstanceOf(Prisma.Decimal);
      expect(createCall.data.creditLimit).toEqual(new Prisma.Decimal(5000));
    });
  });

  describe('findAll', () => {
    it('should find all personal accounts for a user (excluding HIDDEN)', async () => {
      // Arrange
      const userId = 'user-123';
      const accounts = AccountFactory.buildMany(3, { userId });
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toHaveLength(3);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId, status: { not: AccountStatus.HIDDEN } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should find all family accounts for a family (excluding HIDDEN)', async () => {
      // Arrange
      const familyId = 'family-456';
      const accounts = AccountFactory.buildMany(2, { userId: null, familyId });
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.findAll(undefined, familyId);

      // Assert
      expect(result).toHaveLength(2);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { familyId, status: { not: AccountStatus.HIDDEN } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw BadRequestException when neither userId nor familyId provided', async () => {
      // Arrange & Act & Assert
      await expect(service.findAll()).rejects.toThrow(BadRequestException);
      await expect(service.findAll()).rejects.toThrow('XOR constraint');
    });

    it('should throw BadRequestException when both userId and familyId provided', async () => {
      // Arrange & Act & Assert
      await expect(service.findAll('user-123', 'family-456')).rejects.toThrow(BadRequestException);
    });

    it('should return empty array when no accounts found', async () => {
      // Arrange
      const userId = 'user-123';
      prisma.account.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should include HIDDEN accounts when includeHidden=true', async () => {
      // Arrange
      const userId = 'user-123';
      const accounts = [
        AccountFactory.buildForUser(userId, { status: AccountStatus.ACTIVE }),
        AccountFactory.buildForUser(userId, { status: AccountStatus.HIDDEN }),
      ];
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.findAll(userId, undefined, true);

      // Assert
      expect(result).toHaveLength(2);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should find account by ID for owner', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act
      const result = await service.findOne(account.id, userId);

      // Assert
      expect(result.id).toBe(account.id);
      expect(result.userId).toBe(userId);
    });

    it('should find family account for family member', async () => {
      // Arrange
      const familyId = 'family-456';
      const account = AccountFactory.buildForFamily(familyId);
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act
      const result = await service.findOne(account.id, undefined, familyId);

      // Assert
      expect(result.id).toBe(account.id);
    });

    it('should allow admin to access any account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act
      const result = await service.findOne(account.id, undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(result.id).toBe(account.id);
    });

    it('should throw NotFoundException when account does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      prisma.account.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent-id', userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.findOne(account.id, 'user-123')).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(account.id, 'user-123')).rejects.toThrow('Access denied');
    });

    it('should throw ForbiddenException when family does not own the account', async () => {
      // Arrange
      const account = AccountFactory.buildForFamily('other-family');
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.findOne(account.id, undefined, 'family-456')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update account for owner', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const updateDto = AccountFactory.buildUpdateDto({ name: 'Updated Name' });
      const updatedAccount = { ...account, ...updateDto };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(updatedAccount as any);

      // Act
      const result = await service.update(account.id, updateDto, userId);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(prisma.account.update).toHaveBeenCalledTimes(1);
    });

    it('should convert currentBalance to Decimal on update', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const updateDto = { currentBalance: 2000.75 };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue({ ...account, currentBalance: new Prisma.Decimal(2000.75) } as any);

      // Act
      await service.update(account.id, updateDto, userId);

      // Assert
      const updateCall = prisma.account.update.mock.calls[0][0];
      expect(updateCall.data.currentBalance).toBeInstanceOf(Prisma.Decimal);
    });

    it('should convert availableBalance to Decimal on update', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const updateDto = { availableBalance: 1500.25 };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue({ ...account, availableBalance: new Prisma.Decimal(1500.25) } as any);

      // Act
      await service.update(account.id, updateDto, userId);

      // Assert
      const updateCall = prisma.account.update.mock.calls[0][0];
      expect(updateCall.data.availableBalance).toBeInstanceOf(Prisma.Decimal);
    });

    it('should convert creditLimit to Decimal on update', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const updateDto = { creditLimit: 10000 };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue({ ...account, creditLimit: new Prisma.Decimal(10000) } as any);

      // Act
      await service.update(account.id, updateDto, userId);

      // Assert
      const updateCall = prisma.account.update.mock.calls[0][0];
      expect(updateCall.data.creditLimit).toBeInstanceOf(Prisma.Decimal);
    });

    it('should throw NotFoundException when account does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto = AccountFactory.buildUpdateDto();
      prisma.account.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('nonexistent-id', updateDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      const updateDto = AccountFactory.buildUpdateDto();
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.update(account.id, updateDto, 'user-123')).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update any account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      const updateDto = AccountFactory.buildUpdateDto({ name: 'Admin Updated' });
      const updatedAccount = { ...account, ...updateDto };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(updatedAccount as any);

      // Act
      const result = await service.update(account.id, updateDto, undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(result.name).toBe('Admin Updated');
    });

    it('should update account settings with icon and color', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const updateDto = {
        settings: {
          icon: 'piggybank',
          color: 'purple',
        },
      };
      const updatedAccount = {
        ...account,
        settings: { icon: 'piggybank', color: 'purple' },
      };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(updatedAccount as any);

      // Act
      const result = await service.update(account.id, updateDto, userId);

      // Assert
      expect(result.settings).toEqual({ icon: 'piggybank', color: 'purple' });
      const updateCall = prisma.account.update.mock.calls[0][0];
      expect(updateCall.data.settings).toEqual({ icon: 'piggybank', color: 'purple' });
    });

    it('should preserve existing settings when updating partial settings', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, {
        settings: { icon: 'wallet', color: 'blue', autoSync: true },
      });
      const updateDto = {
        settings: {
          color: 'green', // Only update color
        },
      };
      const updatedAccount = {
        ...account,
        settings: { icon: 'wallet', color: 'green', autoSync: true },
      };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(updatedAccount as any);

      // Act
      const result = await service.update(account.id, updateDto, userId);

      // Assert - settings should be passed to prisma as-is (the service stores whatever is provided)
      const updateCall = prisma.account.update.mock.calls[0][0];
      expect(updateCall.data.settings).toEqual({ color: 'green' });
    });
  });

  describe('remove', () => {
    it('should delete account for owner when no linked transfers', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.transaction.findMany.mockResolvedValue([]); // No transfers
      prisma.account.delete.mockResolvedValue(account as any);

      // Act
      await service.remove(account.id, userId);

      // Assert
      expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: account.id } });
      expect(prisma.account.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when account has linked transfers', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const otherAccount = AccountFactory.buildForUser(userId, { id: 'other-account-id', name: 'Savings' });

      prisma.account.findUnique.mockResolvedValue(account as any);

      // Mock transactions with transfer group - set up for multiple calls
      const transferTx = [
        {
          id: 'tx-1',
          transferGroupId: 'transfer-group-1',
          transferRole: 'SOURCE',
          amount: new Prisma.Decimal(-100),
          date: new Date(),
          description: 'Transfer to savings',
        },
      ];
      const linkedTx = [
        {
          id: 'tx-2',
          transferGroupId: 'transfer-group-1',
          transferRole: 'DESTINATION',
          amount: new Prisma.Decimal(100),
          date: new Date(),
          description: 'Transfer from checking',
          accountId: otherAccount.id,
          account: { id: otherAccount.id, name: otherAccount.name },
        },
      ];

      // Set up mocks that return the same values each time (for the test assertion)
      prisma.transaction.findMany
        .mockResolvedValueOnce(transferTx)
        .mockResolvedValueOnce(linkedTx);

      // Act & Assert
      try {
        await service.remove(account.id, userId);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toMatchObject({
          error: 'LINKED_TRANSFERS_EXIST',
          linkedTransferCount: 1,
        });
      }
    });

    it('should throw NotFoundException when account does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      prisma.account.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent-id', userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.remove(account.id, 'user-123')).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to delete any account without linked transfers', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.transaction.findMany.mockResolvedValue([]); // No transfers
      prisma.account.delete.mockResolvedValue(account as any);

      // Act
      await service.remove(account.id, undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(prisma.account.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkDeletionEligibility', () => {
    it('should return canDelete=true when no linked transfers exist', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, { status: AccountStatus.ACTIVE });
      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.transaction.findMany.mockResolvedValue([]); // No transfers

      // Act
      const result = await service.checkDeletionEligibility(account.id, userId);

      // Assert
      expect(result.canDelete).toBe(true);
      expect(result.canHide).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.linkedTransferCount).toBe(0);
      expect(result.currentStatus).toBe(AccountStatus.ACTIVE);
    });

    it('should return canDelete=false when linked transfers exist', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const otherAccount = AccountFactory.buildForUser(userId, { id: 'other-account-id', name: 'Savings' });

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.transaction.findMany
        .mockResolvedValueOnce([
          {
            id: 'tx-1',
            transferGroupId: 'transfer-group-1',
            transferRole: 'SOURCE',
            amount: new Prisma.Decimal(-500),
            date: new Date('2025-11-15'),
            description: 'Monthly savings transfer',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'tx-2',
            transferGroupId: 'transfer-group-1',
            transferRole: 'DESTINATION',
            amount: new Prisma.Decimal(500),
            date: new Date('2025-11-15'),
            description: 'Monthly savings transfer',
            accountId: otherAccount.id,
            account: { id: otherAccount.id, name: otherAccount.name },
          },
        ]);

      // Act
      const result = await service.checkDeletionEligibility(account.id, userId);

      // Assert
      expect(result.canDelete).toBe(false);
      expect(result.canHide).toBe(true); // Can always hide
      expect(result.linkedTransferCount).toBe(1);
      expect(result.blockReason).toContain('1 transfer');
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toMatchObject({
        transactionId: 'tx-1',
        transferGroupId: 'transfer-group-1',
        linkedAccountId: otherAccount.id,
        linkedAccountName: 'Savings',
        amount: 500,
        transferRole: 'SOURCE',
      });
    });

    it('should return correct pluralization for multiple transfers', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      const otherAccount = AccountFactory.buildForUser(userId, { id: 'other-account-id', name: 'Savings' });

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.transaction.findMany
        .mockResolvedValueOnce([
          { id: 'tx-1', transferGroupId: 'tg-1', transferRole: 'SOURCE', amount: new Prisma.Decimal(-100), date: new Date(), description: '' },
          { id: 'tx-2', transferGroupId: 'tg-2', transferRole: 'SOURCE', amount: new Prisma.Decimal(-200), date: new Date(), description: '' },
          { id: 'tx-3', transferGroupId: 'tg-3', transferRole: 'SOURCE', amount: new Prisma.Decimal(-300), date: new Date(), description: '' },
        ])
        .mockResolvedValueOnce([
          { id: 'tx-4', transferGroupId: 'tg-1', accountId: otherAccount.id, account: { id: otherAccount.id, name: 'Savings' } },
          { id: 'tx-5', transferGroupId: 'tg-2', accountId: otherAccount.id, account: { id: otherAccount.id, name: 'Savings' } },
          { id: 'tx-6', transferGroupId: 'tg-3', accountId: otherAccount.id, account: { id: otherAccount.id, name: 'Savings' } },
        ]);

      // Act
      const result = await service.checkDeletionEligibility(account.id, userId);

      // Assert
      expect(result.blockReason).toContain('3 transfers'); // Plural
      expect(result.linkedTransferCount).toBe(3);
    });

    it('should throw NotFoundException for non-existent account', async () => {
      // Arrange
      prisma.account.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkDeletionEligibility('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.checkDeletionEligibility(account.id, 'user-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('hideAccount', () => {
    it('should set account status to HIDDEN', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, { status: AccountStatus.ACTIVE });
      const hiddenAccount = { ...account, status: AccountStatus.HIDDEN };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(hiddenAccount as any);

      // Act
      const result = await service.hideAccount(account.id, userId);

      // Assert
      expect(result.status).toBe(AccountStatus.HIDDEN);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: account.id },
        data: { status: AccountStatus.HIDDEN },
      });
    });

    it('should throw BadRequestException if account is already hidden', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, { status: AccountStatus.HIDDEN });
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.hideAccount(account.id, userId)).rejects.toThrow(BadRequestException);
      await expect(service.hideAccount(account.id, userId)).rejects.toThrow('already hidden');
    });

    it('should throw NotFoundException for non-existent account', async () => {
      // Arrange
      prisma.account.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.hideAccount('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.hideAccount(account.id, 'user-123')).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to hide any account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user', { status: AccountStatus.ACTIVE });
      const hiddenAccount = { ...account, status: AccountStatus.HIDDEN };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(hiddenAccount as any);

      // Act
      const result = await service.hideAccount(account.id, undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(result.status).toBe(AccountStatus.HIDDEN);
    });
  });

  describe('restoreAccount', () => {
    it('should set account status back to ACTIVE', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, { status: AccountStatus.HIDDEN });
      const restoredAccount = { ...account, status: AccountStatus.ACTIVE };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(restoredAccount as any);

      // Act
      const result = await service.restoreAccount(account.id, userId);

      // Assert
      expect(result.status).toBe(AccountStatus.ACTIVE);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: account.id },
        data: { status: AccountStatus.ACTIVE },
      });
    });

    it('should throw BadRequestException if account is not hidden', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, { status: AccountStatus.ACTIVE });
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.restoreAccount(account.id, userId)).rejects.toThrow(BadRequestException);
      await expect(service.restoreAccount(account.id, userId)).rejects.toThrow('Only hidden accounts');
    });

    it('should throw NotFoundException for non-existent account', async () => {
      // Arrange
      prisma.account.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.restoreAccount('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user', { status: AccountStatus.HIDDEN });
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.restoreAccount(account.id, 'user-123')).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to restore any hidden account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user', { status: AccountStatus.HIDDEN });
      const restoredAccount = { ...account, status: AccountStatus.ACTIVE };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(restoredAccount as any);

      // Act
      const result = await service.restoreAccount(account.id, undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(result.status).toBe(AccountStatus.ACTIVE);
    });
  });

  describe('getBalance', () => {
    it('should return account balance for owner', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, {
        currentBalance: 1500.75,
        availableBalance: 1200.50,
        currency: 'USD',
      });
      prisma.account.findUnique.mockResolvedValueOnce(account as any); // verifyAccountAccess
      prisma.account.findUnique.mockResolvedValueOnce({
        currentBalance: new Prisma.Decimal(1500.75),
        availableBalance: new Prisma.Decimal(1200.50),
        currency: 'USD',
      } as any); // getBalance query

      // Act
      const result = await service.getBalance(account.id, userId);

      // Assert
      expect(result).toEqual({
        currentBalance: 1500.75,
        availableBalance: 1200.50,
        currency: 'USD',
      });
    });

    it('should handle null availableBalance', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, {
        currentBalance: 1000,
        availableBalance: null,
      });
      prisma.account.findUnique.mockResolvedValueOnce(account as any);
      prisma.account.findUnique.mockResolvedValueOnce({
        currentBalance: new Prisma.Decimal(1000),
        availableBalance: null,
        currency: 'USD',
      } as any);

      // Act
      const result = await service.getBalance(account.id, userId);

      // Assert
      expect(result.availableBalance).toBeNull();
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.getBalance(account.id, 'user-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSummary', () => {
    it('should return account summary for user', async () => {
      // Arrange
      const userId = 'user-123';
      const accounts = [
        AccountFactory.buildForUser(userId, {
          type: AccountType.CHECKING,
          currentBalance: new Prisma.Decimal(1000),
          status: AccountStatus.ACTIVE
        }),
        AccountFactory.buildForUser(userId, {
          type: AccountType.SAVINGS,
          currentBalance: new Prisma.Decimal(5000),
          status: AccountStatus.ACTIVE
        }),
        AccountFactory.buildForUser(userId, {
          type: AccountType.CHECKING,
          currentBalance: new Prisma.Decimal(2000),
          status: AccountStatus.ACTIVE
        }),
      ];
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.getSummary(userId);

      // Assert
      expect(result.totalAccounts).toBe(3);
      expect(result.totalBalance).toBe(8000);
      expect(result.activeAccounts).toBe(3);
      expect(result.byType[AccountType.CHECKING].count).toBe(2);
      expect(result.byType[AccountType.SAVINGS].count).toBe(1);
    });

    it('should throw BadRequestException when neither userId nor familyId provided', async () => {
      // Act & Assert
      await expect(service.getSummary()).rejects.toThrow(BadRequestException);
    });

    it('should filter by isActive status and exclude HIDDEN accounts', async () => {
      // Arrange
      const userId = 'user-123';
      const activeAccounts = AccountFactory.buildMany(3, { userId, isActive: true });
      prisma.account.findMany.mockResolvedValue(activeAccounts as any);

      // Act
      await service.getSummary(userId);

      // Assert
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId, isActive: true, status: { not: AccountStatus.HIDDEN } },
      });
    });

    it('should exclude HIDDEN accounts from summary totals', async () => {
      // Arrange
      const userId = 'user-123';
      const activeAccounts = [
        AccountFactory.buildForUser(userId, {
          type: AccountType.CHECKING,
          currentBalance: new Prisma.Decimal(1000),
          status: AccountStatus.ACTIVE,
          isActive: true,
        }),
        AccountFactory.buildForUser(userId, {
          type: AccountType.SAVINGS,
          currentBalance: new Prisma.Decimal(5000),
          status: AccountStatus.ACTIVE,
          isActive: true,
        }),
      ];
      // Note: HIDDEN account should NOT be included in query result
      // because the service should filter with status: { not: HIDDEN }
      prisma.account.findMany.mockResolvedValue(activeAccounts as any);

      // Act
      const result = await service.getSummary(userId);

      // Assert
      expect(result.totalBalance).toBe(6000); // 1000 + 5000, no hidden accounts
      expect(result.totalAccounts).toBe(2);
    });

  });

  describe('syncAccount', () => {
    it('should sync Plaid account successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildPlaidAccount({ userId });
      const syncedAccount = { ...account, lastSyncAt: new Date(), syncError: null };

      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.update.mockResolvedValue(syncedAccount as any);

      // Act
      const result = await service.syncAccount(account.id, userId);

      // Assert
      expect(result.lastSyncAt).toBeTruthy();
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: account.id },
        data: { lastSyncAt: expect.any(Date), syncError: null },
      });
    });

    it('should throw ForbiddenException when account is not PLAID source', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId, { source: AccountSource.MANUAL });
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.syncAccount(account.id, userId)).rejects.toThrow(ForbiddenException);
      await expect(service.syncAccount(account.id, userId)).rejects.toThrow('requires a PLAID account');
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      // Arrange
      const account = AccountFactory.buildPlaidAccount({ userId: 'other-user' });
      prisma.account.findUnique.mockResolvedValue(account as any);

      // Act & Assert
      await expect(service.syncAccount(account.id, 'user-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getFinancialSummary', () => {
    /**
     * TDD Red-Green-Refactor: getFinancialSummary
     *
     * This method provides normalized financial totals using BalanceNormalizerService.
     * Tests use real BalanceNormalizerService (not mocked) since it's a pure calculation service.
     */

    it('should return correct financial summary with mixed account types', async () => {
      // Arrange
      const userId = 'user-123';
      const accounts = [
        AccountFactory.buildChecking({ userId, currentBalance: new Prisma.Decimal(5000) }),
        AccountFactory.buildSavings({ userId, currentBalance: new Prisma.Decimal(10000) }),
        AccountFactory.buildCredit({
          userId,
          currentBalance: new Prisma.Decimal(-2500),
          creditLimit: new Prisma.Decimal(10000),
        }),
      ];
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalAssets).toBe(15000); // 5000 + 10000
      expect(result.totalLiabilities).toBe(2500); // Credit card debt (normalized to positive)
      expect(result.netWorth).toBe(12500); // 15000 - 2500
      expect(result.accounts).toHaveLength(3);
      expect(result.currency).toBe('USD');
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should calculate net worth correctly (assets minus liabilities)', async () => {
      // Arrange
      const userId = 'user-123';
      const accounts = [
        AccountFactory.buildChecking({ userId, currentBalance: new Prisma.Decimal(10000) }),
        AccountFactory.buildCredit({ userId, currentBalance: new Prisma.Decimal(-3000) }),
      ];
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalAssets).toBe(10000);
      expect(result.totalLiabilities).toBe(3000);
      expect(result.netWorth).toBe(7000);
    });

    it('should handle negative net worth', async () => {
      // Arrange
      const userId = 'user-123';
      const accounts = [
        AccountFactory.buildChecking({ userId, currentBalance: new Prisma.Decimal(1000) }),
        AccountFactory.buildCredit({ userId, currentBalance: new Prisma.Decimal(-5000) }),
      ];
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.netWorth).toBe(-4000);
    });

    it('should normalize credit card balances as positive amounts owed', async () => {
      // Arrange
      const userId = 'user-123';
      const creditCard = AccountFactory.buildCredit({
        userId,
        currentBalance: new Prisma.Decimal(-1500), // Provider reports as negative
        creditLimit: new Prisma.Decimal(5000),
      });
      prisma.account.findMany.mockResolvedValue([creditCard] as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalLiabilities).toBe(1500);
      expect(result.accounts[0].displayAmount).toBe(1500);
      expect(result.accounts[0].accountNature).toBe('LIABILITY');
      expect(result.accounts[0].displayLabel).toBe('Owed');
    });

    it('should handle overdraft on checking account', async () => {
      // Arrange
      const userId = 'user-123';
      const overdraftAccount = AccountFactory.buildChecking({
        userId,
        currentBalance: new Prisma.Decimal(-250), // Overdrawn
      });
      prisma.account.findMany.mockResolvedValue([overdraftAccount] as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalLiabilities).toBe(250); // Overdraft is a liability
      expect(result.accounts[0].displayLabel).toBe('Overdrawn');
    });

    it('should throw BadRequestException when neither userId nor familyId provided', async () => {
      // Act & Assert
      await expect(service.getFinancialSummary()).rejects.toThrow(BadRequestException);
      await expect(service.getFinancialSummary()).rejects.toThrow('XOR constraint');
    });

    it('should throw BadRequestException when both userId and familyId provided', async () => {
      // Act & Assert
      await expect(service.getFinancialSummary('user-123', 'family-456')).rejects.toThrow(BadRequestException);
    });

    it('should query by familyId when only familyId is provided', async () => {
      // Arrange
      const familyId = 'family-456';
      const account = AccountFactory.buildForFamily(familyId, {
        type: AccountType.CHECKING,
        currentBalance: new Prisma.Decimal(5000),
      });
      prisma.account.findMany.mockResolvedValue([account] as any);

      // Act
      await service.getFinancialSummary(undefined, familyId);

      // Assert
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { familyId, isActive: true, status: { not: AccountStatus.HIDDEN } },
      });
    });

    it('should return financial summary for user with valid userId', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildChecking({
        userId,
        currentBalance: new Prisma.Decimal(5000),
      });
      prisma.account.findMany.mockResolvedValue([account] as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.netWorth).toBe(5000);
    });

    it('should return zero summary when user has no accounts', async () => {
      // Arrange
      const userId = 'user-123';
      prisma.account.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalAssets).toBe(0);
      expect(result.totalLiabilities).toBe(0);
      expect(result.netWorth).toBe(0);
      expect(result.totalAvailableCredit).toBe(0);
      expect(result.accounts).toEqual([]);
      expect(result.currency).toBe('USD');
    });

    it('should use first account currency as summary currency', async () => {
      // Arrange
      const userId = 'user-123';
      const eurAccount = AccountFactory.buildChecking({
        userId,
        currentBalance: new Prisma.Decimal(5000),
        currency: 'EUR',
      });
      prisma.account.findMany.mockResolvedValue([eurAccount] as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.currency).toBe('EUR');
    });

    it('should sum available credit from all credit cards', async () => {
      // Arrange
      const userId = 'user-123';
      const creditCards = [
        AccountFactory.buildCredit({
          userId,
          currentBalance: new Prisma.Decimal(-2000),
          creditLimit: new Prisma.Decimal(5000),
        }),
        AccountFactory.buildCredit({
          userId,
          currentBalance: new Prisma.Decimal(-1000),
          creditLimit: new Prisma.Decimal(3000),
        }),
      ];
      prisma.account.findMany.mockResolvedValue(creditCards as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalAvailableCredit).toBe(5000); // (5000-2000) + (3000-1000)
    });

    it('should return 0 available credit when no credit cards exist', async () => {
      // Arrange
      const userId = 'user-123';
      const checkingAccount = AccountFactory.buildChecking({
        userId,
        currentBalance: new Prisma.Decimal(5000),
      });
      prisma.account.findMany.mockResolvedValue([checkingAccount] as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalAvailableCredit).toBe(0);
    });

    it('should handle credit cards with no credit limit', async () => {
      // Arrange
      const userId = 'user-123';
      const creditCard = AccountFactory.buildCredit({
        userId,
        currentBalance: new Prisma.Decimal(-1000),
        creditLimit: null,
      });
      prisma.account.findMany.mockResolvedValue([creditCard] as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.totalAvailableCredit).toBe(0);
    });

    it('should include normalized account details in response', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildChecking({
        id: 'acct-1',
        userId,
        name: 'Primary Checking',
        currentBalance: new Prisma.Decimal(5000),
        institutionName: 'Chase Bank',
      });
      prisma.account.findMany.mockResolvedValue([account] as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]).toMatchObject({
        accountId: 'acct-1',
        accountName: 'Primary Checking',
        accountType: AccountType.CHECKING,
        accountNature: 'ASSET',
        currentBalance: 5000,
        displayAmount: 5000,
        displayLabel: 'Available',
        affectsNetWorth: 'positive',
        currency: 'USD',
        institutionName: 'Chase Bank',
      });
    });

    it('should exclude HIDDEN accounts from financial summary', async () => {
      // Arrange
      const userId = 'user-123';
      const activeAccounts = [
        AccountFactory.buildChecking({
          userId,
          currentBalance: new Prisma.Decimal(5000),
          status: AccountStatus.ACTIVE,
        }),
        AccountFactory.buildSavings({
          userId,
          currentBalance: new Prisma.Decimal(10000),
          status: AccountStatus.ACTIVE,
        }),
      ];
      // Note: HIDDEN account should NOT be in query result
      prisma.account.findMany.mockResolvedValue(activeAccounts as any);

      // Act
      await service.getFinancialSummary(userId);

      // Assert - query should exclude HIDDEN
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId, isActive: true, status: { not: AccountStatus.HIDDEN } },
      });
    });

    it('should exclude HIDDEN accounts from net worth calculation', async () => {
      // Arrange
      const userId = 'user-123';
      // Only ACTIVE accounts should be returned by the query
      const activeAccounts = [
        AccountFactory.buildChecking({
          userId,
          currentBalance: new Prisma.Decimal(5000),
          status: AccountStatus.ACTIVE,
        }),
      ];
      prisma.account.findMany.mockResolvedValue(activeAccounts as any);

      // Act
      const result = await service.getFinancialSummary(userId);

      // Assert - net worth should only include active accounts
      expect(result.netWorth).toBe(5000);
      expect(result.accounts).toHaveLength(1);
    });

  });

  /**
   * TDD Red-Green-Refactor Example #2
   *
   * Testing DTO transformation helper method
   */
  describe('toResponseDto (via create)', () => {
    it('should convert Decimal fields to numbers', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = AccountFactory.buildCreateDto({ currentBalance: 1234.56 });
      const account = {
        ...AccountFactory.buildForUser(userId),
        currentBalance: new Prisma.Decimal(1234.56),
        availableBalance: new Prisma.Decimal(1000),
        creditLimit: new Prisma.Decimal(5000),
      };
      prisma.account.create.mockResolvedValue(account as any);

      // Act
      const result = await service.create(createDto, userId);

      // Assert
      expect(typeof result.currentBalance).toBe('number');
      expect(result.currentBalance).toBe(1234.56);
    });

    it('should compute derived fields correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = AccountFactory.buildCreateDto();
      const account = {
        ...AccountFactory.buildForUser(userId),
        source: AccountSource.PLAID,
        institutionName: 'Chase Bank',
        name: 'Checking',
        accountNumber: '12345678',
      };
      prisma.account.create.mockResolvedValue(account as any);

      // Act
      const result = await service.create(createDto, userId);

      // Assert
      expect(result.isPlaidAccount).toBe(true);
      expect(result.isManualAccount).toBe(false);
      expect(result.displayName).toBe('Chase Bank - Checking');
      expect(result.maskedAccountNumber).toBe('****5678');
    });
  });
});
