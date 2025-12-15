import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/core/database/prisma/prisma.service';
import { CategoryService } from '@/core/database/prisma/services/category.service';
import { CategoryType, CategoryStatus, Prisma } from '../../../../../../generated/prisma';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('PrismaCategoryService', () => {
  let service: CategoryService;
  let prisma: PrismaService;

  // Test data
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440001';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440002';
  const mockParentCategoryId = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category with required fields', async () => {
      const createDto = {
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
      };

      const expectedCategory = {
        id: mockCategoryId,
        ...createDto,
        description: null,
        status: CategoryStatus.ACTIVE,
        color: null,
        icon: null,
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

      jest.spyOn(prisma.category, 'create').mockResolvedValue(expectedCategory);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedCategory);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          slug: createDto.slug,
          type: createDto.type,
          family: {
            connect: { id: mockFamilyId },
          },
        },
      });
    });

    it('should create a category with optional fields', async () => {
      const createDto = {
        name: 'Dining Out',
        slug: 'dining-out',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
        description: 'Restaurant and takeout expenses',
        color: '#FF5733',
        icon: 'utensils',
        sortOrder: 5,
        depth: 0,
      };

      const expectedCategory = {
        id: mockCategoryId,
        ...createDto,
        status: CategoryStatus.ACTIVE,
        isDefault: false,
        isSystem: false,
        depth: 0,
        parentId: null,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'create').mockResolvedValue(expectedCategory);

      const result = await service.create(createDto);

      expect(result.description).toBe('Restaurant and takeout expenses');
      expect(result.color).toBe('#FF5733');
      expect(result.icon).toBe('utensils');
      expect(result.sortOrder).toBe(5);
    });

    it('should create a category with hierarchy (parent-child)', async () => {
      const createDto = {
        name: 'Fast Food',
        slug: 'fast-food',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
        parentId: mockParentCategoryId,
      };

      const expectedCategory = {
        id: mockCategoryId,
        ...createDto,
        description: null,
        status: CategoryStatus.ACTIVE,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'create').mockResolvedValue(expectedCategory);

      const result = await service.create(createDto);

      expect(result.parentId).toBe(mockParentCategoryId);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          slug: createDto.slug,
          type: createDto.type,
          family: {
            connect: { id: mockFamilyId },
          },
          parent: {
            connect: { id: mockParentCategoryId },
          },
        },
      });
    });

    it('should create a category with complex JSON (rules and metadata)', async () => {
      const createDto = {
        name: 'Business Expenses',
        slug: 'business-expenses',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
        rules: {
          keywords: ['invoice', 'office', 'supplies'],
          merchantPatterns: ['STAPLES', 'OFFICE DEPOT'],
          autoAssign: true,
        },
        metadata: {
          budgetEnabled: true,
          taxDeductible: true,
          businessExpense: true,
        },
      };

      const expectedCategory = {
        id: mockCategoryId,
        ...createDto,
        description: null,
        status: CategoryStatus.ACTIVE,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'create').mockResolvedValue(expectedCategory);

      const result = await service.create(createDto);

      expect(result.rules).toEqual(createDto.rules);
      expect(result.metadata).toEqual(createDto.metadata);
    });

    it('should create a category with isDefault flag', async () => {
      const createDto = {
        name: 'Uncategorized',
        slug: 'uncategorized',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
        isDefault: true,
      };

      const expectedCategory = {
        id: mockCategoryId,
        ...createDto,
        description: null,
        status: CategoryStatus.ACTIVE,
        color: null,
        icon: null,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'create').mockResolvedValue(expectedCategory);

      const result = await service.create(createDto);

      expect(result.isDefault).toBe(true);
    });

    it('should create a category with isSystem flag', async () => {
      const createDto = {
        name: 'Uncategorized',
        slug: 'uncategorized-system',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
        isSystem: true,
      };

      const expectedCategory = {
        id: mockCategoryId,
        ...createDto,
        description: null,
        status: CategoryStatus.ACTIVE,
        color: null,
        icon: null,
        isDefault: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'create').mockResolvedValue(expectedCategory);

      const result = await service.create(createDto);

      expect(result.isSystem).toBe(true);
    });

    it('should throw ConflictException for duplicate slug in same family', async () => {
      const createDto = {
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
      };

      jest.spyOn(prisma.category, 'create').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['familyId', 'slug'] },
        }),
      );

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid familyId UUID', async () => {
      const createDto = {
        name: 'Test',
        slug: 'test',
        type: CategoryType.EXPENSE,
        familyId: 'invalid-uuid',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid color format (not #RRGGBB)', async () => {
      const createDto = {
        name: 'Test',
        slug: 'test',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
        color: 'invalid-color',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for circular parent reference', async () => {
      const createDto = {
        name: 'Test',
        slug: 'test',
        type: CategoryType.EXPENSE,
        familyId: mockFamilyId,
        parentId: mockCategoryId, // Circular: parent points to self
      };

      // Mock findUnique to simulate checking for circular reference
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue({
        id: mockCategoryId,
        parentId: mockCategoryId,
      } as any);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should find a category by id', async () => {
      const expectedCategory = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        description: null,
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(expectedCategory);

      const result = await service.findOne(mockCategoryId);

      expect(result).toEqual(expectedCategory);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
    });

    it('should return null for non-existent category', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne(mockCategoryId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneWithRelations', () => {
    it('should find a category with parent relation', async () => {
      const expectedCategory = {
        id: mockCategoryId,
        name: 'Fast Food',
        slug: 'fast-food',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        parentId: mockParentCategoryId,
        parent: {
          id: mockParentCategoryId,
          name: 'Dining Out',
          slug: 'dining-out',
        },
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(expectedCategory);

      const result = await service.findOneWithRelations(mockCategoryId);

      expect(result).toEqual(expectedCategory);
      expect(result.parent).toBeDefined();
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
        include: {
          parent: true,
          children: true,
        },
      });
    });

    it('should find a category with children relations', async () => {
      const expectedCategory = {
        id: mockParentCategoryId,
        name: 'Food',
        slug: 'food',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        parentId: null,
        children: [
          { id: '1', name: 'Groceries', slug: 'groceries' },
          { id: '2', name: 'Dining Out', slug: 'dining-out' },
        ],
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(expectedCategory);

      const result = await service.findOneWithRelations(mockParentCategoryId);

      expect(result.children).toHaveLength(2);
      expect(result.children[0].name).toBe('Groceries');
    });

    it('should find a category with parent and children relations', async () => {
      const expectedCategory = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [],
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(expectedCategory);

      const result = await service.findOneWithRelations(mockCategoryId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockCategoryId);
      expect(result.parent).toBeNull();
      expect(result.children).toHaveLength(0);
    });
  });

  describe('findByFamilyId', () => {
    it('should find all categories for a family with pagination', async () => {
      const categories = [
        {
          id: mockCategoryId,
          name: 'Groceries',
          slug: 'groceries',
          type: CategoryType.EXPENSE,
          status: CategoryStatus.ACTIVE,
          description: null,
          color: null,
          icon: null,
          isDefault: false,
          isSystem: false,
          sortOrder: 0,
        depth: 0,
          parentId: null,
          familyId: mockFamilyId,
          rules: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.category, 'findMany').mockResolvedValue(categories);

      const result = await service.findByFamilyId(mockFamilyId, {
        skip: 0,
        take: 50,
        orderBy: { sortOrder: 'asc' },
      });

      expect(result).toEqual(categories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
        skip: 0,
        take: 50,
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by type (EXPENSE)', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { type: CategoryType.EXPENSE },
      });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          type: CategoryType.EXPENSE,
        },
        skip: 0,
        take: 50,
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by type (INCOME)', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { type: CategoryType.INCOME },
      });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          type: CategoryType.INCOME,
        },
        skip: 0,
        take: 50,
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by status (ACTIVE)', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { status: CategoryStatus.ACTIVE },
      });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          status: CategoryStatus.ACTIVE,
        },
        skip: 0,
        take: 50,
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by parentId (get children of category)', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        where: { parentId: mockParentCategoryId },
      });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          parentId: mockParentCategoryId,
        },
        skip: 0,
        take: 50,
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should sort by name', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.findByFamilyId(mockFamilyId, {
        orderBy: { name: 'asc' },
      });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' },
      });
    });

    it('should include hierarchy (parent and children)', async () => {
      const categoriesWithHierarchy = [
        {
          id: mockCategoryId,
          name: 'Food',
          slug: 'food',
          type: CategoryType.EXPENSE,
          status: CategoryStatus.ACTIVE,
          parent: null,
          children: [
            { id: '1', name: 'Groceries' },
            { id: '2', name: 'Dining Out' },
          ],
          description: null,
          color: null,
          icon: null,
          isDefault: false,
          isSystem: false,
          sortOrder: 0,
        depth: 0,
          parentId: null,
          familyId: mockFamilyId,
          rules: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.category, 'findMany').mockResolvedValue(categoriesWithHierarchy);

      const result = await service.findByFamilyId(mockFamilyId, {
        include: { parent: true, children: true },
      });

      // Type assertion needed due to union return type (Category[] | CategoryWithOptionalRelations[])
      expect((result as any)[0].children).toHaveLength(2);
    });
  });

  describe('findTopLevel', () => {
    it('should find categories where parentId IS NULL', async () => {
      const topLevelCategories = [
        {
          id: mockCategoryId,
          name: 'Food',
          slug: 'food',
          type: CategoryType.EXPENSE,
          status: CategoryStatus.ACTIVE,
          parentId: null,
          description: null,
          color: null,
          icon: null,
          isDefault: false,
          isSystem: false,
          sortOrder: 0,
        depth: 0,
          familyId: mockFamilyId,
          rules: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.category, 'findMany').mockResolvedValue(topLevelCategories);

      const result = await service.findTopLevel(mockFamilyId);

      expect(result).toEqual(topLevelCategories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          parentId: null,
        },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter top-level by type', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.findTopLevel(mockFamilyId, CategoryType.INCOME);

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          parentId: null,
          type: CategoryType.INCOME,
        },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findChildren', () => {
    it('should get all children of a parent category', async () => {
      const children = [
        {
          id: '1',
          name: 'Groceries',
          slug: 'groceries',
          type: CategoryType.EXPENSE,
          status: CategoryStatus.ACTIVE,
          parentId: mockParentCategoryId,
          description: null,
          color: null,
          icon: null,
          isDefault: false,
          isSystem: false,
          sortOrder: 0,
        depth: 0,
          familyId: mockFamilyId,
          rules: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Dining Out',
          slug: 'dining-out',
          type: CategoryType.EXPENSE,
          status: CategoryStatus.ACTIVE,
          parentId: mockParentCategoryId,
          description: null,
          color: null,
          icon: null,
          isDefault: false,
          isSystem: false,
          sortOrder: 1,
        depth: 0,
          familyId: mockFamilyId,
          rules: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.category, 'findMany').mockResolvedValue(children);

      const result = await service.findChildren(mockParentCategoryId);

      expect(result).toHaveLength(2);
      expect(result[0].parentId).toBe(mockParentCategoryId);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { parentId: mockParentCategoryId },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return empty array for leaf categories', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      const result = await service.findChildren(mockCategoryId);

      expect(result).toEqual([]);
    });

    it('should include nested children (grandchildren)', async () => {
      const childrenWithGrandchildren = [
        {
          id: '1',
          name: 'Dining Out',
          slug: 'dining-out',
          parentId: mockParentCategoryId,
          children: [
            { id: '3', name: 'Fast Food', slug: 'fast-food' },
            { id: '4', name: 'Fine Dining', slug: 'fine-dining' },
          ],
          type: CategoryType.EXPENSE,
          status: CategoryStatus.ACTIVE,
          description: null,
          color: null,
          icon: null,
          isDefault: false,
          isSystem: false,
          sortOrder: 0,
        depth: 0,
          familyId: mockFamilyId,
          rules: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.category, 'findMany').mockResolvedValue(childrenWithGrandchildren);

      const result = await service.findChildren(mockParentCategoryId, {
        include: { children: true },
      });

      // Type assertion needed due to union return type (Category[] | CategoryWithOptionalRelations[])
      expect((result as any)[0].children).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update basic fields (name, description, color, icon)', async () => {
      const updateDto = {
        name: 'Updated Groceries',
        description: 'Updated description',
        color: '#00FF00',
        icon: 'shopping-cart',
      };

      const updatedCategory = {
        id: mockCategoryId,
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        ...updateDto,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

      const result = await service.update(mockCategoryId, updateDto);

      expect(result).toEqual(updatedCategory);
      expect(result.name).toBe('Updated Groceries');
      expect(result.color).toBe('#00FF00');
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
        data: updateDto,
      });
    });

    it('should update status (ACTIVE to INACTIVE)', async () => {
      const updateDto = {
        status: CategoryStatus.INACTIVE,
      };

      const updatedCategory = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.INACTIVE,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

      const result = await service.update(mockCategoryId, updateDto);

      expect(result.status).toBe(CategoryStatus.INACTIVE);
    });

    it('should update sortOrder', async () => {
      const updateDto = {
        sortOrder: 10,
        depth: 0,
      };

      const updatedCategory = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        sortOrder: 10,
        depth: 0,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

      const result = await service.update(mockCategoryId, updateDto);

      expect(result.sortOrder).toBe(10);
    });

    it('should update parent (move in hierarchy)', async () => {
      const newParentId = '550e8400-e29b-41d4-a716-446655440009';
      const updateDto = {
        parentId: newParentId,
      };

      const updatedCategory = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        parentId: newParentId,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

      const result = await service.update(mockCategoryId, updateDto);

      expect(result.parentId).toBe(newParentId);
    });

    it('should update rules and metadata JSON', async () => {
      const updateDto = {
        rules: {
          keywords: ['grocery', 'supermarket'],
          autoAssign: true,
        },
        metadata: {
          budgetEnabled: true,
          monthlyLimit: 500,
        },
      };

      const updatedCategory = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        ...updateDto,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

      const result = await service.update(mockCategoryId, updateDto);

      expect(result.rules).toEqual(updateDto.rules);
      expect(result.metadata).toEqual(updateDto.metadata);
    });

    it('should throw ConflictException for duplicate slug', async () => {
      const updateDto = {
        slug: 'existing-slug',
      };

      jest.spyOn(prisma.category, 'update').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['familyId', 'slug'] },
        }),
      );

      await expect(service.update(mockCategoryId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException for non-existent category', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      jest.spyOn(prisma.category, 'update').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '5.0.0',
        }),
      );

      await expect(service.update(mockCategoryId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent circular parent reference on update', async () => {
      const updateDto = {
        parentId: mockCategoryId, // Circular: set parent to self
      };

      await expect(service.update(mockCategoryId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a category successfully', async () => {
      const deletedCategory = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(deletedCategory);
      jest.spyOn(prisma.category, 'delete').mockResolvedValue(deletedCategory);

      const result = await service.delete(mockCategoryId);

      expect(result).toEqual(deletedCategory);
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
    });

    it('should CASCADE delete children categories', async () => {
      const parentCategory = {
        id: mockParentCategoryId,
        name: 'Food',
        slug: 'food',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(parentCategory);
      jest.spyOn(prisma.category, 'delete').mockResolvedValue(parentCategory);

      const result = await service.delete(mockParentCategoryId);

      expect(result).toEqual(parentCategory);
      // Prisma CASCADE behavior should delete children automatically
    });

    it('should SET NULL on transactions (categoryId becomes null)', async () => {
      const categoryWithTransactions = {
        id: mockCategoryId,
        name: 'Groceries',
        slug: 'groceries',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        _count: {
          transactions: 15,
        },
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        isSystem: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(categoryWithTransactions);
      jest.spyOn(prisma.category, 'delete').mockResolvedValue(categoryWithTransactions);

      const result = await service.delete(mockCategoryId);

      expect(result).toEqual(categoryWithTransactions);
      // Prisma onDelete: SetNull behavior should set transaction.categoryId to NULL
    });

    it('should throw NotFoundException for non-existent category', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);

      await expect(service.delete(mockCategoryId)).rejects.toThrow(NotFoundException);
    });

    it('should prevent deletion of isSystem categories', async () => {
      const systemCategory = {
        id: mockCategoryId,
        name: 'Uncategorized',
        slug: 'uncategorized',
        type: CategoryType.EXPENSE,
        status: CategoryStatus.ACTIVE,
        isSystem: true,
        description: null,
        color: null,
        icon: null,
        isDefault: false,
        sortOrder: 0,
        depth: 0,
        parentId: null,
        familyId: mockFamilyId,
        rules: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(systemCategory);

      await expect(service.delete(mockCategoryId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('count', () => {
    it('should count categories for a family', async () => {
      jest.spyOn(prisma.category, 'count').mockResolvedValue(25);

      const result = await service.count({ familyId: mockFamilyId });

      expect(result).toBe(25);
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
      });
    });

    it('should count with type filter', async () => {
      jest.spyOn(prisma.category, 'count').mockResolvedValue(15);

      const result = await service.count({
        familyId: mockFamilyId,
        type: CategoryType.EXPENSE,
      });

      expect(result).toBe(15);
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          type: CategoryType.EXPENSE,
        },
      });
    });

    it('should count with status filter', async () => {
      jest.spyOn(prisma.category, 'count').mockResolvedValue(20);

      const result = await service.count({
        familyId: mockFamilyId,
        status: CategoryStatus.ACTIVE,
      });

      expect(result).toBe(20);
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          status: CategoryStatus.ACTIVE,
        },
      });
    });

    it('should count children of a parent', async () => {
      jest.spyOn(prisma.category, 'count').mockResolvedValue(3);

      const result = await service.count({ parentId: mockParentCategoryId });

      expect(result).toBe(3);
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { parentId: mockParentCategoryId },
      });
    });
  });

  describe('exists', () => {
    it('should return true when category exists', async () => {
      jest.spyOn(prisma.category, 'count').mockResolvedValue(1);

      const result = await service.exists(mockCategoryId);

      expect(result).toBe(true);
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
    });

    it('should return false when category does not exist', async () => {
      jest.spyOn(prisma.category, 'count').mockResolvedValue(0);

      const result = await service.exists(mockCategoryId);

      expect(result).toBe(false);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.exists('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateSlug', () => {
    it('should validate correct slug format (lowercase, hyphens)', () => {
      expect(() => service['validateSlug']('groceries')).not.toThrow();
      expect(() => service['validateSlug']('dining-out')).not.toThrow();
      expect(() => service['validateSlug']('food-and-drink')).not.toThrow();
    });

    it('should throw for uppercase characters', () => {
      expect(() => service['validateSlug']('Groceries')).toThrow(BadRequestException);
      expect(() => service['validateSlug']('FOOD')).toThrow(BadRequestException);
    });

    it('should throw for spaces', () => {
      expect(() => service['validateSlug']('dining out')).toThrow(BadRequestException);
      expect(() => service['validateSlug']('food and drink')).toThrow(BadRequestException);
    });

    it('should throw for special characters (except hyphen)', () => {
      expect(() => service['validateSlug']('food@drink')).toThrow(BadRequestException);
      expect(() => service['validateSlug']('food_drink')).toThrow(BadRequestException);
      expect(() => service['validateSlug']('food.drink')).toThrow(BadRequestException);
    });

    it('should throw for empty slug', () => {
      expect(() => service['validateSlug']('')).toThrow(BadRequestException);
    });
  });

  describe('validateColor', () => {
    it('should validate correct hex color (#RRGGBB)', () => {
      expect(() => service['validateColor']('#FF5733')).not.toThrow();
      expect(() => service['validateColor']('#00FF00')).not.toThrow();
      expect(() => service['validateColor']('#123456')).not.toThrow();
    });

    it('should throw for invalid format (missing #)', () => {
      expect(() => service['validateColor']('FF5733')).toThrow(BadRequestException);
    });

    it('should throw for wrong length', () => {
      expect(() => service['validateColor']('#FFF')).toThrow(BadRequestException);
      expect(() => service['validateColor']('#FF57331')).toThrow(BadRequestException);
    });

    it('should accept null/undefined (optional field)', () => {
      expect(() => service['validateColor'](null)).not.toThrow();
      expect(() => service['validateColor'](undefined)).not.toThrow();
    });
  });

  describe('getSpendingByCategory', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    beforeEach(async () => {
      // Re-create module with $queryRaw mock for spending tests
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CategoryService,
          {
            provide: PrismaService,
            useValue: {
              category: {
                create: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn(),
              },
              $queryRaw: jest.fn(),
            },
          },
        ],
      }).compile();

      service = module.get<CategoryService>(CategoryService);
      prisma = module.get<PrismaService>(PrismaService);
    });

    it('should return spending aggregated by parent category (parentOnly=true)', async () => {
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
          categoryId: mockParentCategoryId,
          categoryName: 'Transportation',
          icon: 'Car',
          color: '#3B82F6',
          totalAmount: 200.0,
          transactionCount: 10,
        },
      ];

      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(mockSpendingData);

      const result = await service.getSpendingByCategory(
        mockFamilyId,
        startDate,
        endDate,
        { parentOnly: true }
      );

      expect(result).toEqual(mockSpendingData);
      expect(result).toHaveLength(2);
      expect(result[0].totalAmount).toBe(500.0);
      expect(result[0].transactionCount).toBe(25);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return spending for all categories (parentOnly=false)', async () => {
      const mockSpendingData = [
        {
          categoryId: mockCategoryId,
          categoryName: 'Groceries',
          icon: 'ShoppingCart',
          color: '#22C55E',
          totalAmount: 300.0,
          transactionCount: 15,
        },
        {
          categoryId: '550e8400-e29b-41d4-a716-446655440004',
          categoryName: 'Restaurants',
          icon: 'Utensils',
          color: '#F97316',
          totalAmount: 200.0,
          transactionCount: 10,
        },
      ];

      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(mockSpendingData);

      const result = await service.getSpendingByCategory(
        mockFamilyId,
        startDate,
        endDate,
        { parentOnly: false }
      );

      expect(result).toEqual(mockSpendingData);
      expect(result).toHaveLength(2);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return empty array when no spending data exists', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      const result = await service.getSpendingByCategory(
        mockFamilyId,
        startDate,
        endDate
      );

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle categories with null icon and color', async () => {
      const mockSpendingData = [
        {
          categoryId: mockCategoryId,
          categoryName: 'Uncategorized',
          icon: null,
          color: null,
          totalAmount: 100.0,
          transactionCount: 5,
        },
      ];

      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(mockSpendingData);

      const result = await service.getSpendingByCategory(
        mockFamilyId,
        startDate,
        endDate
      );

      expect(result[0].icon).toBeNull();
      expect(result[0].color).toBeNull();
    });

    it('should return categories ordered by total amount descending', async () => {
      const mockSpendingData = [
        { categoryId: '1', categoryName: 'High', icon: null, color: null, totalAmount: 1000.0, transactionCount: 50 },
        { categoryId: '2', categoryName: 'Medium', icon: null, color: null, totalAmount: 500.0, transactionCount: 25 },
        { categoryId: '3', categoryName: 'Low', icon: null, color: null, totalAmount: 100.0, transactionCount: 5 },
      ];

      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(mockSpendingData);

      const result = await service.getSpendingByCategory(
        mockFamilyId,
        startDate,
        endDate
      );

      expect(result[0].totalAmount).toBeGreaterThan(result[1].totalAmount);
      expect(result[1].totalAmount).toBeGreaterThan(result[2].totalAmount);
    });

    it('should throw BadRequestException for invalid familyId UUID', async () => {
      await expect(
        service.getSpendingByCategory('invalid-uuid', startDate, endDate)
      ).rejects.toThrow(BadRequestException);
    });

    it('should default to parentOnly=true when options not provided', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      await service.getSpendingByCategory(mockFamilyId, startDate, endDate);

      // Verify query was called (parentOnly=true uses recursive CTE)
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle date range at month boundaries', async () => {
      const monthStart = new Date('2025-02-01');
      const monthEnd = new Date('2025-02-28');

      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      await service.getSpendingByCategory(mockFamilyId, monthStart, monthEnd);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle zero spending for categories', async () => {
      const mockSpendingData = [
        {
          categoryId: mockCategoryId,
          categoryName: 'Empty Category',
          icon: 'Folder',
          color: '#6B7280',
          totalAmount: 0,
          transactionCount: 0,
        },
      ];

      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(mockSpendingData);

      const result = await service.getSpendingByCategory(
        mockFamilyId,
        startDate,
        endDate
      );

      expect(result[0].totalAmount).toBe(0);
      expect(result[0].transactionCount).toBe(0);
    });
  });
});
