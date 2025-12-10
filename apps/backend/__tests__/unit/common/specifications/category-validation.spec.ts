/**
 * Category Validation Specifications - TDD Tests
 *
 * Tests for the Specification Pattern implementation for category validation.
 * These tests follow TDD: written first, then implementation.
 *
 * Specifications tested:
 * 1. CategoryExistsSpecification - Verifies category exists in database
 * 2. CategoryBelongsToFamilySpecification - Verifies category belongs to user's family
 * 3. CategoryTypeMatchesFlowTypeSpecification - Verifies category type matches transaction flow
 * 4. TransactionCategorySpecification - Composite specification for full validation
 *
 * @pattern Specification Pattern (Domain-Driven Design)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/core/database/prisma/prisma.service';
import { CategoryType, CategoryStatus, FlowType } from '../../../../generated/prisma';
import {
  CategoryExistsSpecification,
  CategoryBelongsToFamilySpecification,
  CategoryTypeMatchesFlowTypeSpecification,
  TransactionCategorySpecification,
  CategoryValidationCandidate,
} from '@/common/specifications/category-validation.specification';

describe('Category Validation Specifications', () => {
  let prisma: PrismaService;

  // Test data
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440001';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440002';
  const mockDifferentFamilyId = '550e8400-e29b-41d4-a716-446655440003';

  const mockExpenseCategory = {
    id: mockCategoryId,
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
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Salary',
    slug: 'salary',
    type: CategoryType.INCOME,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            category: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // CategoryExistsSpecification Tests
  // ===========================================================================

  describe('CategoryExistsSpecification', () => {
    it('should be satisfied when category exists', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const spec = new CategoryExistsSpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
    });

    it('should not be satisfied when category does not exist', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);

      const spec = new CategoryExistsSpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_NOT_FOUND');
      expect(result.errorMessage).toContain('does not exist');
    });

    it('should be satisfied when categoryId is null (optional category)', async () => {
      const spec = new CategoryExistsSpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: null,
        familyId: mockFamilyId,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
      expect(prisma.category.findUnique).not.toHaveBeenCalled();
    });

    it('should be satisfied when categoryId is undefined (optional category)', async () => {
      const spec = new CategoryExistsSpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: undefined,
        familyId: mockFamilyId,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
      expect(prisma.category.findUnique).not.toHaveBeenCalled();
    });

    it('should cache the category for subsequent specifications', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const spec = new CategoryExistsSpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
      };

      await spec.isSatisfiedBy(candidate);

      // Category should be attached to candidate for subsequent specs
      expect(candidate.category).toEqual(mockExpenseCategory);
    });
  });

  // ===========================================================================
  // CategoryBelongsToFamilySpecification Tests
  // ===========================================================================

  describe('CategoryBelongsToFamilySpecification', () => {
    it('should be satisfied when category belongs to the family', async () => {
      const spec = new CategoryBelongsToFamilySpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        category: mockExpenseCategory,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should not be satisfied when category belongs to different family', async () => {
      const spec = new CategoryBelongsToFamilySpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockDifferentFamilyId,
        category: mockExpenseCategory, // belongs to mockFamilyId
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_WRONG_FAMILY');
      expect(result.errorMessage).toContain('does not belong to your family');
    });

    it('should be satisfied when categoryId is null', async () => {
      const spec = new CategoryBelongsToFamilySpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: null,
        familyId: mockFamilyId,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should not be satisfied when category is missing (not fetched)', async () => {
      const spec = new CategoryBelongsToFamilySpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        // category not provided - should fail
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_NOT_LOADED');
    });
  });

  // ===========================================================================
  // CategoryTypeMatchesFlowTypeSpecification Tests
  // ===========================================================================

  describe('CategoryTypeMatchesFlowTypeSpecification', () => {
    it('should be satisfied when EXPENSE category used with EXPENSE flowType', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.EXPENSE,
        category: mockExpenseCategory,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should be satisfied when INCOME category used with INCOME flowType', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockIncomeCategory.id,
        familyId: mockFamilyId,
        flowType: FlowType.INCOME,
        category: mockIncomeCategory,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should not be satisfied when EXPENSE category used with INCOME flowType', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.INCOME,
        category: mockExpenseCategory,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_TYPE_MISMATCH');
      expect(result.errorMessage).toContain('EXPENSE');
      expect(result.errorMessage).toContain('INCOME');
    });

    it('should not be satisfied when INCOME category used with EXPENSE flowType', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockIncomeCategory.id,
        familyId: mockFamilyId,
        flowType: FlowType.EXPENSE,
        category: mockIncomeCategory,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_TYPE_MISMATCH');
    });

    it('should be satisfied when flowType is TRANSFER (no category required)', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: null,
        familyId: mockFamilyId,
        flowType: FlowType.TRANSFER,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should not be satisfied when TRANSFER has a category assigned', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.TRANSFER,
        category: mockExpenseCategory,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('TRANSFER_CANNOT_HAVE_CATEGORY');
      expect(result.errorMessage).toContain('Transfer');
    });

    it('should be satisfied when categoryId is null and flowType is EXPENSE', async () => {
      // Categories are optional for EXPENSE/INCOME
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: null,
        familyId: mockFamilyId,
        flowType: FlowType.EXPENSE,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should handle LIABILITY_PAYMENT flowType (no category required)', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: null,
        familyId: mockFamilyId,
        flowType: FlowType.LIABILITY_PAYMENT,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should handle REFUND flowType with EXPENSE category', async () => {
      const spec = new CategoryTypeMatchesFlowTypeSpecification();
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.REFUND,
        category: mockExpenseCategory,
      };

      const result = await spec.isSatisfiedBy(candidate);

      // REFUND can use EXPENSE category (refund for a purchase)
      expect(result.isSatisfied).toBe(true);
    });
  });

  // ===========================================================================
  // TransactionCategorySpecification (Composite) Tests
  // ===========================================================================

  describe('TransactionCategorySpecification', () => {
    it('should validate all rules when category provided', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const spec = new TransactionCategorySpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.EXPENSE,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should fail fast on first failing specification', async () => {
      // Category doesn't exist
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);

      const spec = new TransactionCategorySpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.EXPENSE,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_NOT_FOUND');
    });

    it('should pass when no category for TRANSFER', async () => {
      const spec = new TransactionCategorySpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: null,
        familyId: mockFamilyId,
        flowType: FlowType.TRANSFER,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
      expect(prisma.category.findUnique).not.toHaveBeenCalled();
    });

    it('should fail when category exists but wrong family', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const spec = new TransactionCategorySpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockDifferentFamilyId, // Different family
        flowType: FlowType.EXPENSE,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_WRONG_FAMILY');
    });

    it('should fail when category type does not match flow type', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const spec = new TransactionCategorySpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.INCOME, // Mismatch: EXPENSE category with INCOME flow
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_TYPE_MISMATCH');
    });

    it('should fail when TRANSFER has category', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const spec = new TransactionCategorySpecification(prisma);
      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
        flowType: FlowType.TRANSFER,
      };

      const result = await spec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('TRANSFER_CANNOT_HAVE_CATEGORY');
    });
  });

  // ===========================================================================
  // Specification Composition Tests (AND, OR, NOT)
  // ===========================================================================

  describe('Specification Composition', () => {
    it('should support AND composition', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const existsSpec = new CategoryExistsSpecification(prisma);
      const belongsSpec = new CategoryBelongsToFamilySpecification();

      const compositeSpec = existsSpec.and(belongsSpec);

      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
      };

      const result = await compositeSpec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(true);
    });

    it('should fail AND composition when first spec fails', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);

      const existsSpec = new CategoryExistsSpecification(prisma);
      const belongsSpec = new CategoryBelongsToFamilySpecification();

      const compositeSpec = existsSpec.and(belongsSpec);

      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
      };

      const result = await compositeSpec.isSatisfiedBy(candidate);

      expect(result.isSatisfied).toBe(false);
      expect(result.errorCode).toBe('CATEGORY_NOT_FOUND');
    });

    it('should support OR composition', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);

      const existsSpec = new CategoryExistsSpecification(prisma);
      // Create a spec that always passes for OR test
      const alwaysPassSpec = new CategoryExistsSpecification(prisma);
      jest.spyOn(alwaysPassSpec, 'isSatisfiedBy').mockResolvedValue({ isSatisfied: true });

      const compositeSpec = existsSpec.or(alwaysPassSpec);

      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
      };

      const result = await compositeSpec.isSatisfiedBy(candidate);

      // First fails, but second passes, so OR passes
      expect(result.isSatisfied).toBe(true);
    });

    it('should support NOT composition', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockExpenseCategory);

      const existsSpec = new CategoryExistsSpecification(prisma);
      const notExistsSpec = existsSpec.not();

      const candidate: CategoryValidationCandidate = {
        categoryId: mockCategoryId,
        familyId: mockFamilyId,
      };

      const result = await notExistsSpec.isSatisfiedBy(candidate);

      // Category exists, so NOT(exists) should be false
      expect(result.isSatisfied).toBe(false);
    });
  });
});
