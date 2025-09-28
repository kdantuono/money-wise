/**
 * AccountRepository Unit Tests
 * Comprehensive test suite for AccountRepository with 90% coverage target
 * Focus on critical methods: balance operations, Plaid integration, account management
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AccountRepository } from '../impl/account.repository';
import { Account, AccountType } from '../../entities';

describe('AccountRepository', () => {
  let accountRepository: AccountRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<Account>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Account>>;
  let mockLogger: jest.Mocked<Logger>;

  const mockAccount: Account = {
    id: 'account-id-123',
    userId: 'user-id-123',
    name: 'Test Checking Account',
    type: AccountType.CHECKING,
    balance: 1000.50,
    currency: 'USD',
    isActive: true,
    plaidAccountId: 'plaid-account-123',
    plaidItemId: 'plaid-item-123',
    createdAt: new Date('2025-09-28T10:00:00Z'),
    updatedAt: new Date('2025-09-28T10:00:00Z'),
  } as Account;

  beforeEach(async () => {
    // Create mock query builder with update methods
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    } as any;

    // Create mock repository
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    // Create mock data source
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    } as any;

    await Test.createTestingModule({
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    accountRepository = new AccountRepository(mockDataSource);
    // Manually inject the mock logger
    (accountRepository as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should find accounts by user ID', async () => {
      const accounts = [mockAccount, { ...mockAccount, id: 'account-id-456' }];
      mockRepository.find.mockResolvedValue(accounts);

      const result = await accountRepository.findByUserId('user-id-123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(accounts);
    });

    it('should handle findByUserId errors', async () => {
      const error = new Error('Database error');
      mockRepository.find.mockRejectedValue(error);

      await expect(accountRepository.findByUserId('user-id-123')).rejects.toThrow(
        'Failed to find accounts by user ID: Database error'
      );
    });
  });

  describe('findActiveAccountsByUserId', () => {
    it('should find active accounts by user ID', async () => {
      const activeAccounts = [mockAccount];
      mockRepository.find.mockResolvedValue(activeAccounts);

      const result = await accountRepository.findActiveAccountsByUserId('user-id-123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', isActive: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(activeAccounts);
    });

    it('should handle findActiveAccountsByUserId errors', async () => {
      const error = new Error('Active accounts query failed');
      mockRepository.find.mockRejectedValue(error);

      await expect(accountRepository.findActiveAccountsByUserId('user-id-123')).rejects.toThrow(
        'Failed to find active accounts: Active accounts query failed'
      );
    });
  });

  describe('updateBalance', () => {
    it('should update account balance successfully', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await accountRepository.updateBalance('account-id-123', 1500.75);

      expect(mockRepository.update).toHaveBeenCalledWith('account-id-123', { balance: 1500.75 });
      expect(result).toBe(true);
    });

    it('should return false when no account was updated', async () => {
      const updateResult = { affected: 0, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await accountRepository.updateBalance('non-existent-id', 1000);

      expect(result).toBe(false);
    });

    it('should handle updateBalance errors', async () => {
      const error = new Error('Balance update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(accountRepository.updateBalance('account-id-123', 1000)).rejects.toThrow(
        'Failed to update account balance: Balance update failed'
      );
    });
  });

  describe('incrementBalance', () => {
    it('should increment account balance successfully', async () => {
      const executeResult = { affected: 1, raw: {} };
      mockQueryBuilder.execute.mockResolvedValue(executeResult);

      const result = await accountRepository.incrementBalance('account-id-123', 500.25);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Account);
      expect((mockQueryBuilder as any).set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 'account-id-123' });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when no account was updated', async () => {
      const executeResult = { affected: 0, raw: {} };
      mockQueryBuilder.execute.mockResolvedValue(executeResult);

      const result = await accountRepository.incrementBalance('non-existent-id', 100);

      expect(result).toBe(false);
    });

    it('should handle incrementBalance errors', async () => {
      const error = new Error('Increment failed');
      mockQueryBuilder.execute.mockRejectedValue(error);

      await expect(accountRepository.incrementBalance('account-id-123', 100)).rejects.toThrow(
        'Failed to increment account balance: Increment failed'
      );
    });
  });

  describe('decrementBalance', () => {
    it('should decrement account balance successfully', async () => {
      const executeResult = { affected: 1, raw: {} };
      mockQueryBuilder.execute.mockResolvedValue(executeResult);

      const result = await accountRepository.decrementBalance('account-id-123', 200.50);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Account);
      expect((mockQueryBuilder as any).set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 'account-id-123' });
      expect(result).toBe(true);
    });

    it('should handle decrementBalance errors', async () => {
      const error = new Error('Decrement failed');
      mockQueryBuilder.execute.mockRejectedValue(error);

      await expect(accountRepository.decrementBalance('account-id-123', 100)).rejects.toThrow(
        'Failed to decrement account balance: Decrement failed'
      );
    });
  });

  describe('getTotalBalanceForUser', () => {
    it('should get total balance for user', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '2500.75' });

      const result = await accountRepository.getTotalBalanceForUser('user-id-123');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('account');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('SUM(account.balance)', 'total');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('account.isActive = :isActive', {
        isActive: true,
      });
      expect(result).toBe(2500.75);
    });

    it('should return 0 when no total found', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await accountRepository.getTotalBalanceForUser('user-id-123');

      expect(result).toBe(0);
    });

    it('should handle getTotalBalanceForUser errors', async () => {
      const error = new Error('Total balance query failed');
      mockQueryBuilder.getRawOne.mockRejectedValue(error);

      await expect(accountRepository.getTotalBalanceForUser('user-id-123')).rejects.toThrow(
        'Failed to get total balance: Total balance query failed'
      );
    });
  });

  describe('findByPlaidAccountId', () => {
    it('should find account by Plaid account ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockAccount);

      const result = await accountRepository.findByPlaidAccountId('plaid-account-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { plaidAccountId: 'plaid-account-123' },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null when Plaid account not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await accountRepository.findByPlaidAccountId('non-existent-plaid-id');

      expect(result).toBeNull();
    });

    it('should handle findByPlaidAccountId errors', async () => {
      const error = new Error('Plaid lookup failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(accountRepository.findByPlaidAccountId('plaid-id')).rejects.toThrow(
        'Failed to find account by Plaid ID: Plaid lookup failed'
      );
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account successfully', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await accountRepository.deactivateAccount('account-id-123');

      expect(mockRepository.update).toHaveBeenCalledWith('account-id-123', { isActive: false });
      expect(result).toBe(true);
    });

    it('should return false when no account was deactivated', async () => {
      const updateResult = { affected: 0, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await accountRepository.deactivateAccount('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle deactivateAccount errors', async () => {
      const error = new Error('Deactivation failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(accountRepository.deactivateAccount('account-id-123')).rejects.toThrow(
        'Failed to deactivate account: Deactivation failed'
      );
    });
  });

  describe('reactivateAccount', () => {
    it('should reactivate account successfully', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await accountRepository.reactivateAccount('account-id-123');

      expect(mockRepository.update).toHaveBeenCalledWith('account-id-123', { isActive: true });
      expect(result).toBe(true);
    });

    it('should handle reactivateAccount errors', async () => {
      const error = new Error('Reactivation failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(accountRepository.reactivateAccount('account-id-123')).rejects.toThrow(
        'Failed to reactivate account: Reactivation failed'
      );
    });
  });

  describe('findAccountsForSync', () => {
    it('should find accounts for sync with user filter', async () => {
      const syncAccounts = [mockAccount];
      mockQueryBuilder.getMany.mockResolvedValue(syncAccounts);

      const result = await accountRepository.findAccountsForSync('user-id-123');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('account');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.plaidAccountId IS NOT NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('account.isActive = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(result).toEqual(syncAccounts);
    });

    it('should find all accounts for sync without user filter', async () => {
      const syncAccounts = [mockAccount];
      mockQueryBuilder.getMany.mockResolvedValue(syncAccounts);

      const result = await accountRepository.findAccountsForSync();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.plaidAccountId IS NOT NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('account.isActive = :isActive', {
        isActive: true,
      });
      // Should not call the user filter
      expect(result).toEqual(syncAccounts);
    });

    it('should handle findAccountsForSync errors', async () => {
      const error = new Error('Sync accounts query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(accountRepository.findAccountsForSync()).rejects.toThrow(
        'Failed to find accounts for sync: Sync accounts query failed'
      );
    });
  });

  describe('getAccountBalancesSummary', () => {
    it('should get account balances summary by type', async () => {
      const summaryResults = [
        {
          accountType: AccountType.CHECKING,
          totalBalance: '1500.75',
          accountCount: '2',
        },
        {
          accountType: AccountType.SAVINGS,
          totalBalance: '5000.00',
          accountCount: '1',
        },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(summaryResults);

      const result = await accountRepository.getAccountBalancesSummary('user-id-123');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('account');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('account.type', 'accountType');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('SUM(account.balance)', 'totalBalance');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(account.id)', 'accountCount');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('account.isActive = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('account.type');

      expect(result).toEqual([
        {
          accountType: AccountType.CHECKING,
          totalBalance: 1500.75,
          accountCount: 2,
        },
        {
          accountType: AccountType.SAVINGS,
          totalBalance: 5000.0,
          accountCount: 1,
        },
      ]);
    });

    it('should handle getAccountBalancesSummary errors', async () => {
      const error = new Error('Summary query failed');
      mockQueryBuilder.getRawMany.mockRejectedValue(error);

      await expect(accountRepository.getAccountBalancesSummary('user-id-123')).rejects.toThrow(
        'Failed to get account balances summary: Summary query failed'
      );
    });
  });

  describe('findLowBalanceAccounts', () => {
    it('should find low balance accounts with user filter', async () => {
      const lowBalanceAccounts = [{ ...mockAccount, balance: 50.0 }];
      mockQueryBuilder.getMany.mockResolvedValue(lowBalanceAccounts);

      const result = await accountRepository.findLowBalanceAccounts(100, 'user-id-123');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('account');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.balance < :threshold', {
        threshold: 100,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('account.isActive = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('account.balance', 'ASC');
      expect(result).toEqual(lowBalanceAccounts);
    });

    it('should handle findLowBalanceAccounts errors', async () => {
      const error = new Error('Low balance query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(accountRepository.findLowBalanceAccounts(100)).rejects.toThrow(
        'Failed to find low balance accounts: Low balance query failed'
      );
    });
  });
});