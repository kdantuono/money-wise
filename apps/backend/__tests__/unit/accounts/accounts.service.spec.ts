import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsService } from '../../../src/accounts/accounts.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
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
    it('should find all personal accounts for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const accounts = AccountFactory.buildMany(3, { userId });
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toHaveLength(3);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should find all family accounts for a family', async () => {
      // Arrange
      const familyId = 'family-456';
      const accounts = AccountFactory.buildMany(2, { userId: null, familyId });
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.findAll(undefined, familyId);

      // Assert
      expect(result).toHaveLength(2);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { familyId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should find all accounts for admin users', async () => {
      // Arrange
      const accounts = AccountFactory.buildMany(5);
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.findAll(undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(result).toHaveLength(5);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
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
  });

  describe('remove', () => {
    it('should delete account for owner', async () => {
      // Arrange
      const userId = 'user-123';
      const account = AccountFactory.buildForUser(userId);
      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.delete.mockResolvedValue(account as any);

      // Act
      await service.remove(account.id, userId);

      // Assert
      expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: account.id } });
      expect(prisma.account.delete).toHaveBeenCalledTimes(1);
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

    it('should allow admin to delete any account', async () => {
      // Arrange
      const account = AccountFactory.buildForUser('other-user');
      prisma.account.findUnique.mockResolvedValue(account as any);
      prisma.account.delete.mockResolvedValue(account as any);

      // Act
      await service.remove(account.id, undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(prisma.account.delete).toHaveBeenCalledTimes(1);
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

    it('should return summary for admin across all accounts', async () => {
      // Arrange
      const accounts = AccountFactory.buildMany(10, { isActive: true });
      prisma.account.findMany.mockResolvedValue(accounts as any);

      // Act
      const result = await service.getSummary(undefined, undefined, UserRole.ADMIN);

      // Assert
      expect(result.totalAccounts).toBe(10);
    });

    it('should throw BadRequestException when neither userId nor familyId provided', async () => {
      // Act & Assert
      await expect(service.getSummary()).rejects.toThrow(BadRequestException);
    });

    it('should filter by isActive status', async () => {
      // Arrange
      const userId = 'user-123';
      const activeAccounts = AccountFactory.buildMany(3, { userId, isActive: true });
      prisma.account.findMany.mockResolvedValue(activeAccounts as any);

      // Act
      await service.getSummary(userId);

      // Assert
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId, isActive: true },
      });
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
