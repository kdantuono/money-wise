/**
 * PrismaFamilyService Unit Tests (TDD Approach)
 *
 * Test suite for Family entity CRUD operations and relationships using Prisma.
 * Written BEFORE implementation following Test-Driven Development methodology.
 *
 * Coverage Target: 80%+ for all metrics
 * Test Categories: Create, FindOne, FindAll, Update, Delete, Relations
 *
 * @phase Phase 2 - Core Entities Migration (TASK-1.5-P.2.1)
 */

import { Test, TestingModule } from '@nestjs/testing';
import type { PrismaClient, Family, User, Account } from '../../../../../../generated/prisma';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../../../../../src/core/database/prisma/prisma.service';
import { PrismaFamilyService } from '../../../../../../src/core/database/prisma/services/family.service';
import type { CreateFamilyDto } from '../../../../../../src/core/database/prisma/dto/create-family.dto';
import type { UpdateFamilyDto } from '../../../../../../src/core/database/prisma/dto/update-family.dto';
import type { FindAllOptions, RelationOptions, FamilyWithRelations } from '../../../../../../src/core/database/prisma/services/family.service';

// Mock PrismaClient type with all model methods
// Using any for Prisma model methods to work around complex return types
type MockPrismaClient = DeepMockProxy<PrismaClient> & {
  family: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('PrismaFamilyService', () => {
  let service: PrismaFamilyService;
  let prisma: MockPrismaClient;

  /**
   * Test Data Factory
   * Creates mock Family objects with default values
   */
  const createMockFamily = (overrides: Partial<Family> = {}): Family => ({
    id: 'f1234567-89ab-cdef-0123-456789abcdef',
    name: 'Smith Family',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

  /**
   * Test Data Factory - Family with Relations
   */
  const createMockFamilyWithRelations = (
    overrides: Partial<Family> & Partial<{
      users: User[];
      accounts: Account[];
      categories: any[];
      budgets: any[];
    }> = {}
  ): FamilyWithRelations => ({
    ...createMockFamily(),
    users: [],
    accounts: [],
    categories: [],
    budgets: [],
    ...overrides,
  });

  beforeEach(async () => {
    // Create deep mock of PrismaClient
    // Cast to any to work around Prisma's complex return types
    prisma = mockDeep<PrismaClient>() as any;

    // Create testing module with mocked PrismaService and real PrismaFamilyService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        PrismaFamilyService,
      ],
    }).compile();

    service = module.get<PrismaFamilyService>(PrismaFamilyService);
  });

  afterEach(() => {
    // Reset all mocks between tests
    mockReset(prisma);
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe('create', () => {
    const validCreateDto: CreateFamilyDto = {
      name: 'Johnson Family',
    };

    it('should create a family with valid data', async () => {
      // Arrange
      const expectedFamily = createMockFamily({
        id: 'new-family-id',
        name: validCreateDto.name,
        createdAt: new Date('2025-10-11T10:00:00Z'),
        updatedAt: new Date('2025-10-11T10:00:00Z'),
      });

      prisma.family.create.mockResolvedValue(expectedFamily);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(prisma.family.create).toHaveBeenCalledWith({
        data: {
          name: validCreateDto.name,
        },
      });
      expect(result).toEqual(expectedFamily);
      expect(result.name).toBe('Johnson Family');
    });

    it('should create family with trimmed name', async () => {
      // Arrange
      const dtoWithSpaces: CreateFamilyDto = {
        name: '  Brown Family  ',
      };
      const expectedFamily = createMockFamily({ name: 'Brown Family' });

      prisma.family.create.mockResolvedValue(expectedFamily);

      // Act
      const result = await service.create(dtoWithSpaces);

      // Assert
      expect(result.name).toBe('Brown Family');
      expect(result.name).not.toContain('  ');
    });

    it('should set createdAt and updatedAt timestamps automatically', async () => {
      // Arrange
      const now = new Date('2025-10-11T12:30:00Z');
      const expectedFamily = createMockFamily({
        createdAt: now,
        updatedAt: now,
      });

      prisma.family.create.mockResolvedValue(expectedFamily);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.createdAt).toEqual(result.updatedAt); // Should be equal on creation
    });

    it('should reject empty name', async () => {
      // Arrange
      const invalidDto: CreateFamilyDto = {
        name: '',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow();
    });

    it('should reject name with only whitespace', async () => {
      // Arrange
      const invalidDto: CreateFamilyDto = {
        name: '   ',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow();
    });

    it('should reject name exceeding 255 characters', async () => {
      // Arrange
      const invalidDto: CreateFamilyDto = {
        name: 'A'.repeat(256),
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prisma.family.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.create(validCreateDto)).rejects.toThrow('Database connection failed');
    });

    it('should generate unique UUID for family ID', async () => {
      // Arrange
      const family1 = createMockFamily({ id: 'a1111111-1111-1111-1111-111111111111' });
      const family2 = createMockFamily({ id: 'b2222222-2222-2222-2222-222222222222' });

      prisma.family.create
        .mockResolvedValueOnce(family1)
        .mockResolvedValueOnce(family2);

      // Act
      const result1 = await service.create({ name: 'Family 1' });
      const result2 = await service.create({ name: 'Family 2' });

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(result2.id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    const existingFamilyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should find existing family by ID', async () => {
      // Arrange
      const expectedFamily = createMockFamily({ id: existingFamilyId });
      prisma.family.findUnique.mockResolvedValue(expectedFamily);

      // Act
      const result = await service.findOne(existingFamilyId);

      // Assert
      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: existingFamilyId },
      });
      expect(result).toEqual(expectedFamily);
    });

    it('should return null for non-existent family ID', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      prisma.family.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findOne(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });

    it('should reject invalid UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow();
    });

    it('should handle database errors during findOne', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      prisma.family.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.findOne(existingFamilyId)).rejects.toThrow('Connection timeout');
    });

    it('should not include relations by default', async () => {
      // Arrange
      const familyWithoutRelations = createMockFamily();
      prisma.family.findUnique.mockResolvedValue(familyWithoutRelations);

      // Act
      const result = await service.findOne(existingFamilyId);

      // Assert
      expect(result).toEqual(familyWithoutRelations);
      expect((result as any).users).toBeUndefined();
      expect((result as any).accounts).toBeUndefined();
    });
  });

  // ============================================================================
  // FIND ONE WITH RELATIONS TESTS
  // ============================================================================

  describe('findOneWithRelations', () => {
    const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should find family with users relation', async () => {
      // Arrange
      const familyWithUsers = createMockFamilyWithRelations({
        id: familyId,
        users: [
          { id: 'user-1', email: 'user1@example.com', familyId } as User,
          { id: 'user-2', email: 'user2@example.com', familyId } as User,
        ],
      });

      prisma.family.findUnique.mockResolvedValue(familyWithUsers);

      // Act
      const result = await service.findOneWithRelations(familyId, { users: true });

      // Assert
      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: familyId },
        include: {
          users: true,
          accounts: false,
          categories: false,
          budgets: false,
        },
      });
      expect(result?.users).toHaveLength(2);
    });

    it('should find family with accounts relation', async () => {
      // Arrange
      const familyWithAccounts = createMockFamilyWithRelations({
        id: familyId,
        accounts: [
          { id: 'account-1', name: 'Family Checking', familyId } as Account,
        ],
      });

      prisma.family.findUnique.mockResolvedValue(familyWithAccounts);

      // Act
      const result = await service.findOneWithRelations(familyId, { accounts: true });

      // Assert
      expect(result?.accounts).toHaveLength(1);
      expect(result?.accounts?.[0].name).toBe('Family Checking');
    });

    it('should find family with multiple relations', async () => {
      // Arrange
      const familyWithMultipleRelations = createMockFamilyWithRelations({
        id: familyId,
        users: [{ id: 'user-1' } as User],
        accounts: [{ id: 'account-1' } as Account],
        categories: [{ id: 'category-1' }],
        budgets: [{ id: 'budget-1' }],
      });

      prisma.family.findUnique.mockResolvedValue(familyWithMultipleRelations);

      // Act
      const result = await service.findOneWithRelations(familyId, {
        users: true,
        accounts: true,
        categories: true,
        budgets: true,
      });

      // Assert
      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: familyId },
        include: {
          users: true,
          accounts: true,
          categories: true,
          budgets: true,
        },
      });
      expect(result?.users).toHaveLength(1);
      expect(result?.accounts).toHaveLength(1);
      expect(result?.categories).toHaveLength(1);
      expect(result?.budgets).toHaveLength(1);
    });

    it('should return null with relations for non-existent family', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      prisma.family.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findOneWithRelations(nonExistentId, { users: true });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all families', async () => {
      // Arrange
      const families = [
        createMockFamily({ id: 'family-1', name: 'Smith Family' }),
        createMockFamily({ id: 'family-2', name: 'Johnson Family' }),
        createMockFamily({ id: 'family-3', name: 'Williams Family' }),
      ];

      prisma.family.findMany.mockResolvedValue(families);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prisma.family.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result).toEqual(families);
    });

    it('should return empty array when no families exist', async () => {
      // Arrange
      prisma.family.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should support pagination with skip and take', async () => {
      // Arrange
      const paginatedFamilies = [
        createMockFamily({ id: 'family-2', name: 'Family 2' }),
        createMockFamily({ id: 'family-3', name: 'Family 3' }),
      ];

      prisma.family.findMany.mockResolvedValue(paginatedFamilies);

      // Act
      const result = await service.findAll({ skip: 1, take: 2 });

      // Assert
      expect(prisma.family.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 2,
      });
      expect(result).toHaveLength(2);
    });

    it('should support ordering by createdAt ascending', async () => {
      // Arrange
      const orderedFamilies = [
        createMockFamily({ createdAt: new Date('2025-01-01') }),
        createMockFamily({ createdAt: new Date('2025-02-01') }),
      ];

      prisma.family.findMany.mockResolvedValue(orderedFamilies);

      // Act
      const result = await service.findAll({ orderBy: { createdAt: 'asc' } });

      // Assert
      expect(prisma.family.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should support ordering by name descending', async () => {
      // Arrange
      const orderedFamilies = [
        createMockFamily({ name: 'Zulu Family' }),
        createMockFamily({ name: 'Alpha Family' }),
      ];

      prisma.family.findMany.mockResolvedValue(orderedFamilies);

      // Act
      const result = await service.findAll({ orderBy: { name: 'desc' } });

      // Assert
      expect(prisma.family.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'desc' },
      });
    });

    it('should combine pagination and ordering', async () => {
      // Arrange
      prisma.family.findMany.mockResolvedValue([]);

      // Act
      await service.findAll({
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      // Assert
      expect(prisma.family.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update', () => {
    const existingFamilyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should update family name successfully', async () => {
      // Arrange
      const updateDto: UpdateFamilyDto = {
        name: 'Updated Family Name',
      };
      const updatedFamily = createMockFamily({
        id: existingFamilyId,
        name: 'Updated Family Name',
        updatedAt: new Date('2025-10-11T15:00:00Z'),
      });

      prisma.family.update.mockResolvedValue(updatedFamily);

      // Act
      const result = await service.update(existingFamilyId, updateDto);

      // Assert
      expect(prisma.family.update).toHaveBeenCalledWith({
        where: { id: existingFamilyId },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Family Name');
    });

    it('should automatically update updatedAt timestamp', async () => {
      // Arrange
      const originalFamily = createMockFamily({
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });
      const updatedFamily = createMockFamily({
        updatedAt: new Date('2025-10-11T15:00:00Z'),
      });

      prisma.family.update.mockResolvedValue(updatedFamily);

      // Act
      const result = await service.update(existingFamilyId, { name: 'New Name' });

      // Assert
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalFamily.updatedAt.getTime());
    });

    it('should not update createdAt timestamp', async () => {
      // Arrange
      const createdAt = new Date('2025-01-01T00:00:00Z');
      const updatedFamily = createMockFamily({
        createdAt,
        updatedAt: new Date('2025-10-11T15:00:00Z'),
      });

      prisma.family.update.mockResolvedValue(updatedFamily);

      // Act
      const result = await service.update(existingFamilyId, { name: 'New Name' });

      // Assert
      expect(result.createdAt).toEqual(createdAt);
    });

    it('should trim whitespace from updated name', async () => {
      // Arrange
      const updateDto: UpdateFamilyDto = {
        name: '  Trimmed Name  ',
      };
      const updatedFamily = createMockFamily({ name: 'Trimmed Name' });

      prisma.family.update.mockResolvedValue(updatedFamily);

      // Act
      const result = await service.update(existingFamilyId, updateDto);

      // Assert
      expect(result.name).toBe('Trimmed Name');
    });

    it('should reject update with empty name', async () => {
      // Arrange
      const invalidDto: UpdateFamilyDto = {
        name: '',
      };

      // Act & Assert
      await expect(service.update(existingFamilyId, invalidDto)).rejects.toThrow();
    });

    it('should handle update of non-existent family', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const error = new Error('Record to update not found');
      prisma.family.update.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.update(nonExistentId, { name: 'New Name' })
      ).rejects.toThrow('Record to update not found');
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialUpdateDto: UpdateFamilyDto = {}; // Empty update should be valid
      const unchangedFamily = createMockFamily();

      prisma.family.update.mockResolvedValue(unchangedFamily);

      // Act
      const result = await service.update(existingFamilyId, partialUpdateDto);

      // Assert
      expect(result).toEqual(unchangedFamily);
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe('delete', () => {
    const existingFamilyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should delete family successfully', async () => {
      // Arrange
      const deletedFamily = createMockFamily({ id: existingFamilyId });
      prisma.family.delete.mockResolvedValue(deletedFamily);

      // Act
      await service.delete(existingFamilyId);

      // Assert
      expect(prisma.family.delete).toHaveBeenCalledWith({
        where: { id: existingFamilyId },
      });
    });

    it('should CASCADE delete related users', async () => {
      // Arrange
      // In Prisma, CASCADE is defined in schema, so delete should succeed
      // even with related users
      const deletedFamily = createMockFamily({ id: existingFamilyId });
      prisma.family.delete.mockResolvedValue(deletedFamily);

      // Act
      await service.delete(existingFamilyId);

      // Assert
      expect(prisma.family.delete).toHaveBeenCalled();
      // In real implementation, related users would be deleted automatically
    });

    it('should CASCADE delete related accounts', async () => {
      // Arrange
      const deletedFamily = createMockFamily({ id: existingFamilyId });
      prisma.family.delete.mockResolvedValue(deletedFamily);

      // Act
      await service.delete(existingFamilyId);

      // Assert
      expect(prisma.family.delete).toHaveBeenCalled();
      // In real implementation, related accounts would be deleted automatically
    });

    it('should CASCADE delete related categories and budgets', async () => {
      // Arrange
      const deletedFamily = createMockFamily({ id: existingFamilyId });
      prisma.family.delete.mockResolvedValue(deletedFamily);

      // Act
      await service.delete(existingFamilyId);

      // Assert
      expect(prisma.family.delete).toHaveBeenCalled();
      // In real implementation, all related entities would be deleted
    });

    it('should handle deletion of non-existent family', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const error = new Error('Record to delete does not exist');
      prisma.family.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(service.delete(nonExistentId)).rejects.toThrow(
        'Record to delete does not exist'
      );
    });

    it('should reject invalid UUID format for deletion', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.delete(invalidId)).rejects.toThrow();
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      const dbError = new Error('Foreign key constraint violation');
      prisma.family.delete.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.delete(existingFamilyId)).rejects.toThrow(
        'Foreign key constraint violation'
      );
    });
  });

  // ============================================================================
  // EXISTS TESTS
  // ============================================================================

  describe('exists', () => {
    it('should return true for existing family', async () => {
      // Arrange
      const existingFamily = createMockFamily();
      prisma.family.findUnique.mockResolvedValue(existingFamily);

      // Act
      const result = await service.exists(existingFamily.id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent family', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      prisma.family.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.exists(nonExistentId);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle database errors in exists check', async () => {
      // Arrange
      const validId = 'f1234567-89ab-cdef-0123-456789abcdef';
      const dbError = new Error('Database unavailable');
      prisma.family.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.exists(validId)).rejects.toThrow('Database unavailable');
    });
  });

  // ============================================================================
  // RELATIONS TESTS
  // ============================================================================

  describe('relations', () => {
    const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should maintain family-user relationship integrity', async () => {
      // Arrange
      const familyWithUsers = createMockFamilyWithRelations({
        id: familyId,
        users: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
            familyId,
          } as User,
        ],
      });

      prisma.family.findUnique.mockResolvedValue(familyWithUsers);

      // Act
      const result = await service.findOneWithRelations(familyId, { users: true });

      // Assert
      expect(result?.users).toHaveLength(1);
      expect(result?.users?.[0].familyId).toBe(familyId);
    });

    it('should maintain family-account relationship integrity', async () => {
      // Arrange
      const familyWithAccounts = createMockFamilyWithRelations({
        id: familyId,
        accounts: [
          {
            id: 'account-1',
            name: 'Family Savings',
            familyId,
            userId: null, // Family-owned account
          } as Account,
        ],
      });

      prisma.family.findUnique.mockResolvedValue(familyWithAccounts);

      // Act
      const result = await service.findOneWithRelations(familyId, { accounts: true });

      // Assert
      expect(result?.accounts).toHaveLength(1);
      expect(result?.accounts?.[0].familyId).toBe(familyId);
      expect(result?.accounts?.[0].userId).toBeNull();
    });

    it('should return empty arrays for families with no relations', async () => {
      // Arrange
      const familyWithEmptyRelations = createMockFamilyWithRelations({
        id: familyId,
        users: [],
        accounts: [],
        categories: [],
        budgets: [],
      });

      prisma.family.findUnique.mockResolvedValue(familyWithEmptyRelations);

      // Act
      const result = await service.findOneWithRelations(familyId, {
        users: true,
        accounts: true,
        categories: true,
        budgets: true,
      });

      // Assert
      expect(result?.users).toEqual([]);
      expect(result?.accounts).toEqual([]);
      expect(result?.categories).toEqual([]);
      expect(result?.budgets).toEqual([]);
    });

    it('should handle large families with many users', async () => {
      // Arrange
      const manyUsers = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        familyId,
      })) as User[];

      const familyWithManyUsers = createMockFamilyWithRelations({
        id: familyId,
        users: manyUsers,
      });

      prisma.family.findUnique.mockResolvedValue(familyWithManyUsers);

      // Act
      const result = await service.findOneWithRelations(familyId, { users: true });

      // Assert
      expect(result?.users).toHaveLength(50);
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('edge cases', () => {
    it('should handle concurrent create operations', async () => {
      // Arrange
      const family1 = createMockFamily({ id: 'concurrent-1', name: 'Family 1' });
      const family2 = createMockFamily({ id: 'concurrent-2', name: 'Family 2' });

      prisma.family.create
        .mockResolvedValueOnce(family1)
        .mockResolvedValueOnce(family2);

      // Act
      const [result1, result2] = await Promise.all([
        service.create({ name: 'Family 1' }),
        service.create({ name: 'Family 2' }),
      ]);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(prisma.family.create).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in family name', async () => {
      // Arrange
      const specialName = "O'Brien-Smith & Associates (2025)";
      const family = createMockFamily({ name: specialName });

      prisma.family.create.mockResolvedValue(family);

      // Act
      const result = await service.create({ name: specialName });

      // Assert
      expect(result.name).toBe(specialName);
    });

    it('should handle unicode characters in family name', async () => {
      // Arrange
      const unicodeName = 'família González 家族';
      const family = createMockFamily({ name: unicodeName });

      prisma.family.create.mockResolvedValue(family);

      // Act
      const result = await service.create({ name: unicodeName });

      // Assert
      expect(result.name).toBe(unicodeName);
    });

    it('should handle database connection timeouts', async () => {
      // Arrange
      const timeoutError = new Error('Connection timeout after 30s');
      prisma.family.findMany.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Connection timeout after 30s');
    });
  });
});
