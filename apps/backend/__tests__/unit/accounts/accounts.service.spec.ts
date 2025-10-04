import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsService } from '../../../src/accounts/accounts.service';
import { Account, AccountType, AccountStatus, AccountSource } from '../../../src/core/database/entities/account.entity';
import { UserRole } from '../../../src/core/database/entities/user.entity';
import { CreateAccountDto } from '../../../src/accounts/dto/create-account.dto';
import { UpdateAccountDto } from '../../../src/accounts/dto/update-account.dto';

describe('AccountsService', () => {
  let service: AccountsService;
  let accountRepository: jest.Mocked<Repository<Account>>;

  // Mock Repository
  const mockAccountRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  // Helper to create mock account
  const createMockAccount = (partial: Partial<Account> = {}): Account => ({
    id: 'acc-123',
    userId: 'user-123',
    name: 'Test Account',
    type: AccountType.CHECKING,
    status: AccountStatus.ACTIVE,
    source: AccountSource.MANUAL,
    currentBalance: 1000,
    availableBalance: 900,
    creditLimit: null,
    currency: 'USD',
    institutionName: null,
    accountNumber: null,
    routingNumber: null,
    plaidAccountId: null,
    plaidItemId: null,
    plaidAccessToken: null,
    plaidMetadata: null,
    maskedAccountNumber: '',
    displayName: 'Test Account',
    isPlaidAccount: false,
    isManualAccount: true,
    needsSync: false,
    isActive: true,
    syncEnabled: true,
    lastSyncAt: null,
    syncError: null,
    settings: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    user: null,
    transactions: [],
    ...partial,
  } as Account);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockAccountRepository,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    accountRepository = module.get(getRepositoryToken(Account));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(accountRepository).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateAccountDto = {
      name: 'Test Account',
      type: AccountType.CHECKING,
      source: AccountSource.MANUAL,
      currentBalance: 1000,
      currency: 'USD',
      syncEnabled: true,
    };

    it('should create account with provided DTO', async () => {
      const mockAccount = createMockAccount();
      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      const result = await service.create('user-123', createDto);

      expect(accountRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId: 'user-123',
        currency: 'USD',
        syncEnabled: true,
        isActive: true,
      });
      expect(accountRepository.save).toHaveBeenCalledWith(mockAccount);
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

    it('should apply default currency (USD) when not provided', async () => {
      const dtoWithoutCurrency = { ...createDto, currency: undefined };
      const mockAccount = createMockAccount({ currency: 'USD' });
      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      await service.create('user-123', dtoWithoutCurrency);

      expect(accountRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutCurrency,
        userId: 'user-123',
        currency: 'USD',
        syncEnabled: true,
        isActive: true,
      });
    });

    it('should apply default syncEnabled (true) when not provided', async () => {
      const dtoWithoutSyncEnabled = { ...createDto, syncEnabled: undefined };
      const mockAccount = createMockAccount({ syncEnabled: true });
      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      await service.create('user-123', dtoWithoutSyncEnabled);

      expect(accountRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutSyncEnabled,
        userId: 'user-123',
        currency: 'USD',
        syncEnabled: true,
        isActive: true,
      });
    });

    it('should respect false value for syncEnabled', async () => {
      const dtoWithSyncDisabled = { ...createDto, syncEnabled: false };
      const mockAccount = createMockAccount({ syncEnabled: false });
      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      await service.create('user-123', dtoWithSyncDisabled);

      expect(accountRepository.create).toHaveBeenCalledWith({
        ...dtoWithSyncDisabled,
        userId: 'user-123',
        currency: 'USD',
        syncEnabled: false,
        isActive: true,
      });
    });

    it('should set isActive to true', async () => {
      const mockAccount = createMockAccount({ isActive: true });
      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      await service.create('user-123', createDto);

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('should create account with optional fields', async () => {
      const dtoWithOptionals: CreateAccountDto = {
        ...createDto,
        availableBalance: 900,
        creditLimit: 5000,
        institutionName: 'Chase Bank',
        accountNumber: '1234',
        routingNumber: '5678',
        settings: {
          autoSync: true,
          syncFrequency: 'daily',
          notifications: true,
          budgetIncluded: true,
        },
      };
      const mockAccount = createMockAccount(dtoWithOptionals);
      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      const result = await service.create('user-123', dtoWithOptionals);

      expect(accountRepository.create).toHaveBeenCalledWith({
        ...dtoWithOptionals,
        userId: 'user-123',
        currency: 'USD',
        syncEnabled: true,
        isActive: true,
      });
      expect(result.availableBalance).toBe(900);
      expect(result.settings).toEqual(dtoWithOptionals.settings);
    });

    it('should return AccountResponseDto', async () => {
      const mockAccount = createMockAccount();
      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      const result = await service.create('user-123', createDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('currentBalance');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('displayName');
      expect(result).toHaveProperty('isPlaidAccount');
      expect(result).toHaveProperty('isManualAccount');
      expect(result).toHaveProperty('needsSync');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('syncEnabled');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('findAll', () => {
    it('should find accounts for user', async () => {
      const mockAccounts = [
        createMockAccount({ id: 'acc-1', name: 'Account 1' }),
        createMockAccount({ id: 'acc-2', name: 'Account 2' }),
      ];
      mockAccountRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.findAll('user-123');

      expect(accountRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('acc-1');
      expect(result[1].id).toBe('acc-2');
    });

    it('should order by createdAt DESC', async () => {
      const oldAccount = createMockAccount({
        id: 'acc-old',
        createdAt: new Date('2024-01-01')
      });
      const newAccount = createMockAccount({
        id: 'acc-new',
        createdAt: new Date('2025-01-01')
      });
      mockAccountRepository.find.mockResolvedValue([newAccount, oldAccount]);

      await service.findAll('user-123');

      expect(accountRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when user has no accounts', async () => {
      mockAccountRepository.find.mockResolvedValue([]);

      const result = await service.findAll('user-123');

      expect(result).toEqual([]);
    });

    it('should map to AccountResponseDto[]', async () => {
      const mockAccounts = [createMockAccount()];
      mockAccountRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.findAll('user-123');

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('userId');
      expect(result[0]).toHaveProperty('displayName');
      expect(result[0]).toHaveProperty('isPlaidAccount');
      expect(result[0]).toHaveProperty('isManualAccount');
      expect(result[0]).toHaveProperty('needsSync');
    });
  });

  describe('findOne', () => {
    it('should load account with transactions relation', async () => {
      const mockAccount = createMockAccount();
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);

      await service.findOne('acc-123', 'user-123', UserRole.USER);

      expect(accountRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'acc-123' },
        relations: ['transactions'],
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow('Account with ID non-existent not found');
    });

    describe('authorization checks', () => {
      it('should allow access when user owns account', async () => {
        const account = createMockAccount({ userId: 'user-123' });
        mockAccountRepository.findOne.mockResolvedValue(account);

        const result = await service.findOne('acc-123', 'user-123', UserRole.USER);

        expect(result).toBeDefined();
        expect(result.id).toBe('acc-123');
      });

      it('should throw ForbiddenException when user does not own account', async () => {
        const account = createMockAccount({ userId: 'user-456' });
        mockAccountRepository.findOne.mockResolvedValue(account);

        await expect(
          service.findOne('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.findOne('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow('You can only access your own accounts');
      });

      it('should allow admin access to any account', async () => {
        const account = createMockAccount({ userId: 'user-456' });
        mockAccountRepository.findOne.mockResolvedValue(account);

        const result = await service.findOne('acc-123', 'admin-123', UserRole.ADMIN);

        expect(result).toBeDefined();
        expect(result.id).toBe('acc-123');
      });
    });

    it('should return AccountResponseDto', async () => {
      const mockAccount = createMockAccount();
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne('acc-123', 'user-123', UserRole.USER);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('displayName');
      expect(result).toHaveProperty('isPlaidAccount');
      expect(result).toHaveProperty('isManualAccount');
      expect(result).toHaveProperty('needsSync');
    });
  });

  describe('update', () => {
    const updateDto: UpdateAccountDto = {
      name: 'Updated Account',
      currentBalance: 2000,
    };

    it('should throw NotFoundException when account not found', async () => {
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'user-123', UserRole.USER, updateDto)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('non-existent', 'user-123', UserRole.USER, updateDto)
      ).rejects.toThrow('Account with ID non-existent not found');
    });

    describe('authorization checks', () => {
      it('should allow update when user owns account', async () => {
        const account = createMockAccount({ userId: 'user-123' });
        const updatedAccount = { ...account, ...updateDto };
        mockAccountRepository.findOne.mockResolvedValue(account);
        mockAccountRepository.save.mockResolvedValue(updatedAccount);

        const result = await service.update('acc-123', 'user-123', UserRole.USER, updateDto);

        expect(result).toBeDefined();
        expect(result.name).toBe('Updated Account');
      });

      it('should throw ForbiddenException when user does not own account', async () => {
        const account = createMockAccount({ userId: 'user-456' });
        mockAccountRepository.findOne.mockResolvedValue(account);

        await expect(
          service.update('acc-123', 'user-123', UserRole.USER, updateDto)
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.update('acc-123', 'user-123', UserRole.USER, updateDto)
        ).rejects.toThrow('You can only update your own accounts');
      });

      it('should allow admin update of any account', async () => {
        const account = createMockAccount({ userId: 'user-456' });
        const updatedAccount = { ...account, ...updateDto };
        mockAccountRepository.findOne.mockResolvedValue(account);
        mockAccountRepository.save.mockResolvedValue(updatedAccount);

        const result = await service.update('acc-123', 'admin-123', UserRole.ADMIN, updateDto);

        expect(result).toBeDefined();
        expect(result.name).toBe('Updated Account');
      });
    });

    it('should apply updateAccountDto with Object.assign', async () => {
      const account = createMockAccount({ userId: 'user-123', name: 'Original' });
      const updatedAccount = { ...account, ...updateDto };
      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.save.mockResolvedValue(updatedAccount);

      await service.update('acc-123', 'user-123', UserRole.USER, updateDto);

      expect(accountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Account',
          currentBalance: 2000,
        })
      );
    });

    it('should return updated AccountResponseDto', async () => {
      const account = createMockAccount({ userId: 'user-123' });
      const updatedAccount = { ...account, ...updateDto };
      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.save.mockResolvedValue(updatedAccount);

      const result = await service.update('acc-123', 'user-123', UserRole.USER, updateDto);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Updated Account');
      expect(result.currentBalance).toBe(2000);
    });

    it('should update multiple fields', async () => {
      const multiFieldUpdate: UpdateAccountDto = {
        name: 'New Name',
        status: AccountStatus.INACTIVE,
        currentBalance: 3000,
        availableBalance: 2500,
        syncEnabled: false,
        settings: { notifications: false },
      };
      const account = createMockAccount({ userId: 'user-123' });
      const updatedAccount = { ...account, ...multiFieldUpdate };
      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.save.mockResolvedValue(updatedAccount);

      const result = await service.update('acc-123', 'user-123', UserRole.USER, multiFieldUpdate);

      expect(result.name).toBe('New Name');
      expect(result.status).toBe(AccountStatus.INACTIVE);
      expect(result.currentBalance).toBe(3000);
      expect(result.availableBalance).toBe(2500);
      expect(result.syncEnabled).toBe(false);
      expect(result.settings).toEqual({ notifications: false });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when account not found', async () => {
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.remove('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow('Account with ID non-existent not found');
    });

    describe('authorization checks', () => {
      it('should allow deletion when user owns account', async () => {
        const account = createMockAccount({ userId: 'user-123' });
        mockAccountRepository.findOne.mockResolvedValue(account);
        mockAccountRepository.remove.mockResolvedValue(account);

        await service.remove('acc-123', 'user-123', UserRole.USER);

        expect(accountRepository.remove).toHaveBeenCalledWith(account);
      });

      it('should throw ForbiddenException when user does not own account', async () => {
        const account = createMockAccount({ userId: 'user-456' });
        mockAccountRepository.findOne.mockResolvedValue(account);

        await expect(
          service.remove('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.remove('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow('You can only delete your own accounts');
      });

      it('should allow admin deletion of any account', async () => {
        const account = createMockAccount({ userId: 'user-456' });
        mockAccountRepository.findOne.mockResolvedValue(account);
        mockAccountRepository.remove.mockResolvedValue(account);

        await service.remove('acc-123', 'admin-123', UserRole.ADMIN);

        expect(accountRepository.remove).toHaveBeenCalledWith(account);
      });
    });

    it('should call repository.remove()', async () => {
      const account = createMockAccount({ userId: 'user-123' });
      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.remove.mockResolvedValue(account);

      await service.remove('acc-123', 'user-123', UserRole.USER);

      expect(accountRepository.remove).toHaveBeenCalledWith(account);
      expect(accountRepository.remove).toHaveBeenCalledTimes(1);
    });

    it('should not return anything (void)', async () => {
      const account = createMockAccount({ userId: 'user-123' });
      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.remove.mockResolvedValue(account);

      const result = await service.remove('acc-123', 'user-123', UserRole.USER);

      expect(result).toBeUndefined();
    });
  });

  describe('getBalance', () => {
    it('should throw NotFoundException when account not found', async () => {
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getBalance('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getBalance('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow('Account with ID non-existent not found');
    });

    describe('authorization checks', () => {
      it('should allow access when user owns account', async () => {
        const account = createMockAccount({ userId: 'user-123', currentBalance: 1500 });
        mockAccountRepository.findOne.mockResolvedValue(account);

        const result = await service.getBalance('acc-123', 'user-123', UserRole.USER);

        expect(result).toBeDefined();
        expect(result.currentBalance).toBe(1500);
      });

      it('should throw ForbiddenException when user does not own account', async () => {
        const account = createMockAccount({ userId: 'user-456' });
        mockAccountRepository.findOne.mockResolvedValue(account);

        await expect(
          service.getBalance('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.getBalance('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow('You can only access your own account balances');
      });

      it('should allow admin access to any account', async () => {
        const account = createMockAccount({ userId: 'user-456', currentBalance: 2500 });
        mockAccountRepository.findOne.mockResolvedValue(account);

        const result = await service.getBalance('acc-123', 'admin-123', UserRole.ADMIN);

        expect(result).toBeDefined();
        expect(result.currentBalance).toBe(2500);
      });
    });

    it('should return balance object with currentBalance', async () => {
      const account = createMockAccount({
        userId: 'user-123',
        currentBalance: 1000,
        availableBalance: 900,
        currency: 'USD'
      });
      mockAccountRepository.findOne.mockResolvedValue(account);

      const result = await service.getBalance('acc-123', 'user-123', UserRole.USER);

      expect(result).toEqual({
        currentBalance: 1000,
        availableBalance: 900,
        currency: 'USD',
      });
    });

    it('should return availableBalance as null when undefined', async () => {
      const account = createMockAccount({
        userId: 'user-123',
        currentBalance: 1000,
        availableBalance: undefined,
        currency: 'EUR'
      });
      mockAccountRepository.findOne.mockResolvedValue(account);

      const result = await service.getBalance('acc-123', 'user-123', UserRole.USER);

      expect(result).toEqual({
        currentBalance: 1000,
        availableBalance: null,
        currency: 'EUR',
      });
    });

    it('should return availableBalance as null when null', async () => {
      const account = createMockAccount({
        userId: 'user-123',
        currentBalance: 5000,
        availableBalance: null,
        currency: 'GBP'
      });
      mockAccountRepository.findOne.mockResolvedValue(account);

      const result = await service.getBalance('acc-123', 'user-123', UserRole.USER);

      expect(result).toEqual({
        currentBalance: 5000,
        availableBalance: null,
        currency: 'GBP',
      });
    });
  });

  describe('getSummary', () => {
    it('should find only active accounts for user (isActive: true)', async () => {
      const activeAccount = createMockAccount({ isActive: true });
      mockAccountRepository.find.mockResolvedValue([activeAccount]);

      await service.getSummary('user-123');

      expect(accountRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123', isActive: true },
      });
    });

    it('should calculate totalBalance (sum of currentBalance)', async () => {
      const accounts = [
        createMockAccount({ currentBalance: 1000, isActive: true }),
        createMockAccount({ currentBalance: 2000, isActive: true }),
        createMockAccount({ currentBalance: 500, isActive: true }),
      ];
      mockAccountRepository.find.mockResolvedValue(accounts);

      const result = await service.getSummary('user-123');

      expect(result.totalBalance).toBe(3500);
    });

    it('should count activeAccounts (status === active)', async () => {
      const accounts = [
        createMockAccount({ status: AccountStatus.ACTIVE, isActive: true }),
        createMockAccount({ status: AccountStatus.ACTIVE, isActive: true }),
        createMockAccount({ status: AccountStatus.INACTIVE, isActive: true }),
        createMockAccount({ status: AccountStatus.CLOSED, isActive: true }),
      ];
      mockAccountRepository.find.mockResolvedValue(accounts);

      const result = await service.getSummary('user-123');

      expect(result.activeAccounts).toBe(2);
    });

    it('should count accountsNeedingSync (needsSync === true)', async () => {
      const account1 = createMockAccount({ isActive: true });
      const account2 = createMockAccount({ isActive: true });
      const account3 = createMockAccount({ isActive: true });

      // Override needsSync getter behavior
      Object.defineProperty(account1, 'needsSync', { value: true, configurable: true });
      Object.defineProperty(account2, 'needsSync', { value: false, configurable: true });
      Object.defineProperty(account3, 'needsSync', { value: true, configurable: true });

      mockAccountRepository.find.mockResolvedValue([account1, account2, account3]);

      const result = await service.getSummary('user-123');

      expect(result.accountsNeedingSync).toBe(2);
    });

    it('should group by type with count and totalBalance', async () => {
      const accounts = [
        createMockAccount({
          type: AccountType.CHECKING,
          currentBalance: 1000,
          isActive: true
        }),
        createMockAccount({
          type: AccountType.SAVINGS,
          currentBalance: 2000,
          isActive: true
        }),
        createMockAccount({
          type: AccountType.CHECKING,
          currentBalance: 500,
          isActive: true
        }),
        createMockAccount({
          type: AccountType.CREDIT_CARD,
          currentBalance: 300,
          isActive: true
        }),
      ];
      mockAccountRepository.find.mockResolvedValue(accounts);

      const result = await service.getSummary('user-123');

      expect(result.byType).toEqual({
        [AccountType.CHECKING]: { count: 2, totalBalance: 1500 },
        [AccountType.SAVINGS]: { count: 1, totalBalance: 2000 },
        [AccountType.CREDIT_CARD]: { count: 1, totalBalance: 300 },
      });
    });

    it('should return complete AccountSummaryDto', async () => {
      const account1 = createMockAccount({
        type: AccountType.CHECKING,
        currentBalance: 1000,
        status: AccountStatus.ACTIVE,
        isActive: true
      });
      const account2 = createMockAccount({
        type: AccountType.SAVINGS,
        currentBalance: 2000,
        status: AccountStatus.ACTIVE,
        isActive: true
      });

      Object.defineProperty(account1, 'needsSync', { value: false, configurable: true });
      Object.defineProperty(account2, 'needsSync', { value: true, configurable: true });

      mockAccountRepository.find.mockResolvedValue([account1, account2]);

      const result = await service.getSummary('user-123');

      expect(result).toEqual({
        totalAccounts: 2,
        totalBalance: 3000,
        activeAccounts: 2,
        accountsNeedingSync: 1,
        byType: {
          [AccountType.CHECKING]: { count: 1, totalBalance: 1000 },
          [AccountType.SAVINGS]: { count: 1, totalBalance: 2000 },
        },
      });
    });

    it('should return empty summary when user has no active accounts', async () => {
      mockAccountRepository.find.mockResolvedValue([]);

      const result = await service.getSummary('user-123');

      expect(result).toEqual({
        totalAccounts: 0,
        totalBalance: 0,
        activeAccounts: 0,
        accountsNeedingSync: 0,
        byType: {},
      });
    });

    it('should handle zero balance accounts correctly', async () => {
      const accounts = [
        createMockAccount({
          type: AccountType.CHECKING,
          currentBalance: 0,
          status: AccountStatus.ACTIVE,
          isActive: true
        }),
      ];
      mockAccountRepository.find.mockResolvedValue(accounts);

      const result = await service.getSummary('user-123');

      expect(result.totalBalance).toBe(0);
      expect(result.byType[AccountType.CHECKING]).toEqual({
        count: 1,
        totalBalance: 0,
      });
    });
  });

  describe('syncAccount', () => {
    it('should throw NotFoundException when account not found', async () => {
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(
        service.syncAccount('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.syncAccount('non-existent', 'user-123', UserRole.USER)
      ).rejects.toThrow('Account with ID non-existent not found');
    });

    describe('authorization checks', () => {
      it('should allow sync when user owns account', async () => {
        const account = createMockAccount({
          userId: 'user-123',
          source: AccountSource.PLAID,
          isPlaidAccount: true
        });
        Object.defineProperty(account, 'isPlaidAccount', { value: true });
        const syncedAccount = { ...account, lastSyncAt: new Date() };
        mockAccountRepository.findOne.mockResolvedValue(account);
        mockAccountRepository.save.mockResolvedValue(syncedAccount);

        const result = await service.syncAccount('acc-123', 'user-123', UserRole.USER);

        expect(result).toBeDefined();
      });

      it('should throw ForbiddenException when user does not own account', async () => {
        const account = createMockAccount({
          userId: 'user-456',
          source: AccountSource.PLAID,
          isPlaidAccount: true
        });
        Object.defineProperty(account, 'isPlaidAccount', { value: true });
        mockAccountRepository.findOne.mockResolvedValue(account);

        await expect(
          service.syncAccount('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.syncAccount('acc-123', 'user-123', UserRole.USER)
        ).rejects.toThrow('You can only sync your own accounts');
      });

      it('should allow admin sync of any account', async () => {
        const account = createMockAccount({
          userId: 'user-456',
          source: AccountSource.PLAID,
          isPlaidAccount: true
        });
        Object.defineProperty(account, 'isPlaidAccount', { value: true });
        const syncedAccount = { ...account, lastSyncAt: new Date() };
        mockAccountRepository.findOne.mockResolvedValue(account);
        mockAccountRepository.save.mockResolvedValue(syncedAccount);

        const result = await service.syncAccount('acc-123', 'admin-123', UserRole.ADMIN);

        expect(result).toBeDefined();
      });
    });

    it('should throw ForbiddenException when account is not Plaid account', async () => {
      const account = createMockAccount({
        userId: 'user-123',
        source: AccountSource.MANUAL,
        isPlaidAccount: false
      });
      Object.defineProperty(account, 'isPlaidAccount', { value: false });
      mockAccountRepository.findOne.mockResolvedValue(account);

      await expect(
        service.syncAccount('acc-123', 'user-123', UserRole.USER)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.syncAccount('acc-123', 'user-123', UserRole.USER)
      ).rejects.toThrow('Only Plaid accounts can be synced');
    });

    it('should update lastSyncAt to current date', async () => {
      const account = createMockAccount({
        userId: 'user-123',
        source: AccountSource.PLAID,
        isPlaidAccount: true,
        lastSyncAt: null
      });
      Object.defineProperty(account, 'isPlaidAccount', { value: true });
      const beforeSync = new Date();

      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.save.mockImplementation(async (acc) => {
        acc.lastSyncAt = new Date();
        return acc;
      });

      await service.syncAccount('acc-123', 'user-123', UserRole.USER);

      expect(accountRepository.save).toHaveBeenCalled();
      const savedAccount = accountRepository.save.mock.calls[0][0] as Account;
      expect(savedAccount.lastSyncAt).toBeInstanceOf(Date);
      expect((savedAccount.lastSyncAt as Date).getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
    });

    it('should clear syncError', async () => {
      const account = createMockAccount({
        userId: 'user-123',
        source: AccountSource.PLAID,
        isPlaidAccount: true,
        syncError: 'Previous error'
      });
      Object.defineProperty(account, 'isPlaidAccount', { value: true });
      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.save.mockImplementation(async (acc) => {
        acc.syncError = null;
        acc.lastSyncAt = new Date();
        return acc;
      });

      await service.syncAccount('acc-123', 'user-123', UserRole.USER);

      const savedAccount = accountRepository.save.mock.calls[0][0];
      expect(savedAccount.syncError).toBeNull();
    });

    it('should return updated AccountResponseDto', async () => {
      const account = createMockAccount({
        userId: 'user-123',
        source: AccountSource.PLAID,
        isPlaidAccount: true
      });
      Object.defineProperty(account, 'isPlaidAccount', { value: true });
      const syncedAccount = {
        ...account,
        lastSyncAt: new Date(),
        syncError: null
      };
      mockAccountRepository.findOne.mockResolvedValue(account);
      mockAccountRepository.save.mockResolvedValue(syncedAccount);

      const result = await service.syncAccount('acc-123', 'user-123', UserRole.USER);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('lastSyncAt');
      expect(result.syncError).toBeNull();
      expect(result.lastSyncAt).toBeInstanceOf(Date);
    });
  });

  describe('toResponseDto (private method)', () => {
    it('should map all entity fields to response DTO', () => {
      const mockAccount = createMockAccount({
        id: 'test-id',
        userId: 'test-user',
        name: 'Test Account',
        type: AccountType.SAVINGS,
        status: AccountStatus.ACTIVE,
        source: AccountSource.PLAID,
        currentBalance: 5000,
        availableBalance: 4500,
        creditLimit: 10000,
        currency: 'EUR',
        institutionName: 'Test Bank',
        maskedAccountNumber: '****1234',
        displayName: 'Test Bank - Test Account',
        isPlaidAccount: true,
        isManualAccount: false,
        needsSync: true,
        isActive: true,
        syncEnabled: true,
        lastSyncAt: new Date('2025-01-15'),
        syncError: 'Error message',
        settings: { autoSync: true },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      mockAccountRepository.create.mockReturnValue(mockAccount);
      mockAccountRepository.save.mockResolvedValue(mockAccount);

      // We'll trigger toResponseDto through create method
      const createDto: CreateAccountDto = {
        name: 'Test Account',
        type: AccountType.SAVINGS,
        source: AccountSource.PLAID,
        currentBalance: 5000,
      };

      return service.create('test-user', createDto).then(result => {
        expect(result.id).toBe(mockAccount.id);
        expect(result.userId).toBe(mockAccount.userId);
        expect(result.name).toBe(mockAccount.name);
        expect(result.type).toBe(mockAccount.type);
        expect(result.status).toBe(mockAccount.status);
        expect(result.source).toBe(mockAccount.source);
        expect(result.currentBalance).toBe(mockAccount.currentBalance);
        expect(result.availableBalance).toBe(mockAccount.availableBalance);
        expect(result.creditLimit).toBe(mockAccount.creditLimit);
        expect(result.currency).toBe(mockAccount.currency);
        expect(result.institutionName).toBe(mockAccount.institutionName);
        expect(result.maskedAccountNumber).toBe(mockAccount.maskedAccountNumber);
        expect(result.displayName).toBe(mockAccount.displayName);
        expect(result.isPlaidAccount).toBe(mockAccount.isPlaidAccount);
        expect(result.isManualAccount).toBe(mockAccount.isManualAccount);
        expect(result.needsSync).toBe(mockAccount.needsSync);
        expect(result.isActive).toBe(mockAccount.isActive);
        expect(result.syncEnabled).toBe(mockAccount.syncEnabled);
        expect(result.lastSyncAt).toBe(mockAccount.lastSyncAt);
        expect(result.syncError).toBe(mockAccount.syncError);
        expect(result.settings).toBe(mockAccount.settings);
        expect(result.createdAt).toBe(mockAccount.createdAt);
        expect(result.updatedAt).toBe(mockAccount.updatedAt);
      });
    });
  });
});
