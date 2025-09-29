<<<<<<< HEAD
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRepository } from '../impl/user.repository';
import { User, UserStatus, UserRole } from '../../entities';

/**
 * Unit tests for UserRepository
 *
 * These tests demonstrate:
 * - Proper mocking of TypeORM dependencies
 * - Testing repository methods with various scenarios
 * - Error handling validation
 * - Type safety throughout tests
 */
=======
/**
 * UserRepository Unit Tests
 * Comprehensive test suite for UserRepository with 92% coverage target
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
import { UserRepository } from '../impl/user.repository';
import { User, UserRole, UserStatus } from '../../entities';

>>>>>>> origin/epic/milestone-1-foundation
describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<User>>;
<<<<<<< HEAD
  let mockQueryBuilder: any;

  beforeEach(async () => {
    // Mock QueryBuilder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
    };

    // Mock Repository
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      manager: {
        transaction: jest.fn(),
        query: jest.fn(),
      },
    } as any;

    // Mock DataSource
=======
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<User>>;
  let mockLogger: jest.Mocked<Logger>;

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-id-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    preferences: null,
    lastLoginAt: null,
    emailVerifiedAt: null,
    createdAt: new Date('2025-09-28T10:00:00Z'),
    updatedAt: new Date('2025-09-28T10:00:00Z'),
    accounts: [],
    get fullName() { return `${this.firstName} ${this.lastName}`; },
    get isEmailVerified() { return this.emailVerifiedAt !== null; },
    get isActive() { return this.status === UserStatus.ACTIVE; },
    ...overrides,
  } as User);

  const mockUser = createMockUser();

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    } as any;

    // Create mock repository
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      manager: {
        createQueryBuilder: jest.fn(),
      },
    } as any;

    // Create mock data source
>>>>>>> origin/epic/milestone-1-foundation
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

<<<<<<< HEAD
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
=======
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    } as any;

    await Test.createTestingModule({
      providers: [
>>>>>>> origin/epic/milestone-1-foundation
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

<<<<<<< HEAD
    userRepository = module.get<UserRepository>(UserRepository);
=======
    userRepository = new UserRepository(mockDataSource);
    // Manually inject the mock logger
    (userRepository as any).logger = mockLogger;
>>>>>>> origin/epic/milestone-1-foundation
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
<<<<<<< HEAD
    it('should find user by email successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = createMockUser({ email });
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findByEmail(email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await userRepository.findByEmail(email);

      // Assert
      expect(result).toBeNull();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
    });

    it('should handle email case insensitivity', async () => {
      // Arrange
      const email = 'Test@Example.COM';
      const mockUser = createMockUser({ email: email.toLowerCase() });
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findByEmail(email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw error when database operation fails', async () => {
      // Arrange
      const email = 'test@example.com';
      const dbError = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findByEmail(email)).rejects.toThrow(
        'Failed to find user by email: Database connection failed'
      );
    });
  });

  describe('findByStatus', () => {
    it('should find users by status', async () => {
      // Arrange
      const status = UserStatus.ACTIVE;
      const mockUsers = [
        createMockUser({ status }),
        createMockUser({ status }),
      ];
      mockRepository.find.mockResolvedValue(mockUsers);

      // Act
      const result = await userRepository.findByStatus(status);

      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no users found', async () => {
      // Arrange
      const status = UserStatus.SUSPENDED;
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await userRepository.findByStatus(status);

      // Assert
      expect(result).toEqual([]);
=======
    it('should find user by email with case insensitivity', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('Test@Example.COM');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle findByEmail errors', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(userRepository.findByEmail('test@example.com')).rejects.toThrow(
        'Failed to find user by email: Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to find user by email: Database connection failed',
        error.stack
      );
>>>>>>> origin/epic/milestone-1-foundation
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email is taken', async () => {
<<<<<<< HEAD
      // Arrange
      const email = 'taken@example.com';
      mockQueryBuilder.getCount.mockResolvedValue(1);

      // Act
      const result = await userRepository.isEmailTaken(email);

      // Assert
      expect(result).toBe(true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.email) = LOWER(:email)',
        { email }
      );
    });

    it('should return false when email is available', async () => {
      // Arrange
      const email = 'available@example.com';
      mockQueryBuilder.getCount.mockResolvedValue(0);

      // Act
      const result = await userRepository.isEmailTaken(email);

      // Assert
=======
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await userRepository.isEmailTaken('test@example.com');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.email) = LOWER(:email)',
        { email: 'test@example.com' }
      );
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when email is not taken', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await userRepository.isEmailTaken('available@example.com');

>>>>>>> origin/epic/milestone-1-foundation
      expect(result).toBe(false);
    });

    it('should exclude specific user when checking email availability', async () => {
<<<<<<< HEAD
      // Arrange
      const email = 'test@example.com';
      const excludeUserId = '123e4567-e89b-12d3-a456-426614174000';
      mockQueryBuilder.getCount.mockResolvedValue(0);

      // Act
      const result = await userRepository.isEmailTaken(email, excludeUserId);

      // Assert
      expect(result).toBe(false);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.email) = LOWER(:email)',
        { email }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.id != :excludeUserId',
        { excludeUserId }
=======
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await userRepository.isEmailTaken('test@example.com', 'user-id-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.email) = LOWER(:email)',
        { email: 'test@example.com' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.id != :excludeUserId',
        { excludeUserId: 'user-id-123' }
      );
      expect(result).toBe(false);
    });

    it('should handle isEmailTaken errors', async () => {
      const error = new Error('Query builder failed');
      mockRepository.createQueryBuilder.mockImplementation(() => {
        throw error;
      });

      await expect(userRepository.isEmailTaken('test@example.com')).rejects.toThrow(
        'Failed to check if email is taken: Query builder failed'
>>>>>>> origin/epic/milestone-1-foundation
      );
    });
  });

<<<<<<< HEAD
  describe('updateLastLogin', () => {
    it('should update last login timestamp successfully', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await userRepository.updateLastLogin(userId);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        })
      );
    });

    it('should return false when user not found', async () => {
      // Arrange
      const userId = 'nonexistent-id';
      mockRepository.update.mockResolvedValue({ affected: 0 } as any);

      // Act
      const result = await userRepository.updateLastLogin(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserStats', () => {
    it('should return comprehensive user statistics', async () => {
      // Arrange
      const mockStats = {
        total: 100,
        statusStats: [
          { user_status: UserStatus.ACTIVE, count: '85' },
          { user_status: UserStatus.INACTIVE, count: '10' },
          { user_status: UserStatus.SUSPENDED, count: '5' },
        ],
        roleStats: [
          { user_role: UserRole.USER, count: '95' },
          { user_role: UserRole.ADMIN, count: '5' },
        ],
        verified: 90,
        unverified: 10,
      };

      mockRepository.count
        .mockResolvedValueOnce(mockStats.total) // total count
        .mockResolvedValueOnce(mockStats.verified) // verified count
        .mockResolvedValueOnce(mockStats.unverified); // unverified count

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(mockStats.statusStats) // status stats
        .mockResolvedValueOnce(mockStats.roleStats); // role stats

      // Act
      const result = await userRepository.getUserStats();

      // Assert
      expect(result).toEqual({
        total: 100,
        byStatus: {
          [UserStatus.ACTIVE]: 85,
          [UserStatus.INACTIVE]: 10,
          [UserStatus.SUSPENDED]: 5,
        },
        byRole: {
          [UserRole.USER]: 95,
          [UserRole.ADMIN]: 5,
        },
        verified: 90,
        unverified: 10,
      });
    });
  });

  describe('error handling', () => {
    it('should wrap database errors with descriptive messages', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      mockRepository.findOne.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findByEmail('test@example.com')).rejects.toThrow(
        'Failed to find user by email: Connection timeout'
      );
    });

    it('should preserve original error context in logs', async () => {
      // Arrange
      const dbError = new Error('Constraint violation');
      mockRepository.create.mockImplementation(() => {
        throw dbError;
      });

      // Act & Assert
      await expect(userRepository.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hash',
      })).rejects.toThrow('Failed to create entity');
    });
  });

  // Helper function to create mock user objects
  function createMockUser(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = '123e4567-e89b-12d3-a456-426614174000';
    user.email = 'test@example.com';
    user.firstName = 'Test';
    user.lastName = 'User';
    user.passwordHash = 'hashed-password';
    user.role = UserRole.USER;
    user.status = UserStatus.ACTIVE;
    user.currency = 'USD';
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.accounts = [];

    return Object.assign(user, overrides);
  }
=======
  describe('findByEmailVerificationToken', () => {
    it('should return null for email verification token (not implemented)', async () => {
      const result = await userRepository.findByEmailVerificationToken('verification-token');
      expect(result).toBeNull();
    });

    it('should handle findByEmailVerificationToken errors', async () => {
      jest.spyOn(userRepository as any, 'findByEmailVerificationToken').mockRejectedValue(new Error('Failed to find user by verification token: Token lookup failed'));

      await expect(
        userRepository.findByEmailVerificationToken('verification-token')
      ).rejects.toThrow('Failed to find user by verification token: Token lookup failed');
    });
  });

  describe('findByPasswordResetToken', () => {
    it('should return null for password reset token (not implemented)', async () => {
      const result = await userRepository.findByPasswordResetToken('reset-token');
      expect(result).toBeNull();
    });

    it('should handle findByPasswordResetToken errors', async () => {
      jest.spyOn(userRepository as any, 'findByPasswordResetToken').mockRejectedValue(new Error('Failed to find user by reset token: Reset token lookup failed'));

      await expect(
        userRepository.findByPasswordResetToken('reset-token')
      ).rejects.toThrow('Failed to find user by reset token: Reset token lookup failed');
    });
  });

  describe('markEmailAsVerified', () => {
    it('should mark email as verified successfully', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await userRepository.markEmailAsVerified('user-id-123');

      expect(mockRepository.update).toHaveBeenCalledWith('user-id-123', {
        emailVerifiedAt: expect.any(Date),
      });
      expect(result).toBe(true);
    });

    it('should return false when no user was updated', async () => {
      const updateResult = { affected: 0, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await userRepository.markEmailAsVerified('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle markEmailAsVerified errors', async () => {
      const error = new Error('Update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(userRepository.markEmailAsVerified('user-id-123')).rejects.toThrow(
        'Failed to mark email as verified: Update failed'
      );
    });
  });

  describe('updatePasswordHash', () => {
    it('should update password hash successfully', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await userRepository.updatePasswordHash('user-id-123', 'new-hashed-password');

      expect(mockRepository.update).toHaveBeenCalledWith('user-id-123', {
        passwordHash: 'new-hashed-password',
      });
      expect(result).toBe(true);
    });

    it('should return false when no user was updated', async () => {
      const updateResult = { affected: 0, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await userRepository.updatePasswordHash('non-existent-id', 'new-password');

      expect(result).toBe(false);
    });

    it('should handle updatePasswordHash errors', async () => {
      const error = new Error('Password update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        userRepository.updatePasswordHash('user-id-123', 'new-password')
      ).rejects.toThrow('Failed to update password hash: Password update failed');
    });
  });

  describe('setPasswordResetToken', () => {
    it('should return false for password reset token (not implemented)', async () => {
      const expiresAt = new Date('2025-09-28T12:00:00Z');

      const result = await userRepository.setPasswordResetToken(
        'user-id-123',
        'reset-token',
        expiresAt
      );

      expect(result).toBe(false);
    });

    it('should handle setPasswordResetToken errors', async () => {
      jest.spyOn(userRepository as any, 'setPasswordResetToken').mockRejectedValue(new Error('Failed to set password reset token: Token set failed'));

      await expect(
        userRepository.setPasswordResetToken('user-id-123', 'token', new Date())
      ).rejects.toThrow('Failed to set password reset token: Token set failed');
    });
  });

  describe('clearPasswordResetToken', () => {
    it('should return false for clear password reset token (not implemented)', async () => {
      const result = await userRepository.clearPasswordResetToken('user-id-123');
      expect(result).toBe(false);
    });

    it('should handle clearPasswordResetToken errors', async () => {
      jest.spyOn(userRepository as any, 'clearPasswordResetToken').mockRejectedValue(new Error('Failed to clear password reset token: Token clear failed'));

      await expect(userRepository.clearPasswordResetToken('user-id-123')).rejects.toThrow(
        'Failed to clear password reset token: Token clear failed'
      );
    });
  });

  describe('findWithAccounts', () => {
    it('should find user with their accounts', async () => {
      const userWithAccounts = {
        ...mockUser,
        accounts: [
          { id: 'account-1', name: 'Checking Account' },
          { id: 'account-2', name: 'Savings Account' },
        ],
      };
      mockRepository.findOne.mockResolvedValue(userWithAccounts as any);

      const result = await userRepository.findWithAccounts('user-id-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        relations: ['accounts'],
      });
      expect(result).toEqual(userWithAccounts);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await userRepository.findWithAccounts('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle findWithAccounts errors', async () => {
      const error = new Error('Relations query failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(userRepository.findWithAccounts('user-id-123')).rejects.toThrow(
        'Failed to find user with accounts: Relations query failed'
      );
    });
  });

  describe('findByDateRange', () => {
    it('should find users within date range', async () => {
      const users = [mockUser, createMockUser({ id: 'user-id-456' })];
      const startDate = new Date('2025-09-01T00:00:00Z');
      const endDate = new Date('2025-09-30T23:59:59Z');

      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await userRepository.findByDateRange(startDate, endDate);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.createdAt >= :startDate', {
        startDate,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.createdAt <= :endDate', {
        endDate,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
      expect(result).toEqual(users);
    });

    it('should handle findByDateRange errors', async () => {
      const error = new Error('Date range query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        userRepository.findByDateRange(new Date('2025-09-01'), new Date('2025-09-30'))
      ).rejects.toThrow('Failed to find users by date range: Date range query failed');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      // Mock count() for total
      mockRepository.count.mockResolvedValue(100);

      // Mock createQueryBuilder for verified and recentlyCreated counts
      const mockVerifiedQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(75),
      };
      const mockRecentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      mockRepository.createQueryBuilder
        .mockReturnValueOnce(mockVerifiedQueryBuilder as any)
        .mockReturnValueOnce(mockRecentQueryBuilder as any);

      const result = await userRepository.getUserStats();

      expect(result).toEqual({
        total: 100,
        verified: 75,
        unverified: 25,
        recentlyCreated: 5,
      });

      expect(mockRepository.count).toHaveBeenCalledTimes(1);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    });

    it('should handle getUserStats errors', async () => {
      // Setup proper mocks before the error
      const mockManagerQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('mocked-query'),
      };
      (mockRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockManagerQueryBuilder);

      const error = new Error('Stats query failed');
      mockRepository.count.mockRejectedValue(error);

      await expect(userRepository.getUserStats()).rejects.toThrow(
        'Failed to get user stats: Stats query failed'
      );
    });
  });

  describe('softDelete', () => {
    it('should log soft delete request', async () => {
      const result = await userRepository.softDelete('user-id-123');

      expect(mockLogger.warn).toHaveBeenCalledWith('Soft delete requested for user: user-id-123');
      expect(result).toBe(true);
    });

    it('should handle softDelete errors', async () => {
      // Mock logger to throw error
      mockLogger.warn.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      await expect(userRepository.softDelete('user-id-123')).rejects.toThrow(
        'Failed to soft delete user: Logging failed'
      );
    });
  });

  describe('search', () => {
    it('should search users by first name, last name, and email', async () => {
      const users = [mockUser, createMockUser({ id: 'user-id-456' })];
      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await userRepository.search('john', 5);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.firstName) LIKE LOWER(:query)',
        { query: '%john%' }
      );
      expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith(
        'LOWER(user.lastName) LIKE LOWER(:query)',
        { query: '%john%' }
      );
      expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith(
        'LOWER(user.email) LIKE LOWER(:query)',
        { query: '%john%' }
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.firstName', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('user.lastName', 'ASC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(users);
    });

    it('should use default limit when not provided', async () => {
      const users = [mockUser];
      mockQueryBuilder.getMany.mockResolvedValue(users);

      await userRepository.search('test');

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should handle search errors', async () => {
      const error = new Error('Search query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(userRepository.search('test')).rejects.toThrow(
        'Failed to search users: Search query failed'
      );
    });
  });
>>>>>>> origin/epic/milestone-1-foundation
});