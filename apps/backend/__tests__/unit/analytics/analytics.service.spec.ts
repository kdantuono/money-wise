/**
 * Analytics Service Tests
 *
 * Tests for dashboard analytics data aggregation
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../../src/analytics/analytics.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { TimePeriod } from '../../../src/analytics/dto/analytics.dto';
import { TransactionType } from '../../../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// Mock type for Prisma operations
interface MockPrismaService {
  account: {
    findMany: jest.Mock;
  };
  transaction: {
    findMany: jest.Mock;
    groupBy: jest.Mock;
    aggregate: jest.Mock;
  };
  category: {
    findMany: jest.Mock;
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: MockPrismaService;

  const mockUserId = 'user-123';
  const mockAccountId = 'account-456';
  const mockCategoryId = 'category-789';

  beforeEach(async () => {
    const mockPrismaService: MockPrismaService = {
      account: {
        findMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get(PrismaService) as unknown as MockPrismaService;

    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return zero stats when user has no accounts', async () => {
      prismaService.account.findMany.mockResolvedValue([]);

      const result = await service.getStats(mockUserId, TimePeriod.MONTHLY);

      expect(result).toEqual({
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0,
        balanceTrend: 0,
        incomeTrend: 0,
        expensesTrend: 0,
      });
    });

    it('should calculate stats correctly with account data', async () => {
      // Mock user accounts
      prismaService.account.findMany
        .mockResolvedValueOnce([{ id: mockAccountId }]) // getUserAccountIds
        .mockResolvedValueOnce([
          { currentBalance: new Decimal(1000) },
          { currentBalance: new Decimal(2500) },
        ]); // getStats balance query

      // Mock transaction aggregates - current period
      prismaService.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(5000) } }) // income
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(3000) } }) // expenses
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(4000) } }) // prev income
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(2500) } }); // prev expenses

      const result = await service.getStats(mockUserId, TimePeriod.MONTHLY);

      expect(result.totalBalance).toBe(3500);
      expect(result.monthlyIncome).toBe(5000);
      expect(result.monthlyExpenses).toBe(3000);
      expect(result.savingsRate).toBe(40); // (5000-3000)/5000 * 100 = 40%
    });

    it('should calculate savings rate as 0 when no income', async () => {
      prismaService.account.findMany
        .mockResolvedValueOnce([{ id: mockAccountId }])
        .mockResolvedValueOnce([{ currentBalance: new Decimal(1000) }]);

      prismaService.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } }) // no income
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(500) } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getStats(mockUserId, TimePeriod.MONTHLY);

      expect(result.savingsRate).toBe(0);
    });
  });

  describe('getSpendingByCategory', () => {
    it('should return empty array when user has no accounts', async () => {
      prismaService.account.findMany.mockResolvedValue([]);

      const result = await service.getSpendingByCategory(mockUserId, TimePeriod.MONTHLY);

      expect(result).toEqual([]);
    });

    it('should return empty array when no spending data', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prismaService.transaction.groupBy.mockResolvedValue([]);

      const result = await service.getSpendingByCategory(mockUserId, TimePeriod.MONTHLY);

      expect(result).toEqual([]);
    });

    it('should aggregate spending by category correctly', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);

      prismaService.transaction.groupBy.mockResolvedValue([
        {
          categoryId: mockCategoryId,
          _sum: { amount: new Decimal(500) },
          _count: 10,
        },
        {
          categoryId: 'category-2',
          _sum: { amount: new Decimal(300) },
          _count: 5,
        },
      ]);

      prismaService.category.findMany.mockResolvedValue([
        { id: mockCategoryId, name: 'Food & Groceries', color: '#22c55e' },
        { id: 'category-2', name: 'Transportation', color: '#3b82f6' },
      ]);

      const result = await service.getSpendingByCategory(mockUserId, TimePeriod.MONTHLY);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Food & Groceries');
      expect(result[0].amount).toBe(500);
      expect(result[0].percentage).toBe(63); // 500/800 * 100 ≈ 63%
      expect(result[1].name).toBe('Transportation');
      expect(result[1].amount).toBe(300);
    });

    it('should handle uncategorized transactions', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);

      prismaService.transaction.groupBy.mockResolvedValue([
        {
          categoryId: null,
          _sum: { amount: new Decimal(200) },
          _count: 3,
        },
      ]);

      prismaService.category.findMany.mockResolvedValue([]);

      const result = await service.getSpendingByCategory(mockUserId, TimePeriod.MONTHLY);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Uncategorized');
      expect(result[0].id).toBe('uncategorized');
    });
  });

  describe('getRecentTransactions', () => {
    it('should return empty array when user has no accounts', async () => {
      prismaService.account.findMany.mockResolvedValue([]);

      const result = await service.getRecentTransactions(mockUserId, 10);

      expect(result).toEqual([]);
    });

    it('should return formatted transactions', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);

      const mockDate = new Date('2024-01-15');
      prismaService.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          description: 'Grocery Store',
          amount: new Decimal(85.5),
          date: mockDate,
          type: TransactionType.DEBIT,
          account: { name: 'Checking' },
          category: { name: 'Food & Groceries' },
        },
        {
          id: 'tx-2',
          description: 'Salary',
          amount: new Decimal(3000),
          date: mockDate,
          type: TransactionType.CREDIT,
          account: { name: 'Checking' },
          category: { name: 'Income' },
        },
      ]);

      const result = await service.getRecentTransactions(mockUserId, 10);

      expect(result).toHaveLength(2);

      // Expense transaction
      expect(result[0].id).toBe('tx-1');
      expect(result[0].amount).toBe(-85.5); // negative for expense
      expect(result[0].type).toBe('expense');
      expect(result[0].category).toBe('Food & Groceries');

      // Income transaction
      expect(result[1].id).toBe('tx-2');
      expect(result[1].amount).toBe(3000); // positive for income
      expect(result[1].type).toBe('income');
    });

    it('should respect the limit parameter', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prismaService.transaction.findMany.mockResolvedValue([]);

      await service.getRecentTransactions(mockUserId, 5);

      expect(prismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  describe('getTrends', () => {
    it('should return empty array when user has no accounts', async () => {
      prismaService.account.findMany.mockResolvedValue([]);

      const result = await service.getTrends(mockUserId, TimePeriod.MONTHLY);

      expect(result).toEqual([]);
    });

    it('should group transactions by date correctly', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);

      prismaService.transaction.findMany.mockResolvedValue([
        {
          date: new Date('2024-01-08'),
          amount: new Decimal(100),
          type: TransactionType.CREDIT,
        },
        {
          date: new Date('2024-01-08'),
          amount: new Decimal(50),
          type: TransactionType.DEBIT,
        },
        {
          date: new Date('2024-01-15'),
          amount: new Decimal(200),
          type: TransactionType.CREDIT,
        },
      ]);

      const result = await service.getTrends(mockUserId, TimePeriod.MONTHLY);

      expect(result.length).toBeGreaterThan(0);
      // Results should be grouped by week for monthly period
    });

    it('should handle weekly period correctly', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);

      prismaService.transaction.findMany.mockResolvedValue([
        {
          date: new Date('2024-01-15'),
          amount: new Decimal(100),
          type: TransactionType.CREDIT,
        },
      ]);

      const result = await service.getTrends(mockUserId, TimePeriod.WEEKLY);

      expect(result.length).toBeGreaterThan(0);
      // Results should be grouped by day for weekly period
      expect(result[0].date).toBe('2024-01-15');
    });
  });

  describe('period calculation', () => {
    it('should calculate correct date range for weekly period', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prismaService.transaction.findMany.mockResolvedValue([]);

      await service.getTrends(mockUserId, TimePeriod.WEEKLY);

      const call = prismaService.transaction.findMany.mock.calls[0][0];
      const dateFilter = call?.where?.date;

      expect(dateFilter?.gte).toBeDefined();
      expect(dateFilter?.lte).toBeDefined();

      // Check that the range is approximately 7-8 days (inclusive range)
      const startDate = new Date(dateFilter.gte);
      const endDate = new Date(dateFilter.lte);
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(7);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should calculate correct date range for monthly period', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prismaService.transaction.findMany.mockResolvedValue([]);

      await service.getTrends(mockUserId, TimePeriod.MONTHLY);

      const call = prismaService.transaction.findMany.mock.calls[0][0];
      const dateFilter = call?.where?.date;

      expect(dateFilter?.gte).toBeDefined();
      expect(dateFilter?.lte).toBeDefined();
    });

    it('should calculate correct date range for yearly period', async () => {
      prismaService.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prismaService.transaction.findMany.mockResolvedValue([]);

      await service.getTrends(mockUserId, TimePeriod.YEARLY);

      const call = prismaService.transaction.findMany.mock.calls[0][0];
      const dateFilter = call?.where?.date;

      expect(dateFilter?.gte).toBeDefined();
      expect(dateFilter?.lte).toBeDefined();

      // Check that the range is approximately 365-366 days (inclusive range, accounting for leap year)
      const startDate = new Date(dateFilter.gte);
      const endDate = new Date(dateFilter.lte);
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(365);
      expect(daysDiff).toBeLessThanOrEqual(367);
    });
  });

  describe('user data isolation', () => {
    it('should only query accounts for the specified user', async () => {
      prismaService.account.findMany.mockResolvedValue([]);

      await service.getStats(mockUserId, TimePeriod.MONTHLY);

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: { id: true },
      });
    });

    it('should only query transactions for user accounts', async () => {
      const accountIds = ['acc-1', 'acc-2'];
      prismaService.account.findMany
        .mockResolvedValueOnce(accountIds.map(id => ({ id })))
        .mockResolvedValueOnce([{ currentBalance: new Decimal(100) }]);

      prismaService.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await service.getStats(mockUserId, TimePeriod.MONTHLY);

      // Verify transaction aggregates filter by account IDs
      expect(prismaService.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: { in: accountIds },
          }),
        })
      );
    });
  });
});
