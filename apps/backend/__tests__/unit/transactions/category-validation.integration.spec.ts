/**
 * Category Validation Integration Tests
 *
 * Tests the integration of Specification Pattern with TransactionsService.
 * Verifies that category validation is properly enforced during transaction
 * create and update operations.
 *
 * @pattern Specification Pattern Integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TransactionsService } from '@/transactions/transactions.service';
import { TransactionService as CoreTransactionService } from '@/core/database/prisma/services/transaction.service';
import { PrismaService } from '@/core/database/prisma/prisma.service';
import { CategoryValidationService } from '@/transactions/services/category-validation.service';
import {
  CategoryType,
  CategoryStatus,
  FlowType,
  TransactionType,
  TransactionSource,
  TransactionStatus,
  UserRole,
} from '../../../generated/prisma';

describe('Category Validation Integration', () => {
  let transactionsService: TransactionsService;
  let categoryValidationService: CategoryValidationService;
  let prisma: PrismaService;
  let coreTransactionService: CoreTransactionService;

  // Test data
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440002';
  const mockAccountId = '550e8400-e29b-41d4-a716-446655440003';
  const mockExpenseCategoryId = '550e8400-e29b-41d4-a716-446655440004';
  const mockIncomeCategoryId = '550e8400-e29b-41d4-a716-446655440005';
  const mockDifferentFamilyCategoryId = '550e8400-e29b-41d4-a716-446655440006';
  const mockTransactionId = '550e8400-e29b-41d4-a716-446655440007';

  const mockAccount = {
    id: mockAccountId,
    userId: mockUserId,
    familyId: mockFamilyId,
  };

  const mockExpenseCategory = {
    id: mockExpenseCategoryId,
    name: 'Groceries',
    slug: 'groceries',
    type: CategoryType.EXPENSE,
    familyId: mockFamilyId,
    status: CategoryStatus.ACTIVE,
    isSystem: false,
    isDefault: false,
    sortOrder: 0,
    depth: 0,
    parentId: null,
    description: null,
    color: null,
    icon: null,
    rules: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIncomeCategory = {
    ...mockExpenseCategory,
    id: mockIncomeCategoryId,
    name: 'Salary',
    slug: 'salary',
    type: CategoryType.INCOME,
  };

  const mockDifferentFamilyCategory = {
    ...mockExpenseCategory,
    id: mockDifferentFamilyCategoryId,
    name: 'Other Expenses',
    slug: 'other-expenses',
    familyId: 'different-family-id',
  };

  const mockTransaction = {
    id: mockTransactionId,
    accountId: mockAccountId,
    categoryId: null,
    amount: { toNumber: () => 100 },
    type: TransactionType.DEBIT,
    status: TransactionStatus.POSTED,
    source: TransactionSource.MANUAL,
    flowType: FlowType.EXPENSE,
    currency: 'USD',
    date: new Date(),
    authorizedDate: null,
    description: 'Test transaction',
    merchantName: null,
    originalDescription: null,
    reference: null,
    checkNumber: null,
    notes: null,
    isPending: false,
    isRecurring: false,
    isHidden: false,
    includeInBudget: true,
    plaidTransactionId: null,
    plaidAccountId: null,
    plaidMetadata: null,
    transferGroupId: null,
    transferRole: null,
    linkedLiabilityId: null,
    originalTransactionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: CategoryValidationService,
          useValue: {
            validateCategory: jest.fn(),
          },
        },
        {
          provide: CoreTransactionService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            account: {
              findUnique: jest.fn(),
            },
            category: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    transactionsService = module.get<TransactionsService>(TransactionsService);
    categoryValidationService = module.get<CategoryValidationService>(CategoryValidationService);
    coreTransactionService = module.get<CoreTransactionService>(CoreTransactionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create() - Category Validation', () => {
    const baseCreateDto = {
      accountId: mockAccountId,
      amount: 100,
      type: TransactionType.DEBIT,
      source: TransactionSource.MANUAL,
      date: '2025-01-15',
      description: 'Test transaction',
    };

    beforeEach(() => {
      // Default account ownership passes
      jest.spyOn(prisma.account, 'findUnique').mockResolvedValue(mockAccount as any);
      jest.spyOn(coreTransactionService, 'create').mockResolvedValue(mockTransaction as any);
    });

    it('should validate category when provided in create', async () => {
      const createDto = { ...baseCreateDto, categoryId: mockExpenseCategoryId };
      jest.spyOn(categoryValidationService, 'validateCategory').mockResolvedValue(undefined);

      await transactionsService.create(createDto, mockUserId);

      expect(categoryValidationService.validateCategory).toHaveBeenCalledWith({
        categoryId: mockExpenseCategoryId,
        familyId: mockFamilyId,
        flowType: undefined, // flowType derived from DTO if present
      });
    });

    it('should skip validation when no categoryId provided', async () => {
      const createDto = { ...baseCreateDto }; // No categoryId

      await transactionsService.create(createDto, mockUserId);

      expect(categoryValidationService.validateCategory).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when category does not exist', async () => {
      const createDto = { ...baseCreateDto, categoryId: 'non-existent-id' };
      jest.spyOn(categoryValidationService, 'validateCategory').mockRejectedValue(
        new BadRequestException('Category does not exist')
      );

      await expect(transactionsService.create(createDto, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when category belongs to different family', async () => {
      const createDto = { ...baseCreateDto, categoryId: mockDifferentFamilyCategoryId };
      jest.spyOn(categoryValidationService, 'validateCategory').mockRejectedValue(
        new ForbiddenException('Category does not belong to your family')
      );

      await expect(transactionsService.create(createDto, mockUserId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for type mismatch (EXPENSE category for INCOME flow)', async () => {
      const createDto = {
        ...baseCreateDto,
        categoryId: mockExpenseCategoryId,
        flowType: FlowType.INCOME as any,
      };
      jest.spyOn(categoryValidationService, 'validateCategory').mockRejectedValue(
        new BadRequestException('Cannot use EXPENSE category for INCOME transaction')
      );

      await expect(transactionsService.create(createDto, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when TRANSFER has a category', async () => {
      const createDto = {
        ...baseCreateDto,
        categoryId: mockExpenseCategoryId,
        flowType: FlowType.TRANSFER as any,
      };
      jest.spyOn(categoryValidationService, 'validateCategory').mockRejectedValue(
        new BadRequestException('Transfer transactions cannot have a category')
      );

      await expect(transactionsService.create(createDto, mockUserId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('update() - Category Validation', () => {
    const baseUpdateDto = {
      description: 'Updated description',
    };

    beforeEach(() => {
      jest.spyOn(coreTransactionService, 'findOne').mockResolvedValue(mockTransaction as any);
      jest.spyOn(prisma.account, 'findUnique').mockResolvedValue(mockAccount as any);
      jest.spyOn(coreTransactionService, 'update').mockResolvedValue(mockTransaction as any);
    });

    it('should validate category when categoryId is updated', async () => {
      const updateDto = { ...baseUpdateDto, categoryId: mockExpenseCategoryId };
      jest.spyOn(categoryValidationService, 'validateCategory').mockResolvedValue(undefined);

      await transactionsService.update(mockTransactionId, updateDto, mockUserId);

      expect(categoryValidationService.validateCategory).toHaveBeenCalledWith({
        categoryId: mockExpenseCategoryId,
        familyId: mockFamilyId,
        flowType: mockTransaction.flowType,
      });
    });

    it('should skip validation when categoryId not in update', async () => {
      const updateDto = { description: 'Just updating description' };

      await transactionsService.update(mockTransactionId, updateDto, mockUserId);

      expect(categoryValidationService.validateCategory).not.toHaveBeenCalled();
    });

    it('should allow clearing category (categoryId = null)', async () => {
      const updateDto = { categoryId: null };
      jest.spyOn(categoryValidationService, 'validateCategory').mockResolvedValue(undefined);

      await transactionsService.update(mockTransactionId, updateDto, mockUserId);

      // Should not throw, clearing category is allowed
      expect(coreTransactionService.update).toHaveBeenCalled();
    });

    it('should validate against existing transaction flowType', async () => {
      const existingTransfer = { ...mockTransaction, flowType: FlowType.TRANSFER };
      jest.spyOn(coreTransactionService, 'findOne').mockResolvedValue(existingTransfer as any);

      const updateDto = { categoryId: mockExpenseCategoryId };
      jest.spyOn(categoryValidationService, 'validateCategory').mockRejectedValue(
        new BadRequestException('Transfer transactions cannot have a category')
      );

      await expect(transactionsService.update(mockTransactionId, updateDto, mockUserId))
        .rejects.toThrow(BadRequestException);
    });
  });
});
