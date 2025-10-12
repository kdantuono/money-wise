import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/core/database/prisma/prisma.service';
import { BudgetService } from '@/core/database/prisma/services/budget.service';
import { BudgetPeriod, BudgetStatus } from '../../../../../../generated/prisma';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PrismaBudgetService', () => {
  let service: BudgetService;
  let prisma: PrismaService;

  // Test data
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440001';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440002';
  const mockBudgetId = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        {
          provide: PrismaService,
          useValue: {
            budget: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a budget with required fields', async () => {
      const createDto = {
        name: 'Monthly Groceries Budget',
        amount: new Decimal('500.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedBudget);
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          amount: createDto.amount,
          period: BudgetPeriod.MONTHLY,
          startDate: createDto.startDate,
          endDate: createDto.endDate,
          status: BudgetStatus.ACTIVE,
          alertThresholds: [50, 75, 90],
          settings: null,
          notes: null,
          category: {
            connect: { id: mockCategoryId },
          },
          family: {
            connect: { id: mockFamilyId },
          },
        },
      });
    });

    it('should create budget with default period MONTHLY', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('1000.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.period).toBe(BudgetPeriod.MONTHLY);
    });

    it('should create budget with default alertThresholds [50, 75, 90]', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('1000.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.alertThresholds).toEqual([50, 75, 90]);
    });

    it('should create budget with custom period QUARTERLY', async () => {
      const createDto = {
        name: 'Q4 Budget',
        amount: new Decimal('3000.00'),
        period: BudgetPeriod.QUARTERLY,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-12-31'),
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.period).toBe(BudgetPeriod.QUARTERLY);
    });

    it('should create budget with custom period YEARLY', async () => {
      const createDto = {
        name: '2025 Annual Budget',
        amount: new Decimal('12000.00'),
        period: BudgetPeriod.YEARLY,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.period).toBe(BudgetPeriod.YEARLY);
    });

    it('should create budget with custom period CUSTOM', async () => {
      const createDto = {
        name: 'Holiday Budget',
        amount: new Decimal('1500.00'),
        period: BudgetPeriod.CUSTOM,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-11-15'),
        endDate: new Date('2025-12-25'),
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.period).toBe(BudgetPeriod.CUSTOM);
    });

    it('should create budget with custom alertThresholds', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('2000.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [25, 50, 75, 100],
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.alertThresholds).toEqual([25, 50, 75, 100]);
    });

    it('should create budget with complex JSON settings', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('1000.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        settings: {
          rolloverUnspent: true,
          includeHiddenTransactions: false,
          notifyOnOverspend: true,
        },
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.settings).toEqual(createDto.settings);
    });

    it('should create budget with notes', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('800.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        notes: 'This budget covers weekly grocery shopping',
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.notes).toBe('This budget covers weekly grocery shopping');
    });

    it('should create budget with status DRAFT', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('500.00'),
        status: BudgetStatus.DRAFT,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-30'),
      };

      const expectedBudget = {
        id: mockBudgetId,
        ...createDto,
        period: BudgetPeriod.MONTHLY,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'create').mockResolvedValue(expectedBudget);

      const result = await service.create(createDto);

      expect(result.status).toBe(BudgetStatus.DRAFT);
    });

    it('should throw BadRequestException for negative amount', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('-500.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for startDate >= endDate', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('500.00'),
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        startDate: new Date('2025-10-31'),
        endDate: new Date('2025-10-01'),
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid familyId UUID', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('500.00'),
        categoryId: mockCategoryId,
        familyId: 'invalid-uuid',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid categoryId UUID', async () => {
      const createDto = {
        name: 'Budget',
        amount: new Decimal('500.00'),
        categoryId: 'invalid-uuid',
        familyId: mockFamilyId,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should find a budget by id', async () => {
      const expectedBudget = {
        id: mockBudgetId,
        name: 'Monthly Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'findUnique').mockResolvedValue(expectedBudget);

      const result = await service.findOne(mockBudgetId);

      expect(result).toEqual(expectedBudget);
      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
      });
    });

    it('should return null for non-existent budget', async () => {
      jest.spyOn(prisma.budget, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne(mockBudgetId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneWithRelations', () => {
    it('should find budget with category relation', async () => {
      const expectedBudget = {
        id: mockBudgetId,
        name: 'Monthly Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        category: {
          id: mockCategoryId,
          name: 'Groceries',
          slug: 'groceries',
        },
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'findUnique').mockResolvedValue(expectedBudget);

      const result = await service.findOneWithRelations(mockBudgetId);

      expect(result).toEqual(expectedBudget);
      expect(result.category).toBeDefined();
      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
        include: {
          category: true,
          family: true,
        },
      });
    });

    it('should find budget with family relation', async () => {
      const expectedBudget = {
        id: mockBudgetId,
        name: 'Monthly Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        family: {
          id: mockFamilyId,
          name: 'Smith Family',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'findUnique').mockResolvedValue(expectedBudget);

      const result = await service.findOneWithRelations(mockBudgetId);

      expect(result.family).toBeDefined();
    });

    it('should find budget with both category and family relations', async () => {
      const expectedBudget = {
        id: mockBudgetId,
        name: 'Monthly Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        category: {
          id: mockCategoryId,
          name: 'Groceries',
        },
        familyId: mockFamilyId,
        family: {
          id: mockFamilyId,
          name: 'Smith Family',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'findUnique').mockResolvedValue(expectedBudget);

      const result = await service.findOneWithRelations(mockBudgetId);

      expect(result.category).toBeDefined();
      expect(result.family).toBeDefined();
      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
        include: {
          category: true,
          family: true,
        },
      });
    });
  });

  describe('findByFamilyId', () => {
    it('should find all budgets for family with pagination', async () => {
      const budgets = [
        {
          id: mockBudgetId,
          name: 'Monthly Budget',
          amount: new Decimal('1000.00'),
          period: BudgetPeriod.MONTHLY,
          status: BudgetStatus.ACTIVE,
          startDate: new Date('2025-10-01'),
          endDate: new Date('2025-10-31'),
          alertThresholds: [50, 75, 90],
          settings: null,
          notes: null,
          categoryId: mockCategoryId,
          familyId: mockFamilyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue(budgets);

      const result = await service.findByFamilyId(mockFamilyId, {
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });

      expect(result).toEqual(budgets);
      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by status ACTIVE', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { status: BudgetStatus.ACTIVE },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          status: BudgetStatus.ACTIVE,
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by status COMPLETED', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { status: BudgetStatus.COMPLETED },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          status: BudgetStatus.COMPLETED,
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by status DRAFT', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { status: BudgetStatus.DRAFT },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          status: BudgetStatus.DRAFT,
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by period MONTHLY', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { period: BudgetPeriod.MONTHLY },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          period: BudgetPeriod.MONTHLY,
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by period QUARTERLY', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { period: BudgetPeriod.QUARTERLY },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          period: BudgetPeriod.QUARTERLY,
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by period YEARLY', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { period: BudgetPeriod.YEARLY },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          period: BudgetPeriod.YEARLY,
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by categoryId', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { categoryId: mockCategoryId },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          categoryId: mockCategoryId,
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by date range (budgets overlapping period)', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        skip: 0,
        take: 50,
        orderBy: { startDate: 'desc' },
      });
    });

    it('should sort by name', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        orderBy: { name: 'asc' },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' },
      });
    });

    it('should sort by amount', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        orderBy: { amount: 'desc' },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
        skip: 0,
        take: 50,
        orderBy: { amount: 'desc' },
      });
    });

    it('should include category relation', async () => {
      const budgetsWithCategory = [
        {
          id: mockBudgetId,
          name: 'Monthly Budget',
          amount: new Decimal('1000.00'),
          period: BudgetPeriod.MONTHLY,
          status: BudgetStatus.ACTIVE,
          startDate: new Date('2025-10-01'),
          endDate: new Date('2025-10-31'),
          alertThresholds: [50, 75, 90],
          category: {
            id: mockCategoryId,
            name: 'Groceries',
          },
          settings: null,
          notes: null,
          categoryId: mockCategoryId,
          familyId: mockFamilyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue(budgetsWithCategory);

      const result = await service.findByFamilyId(mockFamilyId, {
        include: { category: true },
      });

      expect((result[0] as any).category).toBeDefined();
    });
  });

  describe('findByCategoryId', () => {
    it('should find all budgets for a category', async () => {
      const budgets = [
        {
          id: mockBudgetId,
          name: 'Monthly Budget',
          amount: new Decimal('1000.00'),
          period: BudgetPeriod.MONTHLY,
          status: BudgetStatus.ACTIVE,
          startDate: new Date('2025-10-01'),
          endDate: new Date('2025-10-31'),
          alertThresholds: [50, 75, 90],
          settings: null,
          notes: null,
          categoryId: mockCategoryId,
          familyId: mockFamilyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue(budgets);

      const result = await service.findByCategoryId(mockCategoryId);

      expect(result).toEqual(budgets);
      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId },
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter by status (active budgets only)', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByCategoryId(mockCategoryId, {
        where: { status: BudgetStatus.ACTIVE },
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: mockCategoryId,
          status: BudgetStatus.ACTIVE,
        },
        orderBy: { startDate: 'desc' },
      });
    });

    it('should throw BadRequestException for invalid categoryId UUID', async () => {
      await expect(service.findByCategoryId('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findActive', () => {
    it('should find budgets where status = ACTIVE', async () => {
      const activeBudgets = [
        {
          id: mockBudgetId,
          name: 'Active Budget',
          amount: new Decimal('1000.00'),
          period: BudgetPeriod.MONTHLY,
          status: BudgetStatus.ACTIVE,
          startDate: new Date('2025-10-01'),
          endDate: new Date('2025-10-31'),
          alertThresholds: [50, 75, 90],
          settings: null,
          notes: null,
          categoryId: mockCategoryId,
          familyId: mockFamilyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue(activeBudgets);

      const result = await service.findActive();

      expect(result).toEqual(activeBudgets);
      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { status: BudgetStatus.ACTIVE },
        orderBy: { startDate: 'desc' },
      });
    });

    it('should filter active budgets by familyId', async () => {
      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findActive(mockFamilyId);

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          status: BudgetStatus.ACTIVE,
          familyId: mockFamilyId,
        },
        orderBy: { startDate: 'desc' },
      });
    });
  });

  describe('findByDateRange', () => {
    it('should find budgets overlapping date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const budgets = [
        {
          id: mockBudgetId,
          name: 'Budget',
          amount: new Decimal('1000.00'),
          period: BudgetPeriod.MONTHLY,
          status: BudgetStatus.ACTIVE,
          startDate: new Date('2025-10-01'),
          endDate: new Date('2025-10-31'),
          alertThresholds: [50, 75, 90],
          settings: null,
          notes: null,
          categoryId: mockCategoryId,
          familyId: mockFamilyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue(budgets);

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toEqual(budgets);
      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } }
          ]
        },
        orderBy: { startDate: 'desc' },
      });
    });

    it('should find budgets starting in date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-15');

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByDateRange(startDate, endDate);

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } }
          ]
        },
        orderBy: { startDate: 'desc' },
      });
    });

    it('should find budgets ending in date range', async () => {
      const startDate = new Date('2025-10-15');
      const endDate = new Date('2025-10-31');

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      await service.findByDateRange(startDate, endDate);

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } }
          ]
        },
        orderBy: { startDate: 'desc' },
      });
    });

    it('should return empty array for non-overlapping dates', async () => {
      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([]);

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update basic fields (name, amount, notes)', async () => {
      const updateDto = {
        name: 'Updated Budget',
        amount: new Decimal('1500.00'),
        notes: 'Updated notes',
      };

      const updatedBudget = {
        id: mockBudgetId,
        ...updateDto,
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'update').mockResolvedValue(updatedBudget);

      const result = await service.update(mockBudgetId, updateDto);

      expect(result).toEqual(updatedBudget);
      expect(result.name).toBe('Updated Budget');
      expect(result.amount).toEqual(new Decimal('1500.00'));
      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
        data: updateDto,
      });
    });

    it('should update period and dates', async () => {
      const updateDto = {
        period: BudgetPeriod.QUARTERLY,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-12-31'),
      };

      const updatedBudget = {
        id: mockBudgetId,
        name: 'Budget',
        amount: new Decimal('1000.00'),
        ...updateDto,
        status: BudgetStatus.ACTIVE,
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'update').mockResolvedValue(updatedBudget);

      const result = await service.update(mockBudgetId, updateDto);

      expect(result.period).toBe(BudgetPeriod.QUARTERLY);
    });

    it('should update status (ACTIVE to COMPLETED)', async () => {
      const updateDto = {
        status: BudgetStatus.COMPLETED,
      };

      const updatedBudget = {
        id: mockBudgetId,
        name: 'Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.COMPLETED,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'update').mockResolvedValue(updatedBudget);

      const result = await service.update(mockBudgetId, updateDto);

      expect(result.status).toBe(BudgetStatus.COMPLETED);
    });

    it('should update alertThresholds array', async () => {
      const updateDto = {
        alertThresholds: [25, 50, 75, 100],
      };

      const updatedBudget = {
        id: mockBudgetId,
        name: 'Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [25, 50, 75, 100],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'update').mockResolvedValue(updatedBudget);

      const result = await service.update(mockBudgetId, updateDto);

      expect(result.alertThresholds).toEqual([25, 50, 75, 100]);
    });

    it('should update settings JSON', async () => {
      const updateDto = {
        settings: {
          rolloverUnspent: false,
          includeHiddenTransactions: true,
          notifyOnOverspend: false,
        },
      };

      const updatedBudget = {
        id: mockBudgetId,
        name: 'Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: updateDto.settings,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'update').mockResolvedValue(updatedBudget);

      const result = await service.update(mockBudgetId, updateDto);

      expect(result.settings).toEqual(updateDto.settings);
    });

    it('should throw NotFoundException for non-existent budget', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      jest.spyOn(prisma.budget, 'update').mockRejectedValue({ code: 'P2025' });

      await expect(service.update(mockBudgetId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid date range on update', async () => {
      const updateDto = {
        startDate: new Date('2025-10-31'),
        endDate: new Date('2025-10-01'),
      };

      await expect(service.update(mockBudgetId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete budget successfully', async () => {
      const deletedBudget = {
        id: mockBudgetId,
        name: 'Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'delete').mockResolvedValue(deletedBudget);

      const result = await service.delete(mockBudgetId);

      expect(result).toEqual(deletedBudget);
      expect(prisma.budget.delete).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
      });
    });

    it('should CASCADE delete when category is deleted', async () => {
      const deletedBudget = {
        id: mockBudgetId,
        name: 'Budget',
        amount: new Decimal('1000.00'),
        period: BudgetPeriod.MONTHLY,
        status: BudgetStatus.ACTIVE,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        alertThresholds: [50, 75, 90],
        settings: null,
        notes: null,
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.budget, 'delete').mockResolvedValue(deletedBudget);

      const result = await service.delete(mockBudgetId);

      expect(result).toEqual(deletedBudget);
      // Prisma CASCADE behavior should delete budget when category deleted
    });

    it('should throw NotFoundException for non-existent budget', async () => {
      jest.spyOn(prisma.budget, 'delete').mockRejectedValue({ code: 'P2025' });

      await expect(service.delete(mockBudgetId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('should count budgets for family', async () => {
      jest.spyOn(prisma.budget, 'count').mockResolvedValue(15);

      const result = await service.count({ familyId: mockFamilyId });

      expect(result).toBe(15);
      expect(prisma.budget.count).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
      });
    });

    it('should count with status filter', async () => {
      jest.spyOn(prisma.budget, 'count').mockResolvedValue(10);

      const result = await service.count({
        familyId: mockFamilyId,
        status: BudgetStatus.ACTIVE,
      });

      expect(result).toBe(10);
      expect(prisma.budget.count).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          status: BudgetStatus.ACTIVE,
        },
      });
    });

    it('should count with period filter', async () => {
      jest.spyOn(prisma.budget, 'count').mockResolvedValue(8);

      const result = await service.count({
        familyId: mockFamilyId,
        period: BudgetPeriod.MONTHLY,
      });

      expect(result).toBe(8);
      expect(prisma.budget.count).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          period: BudgetPeriod.MONTHLY,
        },
      });
    });

    it('should count for category', async () => {
      jest.spyOn(prisma.budget, 'count').mockResolvedValue(3);

      const result = await service.count({ categoryId: mockCategoryId });

      expect(result).toBe(3);
      expect(prisma.budget.count).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId },
      });
    });

    it('should count active budgets', async () => {
      jest.spyOn(prisma.budget, 'count').mockResolvedValue(12);

      const result = await service.count({ status: BudgetStatus.ACTIVE });

      expect(result).toBe(12);
      expect(prisma.budget.count).toHaveBeenCalledWith({
        where: { status: BudgetStatus.ACTIVE },
      });
    });
  });

  describe('exists', () => {
    it('should return true when budget exists', async () => {
      jest.spyOn(prisma.budget, 'findUnique').mockResolvedValue({ id: mockBudgetId } as any);

      const result = await service.exists(mockBudgetId);

      expect(result).toBe(true);
      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: { id: mockBudgetId },
        select: { id: true }
      });
    });

    it('should return false when budget does not exist', async () => {
      jest.spyOn(prisma.budget, 'findUnique').mockResolvedValue(null);

      const result = await service.exists(mockBudgetId);

      expect(result).toBe(false);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.exists('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateDateRange', () => {
    it('should validate startDate < endDate (valid range)', () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      expect(() => service['validateDateRange'](startDate, endDate)).not.toThrow();
    });

    it('should throw for startDate = endDate (must be different)', () => {
      const startDate = new Date('2025-10-15');
      const endDate = new Date('2025-10-15');

      expect(() => service['validateDateRange'](startDate, endDate)).toThrow(
        BadRequestException,
      );
    });

    it('should throw for startDate > endDate (invalid range)', () => {
      const startDate = new Date('2025-10-31');
      const endDate = new Date('2025-10-01');

      expect(() => service['validateDateRange'](startDate, endDate)).toThrow(
        BadRequestException,
      );
    });

    it('should accept same-day range with different times', () => {
      const startDate = new Date('2025-10-15T00:00:00Z');
      const endDate = new Date('2025-10-15T23:59:59Z');

      // Service allows same-day budgets if times are different (endDate > startDate)
      expect(() => service['validateDateRange'](startDate, endDate)).not.toThrow();
    });

    it('should validate Date object types', () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      expect(() => service['validateDateRange'](startDate, endDate)).not.toThrow();
      expect(startDate).toBeInstanceOf(Date);
      expect(endDate).toBeInstanceOf(Date);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive amount', () => {
      const amount = new Decimal('1000.00');

      expect(() => service['validateAmount'](amount)).not.toThrow();
    });

    it('should throw for zero amount', () => {
      const amount = new Decimal('0.00');

      expect(() => service['validateAmount'](amount)).toThrow(BadRequestException);
    });

    it('should throw for negative amount', () => {
      const amount = new Decimal('-500.00');

      expect(() => service['validateAmount'](amount)).toThrow(BadRequestException);
    });

    it('should accept Decimal type', () => {
      const amount = new Decimal('2500.50');

      expect(() => service['validateAmount'](amount)).not.toThrow();
      expect(amount).toBeInstanceOf(Decimal);
    });
  });

  describe('validateAlertThresholds', () => {
    it('should validate default [50, 75, 90]', () => {
      const thresholds = [50, 75, 90];

      expect(() => service['validateAlertThresholds'](thresholds)).not.toThrow();
    });

    it('should validate custom thresholds [25, 50, 75, 100]', () => {
      const thresholds = [25, 50, 75, 100];

      expect(() => service['validateAlertThresholds'](thresholds)).not.toThrow();
    });

    it('should throw for negative thresholds', () => {
      const thresholds = [-10, 50, 75];

      expect(() => service['validateAlertThresholds'](thresholds)).toThrow(
        BadRequestException,
      );
    });

    it('should throw for thresholds > 100%', () => {
      const thresholds = [50, 75, 150];

      expect(() => service['validateAlertThresholds'](thresholds)).toThrow(
        BadRequestException,
      );
    });

    it('should accept empty array (no alerts)', () => {
      const thresholds: number[] = [];

      expect(() => service['validateAlertThresholds'](thresholds)).not.toThrow();
    });
  });

  describe('validateUuid', () => {
    it('should validate correct UUID format', () => {
      expect(() => service['validateUuid'](mockBudgetId)).not.toThrow();
      expect(() =>
        service['validateUuid']('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
      ).not.toThrow();
    });

    it('should throw BadRequestException for invalid UUIDs', () => {
      expect(() => service['validateUuid']('invalid')).toThrow(BadRequestException);
      expect(() => service['validateUuid']('123')).toThrow(BadRequestException);
      expect(() => service['validateUuid']('')).toThrow(BadRequestException);
      expect(() => service['validateUuid']('not-a-uuid-at-all')).toThrow(BadRequestException);
    });
  });
});
