import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BudgetsService } from '../../../src/budgets/budgets.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { BudgetPeriod, BudgetStatus, TransactionType } from '../../../generated/prisma';
import { createMockPrismaService, resetPrismaMocks } from '../../utils/mocks';
import { Decimal } from '@prisma/client/runtime/library';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: any;

  // Mock data
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440000';
  const mockBudgetId = '550e8400-e29b-41d4-a716-446655440001';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440002';
  const mockAccountId = '550e8400-e29b-41d4-a716-446655440003';

  const mockCategory = {
    id: mockCategoryId,
    name: 'Groceries',
    icon: 'shopping-cart',
    color: '#4CAF50',
  };

  const mockBudget = {
    id: mockBudgetId,
    name: 'Groceries Budget',
    amount: new Decimal(500),
    period: BudgetPeriod.MONTHLY,
    status: BudgetStatus.ACTIVE,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    alertThresholds: [50, 75, 90],
    notes: 'Monthly grocery budget',
    familyId: mockFamilyId,
    categoryId: mockCategoryId,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: mockCategory,
  };

  const mockCreateDto = {
    name: 'Groceries Budget',
    categoryId: mockCategoryId,
    amount: 500,
    period: BudgetPeriod.MONTHLY,
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    notes: 'Monthly grocery budget',
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    resetPrismaMocks(prisma);
  });

  describe('create', () => {
    it('should create a budget successfully', async () => {
      prisma.category.findUnique.mockResolvedValue({ familyId: mockFamilyId });
      prisma.budget.create.mockResolvedValue(mockBudget);

      const result = await service.create(mockFamilyId, mockCreateDto);

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
        select: { familyId: true },
      });
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: mockCreateDto.name,
          amount: expect.any(Decimal),
          period: mockCreateDto.period,
          status: BudgetStatus.ACTIVE,
        }),
        include: { category: true },
      });
      expect(result).toHaveProperty('id', mockBudgetId);
      expect(result).toHaveProperty('name', 'Groceries Budget');
      expect(result).toHaveProperty('amount', 500);
      expect(result).toHaveProperty('spent', 0);
    });

    it('should use default alert thresholds when not provided', async () => {
      prisma.category.findUnique.mockResolvedValue({ familyId: mockFamilyId });
      prisma.budget.create.mockResolvedValue(mockBudget);

      const dtoWithoutThresholds = { ...mockCreateDto };
      delete (dtoWithoutThresholds as any).alertThresholds;

      await service.create(mockFamilyId, dtoWithoutThresholds);

      expect(prisma.budget.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alertThresholds: [50, 75, 90],
          }),
        }),
      );
    });

    it('should throw NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create(mockFamilyId, mockCreateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.budget.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when category belongs to different family', async () => {
      prisma.category.findUnique.mockResolvedValue({ familyId: 'different-family-id' });

      await expect(service.create(mockFamilyId, mockCreateDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.budget.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all budgets for a family with spent amounts', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      // Batch calculation uses transaction.findMany instead of aggregate
      prisma.transaction.findMany.mockResolvedValue([
        { amount: new Decimal(250), date: new Date('2025-01-15') },
      ]);

      const result = await service.findAll(mockFamilyId);

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
        include: { category: true },
        orderBy: expect.any(Array),
      });
      expect(result.budgets).toHaveLength(1);
      expect(result.budgets[0].spent).toBe(250);
      expect(result.budgets[0].percentage).toBe(50);
      expect(result.total).toBe(1);
    });

    it('should return empty list when no budgets exist', async () => {
      prisma.budget.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockFamilyId);

      expect(result.budgets).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.overBudgetCount).toBe(0);
    });

    it('should calculate overBudgetCount correctly', async () => {
      const overBudget = {
        ...mockBudget,
        id: 'over-budget-id',
        amount: new Decimal(100),
      };
      prisma.budget.findMany.mockResolvedValue([mockBudget, overBudget]);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      // Both budgets have same category, so single query returns all transactions
      prisma.transaction.findMany.mockResolvedValue([
        { amount: new Decimal(250), date: new Date('2025-01-15') },
      ]);

      const result = await service.findAll(mockFamilyId);

      // First budget: 250/500 = 50% (not over)
      // Second budget: 250/100 = 250% (over)
      expect(result.overBudgetCount).toBe(1);
    });

    it('should use batch query optimization (one query per category)', async () => {
      const budget2 = {
        ...mockBudget,
        id: 'budget-2',
        categoryId: 'different-category-id',
        category: { ...mockCategory, id: 'different-category-id', name: 'Dining' },
      };
      prisma.budget.findMany.mockResolvedValue([mockBudget, budget2]);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.findMany.mockResolvedValue([]);

      await service.findAll(mockFamilyId);

      // Should call transaction.findMany twice (once per category)
      expect(prisma.transaction.findMany).toHaveBeenCalledTimes(2);
    });

    it('should return 0 spent when no accounts exist', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.account.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockFamilyId);

      expect(result.budgets[0].spent).toBe(0);
      expect(prisma.transaction.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a budget by id', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(350) },
      });

      const result = await service.findOne(mockFamilyId, mockBudgetId);

      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
        include: { category: true },
      });
      expect(result.id).toBe(mockBudgetId);
      expect(result.spent).toBe(350);
      expect(result.percentage).toBe(70);
      expect(result.progressStatus).toBe('safe');
    });

    it('should throw NotFoundException when budget not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockFamilyId, mockBudgetId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when budget belongs to different family', async () => {
      const differentFamilyBudget = {
        ...mockBudget,
        familyId: 'different-family-id',
      };
      prisma.budget.findUnique.mockResolvedValue(differentFamilyBudget);

      await expect(service.findOne(mockFamilyId, mockBudgetId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return correct progressStatus for warning level', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(425) }, // 85% of 500
      });

      const result = await service.findOne(mockFamilyId, mockBudgetId);

      expect(result.progressStatus).toBe('warning');
    });

    it('should return correct progressStatus for over budget', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(550) }, // 110% of 500
      });

      const result = await service.findOne(mockFamilyId, mockBudgetId);

      expect(result.progressStatus).toBe('over');
      expect(result.isOverBudget).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a budget successfully', async () => {
      prisma.budget.findUnique
        .mockResolvedValueOnce(mockBudget) // For authorization check
        .mockResolvedValueOnce(mockBudget); // For response
      prisma.budget.update.mockResolvedValue({
        ...mockBudget,
        amount: new Decimal(600),
      });
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(250) },
      });

      const result = await service.update(mockFamilyId, mockBudgetId, {
        amount: 600,
      });

      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
        data: expect.objectContaining({
          amount: expect.any(Decimal),
        }),
        include: { category: true },
      });
      expect(result.amount).toBe(600);
    });

    it('should throw NotFoundException when budget not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockFamilyId, mockBudgetId, { amount: 600 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when updating budget from different family', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        ...mockBudget,
        familyId: 'different-family-id',
      });

      await expect(
        service.update(mockFamilyId, mockBudgetId, { amount: 600 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate category ownership when updating categoryId', async () => {
      const newCategoryId = 'new-category-id';
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.category.findUnique.mockResolvedValue({ familyId: mockFamilyId });
      prisma.budget.update.mockResolvedValue({
        ...mockBudget,
        categoryId: newCategoryId,
      });
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(0) },
      });

      await service.update(mockFamilyId, mockBudgetId, { categoryId: newCategoryId });

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: newCategoryId },
        select: { familyId: true },
      });
    });

    it('should throw NotFoundException when new category not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockFamilyId, mockBudgetId, { categoryId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when new category belongs to different family', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.category.findUnique.mockResolvedValue({ familyId: 'different-family-id' });

      await expect(
        service.update(mockFamilyId, mockBudgetId, { categoryId: 'other-family-category' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a budget successfully', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.budget.delete.mockResolvedValue(mockBudget);

      await service.remove(mockFamilyId, mockBudgetId);

      expect(prisma.budget.delete).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
      });
    });

    it('should throw NotFoundException when budget not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockFamilyId, mockBudgetId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when deleting budget from different family', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        ...mockBudget,
        familyId: 'different-family-id',
      });

      await expect(service.remove(mockFamilyId, mockBudgetId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('calculateSpent', () => {
    it('should return 0 when no accounts exist', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.account.findMany.mockResolvedValue([]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.findOne(mockFamilyId, mockBudgetId);

      expect(result.spent).toBe(0);
    });

    it('should sum DEBIT transactions correctly', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(123.45) },
      });

      const result = await service.findOne(mockFamilyId, mockBudgetId);

      expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          accountId: { in: [mockAccountId] },
          categoryId: mockCategoryId,
          type: TransactionType.DEBIT,
          date: {
            gte: mockBudget.startDate,
            lte: mockBudget.endDate,
          },
          includeInBudget: true,
        },
        _sum: { amount: true },
      });
      expect(result.spent).toBe(123.45);
    });
  });

  describe('isExpired computation', () => {
    it('should return isExpired=false for future end date', async () => {
      const futureBudget = {
        ...mockBudget,
        endDate: new Date('2099-12-31'),
      };
      prisma.budget.findUnique.mockResolvedValue(futureBudget);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(0) },
      });

      const result = await service.findOne(mockFamilyId, mockBudgetId);

      expect(result.isExpired).toBe(false);
    });

    it('should return isExpired=true for past end date', async () => {
      const expiredBudget = {
        ...mockBudget,
        endDate: new Date('2020-01-01'),
      };
      prisma.budget.findUnique.mockResolvedValue(expiredBudget);
      prisma.account.findMany.mockResolvedValue([{ id: mockAccountId }]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(0) },
      });

      const result = await service.findOne(mockFamilyId, mockBudgetId);

      expect(result.isExpired).toBe(true);
    });
  });

  describe('markExpiredBudgetsAsCompleted', () => {
    it('should update expired budgets to COMPLETED status', async () => {
      prisma.budget.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markExpiredBudgetsAsCompleted();

      expect(prisma.budget.updateMany).toHaveBeenCalledWith({
        where: {
          status: BudgetStatus.ACTIVE,
          endDate: { lt: expect.any(Date) },
        },
        data: {
          status: BudgetStatus.COMPLETED,
        },
      });
      expect(result).toBe(3);
    });

    it('should filter by familyId when provided', async () => {
      prisma.budget.updateMany.mockResolvedValue({ count: 2 });

      await service.markExpiredBudgetsAsCompleted(mockFamilyId);

      expect(prisma.budget.updateMany).toHaveBeenCalledWith({
        where: {
          status: BudgetStatus.ACTIVE,
          endDate: { lt: expect.any(Date) },
          familyId: mockFamilyId,
        },
        data: {
          status: BudgetStatus.COMPLETED,
        },
      });
    });

    it('should return 0 when no expired budgets found', async () => {
      prisma.budget.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markExpiredBudgetsAsCompleted();

      expect(result).toBe(0);
    });
  });
});
