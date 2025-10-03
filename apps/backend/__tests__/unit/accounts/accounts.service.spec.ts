import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsService } from '../../../src/accounts/accounts.service';
import { Account, AccountType, AccountSource, AccountStatus } from '../../../src/core/database/entities/account.entity';
import { UserRole } from '../../../src/core/database/entities/user.entity';
import { CreateAccountDto } from '../../../src/accounts/dto/create-account.dto';
import { UpdateAccountDto } from '../../../src/accounts/dto/update-account.dto';

describe('AccountsService', () => {
  let service: AccountsService;
  let repository: jest.Mocked<Repository<Account>>;

  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const adminUserId = 'admin-uuid';
  const otherUserId = 'other-user-uuid';

  // Helper function to create account with getters
  const createMockAccountWithGetters = (base: Partial<Account>): Account => {
    return {
      ...base,
      get isPlaidAccount() { return this.source === AccountSource.PLAID; },
      get isManualAccount() { return this.source === AccountSource.MANUAL; },
      get needsSync() {
        if (!this.syncEnabled || !this.isPlaidAccount) return false;
        if (!this.lastSyncAt) return true;
        const hoursSinceSync = (Date.now() - this.lastSyncAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceSync >= 1;
      },
      get displayName() {
        if (this.institutionName) {
          return `${this.institutionName} - ${this.name}`;
        }
        return this.name;
      },
      get maskedAccountNumber() {
        if (!this.accountNumber) return '';
        const last4 = this.accountNumber.slice(-4);
        return `****${last4}`;
      },
    } as Account;
  };

  const mockAccount: Account = createMockAccountWithGetters({
    id: 'account-1',
    userId,
    name: 'Test Checking',
    type: AccountType.CHECKING,
    status: AccountStatus.ACTIVE,
    source: AccountSource.MANUAL,
    currentBalance: 1000,
    availableBalance: 950,
    creditLimit: null,
    currency: 'USD',
    institutionName: 'Test Bank',
    accountNumber: '1234567890',
    plaidAccountId: null,
    plaidAccessToken: null,
    isActive: true,
    syncEnabled: true,
    lastSyncAt: null,
    syncError: null,
    settings: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    user: null,
    transactions: [],
  });

  const mockPlaidAccount: Account = createMockAccountWithGetters({
    id: 'plaid-account-1',
    userId,
    name: 'Plaid Savings',
    type: AccountType.SAVINGS,
    status: AccountStatus.ACTIVE,
    source: AccountSource.PLAID,
    currentBalance: 5000,
    availableBalance: 5000,
    creditLimit: null,
    currency: 'USD',
    institutionName: 'Plaid Bank',
    accountNumber: '9876543210',
    plaidAccountId: 'plaid_abc123',
    plaidAccessToken: 'access_token_abc',
    isActive: true,
    syncEnabled: true,
    lastSyncAt: new Date('2024-01-01'), // Old sync date to trigger needsSync
    syncError: null,
    settings: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    user: null,
    transactions: [],
  });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    repository = module.get(getRepositoryToken(Account));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createAccountDto: CreateAccountDto = {
      name: 'New Account',
      type: AccountType.CHECKING,
      source: AccountSource.MANUAL,
      currentBalance: 500,
      currency: 'USD',
    };

    it('should create a new account with provided data', async () => {
      const createdAccount = { ...mockAccount, ...createAccountDto };
      repository.create.mockReturnValue(createdAccount as any);
      repository.save.mockResolvedValue(createdAccount as any);

      const result = await service.create(userId, createAccountDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createAccountDto,
        userId,
        currency: 'USD',
        syncEnabled: true,
        isActive: true,
      });
      expect(repository.save).toHaveBeenCalledWith(createdAccount);
      expect(result).toEqual(expect.objectContaining({
        name: createAccountDto.name,
        type: createAccountDto.type,
        userId,
      }));
    });

    it('should default currency to USD when not provided', async () => {
      const dtoWithoutCurrency: CreateAccountDto = {
        name: 'Test Account',
        type: AccountType.SAVINGS,
        source: AccountSource.MANUAL,
        currentBalance: 1000,
      };

      const createdAccount = { ...mockAccount, ...dtoWithoutCurrency, currency: 'USD' };
      repository.create.mockReturnValue(createdAccount as any);
      repository.save.mockResolvedValue(createdAccount as any);

      await service.create(userId, dtoWithoutCurrency);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD' })
      );
    });

    it('should default syncEnabled to true when not provided', async () => {
      const createdAccount = { ...mockAccount, ...createAccountDto };
      repository.create.mockReturnValue(createdAccount as any);
      repository.save.mockResolvedValue(createdAccount as any);

      await service.create(userId, createAccountDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ syncEnabled: true })
      );
    });

    it('should set syncEnabled from DTO when provided', async () => {
      const dtoWithSync: CreateAccountDto = {
        ...createAccountDto,
        syncEnabled: false,
      };

      const createdAccount = { ...mockAccount, ...dtoWithSync };
      repository.create.mockReturnValue(createdAccount as any);
      repository.save.mockResolvedValue(createdAccount as any);

      await service.create(userId, dtoWithSync);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ syncEnabled: false })
      );
    });

    it('should set isActive to true on creation', async () => {
      const createdAccount = { ...mockAccount, ...createAccountDto };
      repository.create.mockReturnValue(createdAccount as any);
      repository.save.mockResolvedValue(createdAccount as any);

      await service.create(userId, createAccountDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('should associate account with correct userId', async () => {
      const createdAccount = { ...mockAccount, ...createAccountDto };
      repository.create.mockReturnValue(createdAccount as any);
      repository.save.mockResolvedValue(createdAccount as any);

      const result = await service.create(userId, createAccountDto);

      expect(result.userId).toBe(userId);
    });
  });

  describe('findAll', () => {
    it('should return all accounts for a user', async () => {
      const accounts = [mockAccount, { ...mockAccount, id: 'account-2' }];
      repository.find.mockResolvedValue(accounts as any);

      const result = await service.findAll(userId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ id: mockAccount.id }));
    });

    it('should return empty array when user has no accounts', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });

    it('should order accounts by creation date descending', async () => {
      repository.find.mockResolvedValue([mockAccount]);

      await service.findAll(userId);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return account when user owns it', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne(mockAccount.id, userId, UserRole.USER);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        relations: ['transactions'],
      });
      expect(result).toEqual(expect.objectContaining({ id: mockAccount.id }));
    });

    it('should allow admin to access any account', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne(mockAccount.id, adminUserId, UserRole.ADMIN);

      expect(result).toEqual(expect.objectContaining({ id: mockAccount.id }));
    });

    it('should throw ForbiddenException when non-owner non-admin tries to access', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.findOne(mockAccount.id, otherUserId, UserRole.USER)
      ).rejects.toThrow(
        new ForbiddenException('You can only access your own accounts')
      );
    });

    it('should throw NotFoundException when account does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent-id', userId, UserRole.USER)
      ).rejects.toThrow(
        new NotFoundException('Account with ID non-existent-id not found')
      );
    });

    it('should include transactions relation', async () => {
      const accountWithTransactions = {
        ...mockAccount,
        transactions: [{ id: 'txn-1', amount: 100 }],
      };
      repository.findOne.mockResolvedValue(accountWithTransactions as any);

      await service.findOne(mockAccount.id, userId, UserRole.USER);

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['transactions'],
        })
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAccountDto = {
      name: 'Updated Account Name',
      currentBalance: 2000,
    };

    it('should allow user to update their own account', async () => {
      repository.findOne.mockResolvedValue(mockAccount);
      const updatedAccount = { ...mockAccount, ...updateDto };
      repository.save.mockResolvedValue(updatedAccount as any);

      const result = await service.update(mockAccount.id, userId, UserRole.USER, updateDto);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto)
      );
      expect(result.name).toBe('Updated Account Name');
      expect(result.currentBalance).toBe(2000);
    });

    it('should allow admin to update any account', async () => {
      repository.findOne.mockResolvedValue(mockAccount);
      const updatedAccount = { ...mockAccount, ...updateDto };
      repository.save.mockResolvedValue(updatedAccount as any);

      const result = await service.update(mockAccount.id, adminUserId, UserRole.ADMIN, updateDto);

      expect(result.name).toBe('Updated Account Name');
    });

    it('should throw ForbiddenException when non-owner non-admin tries to update', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.update(mockAccount.id, otherUserId, UserRole.USER, updateDto)
      ).rejects.toThrow(
        new ForbiddenException('You can only update your own accounts')
      );
    });

    it('should throw NotFoundException when account does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', userId, UserRole.USER, updateDto)
      ).rejects.toThrow(
        new NotFoundException('Account with ID non-existent-id not found')
      );
    });

    it('should update multiple fields at once', async () => {
      const multiFieldUpdate: UpdateAccountDto = {
        name: 'New Name',
        currentBalance: 5000,
        availableBalance: 4500,
        syncEnabled: false,
      };

      repository.findOne.mockResolvedValue(mockAccount);
      const updatedAccount = { ...mockAccount, ...multiFieldUpdate };
      repository.save.mockResolvedValue(updatedAccount as any);

      const result = await service.update(mockAccount.id, userId, UserRole.USER, multiFieldUpdate);

      expect(result.name).toBe('New Name');
      expect(result.currentBalance).toBe(5000);
      expect(result.syncEnabled).toBe(false);
    });
  });

  describe('remove', () => {
    it('should allow user to delete their own account', async () => {
      repository.findOne.mockResolvedValue(mockAccount);
      repository.remove.mockResolvedValue(mockAccount);

      await service.remove(mockAccount.id, userId, UserRole.USER);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: mockAccount.id } });
      expect(repository.remove).toHaveBeenCalledWith(mockAccount);
    });

    it('should allow admin to delete any account', async () => {
      repository.findOne.mockResolvedValue(mockAccount);
      repository.remove.mockResolvedValue(mockAccount);

      await service.remove(mockAccount.id, adminUserId, UserRole.ADMIN);

      expect(repository.remove).toHaveBeenCalledWith(mockAccount);
    });

    it('should throw ForbiddenException when non-owner non-admin tries to delete', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.remove(mockAccount.id, otherUserId, UserRole.USER)
      ).rejects.toThrow(
        new ForbiddenException('You can only delete your own accounts')
      );
    });

    it('should throw NotFoundException when account does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent-id', userId, UserRole.USER)
      ).rejects.toThrow(
        new NotFoundException('Account with ID non-existent-id not found')
      );
    });

    it('should not call remove when authorization fails', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.remove(mockAccount.id, otherUserId, UserRole.USER)
      ).rejects.toThrow(ForbiddenException);

      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should return balance for account owner', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      const result = await service.getBalance(mockAccount.id, userId, UserRole.USER);

      expect(result).toEqual({
        currentBalance: mockAccount.currentBalance,
        availableBalance: mockAccount.availableBalance,
        currency: mockAccount.currency,
      });
    });

    it('should allow admin to get any account balance', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      const result = await service.getBalance(mockAccount.id, adminUserId, UserRole.ADMIN);

      expect(result.currentBalance).toBe(mockAccount.currentBalance);
    });

    it('should throw ForbiddenException when non-owner non-admin tries to access', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.getBalance(mockAccount.id, otherUserId, UserRole.USER)
      ).rejects.toThrow(
        new ForbiddenException('You can only access your own account balances')
      );
    });

    it('should throw NotFoundException when account does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getBalance('non-existent-id', userId, UserRole.USER)
      ).rejects.toThrow(
        new NotFoundException('Account with ID non-existent-id not found')
      );
    });

    it('should return null for availableBalance when not set', async () => {
      const accountWithoutAvailable = { ...mockAccount, availableBalance: null };
      repository.findOne.mockResolvedValue(accountWithoutAvailable as any);

      const result = await service.getBalance(mockAccount.id, userId, UserRole.USER);

      expect(result.availableBalance).toBeNull();
    });
  });

  describe('getSummary', () => {
    it('should calculate summary for user accounts', async () => {
      // Create accounts with explicit balances
      const checkingAccount = { ...mockAccount, currentBalance: 1000 };
      const savingsAccount = createMockAccountWithGetters({ ...mockAccount, id: 'account-2', type: AccountType.SAVINGS, currentBalance: 5000 });
      const creditAccount = createMockAccountWithGetters({ ...mockAccount, id: 'account-3', type: AccountType.CREDIT_CARD, currentBalance: -500, status: AccountStatus.ACTIVE });

      const accounts = [checkingAccount, savingsAccount, creditAccount];
      repository.find.mockResolvedValue(accounts as any);

      const result = await service.getSummary(userId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId, isActive: true },
      });
      expect(result.totalAccounts).toBe(3);
      expect(result.totalBalance).toBe(5500); // 1000 + 5000 - 500
      expect(result.activeAccounts).toBe(3);
    });

    it('should group accounts by type', async () => {
      // Create simple accounts with specific balances for this test
      const checkingAccount = { ...mockAccount, currentBalance: 1000 };
      const savingsAccount1 = createMockAccountWithGetters({ ...mockAccount, id: 'account-2', type: AccountType.SAVINGS, currentBalance: 5000 });
      const savingsAccount2 = createMockAccountWithGetters({ ...mockAccount, id: 'account-3', type: AccountType.SAVINGS, currentBalance: 3000 });

      const accounts = [checkingAccount, savingsAccount1, savingsAccount2];
      repository.find.mockResolvedValue(accounts as any);

      const result = await service.getSummary(userId);

      expect(result.byType[AccountType.CHECKING]).toEqual({
        count: 1,
        totalBalance: 1000,
      });
      expect(result.byType[AccountType.SAVINGS]).toEqual({
        count: 2,
        totalBalance: 8000,
      });
    });

    it('should count accounts needing sync', async () => {
      const manualAccount = { ...mockAccount };
      const plaidAccount1 = createMockAccountWithGetters({ ...mockAccount, id: 'account-2', source: AccountSource.PLAID, syncEnabled: true, lastSyncAt: new Date('2024-01-01') });
      const plaidAccount2 = createMockAccountWithGetters({ ...mockAccount, id: 'account-3', source: AccountSource.PLAID, syncEnabled: true, lastSyncAt: new Date('2024-01-01') });

      const accounts = [manualAccount, plaidAccount1, plaidAccount2];
      repository.find.mockResolvedValue(accounts as any);

      const result = await service.getSummary(userId);

      expect(result.accountsNeedingSync).toBe(2);
    });

    it('should only include active accounts', async () => {
      const accounts = [mockAccount];
      repository.find.mockResolvedValue(accounts as any);

      await service.getSummary(userId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId, isActive: true },
      });
    });

    it('should return zero summary when user has no accounts', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result).toEqual({
        totalAccounts: 0,
        totalBalance: 0,
        activeAccounts: 0,
        accountsNeedingSync: 0,
        byType: {},
      });
    });

    it('should handle negative balances in credit accounts', async () => {
      const accounts = [
        createMockAccountWithGetters({ ...mockAccount, type: AccountType.CREDIT_CARD, currentBalance: -1000 }),
      ];
      repository.find.mockResolvedValue(accounts as any);

      const result = await service.getSummary(userId);

      expect(result.totalBalance).toBe(-1000);
    });
  });

  describe('syncAccount', () => {
    it('should sync Plaid account for owner', async () => {
      repository.findOne.mockResolvedValue(mockPlaidAccount);
      const syncedAccount = createMockAccountWithGetters({
        ...mockPlaidAccount,
        lastSyncAt: new Date(),
        syncError: null,
      });
      repository.save.mockResolvedValue(syncedAccount as any);

      const result = await service.syncAccount(mockPlaidAccount.id, userId, UserRole.USER);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          syncError: null,
        })
      );
      expect(result.lastSyncAt).toBeInstanceOf(Date);
    });

    it('should allow admin to sync any Plaid account', async () => {
      repository.findOne.mockResolvedValue(mockPlaidAccount);
      const syncedAccount = createMockAccountWithGetters({ ...mockPlaidAccount, lastSyncAt: new Date() });
      repository.save.mockResolvedValue(syncedAccount as any);

      const result = await service.syncAccount(mockPlaidAccount.id, adminUserId, UserRole.ADMIN);

      expect(result.lastSyncAt).toBeInstanceOf(Date);
    });

    it('should throw ForbiddenException when non-owner tries to sync', async () => {
      repository.findOne.mockResolvedValue(mockPlaidAccount);

      await expect(
        service.syncAccount(mockPlaidAccount.id, otherUserId, UserRole.USER)
      ).rejects.toThrow(
        new ForbiddenException('You can only sync your own accounts')
      );
    });

    it('should throw NotFoundException when account does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.syncAccount('non-existent-id', userId, UserRole.USER)
      ).rejects.toThrow(
        new NotFoundException('Account with ID non-existent-id not found')
      );
    });

    it('should throw ForbiddenException when trying to sync non-Plaid account', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.syncAccount(mockAccount.id, userId, UserRole.USER)
      ).rejects.toThrow(
        new ForbiddenException('Only Plaid accounts can be synced')
      );
    });

    it('should clear sync error on successful sync', async () => {
      const accountWithError = createMockAccountWithGetters({
        ...mockPlaidAccount,
        syncError: 'Previous error',
      });
      repository.findOne.mockResolvedValue(accountWithError);
      const syncedAccount = createMockAccountWithGetters({ ...accountWithError, syncError: null, lastSyncAt: new Date() });
      repository.save.mockResolvedValue(syncedAccount as any);

      const result = await service.syncAccount(mockPlaidAccount.id, userId, UserRole.USER);

      expect(result.syncError).toBeNull();
    });
  });

  describe('toResponseDto (private method - tested through public methods)', () => {
    it('should map account to response DTO correctly', async () => {
      repository.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne(mockAccount.id, userId, UserRole.USER);

      expect(result).toEqual({
        id: mockAccount.id,
        userId: mockAccount.userId,
        name: mockAccount.name,
        type: mockAccount.type,
        status: mockAccount.status,
        source: mockAccount.source,
        currentBalance: mockAccount.currentBalance,
        availableBalance: mockAccount.availableBalance,
        creditLimit: mockAccount.creditLimit,
        currency: mockAccount.currency,
        institutionName: mockAccount.institutionName,
        maskedAccountNumber: mockAccount.maskedAccountNumber,
        displayName: mockAccount.displayName,
        isPlaidAccount: mockAccount.isPlaidAccount,
        isManualAccount: mockAccount.isManualAccount,
        needsSync: mockAccount.needsSync,
        isActive: mockAccount.isActive,
        syncEnabled: mockAccount.syncEnabled,
        lastSyncAt: mockAccount.lastSyncAt,
        syncError: mockAccount.syncError,
        settings: mockAccount.settings,
        createdAt: mockAccount.createdAt,
        updatedAt: mockAccount.updatedAt,
      });
    });

    it('should exclude sensitive fields like plaidAccessToken', async () => {
      repository.findOne.mockResolvedValue(mockPlaidAccount);

      const result = await service.findOne(mockPlaidAccount.id, userId, UserRole.USER);

      expect(result).not.toHaveProperty('plaidAccessToken');
      expect(result).not.toHaveProperty('plaidAccountId');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle repository errors gracefully', async () => {
      repository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.findOne(mockAccount.id, userId, UserRole.USER)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle save errors during create', async () => {
      const createDto: CreateAccountDto = {
        name: 'Test',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 1000,
      };

      repository.create.mockReturnValue(mockAccount);
      repository.save.mockRejectedValue(new Error('Constraint violation'));

      await expect(service.create(userId, createDto)).rejects.toThrow('Constraint violation');
    });

    it('should handle concurrent update scenarios', async () => {
      repository.findOne.mockResolvedValue(mockAccount);
      const updatedAccount: Account = {
        ...mockAccount,
        updatedAt: new Date(),
      } as Account;
      repository.save.mockResolvedValue(updatedAccount as any);

      const result = await service.update(
        mockAccount.id,
        userId,
        UserRole.USER,
        { name: 'Updated' }
      );

      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid account ID format', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('invalid-id', userId, UserRole.USER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle accounts with null optional fields', async () => {
      const minimalAccount = createMockAccountWithGetters({
        ...mockAccount,
        availableBalance: null,
        creditLimit: null,
        institutionName: null,
        accountNumber: null,
        lastSyncAt: null,
      });
      repository.findOne.mockResolvedValue(minimalAccount);

      const result = await service.findOne(mockAccount.id, userId, UserRole.USER);

      expect(result.availableBalance).toBeNull();
      expect(result.creditLimit).toBeNull();
    });
  });
});
