/**
 * Categories Controller Unit Tests
 *
 * Tests for the CategoriesController focusing on the spending endpoint
 * and CRUD operations.
 *
 * @module __tests__/unit/categories/categories.controller.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from '@/categories/categories.controller';
import { CategoryService } from '@/core/database/prisma/services/category.service';
import { CategoryType, CategoryStatus } from '../../../generated/prisma';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoryService: CategoryService;

  // Test data
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440001';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440002';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440003';

  const mockRequest = {
    user: {
      id: mockUserId,
      familyId: mockFamilyId,
    },
  };

  const mockCategory = {
    id: mockCategoryId,
    name: 'Groceries',
    slug: 'groceries',
    type: CategoryType.EXPENSE,
    status: CategoryStatus.ACTIVE,
    familyId: mockFamilyId,
    description: null,
    color: '#22C55E',
    icon: 'ShoppingCart',
    isDefault: false,
    isSystem: false,
    sortOrder: 0,
    depth: 0,
    parentId: null,
    rules: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoryService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findOneWithRelations: jest.fn(),
            findByFamilyId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            getSpendingByCategory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    categoryService = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSpending', () => {
    const mockSpendingData = [
      {
        categoryId: mockCategoryId,
        categoryName: 'Food & Dining',
        icon: 'Utensils',
        color: '#FF5733',
        totalAmount: 500.0,
        transactionCount: 25,
      },
      {
        categoryId: '550e8400-e29b-41d4-a716-446655440004',
        categoryName: 'Transportation',
        icon: 'Car',
        color: '#3B82F6',
        totalAmount: 200.0,
        transactionCount: 10,
      },
    ];

    it('should return spending summary for date range', async () => {
      jest
        .spyOn(categoryService, 'getSpendingByCategory')
        .mockResolvedValue(mockSpendingData);

      const result = await controller.getSpending(
        mockRequest,
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual({
        categories: mockSpendingData,
        totalSpending: 700.0,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(categoryService.getSpendingByCategory).toHaveBeenCalledWith(
        mockFamilyId,
        expect.any(Date),
        expect.any(Date),
        { parentOnly: true }
      );
    });

    it('should calculate total spending correctly', async () => {
      jest
        .spyOn(categoryService, 'getSpendingByCategory')
        .mockResolvedValue(mockSpendingData);

      const result = await controller.getSpending(
        mockRequest,
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.totalSpending).toBe(700.0); // 500 + 200
    });

    it('should return zero total for empty categories', async () => {
      jest.spyOn(categoryService, 'getSpendingByCategory').mockResolvedValue([]);

      const result = await controller.getSpending(
        mockRequest,
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.totalSpending).toBe(0);
      expect(result.categories).toEqual([]);
    });

    it('should pass parentOnly=true by default', async () => {
      jest.spyOn(categoryService, 'getSpendingByCategory').mockResolvedValue([]);

      await controller.getSpending(mockRequest, '2025-01-01', '2025-01-31');

      expect(categoryService.getSpendingByCategory).toHaveBeenCalledWith(
        mockFamilyId,
        expect.any(Date),
        expect.any(Date),
        { parentOnly: true }
      );
    });

    it('should pass parentOnly=false when explicitly set', async () => {
      jest.spyOn(categoryService, 'getSpendingByCategory').mockResolvedValue([]);

      await controller.getSpending(
        mockRequest,
        '2025-01-01',
        '2025-01-31',
        'false'
      );

      expect(categoryService.getSpendingByCategory).toHaveBeenCalledWith(
        mockFamilyId,
        expect.any(Date),
        expect.any(Date),
        { parentOnly: false }
      );
    });

    it('should throw error for invalid startDate format', async () => {
      await expect(
        controller.getSpending(mockRequest, 'invalid-date', '2025-01-31')
      ).rejects.toThrow('Invalid date format');
    });

    it('should throw error for invalid endDate format', async () => {
      await expect(
        controller.getSpending(mockRequest, '2025-01-01', 'invalid-date')
      ).rejects.toThrow('Invalid date format');
    });

    it('should use family ID from authenticated user', async () => {
      jest.spyOn(categoryService, 'getSpendingByCategory').mockResolvedValue([]);

      await controller.getSpending(mockRequest, '2025-01-01', '2025-01-31');

      expect(categoryService.getSpendingByCategory).toHaveBeenCalledWith(
        mockFamilyId, // Should use user's family ID
        expect.any(Date),
        expect.any(Date),
        expect.any(Object)
      );
    });

    it('should include date range in response', async () => {
      jest.spyOn(categoryService, 'getSpendingByCategory').mockResolvedValue([]);

      const result = await controller.getSpending(
        mockRequest,
        '2025-02-01',
        '2025-02-28'
      );

      expect(result.startDate).toBe('2025-02-01');
      expect(result.endDate).toBe('2025-02-28');
    });
  });

  describe('create', () => {
    it('should create a category with required fields', async () => {
      const createDto = {
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
      };

      jest.spyOn(categoryService, 'create').mockResolvedValue(mockCategory);

      const result = await controller.create(mockRequest, createDto);

      expect(result.id).toBe(mockCategoryId);
      expect(result.name).toBe('Groceries');
      expect(categoryService.create).toHaveBeenCalledWith({
        ...createDto,
        familyId: mockFamilyId,
      });
    });

    it('should include familyId from authenticated user', async () => {
      const createDto = {
        name: 'Test',
        slug: 'test',
        type: CategoryType.EXPENSE,
      };

      jest.spyOn(categoryService, 'create').mockResolvedValue(mockCategory);

      await controller.create(mockRequest, createDto);

      expect(categoryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: mockFamilyId,
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all categories for family', async () => {
      const categories = [mockCategory];

      jest.spyOn(categoryService, 'findByFamilyId').mockResolvedValue(categories);

      const result = await controller.findAll(mockRequest);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCategoryId);
    });

    it('should filter by type when provided', async () => {
      jest.spyOn(categoryService, 'findByFamilyId').mockResolvedValue([]);

      await controller.findAll(mockRequest, CategoryType.EXPENSE);

      expect(categoryService.findByFamilyId).toHaveBeenCalledWith(
        mockFamilyId,
        { where: { type: CategoryType.EXPENSE } }
      );
    });
  });

  describe('findOne', () => {
    it('should return category by id', async () => {
      const categoryWithRelations = {
        ...mockCategory,
        parent: null,
        children: [],
      };

      jest
        .spyOn(categoryService, 'findOneWithRelations')
        .mockResolvedValue(categoryWithRelations);

      const result = await controller.findOne(mockRequest, mockCategoryId);

      expect(result.id).toBe(mockCategoryId);
    });

    it('should throw error for non-existent category', async () => {
      jest.spyOn(categoryService, 'findOneWithRelations').mockResolvedValue(null);

      await expect(
        controller.findOne(mockRequest, mockCategoryId)
      ).rejects.toThrow(/not found/);
    });

    it('should throw error for category from different family', async () => {
      const otherFamilyCategory = {
        ...mockCategory,
        familyId: 'different-family-id',
        parent: null,
        children: [],
      };

      jest
        .spyOn(categoryService, 'findOneWithRelations')
        .mockResolvedValue(otherFamilyCategory);

      await expect(
        controller.findOne(mockRequest, mockCategoryId)
      ).rejects.toThrow(/denied/);
    });
  });

  describe('update', () => {
    it('should update category', async () => {
      const updateDto = { name: 'Updated Groceries' };
      const updatedCategory = { ...mockCategory, name: 'Updated Groceries' };

      jest.spyOn(categoryService, 'findOne').mockResolvedValue(mockCategory);
      jest.spyOn(categoryService, 'update').mockResolvedValue(updatedCategory);

      const result = await controller.update(
        mockRequest,
        mockCategoryId,
        updateDto
      );

      expect(result.name).toBe('Updated Groceries');
    });

    it('should throw error for category from different family', async () => {
      const otherFamilyCategory = {
        ...mockCategory,
        familyId: 'different-family-id',
      };

      jest.spyOn(categoryService, 'findOne').mockResolvedValue(otherFamilyCategory);

      await expect(
        controller.update(mockRequest, mockCategoryId, { name: 'Test' })
      ).rejects.toThrow(/denied/);
    });
  });

  describe('remove', () => {
    it('should delete category', async () => {
      jest.spyOn(categoryService, 'findOne').mockResolvedValue(mockCategory);
      jest.spyOn(categoryService, 'delete').mockResolvedValue(mockCategory);

      await controller.remove(mockRequest, mockCategoryId);

      expect(categoryService.delete).toHaveBeenCalledWith(mockCategoryId);
    });

    it('should throw error for category from different family', async () => {
      const otherFamilyCategory = {
        ...mockCategory,
        familyId: 'different-family-id',
      };

      jest.spyOn(categoryService, 'findOne').mockResolvedValue(otherFamilyCategory);

      await expect(
        controller.remove(mockRequest, mockCategoryId)
      ).rejects.toThrow(/denied/);
    });
  });
});
