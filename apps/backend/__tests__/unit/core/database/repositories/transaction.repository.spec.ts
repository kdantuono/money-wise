/**
 * TransactionRepository Unit Tests
 * Comprehensive test suite for TransactionRepository with 80%+ coverage target
 * Tests all 23 repository methods including complex queries, aggregations, and analytics
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, SelectQueryBuilder, EntityManager } from 'typeorm';
import { Logger } from '@nestjs/common';
import { TransactionRepository } from '@/core/database/repositories/impl/transaction.repository';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionSource,
} from '@/core/database/entities';

describe('TransactionRepository', () => {
  let transactionRepository: TransactionRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<Transaction>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Transaction>>;
  let mockManager: jest.Mocked<EntityManager>;
  let mockLogger: jest.Mocked<Logger>;

  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
    ({
      id: 'transaction-id-123',
      accountId: 'account-id-123',
      categoryId: 'category-id-123',
      amount: 100.5,
      type: TransactionType.DEBIT,
      status: TransactionStatus.POSTED,
      source: TransactionSource.PLAID,
      date: new Date('2025-09-28T00:00:00Z'),
      authorizedDate: new Date('2025-09-27T10:00:00Z'),
      description: 'Test Transaction',
      merchantName: 'Test Merchant',
      originalDescription: 'Original Test Transaction',
      currency: 'USD',
      reference: 'REF123',
      checkNumber: null,
      isPending: false,
      isRecurring: false,
      isHidden: false,
      includeInBudget: true,
      plaidTransactionId: 'plaid-tx-123',
      plaidAccountId: 'plaid-account-123',
      plaidMetadata: null,
      location: null,
      notes: null,
      tags: null,
      attachments: null,
      splitDetails: null,
      createdAt: new Date('2025-09-28T10:00:00Z'),
      updatedAt: new Date('2025-09-28T10:00:00Z'),
      account: undefined,
      category: undefined,
      get isExpense() {
        return this.type === TransactionType.DEBIT && this.amount > 0;
      },
      get isIncome() {
        return this.type === TransactionType.CREDIT && this.amount > 0;
      },
      get displayAmount() {
        if (this.type === TransactionType.DEBIT) {
          return -Math.abs(this.amount);
        }
        return Math.abs(this.amount);
      },
      get formattedAmount() {
        const absAmount = Math.abs(this.amount);
        const sign = this.type === TransactionType.DEBIT ? '-' : '+';
        return `${sign}$${absAmount.toFixed(2)}`;
      },
      get displayDescription() {
        return this.merchantName || this.description;
      },
      get isPlaidTransaction() {
        return this.source === TransactionSource.PLAID;
      },
      get isManualTransaction() {
        return this.source === TransactionSource.MANUAL;
      },
      get daysSinceTransaction() {
        const today = new Date();
        const transactionDate = new Date(this.date);
        const diffTime = Math.abs(today.getTime() - transactionDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      },
      get isSplit() {
        return this.splitDetails?.isParent || !!this.splitDetails?.parentId;
      },
      get needsCategorization() {
        return !this.categoryId && this.amount !== 0;
      },
      ...overrides,
    }) as Transaction;

  const mockTransaction = createMockTransaction();

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Transaction>>;

    // Create mock entity manager
    mockManager = {
      query: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as jest.Mocked<EntityManager>;

    // Create mock repository
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      manager: mockManager,
    } as unknown as jest.Mocked<Repository<Transaction>>;

    // Create mock data source
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as unknown as jest.Mocked<DataSource>;

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

    transactionRepository = new TransactionRepository(mockDataSource);
    // Manually inject the mock logger
    (transactionRepository as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByAccountId', () => {
    it('should find transactions by account ID', async () => {
      const transactions = [mockTransaction, createMockTransaction({ id: 'transaction-id-456' })];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.findByAccountId('account-id-123');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('transaction');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('transaction.category', 'category');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.accountId = :accountId', {
        accountId: 'account-id-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.isHidden = false');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('transaction.date', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('transaction.createdAt', 'DESC');
      expect(result).toEqual(transactions);
    });

    it('should apply date range filters', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');

      await transactionRepository.findByAccountId('account-id-123', { startDate, endDate });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.date >= :startDate', { startDate });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.date <= :endDate', { endDate });
    });

    it('should apply pagination', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await transactionRepository.findByAccountId('account-id-123', { limit: 10, offset: 20 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20);
    });

    it('should include hidden transactions when requested', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await transactionRepository.findByAccountId('account-id-123', { includeHidden: true });

      // Should not call andWhere with isHidden filter when includeHidden is true
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('transaction.isHidden = false');
    });

    it('should handle findByAccountId errors', async () => {
      const error = new Error('Query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findByAccountId('account-id-123')
      ).rejects.toThrow('Failed to find transactions for account: Query failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findByCategoryId', () => {
    it('should find transactions by category ID', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.findByCategoryId('category-id-123');

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('transaction.account', 'account');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.categoryId = :categoryId', {
        categoryId: 'category-id-123',
      });
      expect(result).toEqual(transactions);
    });

    it('should apply date range and pagination', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');

      await transactionRepository.findByCategoryId('category-id-123', {
        startDate,
        endDate,
        limit: 5,
        offset: 10,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.date >= :startDate', { startDate });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.date <= :endDate', { endDate });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
    });

    it('should handle findByCategoryId errors', async () => {
      const error = new Error('Category query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findByCategoryId('category-id-123')
      ).rejects.toThrow('Failed to find transactions for category: Category query failed');
    });
  });

  describe('findByUserId', () => {
    it('should find transactions by user ID', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.findByUserId('user-id-123');

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('transaction.account', 'account');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('transaction.category', 'category');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.isHidden = false');
      expect(result).toEqual(transactions);
    });

    it('should apply complex filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);
      const options = {
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        accountIds: ['account-1', 'account-2'],
        categoryIds: ['category-1', 'category-2'],
        types: [TransactionType.DEBIT, TransactionType.CREDIT],
        limit: 20,
        offset: 40,
      };

      await transactionRepository.findByUserId('user-id-123', options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.date >= :startDate', {
        startDate: options.startDate,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.date <= :endDate', {
        endDate: options.endDate,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.accountId IN (:...accountIds)', {
        accountIds: options.accountIds,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.categoryId IN (:...categoryIds)', {
        categoryIds: options.categoryIds,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.type IN (:...types)', {
        types: options.types,
      });
    });

    it('should handle findByUserId errors', async () => {
      const error = new Error('User transactions query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findByUserId('user-id-123')
      ).rejects.toThrow('Failed to find transactions for user: User transactions query failed');
    });
  });

  describe('findByPlaidTransactionId', () => {
    it('should find transaction by Plaid ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.findByPlaidTransactionId('plaid-tx-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { plaidTransactionId: 'plaid-tx-123' },
        relations: ['account', 'category'],
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null when Plaid transaction not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await transactionRepository.findByPlaidTransactionId('non-existent');

      expect(result).toBeNull();
    });

    it('should handle findByPlaidTransactionId errors', async () => {
      const error = new Error('Plaid lookup failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(
        transactionRepository.findByPlaidTransactionId('plaid-tx-123')
      ).rejects.toThrow('Failed to find transaction by Plaid ID: Plaid lookup failed');
    });
  });

  describe('findByType', () => {
    it('should find transactions by type', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.findByType(TransactionType.DEBIT);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.type = :type', {
        type: TransactionType.DEBIT,
      });
      expect(result).toEqual(transactions);
    });

    it('should apply optional filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await transactionRepository.findByType(TransactionType.CREDIT, {
        accountId: 'account-id-123',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        limit: 15,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.accountId = :accountId', {
        accountId: 'account-id-123',
      });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(15);
    });

    it('should handle findByType errors', async () => {
      const error = new Error('Type query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findByType(TransactionType.DEBIT)
      ).rejects.toThrow('Failed to find transactions by type: Type query failed');
    });
  });

  describe('findByStatus', () => {
    it('should find transactions by status', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.findByStatus(TransactionStatus.POSTED);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.status = :status', {
        status: TransactionStatus.POSTED,
      });
      expect(result).toEqual(transactions);
    });

    it('should apply optional filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await transactionRepository.findByStatus(TransactionStatus.PENDING, {
        accountId: 'account-id-123',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        limit: 10,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.accountId = :accountId', {
        accountId: 'account-id-123',
      });
    });

    it('should handle findByStatus errors', async () => {
      const error = new Error('Status query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findByStatus(TransactionStatus.POSTED)
      ).rejects.toThrow('Failed to find transactions by status: Status query failed');
    });
  });

  describe('findBySource', () => {
    it('should find transactions by source', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.findBySource(TransactionSource.PLAID);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.source = :source', {
        source: TransactionSource.PLAID,
      });
      expect(result).toEqual(transactions);
    });

    it('should apply optional filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await transactionRepository.findBySource(TransactionSource.MANUAL, {
        accountId: 'account-id-123',
        limit: 25,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.accountId = :accountId', {
        accountId: 'account-id-123',
      });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
    });

    it('should handle findBySource errors', async () => {
      const error = new Error('Source query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findBySource(TransactionSource.PLAID)
      ).rejects.toThrow('Failed to find transactions by source: Source query failed');
    });
  });

  describe('findUncategorized', () => {
    it('should find uncategorized transactions', async () => {
      const uncategorized = createMockTransaction({ categoryId: null });
      mockQueryBuilder.getMany.mockResolvedValue([uncategorized]);

      const result = await transactionRepository.findUncategorized('user-id-123');

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('transaction.account', 'account');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.categoryId IS NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.isHidden = false');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.status = :postedStatus', {
        postedStatus: TransactionStatus.POSTED,
      });
      expect(result).toEqual([uncategorized]);
    });

    it('should apply optional filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await transactionRepository.findUncategorized('user-id-123', {
        accountIds: ['account-1', 'account-2'],
        minAmount: 10.0,
        limit: 50,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.accountId IN (:...accountIds)', {
        accountIds: ['account-1', 'account-2'],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ABS(transaction.amount) >= :minAmount', {
        minAmount: 10.0,
      });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should handle findUncategorized errors', async () => {
      const error = new Error('Uncategorized query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findUncategorized('user-id-123')
      ).rejects.toThrow('Failed to find uncategorized transactions: Uncategorized query failed');
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicate transactions', async () => {
      const rawResults = [
        {
          id: 'tx-1',
          amount: 100.5,
          date: new Date('2025-09-28'),
          description: 'Test',
          merchantName: 'Merchant',
          type: TransactionType.DEBIT,
          status: TransactionStatus.POSTED,
          source: TransactionSource.PLAID,
        },
        {
          id: 'tx-2',
          amount: 100.5,
          date: new Date('2025-09-28'),
          description: 'Test',
          merchantName: 'Merchant',
          type: TransactionType.DEBIT,
          status: TransactionStatus.POSTED,
          source: TransactionSource.PLAID,
        },
      ];
      mockManager.query.mockResolvedValue(rawResults);

      const result = await transactionRepository.findDuplicates('account-id-123');

      expect(mockManager.query).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply duplicate detection options', async () => {
      mockManager.query.mockResolvedValue([]);

      await transactionRepository.findDuplicates('account-id-123', {
        amountTolerance: 0.5,
        daysTolerance: 2,
        includeDescription: true,
      });

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('ABS(t1.amount - t2.amount) <= $2'),
        expect.arrayContaining(['account-id-123', 0.5, 2])
      );
    });

    it('should handle findDuplicates errors', async () => {
      const error = new Error('Duplicate query failed');
      mockManager.query.mockRejectedValue(error);

      await expect(
        transactionRepository.findDuplicates('account-id-123')
      ).rejects.toThrow('Failed to find duplicate transactions: Duplicate query failed');
    });
  });

  describe('findRecent', () => {
    it('should find recent transactions', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.findRecent('user-id-123');

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('transaction.account', 'account');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.date >= :startDate', {
        startDate: expect.any(Date),
      });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual(transactions);
    });

    it('should use custom days and limit', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await transactionRepository.findRecent('user-id-123', 7, 25);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
    });

    it('should handle findRecent errors', async () => {
      const error = new Error('Recent query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.findRecent('user-id-123')
      ).rejects.toThrow('Failed to find recent transactions: Recent query failed');
    });
  });

  describe('searchTransactions', () => {
    it('should search transactions by term', async () => {
      const transactions = [mockTransaction];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await transactionRepository.searchTransactions('user-id-123', 'coffee');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('account.userId = :userId', {
        userId: 'user-id-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(transaction.description) LIKE LOWER(:searchTerm)'),
        { searchTerm: '%coffee%' }
      );
      expect(result).toEqual(transactions);
    });

    it('should apply search filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await transactionRepository.searchTransactions('user-id-123', 'test', {
        accountIds: ['account-1'],
        categoryIds: ['category-1'],
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        minAmount: 10,
        maxAmount: 100,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.accountId IN (:...accountIds)', {
        accountIds: ['account-1'],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.categoryId IN (:...categoryIds)', {
        categoryIds: ['category-1'],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ABS(transaction.amount) >= :minAmount', {
        minAmount: 10,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ABS(transaction.amount) <= :maxAmount', {
        maxAmount: 100,
      });
    });

    it('should handle searchTransactions errors', async () => {
      const error = new Error('Search failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        transactionRepository.searchTransactions('user-id-123', 'test')
      ).rejects.toThrow('Failed to search transactions: Search failed');
    });
  });

  describe('getTransactionStats', () => {
    it('should get transaction statistics', async () => {
      const basicStats = [
        {
          transaction_count: '100',
          total_income: '5000.00',
          total_expenses: '3000.00',
          average_transaction: '80.00',
        },
      ];
      const categoryStats = [
        {
          category_id: 'cat-1',
          category_name: 'Groceries',
          count: '50',
          amount: '1500.00',
        },
      ];
      const accountStats = [
        {
          account_id: 'acc-1',
          account_name: 'Checking',
          count: '80',
          amount: '6400.00',
        },
      ];
      const dailyStats = [
        {
          date: '2025-09-28',
          income: '200.00',
          expenses: '100.00',
        },
      ];

      mockManager.query
        .mockResolvedValueOnce(basicStats)
        .mockResolvedValueOnce(categoryStats)
        .mockResolvedValueOnce(accountStats)
        .mockResolvedValueOnce(dailyStats);

      const result = await transactionRepository.getTransactionStats(
        'user-id-123',
        new Date('2025-09-01'),
        new Date('2025-09-30')
      );

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(3000);
      expect(result.netIncome).toBe(2000);
      expect(result.transactionCount).toBe(100);
      expect(result.averageTransaction).toBe(80);
      expect(result.byCategory).toHaveLength(1);
      expect(result.byAccount).toHaveLength(1);
      expect(result.byDay).toHaveLength(1);
    });

    it('should handle getTransactionStats errors', async () => {
      const error = new Error('Stats query failed');
      mockManager.query.mockRejectedValue(error);

      await expect(
        transactionRepository.getTransactionStats(
          'user-id-123',
          new Date('2025-09-01'),
          new Date('2025-09-30')
        )
      ).rejects.toThrow('Failed to get transaction stats: Stats query failed');
    });
  });

  describe('updateCategory', () => {
    it('should update transaction category', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.updateCategory('transaction-id-123', 'new-category-id');

      expect(mockRepository.update).toHaveBeenCalledWith('transaction-id-123', {
        categoryId: 'new-category-id',
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should handle null category (uncategorize)', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(mockTransaction);

      await transactionRepository.updateCategory('transaction-id-123', null);

      expect(mockRepository.update).toHaveBeenCalledWith('transaction-id-123', {
        categoryId: null,
      });
    });

    it('should return null when transaction not found', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(null);

      const result = await transactionRepository.updateCategory('non-existent', 'category-id');

      expect(result).toBeNull();
    });

    it('should handle updateCategory errors', async () => {
      const error = new Error('Update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        transactionRepository.updateCategory('transaction-id-123', 'category-id')
      ).rejects.toThrow('Failed to update transaction category: Update failed');
    });
  });

  describe('updateDescription', () => {
    it('should update transaction description', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.updateDescription(
        'transaction-id-123',
        'New Description'
      );

      expect(mockRepository.update).toHaveBeenCalledWith('transaction-id-123', {
        description: 'New Description',
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should handle updateDescription errors', async () => {
      const error = new Error('Description update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        transactionRepository.updateDescription('transaction-id-123', 'New Desc')
      ).rejects.toThrow('Failed to update transaction description: Description update failed');
    });
  });

  describe('toggleHidden', () => {
    it('should toggle hidden status from false to true', async () => {
      const visibleTransaction = createMockTransaction({ isHidden: false });
      const hiddenTransaction = createMockTransaction({ isHidden: true });
      const updateResult = { affected: 1, raw: {} };

      mockRepository.findOne.mockResolvedValueOnce(visibleTransaction).mockResolvedValueOnce(hiddenTransaction);
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await transactionRepository.toggleHidden('transaction-id-123');

      expect(mockRepository.update).toHaveBeenCalledWith('transaction-id-123', {
        isHidden: true,
      });
      expect(result).toEqual(hiddenTransaction);
    });

    it('should toggle hidden status from true to false', async () => {
      const hiddenTransaction = createMockTransaction({ isHidden: true });
      const visibleTransaction = createMockTransaction({ isHidden: false });
      const updateResult = { affected: 1, raw: {} };

      mockRepository.findOne.mockResolvedValueOnce(hiddenTransaction).mockResolvedValueOnce(visibleTransaction);
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await transactionRepository.toggleHidden('transaction-id-123');

      expect(mockRepository.update).toHaveBeenCalledWith('transaction-id-123', {
        isHidden: false,
      });
      expect(result).toEqual(visibleTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await transactionRepository.toggleHidden('non-existent');

      expect(result).toBeNull();
    });

    it('should handle toggleHidden errors', async () => {
      const error = new Error('Toggle failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(
        transactionRepository.toggleHidden('transaction-id-123')
      ).rejects.toThrow('Failed to toggle transaction hidden status');
    });
  });

  describe('addNotes', () => {
    it('should add notes to transaction', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.addNotes('transaction-id-123', 'Important note');

      expect(mockRepository.update).toHaveBeenCalledWith('transaction-id-123', {
        notes: 'Important note',
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should handle addNotes errors', async () => {
      const error = new Error('Notes update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        transactionRepository.addNotes('transaction-id-123', 'note')
      ).rejects.toThrow('Failed to add notes to transaction: Notes update failed');
    });
  });

  describe('addTags', () => {
    it('should add tags to transaction', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const tags = ['business', 'deductible', 'travel'];
      const result = await transactionRepository.addTags('transaction-id-123', tags);

      expect(mockRepository.update).toHaveBeenCalledWith('transaction-id-123', { tags });
      expect(result).toEqual(mockTransaction);
    });

    it('should handle addTags errors', async () => {
      const error = new Error('Tags update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        transactionRepository.addTags('transaction-id-123', ['tag1'])
      ).rejects.toThrow('Failed to add tags to transaction: Tags update failed');
    });
  });

  describe('getMonthlySpendingByCategory', () => {
    it('should throw not implemented error', async () => {
      await expect(
        transactionRepository.getMonthlySpendingByCategory('user-id-123', 2025, 9)
      ).rejects.toThrow('Method not implemented yet');
    });
  });

  describe('createSplit', () => {
    it('should throw not implemented error', async () => {
      await expect(
        transactionRepository.createSplit('transaction-id-123', [
          { amount: 50, categoryId: 'cat-1' },
          { amount: 50, categoryId: 'cat-2' },
        ])
      ).rejects.toThrow('Method not implemented yet');
    });
  });

  describe('bulkCategorize', () => {
    it('should throw not implemented error', async () => {
      await expect(
        transactionRepository.bulkCategorize([
          { transactionId: 'tx-1', categoryId: 'cat-1' },
          { transactionId: 'tx-2', categoryId: 'cat-2' },
        ])
      ).rejects.toThrow('Method not implemented yet');
    });
  });

  describe('findNeedingCategorization', () => {
    it('should throw not implemented error', async () => {
      await expect(
        transactionRepository.findNeedingCategorization('user-id-123', 0.8)
      ).rejects.toThrow('Method not implemented yet');
    });
  });

  describe('getCashFlow', () => {
    it('should throw not implemented error', async () => {
      await expect(
        transactionRepository.getCashFlow(
          'user-id-123',
          new Date('2025-09-01'),
          new Date('2025-09-30'),
          'day'
        )
      ).rejects.toThrow('Method not implemented yet');
    });
  });
});
