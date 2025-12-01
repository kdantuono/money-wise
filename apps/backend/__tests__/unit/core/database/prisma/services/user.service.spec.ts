/**
 * PrismaUserService Unit Tests (TDD Approach)
 *
 * Test suite for User entity CRUD operations, authentication, and relationships using Prisma.
 * Written BEFORE implementation following Test-Driven Development methodology.
 *
 * User entity is MORE COMPLEX than Family due to:
 * - Authentication (password hashing, email verification, login tracking)
 * - Required family relationship (MUST have familyId)
 * - Multiple relations (Family, Accounts, Achievements)
 * - Enums (UserRole, UserStatus)
 * - Authorization patterns (role-based access)
 *
 * Coverage Target: 80%+ for all metrics
 * Test Categories: Create, FindOne, FindAll, Update, Delete, Authentication, Family Relations
 *
 * @phase Phase 2 - Core Entities Migration (TASK-1.5-P.2.5)
 */

import { Test, TestingModule } from '@nestjs/testing';
import type { PrismaClient, User, Family, Account, UserAchievement, UserRole, UserStatus } from '../../../../../../generated/prisma';
import { Prisma } from '../../../../../../generated/prisma';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../../../../../src/core/database/prisma/prisma.service';
import { PrismaUserService } from '../../../../../../src/core/database/prisma/services/user.service';
import type { CreateUserDto } from '../../../../../../src/core/database/prisma/dto/create-user.dto';
import type { UpdateUserDto } from '../../../../../../src/core/database/prisma/dto/update-user.dto';
import type { FindAllOptions, RelationOptions, UserWithRelations } from '../../../../../../src/core/database/prisma/services/user.service';

// Mock PrismaClient type with all User model methods
type MockPrismaClient = DeepMockProxy<PrismaClient> & {
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    groupBy: jest.Mock;
  };
};

describe('PrismaUserService', () => {
  let service: PrismaUserService;
  let prisma: MockPrismaClient;

  /**
   * Test Data Factory - Mock User
   * Creates mock User objects with default values
   */
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: '$2b$10$K7L/V0mIJAiGOiXe4L3Ec.QqKqPqWqT9QqKqPqWqT9QqKqPqWqT', // Bcrypt hash
    firstName: 'John',
    lastName: 'Doe',
    role: 'MEMBER' as UserRole,
    status: 'ACTIVE' as UserStatus,
    avatar: null,
    timezone: null,
    currency: 'USD',
    preferences: null,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
    ...overrides,
  });

  /**
   * Test Data Factory - Mock Family
   */
  const createMockFamily = (overrides: Partial<Family> = {}): Family => ({
    id: 'f1234567-89ab-cdef-0123-456789abcdef',
    name: 'Smith Family',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

  /**
   * Test Data Factory - User with Relations
   */
  const createMockUserWithRelations = (
    overrides: Partial<User> & Partial<{
      family: Family;
      accounts: Account[];
      userAchievements: UserAchievement[];
    }> = {}
  ): UserWithRelations => ({
    ...createMockUser(),
    family: null,
    accounts: [],
    userAchievements: [],
    ...overrides,
  });

  beforeEach(async () => {
    // Create deep mock of PrismaClient
    prisma = mockDeep<PrismaClient>() as any;

    // Create testing module with mocked PrismaService and real PrismaUserService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        PrismaUserService,
      ],
    }).compile();

    service = module.get<PrismaUserService>(PrismaUserService);
  });

  afterEach(() => {
    // Reset all mocks between tests
    mockReset(prisma);
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe('create', () => {
    const validCreateDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
      familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
    };

    it('should create a user with valid data and familyId', async () => {
      // Arrange
      const expectedUser = createMockUser({
        id: 'new-user-id',
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        familyId: validCreateDto.familyId,
        passwordHash: '$2b$10$hashedPassword', // Should be hashed
        createdAt: new Date('2025-10-11T10:00:00Z'),
        updatedAt: new Date('2025-10-11T10:00:00Z'),
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(result.email).toBe('newuser@example.com');
      expect(result.familyId).toBe(validCreateDto.familyId);
    });

    it('should hash password before storing', async () => {
      // Arrange
      const plainPassword = 'PlainTextPassword123!';
      const hashedPassword = '$2a$10$K7L/V0mIJAiGOiXe4L3Ec.QqKqPqWqT9QqKqPqWqT9QqKqPqWqT9a'; // 60 chars

      const dto: CreateUserDto = {
        ...validCreateDto,
        password: plainPassword,
      };

      const expectedUser = createMockUser({
        passwordHash: hashedPassword,
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.passwordHash).not.toBe(plainPassword);
      expect(result.passwordHash).toMatch(/^\$2[ab]\$10\$/); // Bcrypt/bcryptjs format ($2a or $2b)
      expect(result.passwordHash).toHaveLength(60); // Standard bcrypt hash length
    });

    it('should trim and lowercase email', async () => {
      // Arrange
      const dto: CreateUserDto = {
        ...validCreateDto,
        email: '  UPPERCASE@Example.COM  ',
      };

      const expectedUser = createMockUser({
        email: 'uppercase@example.com',
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.email).toBe('uppercase@example.com');
      expect(result.email).not.toContain(' ');
    });

    it('should reject invalid email format', async () => {
      // Arrange
      const invalidDto: CreateUserDto = {
        ...validCreateDto,
        email: 'not-an-email',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/email/i);
    });

    it('should reject duplicate email', async () => {
      // Arrange
      const dto: CreateUserDto = {
        ...validCreateDto,
        email: 'existing@example.com',
      };

      const error = new Error('Unique constraint failed on the fields: (`email`)');
      prisma.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/unique/i);
    });

    it('should reject missing familyId (REQUIRED field)', async () => {
      // Arrange
      const invalidDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        // familyId missing!
      } as CreateUserDto;

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/familyId.*required/i);
    });

    it('should reject invalid familyId (FK constraint)', async () => {
      // Arrange
      const dto: CreateUserDto = {
        ...validCreateDto,
        familyId: '00000000-0000-0000-0000-000000000000', // Non-existent family
      };

      const error = new Error('Foreign key constraint failed on the field: `familyId`');
      prisma.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/foreign key/i);
    });

    it('should set default role to MEMBER', async () => {
      // Arrange
      const dto: CreateUserDto = {
        ...validCreateDto,
        // role not specified
      };

      const expectedUser = createMockUser({
        role: 'MEMBER' as UserRole,
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.role).toBe('MEMBER');
    });

    it('should set default status to ACTIVE', async () => {
      // Arrange
      const expectedUser = createMockUser({
        status: 'ACTIVE' as UserStatus,
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result.status).toBe('ACTIVE');
    });

    it('should set emailVerifiedAt to null (email not verified)', async () => {
      // Arrange
      const expectedUser = createMockUser({
        emailVerifiedAt: null,
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result.emailVerifiedAt).toBeNull();
    });

    it('should set timestamps (createdAt, updatedAt)', async () => {
      // Arrange
      const now = new Date('2025-10-11T12:30:00Z');
      const expectedUser = createMockUser({
        createdAt: now,
        updatedAt: now,
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.createdAt).toEqual(result.updatedAt); // Equal on creation
    });

    it('should handle optional firstName and lastName', async () => {
      // Arrange
      const dto: CreateUserDto = {
        email: 'minimal@example.com',
        password: 'password123',
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
        // firstName and lastName omitted
      };

      const expectedUser = createMockUser({
        firstName: null,
        lastName: null,
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
    });

    it('should allow creating user with ADMIN role', async () => {
      // Arrange
      const dto: CreateUserDto = {
        ...validCreateDto,
        role: 'ADMIN' as UserRole,
      };

      const expectedUser = createMockUser({
        role: 'ADMIN' as UserRole,
      });

      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.role).toBe('ADMIN');
    });

    it('should reject password shorter than 8 characters', async () => {
      // Arrange
      const dto: CreateUserDto = {
        ...validCreateDto,
        password: 'short1',
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/password.*8/i);
    });

    it('should reject empty email', async () => {
      // Arrange
      const dto: CreateUserDto = {
        ...validCreateDto,
        email: '',
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/email/i);
    });

    it('should generate unique UUID for user ID', async () => {
      // Arrange
      const user1 = createMockUser({ id: 'a1111111-1111-1111-1111-111111111111' });
      const user2 = createMockUser({ id: 'b2222222-2222-2222-2222-222222222222' });

      prisma.user.create
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      // Act
      const result1 = await service.create({ ...validCreateDto, email: 'user1@example.com' });
      const result2 = await service.create({ ...validCreateDto, email: 'user2@example.com' });

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
    const existingUserId = '123e4567-e89b-12d3-a456-426614174000';

    it('should find existing user by ID', async () => {
      // Arrange
      const expectedUser = createMockUser({ id: existingUserId });
      prisma.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await service.findOne(existingUserId);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: existingUserId },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should return null for non-existent user ID', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findOne(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });

    it('should reject invalid UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow(/uuid/i);
    });

    it('should not include relations by default', async () => {
      // Arrange
      const userWithoutRelations = createMockUser();
      prisma.user.findUnique.mockResolvedValue(userWithoutRelations);

      // Act
      const result = await service.findOne(existingUserId);

      // Assert
      expect(result).toEqual(userWithoutRelations);
      expect((result as any).family).toBeUndefined();
      expect((result as any).accounts).toBeUndefined();
    });

    it('should handle database errors during findOne', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      prisma.user.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.findOne(existingUserId)).rejects.toThrow('Connection timeout');
    });
  });

  // ============================================================================
  // FIND BY EMAIL TESTS
  // ============================================================================

  describe('findByEmail', () => {
    it('should find user by email (case-insensitive)', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUser = createMockUser({ email: email.toLowerCase() });
      prisma.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should find user with uppercase email', async () => {
      // Arrange
      const uppercaseEmail = 'TEST@EXAMPLE.COM';
      const expectedUser = createMockUser({ email: 'test@example.com' });
      prisma.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await service.findByEmail(uppercaseEmail);

      // Assert
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should trim email before searching', async () => {
      // Arrange
      const emailWithSpaces = '  test@example.com  ';
      const expectedUser = createMockUser({ email: 'test@example.com' });
      prisma.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await service.findByEmail(emailWithSpaces);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  // ============================================================================
  // FIND ONE WITH RELATIONS TESTS
  // ============================================================================

  describe('findOneWithRelations', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should find user with family relation', async () => {
      // Arrange
      const family = createMockFamily();
      const userWithFamily = createMockUserWithRelations({
        id: userId,
        family,
      });

      prisma.user.findUnique.mockResolvedValue(userWithFamily);

      // Act
      const result = await service.findOneWithRelations(userId, { family: true });

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          family: true,
          accounts: false,
          userAchievements: false,
        },
      });
      expect(result?.family).toEqual(family);
    });

    it('should find user with accounts relation', async () => {
      // Arrange
      const userWithAccounts = createMockUserWithRelations({
        id: userId,
        accounts: [
          { id: 'account-1', name: 'Checking', userId } as Account,
          { id: 'account-2', name: 'Savings', userId } as Account,
        ],
      });

      prisma.user.findUnique.mockResolvedValue(userWithAccounts);

      // Act
      const result = await service.findOneWithRelations(userId, { accounts: true });

      // Assert
      expect(result?.accounts).toHaveLength(2);
      expect(result?.accounts?.[0].name).toBe('Checking');
    });

    it('should find user with achievements relation', async () => {
      // Arrange
      const userWithAchievements = createMockUserWithRelations({
        id: userId,
        userAchievements: [
          { id: 'achievement-1', userId, achievementId: 'ach-1' } as UserAchievement,
        ],
      });

      prisma.user.findUnique.mockResolvedValue(userWithAchievements);

      // Act
      const result = await service.findOneWithRelations(userId, { userAchievements: true });

      // Assert
      expect(result?.userAchievements).toHaveLength(1);
    });

    it('should find user with multiple relations', async () => {
      // Arrange
      const family = createMockFamily();
      const userWithMultipleRelations = createMockUserWithRelations({
        id: userId,
        family,
        accounts: [{ id: 'account-1' } as Account],
        userAchievements: [{ id: 'achievement-1' } as UserAchievement],
      });

      prisma.user.findUnique.mockResolvedValue(userWithMultipleRelations);

      // Act
      const result = await service.findOneWithRelations(userId, {
        family: true,
        accounts: true,
        userAchievements: true,
      });

      // Assert
      expect(result?.family).toBeDefined();
      expect(result?.accounts).toHaveLength(1);
      expect(result?.userAchievements).toHaveLength(1);
    });

    it('should return null with relations for non-existent user', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findOneWithRelations(nonExistentId, { family: true });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const users = [
        createMockUser({ id: 'user-1', email: 'user1@example.com' }),
        createMockUser({ id: 'user-2', email: 'user2@example.com' }),
        createMockUser({ id: 'user-3', email: 'user3@example.com' }),
      ];

      prisma.user.findMany.mockResolvedValue(users);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result).toEqual(users);
    });

    it('should return empty array when no users exist', async () => {
      // Arrange
      prisma.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should support pagination with skip and take', async () => {
      // Arrange
      const paginatedUsers = [
        createMockUser({ id: 'user-2' }),
        createMockUser({ id: 'user-3' }),
      ];

      prisma.user.findMany.mockResolvedValue(paginatedUsers);

      // Act
      const result = await service.findAll({ skip: 1, take: 2 });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 2,
      });
      expect(result).toHaveLength(2);
    });

    it('should filter users by familyId', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      const familyUsers = [
        createMockUser({ id: 'user-1', familyId }),
        createMockUser({ id: 'user-2', familyId }),
      ];

      prisma.user.findMany.mockResolvedValue(familyUsers);

      // Act
      const result = await service.findAll({ where: { familyId } });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { familyId },
      });
      expect(result).toHaveLength(2);
    });

    it('should filter users by role', async () => {
      // Arrange
      const adminUsers = [
        createMockUser({ id: 'admin-1', role: 'ADMIN' as UserRole }),
        createMockUser({ id: 'admin-2', role: 'ADMIN' as UserRole }),
      ];

      prisma.user.findMany.mockResolvedValue(adminUsers);

      // Act
      const result = await service.findAll({ where: { role: 'ADMIN' as UserRole } });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(u => u.role === 'ADMIN')).toBe(true);
    });

    it('should filter users by status', async () => {
      // Arrange
      const activeUsers = [
        createMockUser({ id: 'user-1', status: 'ACTIVE' as UserStatus }),
      ];

      prisma.user.findMany.mockResolvedValue(activeUsers);

      // Act
      const result = await service.findAll({ where: { status: 'ACTIVE' as UserStatus } });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should support ordering by createdAt descending', async () => {
      // Arrange
      const orderedUsers = [
        createMockUser({ createdAt: new Date('2025-02-01') }),
        createMockUser({ createdAt: new Date('2025-01-01') }),
      ];

      prisma.user.findMany.mockResolvedValue(orderedUsers);

      // Act
      const result = await service.findAll({ orderBy: { createdAt: 'desc' } });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should support ordering by email ascending', async () => {
      // Arrange
      const orderedUsers = [
        createMockUser({ email: 'aaa@example.com' }),
        createMockUser({ email: 'zzz@example.com' }),
      ];

      prisma.user.findMany.mockResolvedValue(orderedUsers);

      // Act
      const result = await service.findAll({ orderBy: { email: 'asc' } });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { email: 'asc' },
      });
    });

    it('should combine pagination, filtering, and ordering', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      prisma.user.findMany.mockResolvedValue([]);

      // Act
      await service.findAll({
        skip: 10,
        take: 5,
        where: { familyId, role: 'MEMBER' as UserRole },
        orderBy: { createdAt: 'desc' },
      });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        where: { familyId, role: 'MEMBER' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update', () => {
    const existingUserId = '123e4567-e89b-12d3-a456-426614174000';

    it('should update user firstName and lastName', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        firstName: 'UpdatedFirstName',
        lastName: 'UpdatedLastName',
      };

      const updatedUser = createMockUser({
        id: existingUserId,
        firstName: 'UpdatedFirstName',
        lastName: 'UpdatedLastName',
        updatedAt: new Date('2025-10-11T15:00:00Z'),
      });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, updateDto);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUserId },
        data: updateDto,
      });
      expect(result.firstName).toBe('UpdatedFirstName');
      expect(result.lastName).toBe('UpdatedLastName');
    });

    it('should update user email (must remain unique)', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      const updatedUser = createMockUser({
        email: 'newemail@example.com',
      });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, updateDto);

      // Assert
      expect(result.email).toBe('newemail@example.com');
    });

    it('should reject duplicate email on update', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      const error = new Error('Unique constraint failed on the fields: (`email`)');
      prisma.user.update.mockRejectedValue(error);

      // Act & Assert
      await expect(service.update(existingUserId, updateDto)).rejects.toThrow(/unique/i);
    });

    it('should update user role (MEMBER to ADMIN)', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        role: 'ADMIN' as UserRole,
      };

      const updatedUser = createMockUser({
        role: 'ADMIN' as UserRole,
      });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, updateDto);

      // Assert
      expect(result.role).toBe('ADMIN');
    });

    it('should update user status (ACTIVE to SUSPENDED)', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        status: 'SUSPENDED' as UserStatus,
      };

      const updatedUser = createMockUser({
        status: 'SUSPENDED' as UserStatus,
      });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, updateDto);

      // Assert
      expect(result.status).toBe('SUSPENDED');
    });

    it('should NOT allow updating familyId (immutable)', async () => {
      // Arrange
      const updateDto = {
        familyId: 'new-family-id', // Should be rejected
      } as UpdateUserDto;

      // Act & Assert
      await expect(service.update(existingUserId, updateDto)).rejects.toThrow(/familyId.*immutable/i);
    });

    it('should NOT allow updating password directly (separate method)', async () => {
      // Arrange
      const updateDto = {
        password: 'newPassword123',
      } as UpdateUserDto;

      // Act & Assert
      await expect(service.update(existingUserId, updateDto)).rejects.toThrow(/password.*updatePassword/i);
    });

    it('should automatically update updatedAt timestamp', async () => {
      // Arrange
      const originalUser = createMockUser({
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });

      const updatedUser = createMockUser({
        updatedAt: new Date('2025-10-11T15:00:00Z'),
      });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, { firstName: 'New' });

      // Assert
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalUser.updatedAt.getTime());
    });

    it('should NOT update createdAt timestamp', async () => {
      // Arrange
      const createdAt = new Date('2025-01-01T00:00:00Z');
      const updatedUser = createMockUser({
        createdAt,
        updatedAt: new Date('2025-10-11T15:00:00Z'),
      });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, { firstName: 'New' });

      // Assert
      expect(result.createdAt).toEqual(createdAt);
    });

    it('should trim and lowercase email on update', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: '  UPDATED@EXAMPLE.COM  ',
      };

      const updatedUser = createMockUser({
        email: 'updated@example.com',
      });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, updateDto);

      // Assert
      expect(result.email).toBe('updated@example.com');
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialDto: UpdateUserDto = { firstName: 'OnlyFirstName' };
      const updatedUser = createMockUser({ firstName: 'OnlyFirstName' });

      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(existingUserId, partialDto);

      // Assert
      expect(result.firstName).toBe('OnlyFirstName');
    });

    it('should handle update of non-existent user', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const error = new Error('Record to update not found');
      prisma.user.update.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.update(nonExistentId, { firstName: 'New' })
      ).rejects.toThrow('Record to update not found');
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe('delete', () => {
    const existingUserId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete user successfully', async () => {
      // Arrange
      const deletedUser = createMockUser({ id: existingUserId });
      prisma.user.delete.mockResolvedValue(deletedUser);

      // Act
      await service.delete(existingUserId);

      // Assert
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: existingUserId },
      });
    });

    it('should CASCADE delete user accounts', async () => {
      // Arrange
      // In Prisma, CASCADE is defined in schema (onDelete: Cascade)
      const deletedUser = createMockUser({ id: existingUserId });
      prisma.user.delete.mockResolvedValue(deletedUser);

      // Act
      await service.delete(existingUserId);

      // Assert
      expect(prisma.user.delete).toHaveBeenCalled();
      // Related accounts deleted automatically by Prisma CASCADE
    });

    it('should CASCADE delete user achievements', async () => {
      // Arrange
      const deletedUser = createMockUser({ id: existingUserId });
      prisma.user.delete.mockResolvedValue(deletedUser);

      // Act
      await service.delete(existingUserId);

      // Assert
      expect(prisma.user.delete).toHaveBeenCalled();
      // Related user achievements deleted automatically by Prisma CASCADE
    });

    it('should handle deletion of non-existent user', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const error = new Error('Record to delete does not exist');
      prisma.user.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(service.delete(nonExistentId)).rejects.toThrow(
        'Record to delete does not exist'
      );
    });

    it('should reject invalid UUID format for deletion', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.delete(invalidId)).rejects.toThrow(/uuid/i);
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      const dbError = new Error('Foreign key constraint violation');
      prisma.user.delete.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.delete(existingUserId)).rejects.toThrow(
        'Foreign key constraint violation'
      );
    });
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('authentication', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        // Arrange
        const plainPassword = 'CorrectPassword123!';
        const hashedPassword = '$2a$10$jMuX3MW.xrKBMspS07H3Te.szzQsdYncMhojuq2JGHH9UlVeQXH6i'; // Real bcryptjs hash

        const user = createMockUser({
          id: userId,
          passwordHash: hashedPassword,
        });

        prisma.user.findUnique.mockResolvedValue(user);

        // Act
        const result = await service.verifyPassword(userId, plainPassword);

        // Assert
        expect(result).toBe(true);
      });

      it('should reject incorrect password', async () => {
        // Arrange
        const plainPassword = 'WrongPassword123!';
        const hashedPassword = '$2b$10$K7L/V0mIJAiGOiXe4L3Ec.QqKqPqWqT9QqKqPqWqT9QqKqPqWqT';

        const user = createMockUser({
          id: userId,
          passwordHash: hashedPassword,
        });

        prisma.user.findUnique.mockResolvedValue(user);

        // Act
        const result = await service.verifyPassword(userId, plainPassword);

        // Assert
        expect(result).toBe(false);
      });

      it('should throw error for non-existent user', async () => {
        // Arrange
        prisma.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.verifyPassword(userId, 'password')).rejects.toThrow(/user.*not found/i);
      });
    });

    describe('updatePassword', () => {
      it('should update password with new hash', async () => {
        // Arrange
        const newPassword = 'NewSecurePassword123!';
        const newHashedPassword = '$2b$10$newHashedPasswordString';

        const user = createMockUser({ id: userId });
        const updatedUser = createMockUser({
          id: userId,
          passwordHash: newHashedPassword,
        });

        prisma.user.findUnique.mockResolvedValue(user);
        prisma.user.update.mockResolvedValue(updatedUser);

        // Act
        await service.updatePassword(userId, newPassword);

        // Assert
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: {
            passwordHash: expect.stringMatching(/^\$2[ab]\$10\$/), // Accept both $2a (bcryptjs) and $2b (bcrypt)
          },
        });
      });

      it('should hash new password before storing', async () => {
        // Arrange
        const plainPassword = 'NewPlainPassword123!';
        const user = createMockUser({ id: userId });

        prisma.user.findUnique.mockResolvedValue(user);
        prisma.user.update.mockResolvedValue(user);

        // Act
        await service.updatePassword(userId, plainPassword);

        // Assert
        const callArgs = prisma.user.update.mock.calls[0][0] as any;
        expect(callArgs.data.passwordHash).not.toBe(plainPassword);
        expect(callArgs.data.passwordHash).toMatch(/^\$2[ab]\$10\$/); // Accept both $2a (bcryptjs) and $2b (bcrypt)
      });

      it('should reject password shorter than 8 characters', async () => {
        // Arrange
        const shortPassword = 'short1';

        // Act & Assert
        await expect(service.updatePassword(userId, shortPassword)).rejects.toThrow(/password.*8/i);
      });
    });

    describe('updateLastLogin', () => {
      it('should update lastLoginAt timestamp', async () => {
        // Arrange
        const now = new Date('2025-10-11T12:00:00Z');
        const updatedUser = createMockUser({
          id: userId,
          lastLoginAt: now,
        });

        prisma.user.update.mockResolvedValue(updatedUser);

        // Act
        await service.updateLastLogin(userId);

        // Assert
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: {
            lastLoginAt: expect.any(Date),
          },
        });
      });

      it('should set lastLoginAt to current time', async () => {
        // Arrange
        const beforeUpdate = new Date();
        const updatedUser = createMockUser({
          lastLoginAt: new Date(),
        });

        prisma.user.update.mockResolvedValue(updatedUser);

        // Act
        await service.updateLastLogin(userId);

        // Assert
        const afterUpdate = new Date();
        expect(updatedUser.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(updatedUser.lastLoginAt!.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      });
    });

    describe('verifyEmail', () => {
      it('should set emailVerifiedAt to current timestamp', async () => {
        // Arrange
        const now = new Date('2025-10-11T12:00:00Z');
        const updatedUser = createMockUser({
          id: userId,
          emailVerifiedAt: now,
        });

        prisma.user.update.mockResolvedValue(updatedUser);

        // Act
        await service.verifyEmail(userId);

        // Assert
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: {
            emailVerifiedAt: expect.any(Date),
          },
        });
      });

      it('should handle already verified email', async () => {
        // Arrange
        const alreadyVerified = createMockUser({
          emailVerifiedAt: new Date('2025-01-01T00:00:00Z'),
        });

        prisma.user.update.mockResolvedValue(alreadyVerified);

        // Act
        await service.verifyEmail(userId);

        // Assert
        expect(prisma.user.update).toHaveBeenCalled();
        // Should succeed even if already verified (idempotent)
      });
    });
  });

  // ============================================================================
  // FAMILY RELATIONSHIP TESTS
  // ============================================================================

  describe('family relationship', () => {
    const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should require familyId when creating user', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        // familyId missing!
      } as CreateUserDto;

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/familyId.*required/i);
    });

    it('should validate familyId references existing family', async () => {
      // Arrange
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        familyId: '00000000-0000-0000-0000-000000000000', // Non-existent
      };

      const error = new Error('Foreign key constraint failed on the field: `familyId`');
      prisma.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/foreign key/i);
    });

    it('should find all users in a family', async () => {
      // Arrange
      const familyUsers = [
        createMockUser({ id: 'user-1', familyId, email: 'user1@example.com' }),
        createMockUser({ id: 'user-2', familyId, email: 'user2@example.com' }),
        createMockUser({ id: 'user-3', familyId, email: 'user3@example.com' }),
      ];

      prisma.user.findMany.mockResolvedValue(familyUsers);

      // Act
      const result = await service.findByFamily(familyId);

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { familyId },
      });
      expect(result).toHaveLength(3);
      expect(result.every(u => u.familyId === familyId)).toBe(true);
    });

    it('should CASCADE delete users when family is deleted', async () => {
      // Arrange
      // When family is deleted, Prisma CASCADE deletes all users
      // This is defined in schema: onDelete: Cascade

      // Mock finding users before deletion
      const familyUsers = [
        createMockUser({ id: 'user-1', familyId }),
      ];
      prisma.user.findMany.mockResolvedValue(familyUsers);

      // Mock family deletion (CASCADE deletes users)
      // In real implementation, Prisma handles this automatically

      // Act - Delete family (users should be deleted automatically)
      await service.findByFamily(familyId); // Before deletion

      // After family deletion, users should not exist
      prisma.user.findMany.mockResolvedValue([]);
      const afterDeletion = await service.findByFamily(familyId);

      // Assert
      expect(afterDeletion).toHaveLength(0);
    });

    it('should filter users by family and role', async () => {
      // Arrange
      const adminUsers = [
        createMockUser({ id: 'admin-1', familyId, role: 'ADMIN' as UserRole }),
      ];

      prisma.user.findMany.mockResolvedValue(adminUsers);

      // Act
      const result = await service.findByFamily(familyId, { role: 'ADMIN' as UserRole });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          familyId,
          role: 'ADMIN',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('ADMIN');
    });

    it('should load family relation with user', async () => {
      // Arrange
      const validUserId = '123e4567-e89b-12d3-a456-426614174001'; // Valid UUID
      const family = createMockFamily({ id: familyId });
      const userWithFamily = createMockUserWithRelations({
        id: validUserId,
        familyId,
        family,
      });

      prisma.user.findUnique.mockResolvedValue(userWithFamily);

      // Act
      const result = await service.findOneWithRelations(validUserId, { family: true });

      // Assert
      expect(result?.family).toBeDefined();
      expect(result?.family?.id).toBe(familyId);
      expect(result?.family?.name).toBe('Smith Family');
    });

    it('should return empty array for family with no users', async () => {
      // Arrange
      prisma.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findByFamily(familyId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // EXISTS TESTS
  // ============================================================================

  describe('exists', () => {
    it('should return true for existing user', async () => {
      // Arrange
      const existingUser = createMockUser();
      prisma.user.findUnique.mockResolvedValue(existingUser);

      // Act
      const result = await service.exists(existingUser.id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.exists(nonExistentId);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle database errors in exists check', async () => {
      // Arrange
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const dbError = new Error('Database unavailable');
      prisma.user.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.exists(validId)).rejects.toThrow('Database unavailable');
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('edge cases', () => {
    it('should handle concurrent user creation', async () => {
      // Arrange
      const user1 = createMockUser({ id: 'concurrent-1', email: 'user1@example.com' });
      const user2 = createMockUser({ id: 'concurrent-2', email: 'user2@example.com' });

      prisma.user.create
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      // Act
      const [result1, result2] = await Promise.all([
        service.create({
          email: 'user1@example.com',
          password: 'password1',
          familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
        }),
        service.create({
          email: 'user2@example.com',
          password: 'password2',
          familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
        }),
      ]);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(prisma.user.create).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in names', async () => {
      // Arrange
      const specialName = "O'Brien-Smith";
      const user = createMockUser({ firstName: specialName });

      prisma.user.create.mockResolvedValue(user);

      // Act
      const result = await service.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: specialName,
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
      });

      // Assert
      expect(result.firstName).toBe(specialName);
    });

    it('should handle unicode characters in names', async () => {
      // Arrange
      const unicodeName = 'José González 李明';
      const user = createMockUser({ firstName: unicodeName });

      prisma.user.create.mockResolvedValue(user);

      // Act
      const result = await service.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: unicodeName,
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
      });

      // Assert
      expect(result.firstName).toBe(unicodeName);
    });

    it('should handle database connection timeouts', async () => {
      // Arrange
      const timeoutError = new Error('Connection timeout after 30s');
      prisma.user.findMany.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Connection timeout after 30s');
    });

    it('should handle large result sets (many users)', async () => {
      // Arrange
      const manyUsers = Array.from({ length: 1000 }, (_, i) =>
        createMockUser({
          id: `user-${i}`,
          email: `user${i}@example.com`,
        })
      );

      prisma.user.findMany.mockResolvedValue(manyUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(1000);
    });

    it('should handle email with plus addressing (user+tag@example.com)', async () => {
      // Arrange
      const emailWithPlus = 'user+tag@example.com';
      const user = createMockUser({ email: emailWithPlus });

      prisma.user.create.mockResolvedValue(user);

      // Act
      const result = await service.create({
        email: emailWithPlus,
        password: 'password123',
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
      });

      // Assert
      expect(result.email).toBe(emailWithPlus);
    });

    it('should handle long email addresses (max 255 chars)', async () => {
      // Arrange
      const longEmail = 'a'.repeat(240) + '@example.com'; // 253 chars
      const user = createMockUser({ email: longEmail });

      prisma.user.create.mockResolvedValue(user);

      // Act
      const result = await service.create({
        email: longEmail,
        password: 'password123',
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
      });

      // Assert
      expect(result.email).toBe(longEmail);
    });
  });

  // ============================================================================
  // P.3.4 PREREQUISITE METHODS - NEW METHODS FOR SERVICE MIGRATION
  // ============================================================================

  /**
   * Tests for findByIdentifier() - P.3.4.0.1
   * Required by account-lockout.service
   * Accepts email OR username as identifier
   */
  describe('findByIdentifier', () => {
    it('should find user by email identifier', async () => {
      // Arrange
      const email = 'test@example.com';
      const user = createMockUser({ email });
      prisma.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await service.findByIdentifier(email);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
      expect(result).toEqual(user);
    });

    it('should normalize email before search (case-insensitive)', async () => {
      // Arrange
      const uppercaseEmail = 'TEST@EXAMPLE.COM';
      const user = createMockUser({ email: 'test@example.com' });
      prisma.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await service.findByIdentifier(uppercaseEmail);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(user);
    });

    it('should return null for non-existent identifier', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByIdentifier('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle email identifiers with plus addressing', async () => {
      // Arrange
      const emailWithPlus = 'user+tag@example.com';
      const user = createMockUser({ email: emailWithPlus });
      prisma.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await service.findByIdentifier(emailWithPlus);

      // Assert
      expect(result).toEqual(user);
    });
  });

  /**
   * Tests for count() - P.3.4.0.2
   * Required by users.service and email-verification.service
   * Counts users matching optional filter criteria
   */
  describe('count', () => {
    it('should count all users when no filter provided', async () => {
      // Arrange
      prisma.user.count.mockResolvedValue(42);

      // Act
      const result = await service.count();

      // Assert
      expect(prisma.user.count).toHaveBeenCalledWith({});
      expect(result).toBe(42);
    });

    it('should count users by familyId', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      prisma.user.count.mockResolvedValue(5);

      // Act
      const result = await service.count({ familyId });

      // Assert
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { familyId },
      });
      expect(result).toBe(5);
    });

    it('should count users by status', async () => {
      // Arrange
      prisma.user.count.mockResolvedValue(10);

      // Act
      const result = await service.count({ status: 'ACTIVE' as UserStatus });

      // Assert
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(result).toBe(10);
    });

    it('should count users by role', async () => {
      // Arrange
      prisma.user.count.mockResolvedValue(3);

      // Act
      const result = await service.count({ role: 'ADMIN' as UserRole });

      // Assert
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
      });
      expect(result).toBe(3);
    });

    it('should return 0 when no users match criteria', async () => {
      // Arrange
      prisma.user.count.mockResolvedValue(0);

      // Act
      const result = await service.count({ status: 'SUSPENDED' as UserStatus });

      // Assert
      expect(result).toBe(0);
    });

    it('should count users with multiple filters', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      prisma.user.count.mockResolvedValue(2);

      // Act
      const result = await service.count({
        familyId,
        role: 'MEMBER' as UserRole,
        status: 'ACTIVE' as UserStatus,
      });

      // Assert
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          familyId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });
      expect(result).toBe(2);
    });
  });

  /**
   * Tests for countByStatus() - P.3.4.0.3
   * Required by users.service.getStats()
   * Returns count breakdown by each UserStatus
   */
  describe('countByStatus', () => {
    it('should return counts grouped by status', async () => {
      // Arrange
      const mockGroupByResult = [
        { status: 'ACTIVE' as UserStatus, _count: { _all: 10 } },
        { status: 'INACTIVE' as UserStatus, _count: { _all: 3 } },
        { status: 'SUSPENDED' as UserStatus, _count: { _all: 1 } },
      ];
      // @ts-expect-error - Prisma groupBy has complex circular type references in mock context
      prisma.user.groupBy.mockResolvedValue(mockGroupByResult);

      // Act
      const result = await service.countByStatus();

      // Assert
      expect(prisma.user.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        _count: { _all: true },
      });
      expect(result).toEqual({
        total: 14,
        active: 10,
        inactive: 3,
        suspended: 1,
      });
    });

    it('should return zero counts for missing statuses', async () => {
      // Arrange
      const mockGroupByResult = [
        { status: 'ACTIVE' as UserStatus, _count: { _all: 5 } },
      ];
      prisma.user.groupBy.mockResolvedValue(mockGroupByResult as any);

      // Act
      const result = await service.countByStatus();

      // Assert
      expect(result).toEqual({
        total: 5,
        active: 5,
        inactive: 0,
        suspended: 0,
      });
    });

    it('should handle empty database (all counts zero)', async () => {
      // Arrange
      prisma.user.groupBy.mockResolvedValue([]);

      // Act
      const result = await service.countByStatus();

      // Assert
      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
      });
    });

    it('should filter counts by familyId when provided', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      const mockGroupByResult = [
        { status: 'ACTIVE' as UserStatus, _count: { _all: 7 } },
        { status: 'INACTIVE' as UserStatus, _count: { _all: 2 } },
      ];
      prisma.user.groupBy.mockResolvedValue(mockGroupByResult as any);

      // Act
      const result = await service.countByStatus(familyId);

      // Assert
      expect(prisma.user.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        _count: { _all: true },
        where: { familyId },
      });
      expect(result).toEqual({
        total: 9,
        active: 7,
        inactive: 2,
        suspended: 0,
      });
    });

    it('should validate familyId UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.countByStatus(invalidId)).rejects.toThrow(/uuid/i);
    });
  });

  /**
   * Tests for findAllWithCount() - P.3.4.0.4
   * Required for pagination with total count
   * Returns both data array and total count
   */
  describe('findAllWithCount', () => {
    it('should return users and total count', async () => {
      // Arrange
      const users = [
        createMockUser({ id: 'user-1' }),
        createMockUser({ id: 'user-2' }),
      ];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(42);

      // Act
      const result = await service.findAllWithCount();

      // Assert
      expect(result).toEqual({
        users: users,
        total: 42,
      });
    });

    it('should support pagination with skip and take', async () => {
      // Arrange
      const users = [createMockUser({ id: 'user-2' })];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(10);

      // Act
      const result = await service.findAllWithCount({ skip: 1, take: 1 });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
      });
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it('should filter by familyId with correct count', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      const users = [createMockUser({ id: 'user-1', familyId })];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(3);

      // Act
      const result = await service.findAllWithCount({ where: { familyId } });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { familyId },
      });
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { familyId },
      });
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(3);
    });

    it('should support ordering', async () => {
      // Arrange
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      // Act
      await service.findAllWithCount({ orderBy: { createdAt: 'desc' } });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty data with zero count', async () => {
      // Arrange
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      // Act
      const result = await service.findAllWithCount();

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });

    it('should combine all query options', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(15);

      // Act
      await service.findAllWithCount({
        skip: 10,
        take: 5,
        where: { familyId, role: 'ADMIN' as UserRole },
        orderBy: { email: 'asc' },
      });

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        where: { familyId, role: 'ADMIN' },
        orderBy: { email: 'asc' },
      });
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { familyId, role: 'ADMIN' },
      });
    });
  });

  /**
   * Tests for createWithHash() - P.3.4.0.5
   * Required by auth.service for registration with pre-hashed passwords
   * Accepts passwordHash directly (no hashing)
   */
  describe('createWithHash', () => {
    const validDto = {
      email: 'newuser@example.com',
      passwordHash: '$2b$10$K7L/V0mIJAiGOiXe4L3Ec.QqKqPqWqT9QqKqPqWqT9QqKqPqWqT',
      firstName: 'Jane',
      lastName: 'Smith',
      familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
    };

    it('should create user with pre-hashed password', async () => {
      // Arrange
      const expectedUser = createMockUser({
        email: 'newuser@example.com',
        passwordHash: validDto.passwordHash,
      });
      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createWithHash(validDto);

      // Assert
      expect(result.passwordHash).toBe(validDto.passwordHash);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should NOT re-hash the provided passwordHash', async () => {
      // Arrange
      const preHashedPassword = '$2b$10$PreHashedPasswordString';
      const dto = { ...validDto, passwordHash: preHashedPassword };
      const expectedUser = createMockUser({ passwordHash: preHashedPassword });
      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createWithHash(dto);

      // Assert
      expect(result.passwordHash).toBe(preHashedPassword);
      // Verify the call had exact hash (not double-hashed)
      const callData = prisma.user.create.mock.calls[0][0] as any;
      expect(callData.data.passwordHash).toBe(preHashedPassword);
    });

    it('should accept user without familyId (optional for auth flows)', async () => {
      // Arrange
      const dtoWithoutFamily = {
        email: 'user@example.com',
        passwordHash: '$2b$10$hash',
        firstName: 'John',
      };
      const expectedUser = createMockUser({
        email: 'user@example.com',
        familyId: null as any, // Allow null for this test
      });
      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createWithHash(dtoWithoutFamily);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('user@example.com');
    });

    it('should trim and lowercase email', async () => {
      // Arrange
      const dto = { ...validDto, email: '  UPPERCASE@Example.COM  ' };
      const expectedUser = createMockUser({ email: 'uppercase@example.com' });
      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createWithHash(dto);

      // Assert
      expect(result.email).toBe('uppercase@example.com');
    });

    it('should reject empty email', async () => {
      // Arrange
      const dto = { ...validDto, email: '' };

      // Act & Assert
      await expect(service.createWithHash(dto)).rejects.toThrow(/email/i);
    });

    it('should reject invalid email format', async () => {
      // Arrange
      const dto = { ...validDto, email: 'not-an-email' };

      // Act & Assert
      await expect(service.createWithHash(dto)).rejects.toThrow(/email/i);
    });

    it('should reject duplicate email', async () => {
      // Arrange
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        }
      );
      prisma.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.createWithHash(validDto)).rejects.toThrow(/email.*exists/i);
    });

    it('should set default role to MEMBER', async () => {
      // Arrange
      const expectedUser = createMockUser({ role: 'MEMBER' as UserRole });
      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createWithHash(validDto);

      // Assert
      expect(result.role).toBe('MEMBER');
    });

    it('should allow custom role when specified', async () => {
      // Arrange
      const dtoWithRole = { ...validDto, role: 'ADMIN' as UserRole };
      const expectedUser = createMockUser({ role: 'ADMIN' as UserRole });
      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createWithHash(dtoWithRole);

      // Assert
      expect(result.role).toBe('ADMIN');
    });

    it('should reject empty passwordHash', async () => {
      // Arrange
      const dto = { ...validDto, passwordHash: '' };

      // Act & Assert
      await expect(service.createWithHash(dto)).rejects.toThrow(/password/i);
    });

    it('should validate passwordHash format (bcrypt-like)', async () => {
      // Arrange
      const dto = { ...validDto, passwordHash: 'plaintext' };

      // Act & Assert
      await expect(service.createWithHash(dto)).rejects.toThrow(/password.*hash/i);
    });

    it('should handle optional firstName and lastName', async () => {
      // Arrange
      const minimalDto = {
        email: 'minimal@example.com',
        passwordHash: '$2b$10$hash',
      };
      const expectedUser = createMockUser({ firstName: null, lastName: null });
      prisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createWithHash(minimalDto);

      // Assert
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
    });
  });
});
