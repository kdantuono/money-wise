import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BudgetsController } from '../../../src/budgets/budgets.controller';
import { BudgetsService } from '../../../src/budgets/budgets.service';
import { BudgetPeriod, BudgetStatus, UserRole } from '../../../generated/prisma';
import { CurrentUserPayload } from '../../../src/auth/types/current-user.types';
import { CreateBudgetDto } from '../../../src/budgets/dto/create-budget.dto';
import { UpdateBudgetDto } from '../../../src/budgets/dto/update-budget.dto';

describe('BudgetsController', () => {
  let controller: BudgetsController;
  let service: any;

  // Mock data
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
  const mockBudgetId = '550e8400-e29b-41d4-a716-446655440002';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440003';

  const mockUser: CurrentUserPayload = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.MEMBER,
    familyId: mockFamilyId,
  };

  const mockUserNoFamily: CurrentUserPayload = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.MEMBER,
    familyId: undefined,
  };

  const mockBudgetResponse = {
    id: mockBudgetId,
    name: 'Groceries Budget',
    amount: 500,
    period: BudgetPeriod.MONTHLY,
    status: BudgetStatus.ACTIVE,
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    alertThresholds: [50, 75, 90],
    notes: 'Monthly grocery budget',
    category: {
      id: mockCategoryId,
      name: 'Groceries',
      icon: 'shopping-cart',
      color: '#4CAF50',
    },
    spent: 250,
    remaining: 250,
    percentage: 50,
    progressStatus: 'safe' as const,
    isOverBudget: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockListResponse = {
    budgets: [mockBudgetResponse],
    total: 1,
    overBudgetCount: 0,
  };

  const mockCreateDto: CreateBudgetDto = {
    name: 'Groceries Budget',
    categoryId: mockCategoryId,
    amount: 500,
    period: BudgetPeriod.MONTHLY,
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    notes: 'Monthly grocery budget',
  };

  beforeEach(async () => {
    const mockBudgetsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [
        {
          provide: BudgetsService,
          useValue: mockBudgetsService,
        },
      ],
    }).compile();

    controller = module.get<BudgetsController>(BudgetsController);
    service = module.get(BudgetsService);
  });

  describe('create', () => {
    it('should create a budget successfully', async () => {
      service.create.mockResolvedValue(mockBudgetResponse);

      const result = await controller.create(mockUser, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(mockFamilyId, mockCreateDto);
      expect(result).toEqual(mockBudgetResponse);
    });

    it('should throw BadRequestException when user has no family', async () => {
      await expect(controller.create(mockUserNoFamily, mockCreateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      service.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.create(mockUser, mockCreateDto)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all budgets for the family', async () => {
      service.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockFamilyId);
      expect(result).toEqual(mockListResponse);
      expect(result.total).toBe(1);
    });

    it('should throw BadRequestException when user has no family', async () => {
      await expect(controller.findAll(mockUserNoFamily)).rejects.toThrow(BadRequestException);
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('should return empty list when no budgets exist', async () => {
      const emptyResponse = {
        budgets: [],
        total: 0,
        overBudgetCount: 0,
      };
      service.findAll.mockResolvedValue(emptyResponse);

      const result = await controller.findAll(mockUser);

      expect(result.budgets).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a budget by id', async () => {
      service.findOne.mockResolvedValue(mockBudgetResponse);

      const result = await controller.findOne(mockUser, mockBudgetId);

      expect(service.findOne).toHaveBeenCalledWith(mockFamilyId, mockBudgetId);
      expect(result).toEqual(mockBudgetResponse);
    });

    it('should throw BadRequestException when user has no family', async () => {
      await expect(controller.findOne(mockUserNoFamily, mockBudgetId)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when budget not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Budget not found'));

      await expect(controller.findOne(mockUser, mockBudgetId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when budget belongs to different family', async () => {
      service.findOne.mockRejectedValue(
        new ForbiddenException('You do not have access to this budget'),
      );

      await expect(controller.findOne(mockUser, mockBudgetId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBudgetDto = {
      amount: 600,
      notes: 'Updated notes',
    };

    it('should update a budget successfully', async () => {
      const updatedBudget = {
        ...mockBudgetResponse,
        amount: 600,
        notes: 'Updated notes',
      };
      service.update.mockResolvedValue(updatedBudget);

      const result = await controller.update(mockUser, mockBudgetId, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockFamilyId, mockBudgetId, updateDto);
      expect(result.amount).toBe(600);
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw BadRequestException when user has no family', async () => {
      await expect(controller.update(mockUserNoFamily, mockBudgetId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when budget not found', async () => {
      service.update.mockRejectedValue(new NotFoundException('Budget not found'));

      await expect(controller.update(mockUser, mockBudgetId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when budget belongs to different family', async () => {
      service.update.mockRejectedValue(
        new ForbiddenException('You do not have access to this budget'),
      );

      await expect(controller.update(mockUser, mockBudgetId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a budget successfully', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, mockBudgetId);

      expect(service.remove).toHaveBeenCalledWith(mockFamilyId, mockBudgetId);
    });

    it('should throw BadRequestException when user has no family', async () => {
      await expect(controller.remove(mockUserNoFamily, mockBudgetId)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when budget not found', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Budget not found'));

      await expect(controller.remove(mockUser, mockBudgetId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when budget belongs to different family', async () => {
      service.remove.mockRejectedValue(
        new ForbiddenException('You do not have access to this budget'),
      );

      await expect(controller.remove(mockUser, mockBudgetId)).rejects.toThrow(ForbiddenException);
    });
  });
});
