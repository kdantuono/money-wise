/**
 * CategoryRepository Unit Tests
 * Comprehensive test suite for CategoryRepository with 80%+ coverage target
 * Tests all 23 repository methods including tree operations, hierarchical queries, and analytics
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, SelectQueryBuilder, EntityManager } from 'typeorm';
import { Logger } from '@nestjs/common';
import { CategoryRepository } from '@/core/database/repositories/impl/category.repository';
import {
  Category,
  CategoryType,
  CategoryStatus,
} from '../../generated/prisma';

describe('CategoryRepository', () => {
  let categoryRepository: CategoryRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<Category>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Category>>;
  let mockManager: jest.Mocked<EntityManager>;
  let mockLogger: jest.Mocked<Logger>;

  const createMockCategory = (overrides: Partial<Category> = {}): Category =>
    ({
      id: 'category-id-123',
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test category description',
      type: CategoryType.EXPENSE,
      status: CategoryStatus.ACTIVE,
      color: '#ef4444',
      icon: 'shopping-bag',
      isDefault: false,
      isSystem: false,
      sortOrder: 1,
      rules: null,
      metadata: null,
      parentId: null,
      createdAt: new Date('2025-09-28T10:00:00Z'),
      updatedAt: new Date('2025-09-28T10:00:00Z'),
      children: [],
      parent: undefined,
      transactions: [],
      get isActive() {
        return this.status === CategoryStatus.ACTIVE;
      },
      get hasChildren() {
        return this.children && this.children.length > 0;
      },
      get isTopLevel() {
        return !this.parentId;
      },
      get fullPath() {
        return this.name;
      },
      get transactionCount() {
        return this.transactions?.length || 0;
      },
      ...overrides,
    }) as Category;

  const mockCategory = createMockCategory();

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
    } as unknown as jest.Mocked<SelectQueryBuilder<Category>>;

    // Create mock entity manager
    mockManager = {
      query: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      transaction: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    // Create mock repository
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      manager: mockManager,
    } as unknown as jest.Mocked<Repository<Category>>;

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

    categoryRepository = new CategoryRepository(mockDataSource);
    // Manually inject the mock logger
    (categoryRepository as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findBySlug', () => {
    it('should find category by slug', async () => {
      mockRepository.findOne.mockResolvedValue(mockCategory);

      const result = await categoryRepository.findBySlug('test-category');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-category' },
      });
      expect(result).toEqual(mockCategory);
      expect(mockLogger.debug).toHaveBeenCalledWith('Finding category by slug: test-category');
    });

    it('should return null when category not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await categoryRepository.findBySlug('non-existent');

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Found category by slug non-existent: not found');
    });

    it('should handle findBySlug errors', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(categoryRepository.findBySlug('test-category')).rejects.toThrow(
        'Failed to find category by slug: Database error'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findByType', () => {
    it('should find categories by type (active only)', async () => {
      const categories = [mockCategory, createMockCategory({ id: 'category-2' })];
      mockQueryBuilder.getMany.mockResolvedValue(categories);

      const result = await categoryRepository.findByType(CategoryType.EXPENSE);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('category');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.type = :type', {
        type: CategoryType.EXPENSE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.status = :activeStatus', {
        activeStatus: CategoryStatus.ACTIVE,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('category.sortOrder', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('category.name', 'ASC');
      expect(result).toEqual(categories);
    });

    it('should include inactive categories when requested', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockCategory]);

      await categoryRepository.findByType(CategoryType.INCOME, true);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'category.status = :activeStatus',
        { activeStatus: CategoryStatus.ACTIVE }
      );
    });

    it('should handle findByType errors', async () => {
      const error = new Error('Query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.findByType(CategoryType.EXPENSE)).rejects.toThrow(
        'Failed to find categories by type: Query failed'
      );
    });
  });

  describe('findByStatus', () => {
    it('should find categories by status', async () => {
      const categories = [mockCategory];
      mockRepository.find.mockResolvedValue(categories);

      const result = await categoryRepository.findByStatus(CategoryStatus.ACTIVE);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: CategoryStatus.ACTIVE },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
      expect(result).toEqual(categories);
    });

    it('should handle findByStatus errors', async () => {
      const error = new Error('Status query failed');
      mockRepository.find.mockRejectedValue(error);

      await expect(categoryRepository.findByStatus(CategoryStatus.ACTIVE)).rejects.toThrow(
        'Failed to find categories by status: Status query failed'
      );
    });
  });

  describe('findRootCategories', () => {
    it('should find all root categories', async () => {
      const rootCategories = [mockCategory, createMockCategory({ id: 'root-2' })];
      mockQueryBuilder.getMany.mockResolvedValue(rootCategories);

      const result = await categoryRepository.findRootCategories();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.parentId IS NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.status = :activeStatus', {
        activeStatus: CategoryStatus.ACTIVE,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('category.sortOrder', 'ASC');
      expect(result).toEqual(rootCategories);
    });

    it('should filter root categories by type', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockCategory]);

      await categoryRepository.findRootCategories(CategoryType.EXPENSE);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.type = :type', {
        type: CategoryType.EXPENSE,
      });
    });

    it('should handle findRootCategories errors', async () => {
      const error = new Error('Root query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.findRootCategories()).rejects.toThrow(
        'Failed to find root categories: Root query failed'
      );
    });
  });

  describe('findChildCategories', () => {
    it('should find child categories (active only)', async () => {
      const children = [
        createMockCategory({ id: 'child-1', parentId: 'parent-id' }),
        createMockCategory({ id: 'child-2', parentId: 'parent-id' }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(children);

      const result = await categoryRepository.findChildCategories('parent-id');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.parentId = :parentId', {
        parentId: 'parent-id',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.status = :activeStatus', {
        activeStatus: CategoryStatus.ACTIVE,
      });
      expect(result).toEqual(children);
    });

    it('should include inactive children when requested', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await categoryRepository.findChildCategories('parent-id', true);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'category.status = :activeStatus',
        { activeStatus: CategoryStatus.ACTIVE }
      );
    });

    it('should handle findChildCategories errors', async () => {
      const error = new Error('Child query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.findChildCategories('parent-id')).rejects.toThrow(
        'Failed to find child categories: Child query failed'
      );
    });
  });

  describe('findCategoryTree', () => {
    it('should find full category tree', async () => {
      const treeData = [
        { id: 'cat-1', name: 'Parent', depth: 0, path: ['cat-1'] },
        { id: 'cat-2', name: 'Child', depth: 1, path: ['cat-1', 'cat-2'] },
      ];
      mockManager.query.mockResolvedValue(treeData);

      const result = await categoryRepository.findCategoryTree();

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE category_tree'),
        [10]
      );
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
    });

    it('should find tree starting from specific parent', async () => {
      const treeData = [{ id: 'cat-2', name: 'Child', depth: 0 }];
      mockManager.query.mockResolvedValue(treeData);

      await categoryRepository.findCategoryTree('parent-id', 5);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        ['parent-id', 5]
      );
    });

    it('should handle findCategoryTree errors', async () => {
      const error = new Error('Tree query failed');
      mockManager.query.mockRejectedValue(error);

      await expect(categoryRepository.findCategoryTree()).rejects.toThrow(
        'Failed to find category tree: Tree query failed'
      );
    });
  });

  describe('findCategoriesWithRules', () => {
    it('should find categories with rules', async () => {
      const categoryWithRules = createMockCategory({
        rules: { keywords: ['coffee', 'cafe'], autoAssign: true },
      });
      mockQueryBuilder.getMany.mockResolvedValue([categoryWithRules]);

      const result = await categoryRepository.findCategoriesWithRules();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.rules IS NOT NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.status = :activeStatus', {
        activeStatus: CategoryStatus.ACTIVE,
      });
      expect(result).toEqual([categoryWithRules]);
    });

    it('should filter by type', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await categoryRepository.findCategoriesWithRules(CategoryType.EXPENSE);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.type = :type', {
        type: CategoryType.EXPENSE,
      });
    });

    it('should handle findCategoriesWithRules errors', async () => {
      const error = new Error('Rules query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.findCategoriesWithRules()).rejects.toThrow(
        'Failed to find categories with rules: Rules query failed'
      );
    });
  });

  describe('findDefaultCategories', () => {
    it('should find default categories', async () => {
      const defaultCategory = createMockCategory({ isDefault: true });
      mockQueryBuilder.getMany.mockResolvedValue([defaultCategory]);

      const result = await categoryRepository.findDefaultCategories();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.isDefault = true');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.status = :activeStatus', {
        activeStatus: CategoryStatus.ACTIVE,
      });
      expect(result).toEqual([defaultCategory]);
    });

    it('should filter default categories by type', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await categoryRepository.findDefaultCategories(CategoryType.INCOME);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.type = :type', {
        type: CategoryType.INCOME,
      });
    });

    it('should handle findDefaultCategories errors', async () => {
      const error = new Error('Default query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.findDefaultCategories()).rejects.toThrow(
        'Failed to find default categories: Default query failed'
      );
    });
  });

  describe('findSystemCategories', () => {
    it('should find system categories', async () => {
      const systemCategory = createMockCategory({ isSystem: true });
      mockQueryBuilder.getMany.mockResolvedValue([systemCategory]);

      const result = await categoryRepository.findSystemCategories();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.isSystem = true');
      expect(result).toEqual([systemCategory]);
    });

    it('should filter system categories by type', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await categoryRepository.findSystemCategories(CategoryType.TRANSFER);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.type = :type', {
        type: CategoryType.TRANSFER,
      });
    });

    it('should handle findSystemCategories errors', async () => {
      const error = new Error('System query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.findSystemCategories()).rejects.toThrow(
        'Failed to find system categories: System query failed'
      );
    });
  });

  describe('searchCategories', () => {
    it('should search categories by name and description', async () => {
      const categories = [mockCategory];
      mockQueryBuilder.getMany.mockResolvedValue(categories);

      const result = await categoryRepository.searchCategories('coffee');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(LOWER(category.name) LIKE LOWER(:searchTerm) OR LOWER(category.description) LIKE LOWER(:searchTerm))',
        { searchTerm: '%coffee%' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.status = :activeStatus', {
        activeStatus: CategoryStatus.ACTIVE,
      });
      expect(result).toEqual(categories);
    });

    it('should filter search by type', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await categoryRepository.searchCategories('test', CategoryType.EXPENSE);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.type = :type', {
        type: CategoryType.EXPENSE,
      });
    });

    it('should handle searchCategories errors', async () => {
      const error = new Error('Search failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.searchCategories('test')).rejects.toThrow(
        'Failed to search categories: Search failed'
      );
    });
  });

  describe('isSlugAvailable', () => {
    it('should return true when slug is available', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await categoryRepository.isSlugAvailable('new-slug');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.slug = :slug', {
        slug: 'new-slug',
      });
      expect(result).toBe(true);
    });

    it('should return false when slug is taken', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await categoryRepository.isSlugAvailable('existing-slug');

      expect(result).toBe(false);
    });

    it('should exclude specified category from check', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await categoryRepository.isSlugAvailable('slug', 'exclude-id');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.id != :excludeCategoryId', {
        excludeCategoryId: 'exclude-id',
      });
    });

    it('should handle isSlugAvailable errors', async () => {
      const error = new Error('Slug check failed');
      mockQueryBuilder.getCount.mockRejectedValue(error);

      await expect(categoryRepository.isSlugAvailable('test-slug')).rejects.toThrow(
        'Failed to check slug availability: Slug check failed'
      );
    });
  });

  describe('updateStatus', () => {
    it('should update category status', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(
        createMockCategory({ status: CategoryStatus.INACTIVE })
      );

      const result = await categoryRepository.updateStatus('category-id', CategoryStatus.INACTIVE);

      expect(mockRepository.update).toHaveBeenCalledWith('category-id', {
        status: CategoryStatus.INACTIVE,
      });
      expect(result).toBeTruthy();
      expect(result?.status).toBe(CategoryStatus.INACTIVE);
    });

    it('should return null when category not found', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(null);

      const result = await categoryRepository.updateStatus(
        'non-existent',
        CategoryStatus.ARCHIVED
      );

      expect(result).toBeNull();
    });

    it('should handle updateStatus errors', async () => {
      const error = new Error('Update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        categoryRepository.updateStatus('category-id', CategoryStatus.ACTIVE)
      ).rejects.toThrow('Failed to update category status: Update failed');
    });
  });

  describe('moveCategory', () => {
    it('should move category to new parent', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(
        createMockCategory({ parentId: 'new-parent-id' })
      );

      const result = await categoryRepository.moveCategory('category-id', 'new-parent-id');

      expect(mockRepository.update).toHaveBeenCalledWith('category-id', {
        parentId: 'new-parent-id',
      });
      expect(result?.parentId).toBe('new-parent-id');
    });

    it('should move category to root level', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(createMockCategory({ parentId: null }));

      await categoryRepository.moveCategory('category-id', null);

      expect(mockRepository.update).toHaveBeenCalledWith('category-id', { parentId: null });
    });

    it('should handle moveCategory errors', async () => {
      const error = new Error('Move failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(categoryRepository.moveCategory('category-id', 'parent-id')).rejects.toThrow(
        'Failed to move category: Move failed'
      );
    });
  });

  describe('updateSortOrder', () => {
    it('should update category sort order', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(createMockCategory({ sortOrder: 5 }));

      const result = await categoryRepository.updateSortOrder('category-id', 5);

      expect(mockRepository.update).toHaveBeenCalledWith('category-id', { sortOrder: 5 });
      expect(result?.sortOrder).toBe(5);
    });

    it('should handle updateSortOrder errors', async () => {
      const error = new Error('Sort update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(categoryRepository.updateSortOrder('category-id', 1)).rejects.toThrow(
        'Failed to update category sort order: Sort update failed'
      );
    });
  });

  describe('getCategoryUsageStats', () => {
    it('should get category usage statistics', async () => {
      const basicStats = [
        {
          transaction_count: '50',
          total_amount: '2500.00',
          last_used_at: new Date('2025-09-28'),
        },
      ];
      const monthlyStats = [
        { month: '2025-09', count: '30', amount: '1500.00' },
        { month: '2025-08', count: '20', amount: '1000.00' },
      ];

      mockManager.query.mockResolvedValueOnce(basicStats).mockResolvedValueOnce(monthlyStats);

      const result = await categoryRepository.getCategoryUsageStats('category-id');

      expect(result.transactionCount).toBe(50);
      expect(result.totalAmount).toBe(2500);
      expect(result.lastUsedAt).toEqual(basicStats[0].last_used_at);
      expect(result.monthlyUsage).toHaveLength(2);
      expect(result.monthlyUsage[0].month).toBe('2025-09');
      expect(result.monthlyUsage[0].count).toBe(30);
    });

    it('should handle null values in stats', async () => {
      const basicStats = [
        {
          transaction_count: '0',
          total_amount: '0',
          last_used_at: null,
        },
      ];
      mockManager.query.mockResolvedValueOnce(basicStats).mockResolvedValueOnce([]);

      const result = await categoryRepository.getCategoryUsageStats('unused-category');

      expect(result.transactionCount).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.lastUsedAt).toBeNull();
      expect(result.monthlyUsage).toEqual([]);
    });

    it('should handle getCategoryUsageStats errors', async () => {
      const error = new Error('Stats query failed');
      mockManager.query.mockRejectedValue(error);

      await expect(categoryRepository.getCategoryUsageStats('category-id')).rejects.toThrow(
        'Failed to get category usage stats: Stats query failed'
      );
    });
  });

  describe('findMatchingCategories', () => {
    it('should find matching categories based on keywords', async () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          rules: { keywords: ['coffee', 'cafe'], autoAssign: true },
        }),
        createMockCategory({
          id: 'cat-2',
          rules: { keywords: ['starbucks'], autoAssign: true },
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(categories);

      const result = await categoryRepository.findMatchingCategories('Starbucks Coffee', undefined);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.rules IS NOT NULL');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should match by merchant patterns', async () => {
      const categories = [
        createMockCategory({
          rules: { merchantPatterns: ['AMZN.*', 'Amazon'], autoAssign: true },
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(categories);

      const result = await categoryRepository.findMatchingCategories('AMZN MKTP US', undefined);

      expect(result).toBeInstanceOf(Array);
    });

    it('should match by amount ranges', async () => {
      const categories = [
        createMockCategory({
          rules: { amountRanges: [{ min: 50, max: 200 }], autoAssign: true },
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(categories);

      const result = await categoryRepository.findMatchingCategories(
        undefined,
        undefined,
        100.0
      );

      expect(result).toBeInstanceOf(Array);
    });

    it('should return empty array when no matches', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await categoryRepository.findMatchingCategories('No Match', undefined);

      expect(result).toEqual([]);
    });

    it('should handle findMatchingCategories errors', async () => {
      const error = new Error('Matching failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(categoryRepository.findMatchingCategories('test', undefined)).rejects.toThrow(
        'Failed to find matching categories: Matching failed'
      );
    });
  });

  describe('archiveAndReassign', () => {
    it('should archive category and reassign transactions', async () => {
      const transactionFn = jest.fn((callback) =>
        callback({
          query: jest.fn(),
          update: jest.fn(),
        })
      );
      mockManager.transaction = transactionFn as any;

      const result = await categoryRepository.archiveAndReassign(
        'old-category-id',
        'new-category-id'
      );

      expect(result).toBe(true);
      expect(transactionFn).toHaveBeenCalled();
    });

    it('should handle archiveAndReassign errors', async () => {
      const error = new Error('Archive failed');
      mockManager.transaction = jest.fn().mockRejectedValue(error);

      await expect(
        categoryRepository.archiveAndReassign('old-id', 'new-id')
      ).rejects.toThrow('Failed to archive and reassign category: Archive failed');
    });
  });

  describe('createDefaultCategories', () => {
    it('should create default categories', async () => {
      const defaultCategoriesData = Category.getDefaultCategories();
      const createdCategories = defaultCategoriesData.map((data, index) =>
        createMockCategory({ id: `default-${index}`, ...data })
      );

      // Mock createBulk method
      jest.spyOn(categoryRepository, 'createBulk').mockResolvedValue(createdCategories as any);

      const result = await categoryRepository.createDefaultCategories();

      expect(result).toHaveLength(defaultCategoriesData.length);
      expect(categoryRepository.createBulk).toHaveBeenCalledWith(defaultCategoriesData);
    });

    it('should handle createDefaultCategories errors', async () => {
      const error = new Error('Create failed');
      jest.spyOn(categoryRepository, 'createBulk').mockRejectedValue(error);

      await expect(categoryRepository.createDefaultCategories()).rejects.toThrow(
        'Failed to create default categories: Create failed'
      );
    });
  });

  describe('updateRules', () => {
    it('should update category rules', async () => {
      const newRules = { keywords: ['test'], autoAssign: true };
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(createMockCategory({ rules: newRules }));

      const result = await categoryRepository.updateRules('category-id', newRules);

      expect(mockRepository.update).toHaveBeenCalledWith('category-id', { rules: newRules });
      expect(result?.rules).toEqual(newRules);
    });

    it('should handle updateRules errors', async () => {
      const error = new Error('Rules update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(categoryRepository.updateRules('category-id', {})).rejects.toThrow(
        'Failed to update category rules: Rules update failed'
      );
    });
  });

  describe('updateMetadata', () => {
    it('should update category metadata', async () => {
      const newMetadata = { budgetEnabled: true, monthlyLimit: 500 };
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(createMockCategory({ metadata: newMetadata }));

      const result = await categoryRepository.updateMetadata('category-id', newMetadata);

      expect(mockRepository.update).toHaveBeenCalledWith('category-id', {
        metadata: newMetadata,
      });
      expect(result?.metadata).toEqual(newMetadata);
    });

    it('should handle updateMetadata errors', async () => {
      const error = new Error('Metadata update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(categoryRepository.updateMetadata('category-id', {})).rejects.toThrow(
        'Failed to update category metadata: Metadata update failed'
      );
    });
  });

  describe('reorderCategories', () => {
    it('should reorder categories under parent', async () => {
      const categoryIds = ['cat-1', 'cat-2', 'cat-3'];
      const transactionFn = jest.fn((callback) =>
        callback({
          update: jest.fn(),
        })
      );
      mockManager.transaction = transactionFn as any;

      const result = await categoryRepository.reorderCategories('parent-id', categoryIds);

      expect(result).toBe(true);
      expect(transactionFn).toHaveBeenCalled();
    });

    it('should reorder categories at root level', async () => {
      const categoryIds = ['cat-1', 'cat-2'];
      const transactionFn = jest.fn((callback) =>
        callback({
          update: jest.fn(),
        })
      );
      mockManager.transaction = transactionFn as any;

      await categoryRepository.reorderCategories(null, categoryIds);

      expect(transactionFn).toHaveBeenCalled();
    });

    it('should handle reorderCategories errors', async () => {
      const error = new Error('Reorder failed');
      mockManager.transaction = jest.fn().mockRejectedValue(error);

      await expect(
        categoryRepository.reorderCategories('parent-id', ['cat-1'])
      ).rejects.toThrow('Failed to reorder categories: Reorder failed');
    });
  });

  // Additional edge cases
  describe('Edge Cases', () => {
    it('should handle empty string slug', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await categoryRepository.findBySlug('');

      expect(result).toBeNull();
    });

    it('should handle special characters in search', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await categoryRepository.searchCategories("test'OR'1'='1");

      expect(result).toEqual([]);
    });

    it('should handle large category trees', async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: `cat-${i}`,
        depth: i % 10,
      }));
      mockManager.query.mockResolvedValue(largeBatch);

      const result = await categoryRepository.findCategoryTree();

      expect(result.length).toBe(1000);
    });

    it('should handle category with no transactions in usage stats', async () => {
      mockManager.query
        .mockResolvedValueOnce([{ transaction_count: '0', total_amount: '0', last_used_at: null }])
        .mockResolvedValueOnce([]);

      const result = await categoryRepository.getCategoryUsageStats('unused-category');

      expect(result.transactionCount).toBe(0);
      expect(result.monthlyUsage).toEqual([]);
    });
  });
});
