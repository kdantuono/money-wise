/**
 * Analytics Controller Tests
 *
 * Tests for dashboard analytics REST endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../../../src/analytics/analytics.controller';
import { AnalyticsService } from '../../../src/analytics/analytics.service';
import {
  TimePeriod,
  DashboardStatsDto,
  CategorySpendingDto,
  RecentTransactionDto,
  TrendDataDto,
} from '../../../src/analytics/dto/analytics.dto';
import { CurrentUserPayload } from '../../../src/auth/types/current-user.types';
import { UserRole } from '../../../generated/prisma';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockUser: CurrentUserPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.MEMBER,
  };

  const mockStats: DashboardStatsDto = {
    totalBalance: 5000,
    monthlyIncome: 3000,
    monthlyExpenses: 2000,
    savingsRate: 33.3,
    balanceTrend: 5.2,
    incomeTrend: 10.0,
    expensesTrend: -5.0,
  };

  const mockCategorySpending: CategorySpendingDto[] = [
    {
      id: 'cat-1',
      name: 'Food & Groceries',
      amount: 500,
      color: '#22c55e',
      percentage: 50,
      count: 15,
    },
    {
      id: 'cat-2',
      name: 'Transportation',
      amount: 300,
      color: '#3b82f6',
      percentage: 30,
      count: 8,
    },
  ];

  const mockRecentTransactions: RecentTransactionDto[] = [
    {
      id: 'tx-1',
      description: 'Grocery Store',
      amount: -85.5,
      date: '2024-01-15',
      category: 'Food & Groceries',
      type: 'expense',
      accountName: 'Checking',
    },
    {
      id: 'tx-2',
      description: 'Salary',
      amount: 3000,
      date: '2024-01-14',
      category: 'Income',
      type: 'income',
      accountName: 'Checking',
    },
  ];

  const mockTrends: TrendDataDto[] = [
    { date: '2024-01-08', income: 1500, expenses: 800 },
    { date: '2024-01-15', income: 1500, expenses: 1200 },
  ];

  beforeEach(async () => {
    const mockAnalyticsService = {
      getStats: jest.fn(),
      getSpendingByCategory: jest.fn(),
      getRecentTransactions: jest.fn(),
      getTrends: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsService) as jest.Mocked<AnalyticsService>;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      analyticsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual(mockStats);
      expect(analyticsService.getStats).toHaveBeenCalledWith(mockUser.id, TimePeriod.MONTHLY);
    });

    it('should use default MONTHLY period when not provided', async () => {
      analyticsService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(mockUser, undefined);

      expect(analyticsService.getStats).toHaveBeenCalledWith(mockUser.id, TimePeriod.MONTHLY);
    });

    it('should pass WEEKLY period to service', async () => {
      analyticsService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(mockUser, TimePeriod.WEEKLY);

      expect(analyticsService.getStats).toHaveBeenCalledWith(mockUser.id, TimePeriod.WEEKLY);
    });

    it('should pass YEARLY period to service', async () => {
      analyticsService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(mockUser, TimePeriod.YEARLY);

      expect(analyticsService.getStats).toHaveBeenCalledWith(mockUser.id, TimePeriod.YEARLY);
    });

    it('should use the authenticated user ID', async () => {
      const differentUser: CurrentUserPayload = { id: 'different-user', email: 'other@example.com', role: UserRole.MEMBER };
      analyticsService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(differentUser);

      expect(analyticsService.getStats).toHaveBeenCalledWith('different-user', TimePeriod.MONTHLY);
    });
  });

  describe('getSpendingByCategory', () => {
    it('should return spending breakdown by category', async () => {
      analyticsService.getSpendingByCategory.mockResolvedValue(mockCategorySpending);

      const result = await controller.getSpendingByCategory(mockUser);

      expect(result).toEqual(mockCategorySpending);
      expect(analyticsService.getSpendingByCategory).toHaveBeenCalledWith(mockUser.id, TimePeriod.MONTHLY);
    });

    it('should use default MONTHLY period when not provided', async () => {
      analyticsService.getSpendingByCategory.mockResolvedValue(mockCategorySpending);

      await controller.getSpendingByCategory(mockUser, undefined);

      expect(analyticsService.getSpendingByCategory).toHaveBeenCalledWith(mockUser.id, TimePeriod.MONTHLY);
    });

    it('should pass specified period to service', async () => {
      analyticsService.getSpendingByCategory.mockResolvedValue(mockCategorySpending);

      await controller.getSpendingByCategory(mockUser, TimePeriod.YEARLY);

      expect(analyticsService.getSpendingByCategory).toHaveBeenCalledWith(mockUser.id, TimePeriod.YEARLY);
    });

    it('should return empty array when no spending data', async () => {
      analyticsService.getSpendingByCategory.mockResolvedValue([]);

      const result = await controller.getSpendingByCategory(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions with default limit', async () => {
      analyticsService.getRecentTransactions.mockResolvedValue(mockRecentTransactions);

      const result = await controller.getRecentTransactions(mockUser, 10);

      expect(result).toEqual(mockRecentTransactions);
      expect(analyticsService.getRecentTransactions).toHaveBeenCalledWith(mockUser.id, 10);
    });

    it('should pass custom limit to service', async () => {
      analyticsService.getRecentTransactions.mockResolvedValue(mockRecentTransactions);

      await controller.getRecentTransactions(mockUser, 25);

      expect(analyticsService.getRecentTransactions).toHaveBeenCalledWith(mockUser.id, 25);
    });

    it('should clamp limit to maximum of 50', async () => {
      analyticsService.getRecentTransactions.mockResolvedValue(mockRecentTransactions);

      await controller.getRecentTransactions(mockUser, 100);

      expect(analyticsService.getRecentTransactions).toHaveBeenCalledWith(mockUser.id, 50);
    });

    it('should clamp limit to minimum of 1', async () => {
      analyticsService.getRecentTransactions.mockResolvedValue(mockRecentTransactions);

      await controller.getRecentTransactions(mockUser, 0);

      expect(analyticsService.getRecentTransactions).toHaveBeenCalledWith(mockUser.id, 1);
    });

    it('should clamp negative limit to 1', async () => {
      analyticsService.getRecentTransactions.mockResolvedValue(mockRecentTransactions);

      await controller.getRecentTransactions(mockUser, -5);

      expect(analyticsService.getRecentTransactions).toHaveBeenCalledWith(mockUser.id, 1);
    });

    it('should return empty array when no transactions', async () => {
      analyticsService.getRecentTransactions.mockResolvedValue([]);

      const result = await controller.getRecentTransactions(mockUser, 10);

      expect(result).toEqual([]);
    });
  });

  describe('getTrends', () => {
    it('should return spending trends', async () => {
      analyticsService.getTrends.mockResolvedValue(mockTrends);

      const result = await controller.getTrends(mockUser);

      expect(result).toEqual(mockTrends);
      expect(analyticsService.getTrends).toHaveBeenCalledWith(mockUser.id, TimePeriod.MONTHLY);
    });

    it('should use default MONTHLY period when not provided', async () => {
      analyticsService.getTrends.mockResolvedValue(mockTrends);

      await controller.getTrends(mockUser, undefined);

      expect(analyticsService.getTrends).toHaveBeenCalledWith(mockUser.id, TimePeriod.MONTHLY);
    });

    it('should pass WEEKLY period to service', async () => {
      analyticsService.getTrends.mockResolvedValue(mockTrends);

      await controller.getTrends(mockUser, TimePeriod.WEEKLY);

      expect(analyticsService.getTrends).toHaveBeenCalledWith(mockUser.id, TimePeriod.WEEKLY);
    });

    it('should pass YEARLY period to service', async () => {
      analyticsService.getTrends.mockResolvedValue(mockTrends);

      await controller.getTrends(mockUser, TimePeriod.YEARLY);

      expect(analyticsService.getTrends).toHaveBeenCalledWith(mockUser.id, TimePeriod.YEARLY);
    });

    it('should return empty array when no trends', async () => {
      analyticsService.getTrends.mockResolvedValue([]);

      const result = await controller.getTrends(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should propagate service errors for getStats', async () => {
      const error = new Error('Database error');
      analyticsService.getStats.mockRejectedValue(error);

      await expect(controller.getStats(mockUser)).rejects.toThrow('Database error');
    });

    it('should propagate service errors for getSpendingByCategory', async () => {
      const error = new Error('Service unavailable');
      analyticsService.getSpendingByCategory.mockRejectedValue(error);

      await expect(controller.getSpendingByCategory(mockUser)).rejects.toThrow('Service unavailable');
    });

    it('should propagate service errors for getRecentTransactions', async () => {
      const error = new Error('Query failed');
      analyticsService.getRecentTransactions.mockRejectedValue(error);

      await expect(controller.getRecentTransactions(mockUser, 10)).rejects.toThrow('Query failed');
    });

    it('should propagate service errors for getTrends', async () => {
      const error = new Error('Aggregation error');
      analyticsService.getTrends.mockRejectedValue(error);

      await expect(controller.getTrends(mockUser)).rejects.toThrow('Aggregation error');
    });
  });
});
