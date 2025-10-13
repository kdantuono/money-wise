/**
 * UserRepository Unit Tests
 * Comprehensive test suite for UserRepository with 90%+ coverage target
 * Tests all custom methods beyond BaseRepository
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, SelectQueryBuilder, UpdateResult } from 'typeorm';
import { Logger } from '@nestjs/common';
import { UserRepository } from '@/core/database/repositories/impl/user.repository';
import { User, UserRole, UserStatus } from '../../generated/prisma';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<User>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<User>>;
  let mockLogger: jest.Mocked<Logger>;

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: '$2b$10$hashedpassword',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      currency: 'USD',
      emailVerifiedAt: new Date('2025-09-01T00:00:00Z'),
      lastLoginAt: new Date('2025-09-28T10:00:00Z'),
      createdAt: new Date('2025-08-01T00:00:00Z'),
      updatedAt: new Date('2025-09-28T10:00:00Z'),
      accounts: [],
      get fullName() {
        return `${this.firstName} ${this.lastName}`;
      },
      get isEmailVerified() {
        return this.emailVerifiedAt !== null;
      },
      get isActive() {
        return this.status === UserStatus.ACTIVE;
      },
      ...overrides,
    }) as User;

  const mockUser = createMockUser();

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getCount: jest.fn(),
      getRawOne: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<User>>;

    // Create mock repository
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as jest.Mocked<Repository<User>>;

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

    userRepository = new UserRepository(mockDataSource);
    // Manually inject the mock logger
    (userRepository as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find user by email (case-insensitive)', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should convert email to lowercase before querying', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await userRepository.findByEmail('MixedCase@Example.COM');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'mixedcase@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await userRepository.findByEmail('notfound@example.com');

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
        expect.any(String)
      );
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email is taken', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await userRepository.isEmailTaken('taken@example.com');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.email) = LOWER(:email)',
        { email: 'taken@example.com' }
      );
      expect(result).toBe(true);
    });

    it('should return false when email is not taken', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await userRepository.isEmailTaken('available@example.com');

      expect(result).toBe(false);
    });

    it('should exclude specific user when checking email availability', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await userRepository.isEmailTaken('test@example.com', 'user-id-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.email) = LOWER(:email)',
        { email: 'test@example.com' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.id != :excludeUserId', {
        excludeUserId: 'user-id-123',
      });
      expect(result).toBe(false);
    });

    it('should return true when email exists for different user', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await userRepository.isEmailTaken('test@example.com', 'different-user-id');

      expect(result).toBe(true);
    });

    it('should handle isEmailTaken errors', async () => {
      const error = new Error('Query failed');
      mockQueryBuilder.getCount.mockRejectedValue(error);

      await expect(userRepository.isEmailTaken('test@example.com')).rejects.toThrow(
        'Failed to check if email is taken: Query failed'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findByEmailVerificationToken', () => {
    it('should return null and log warning (not implemented)', async () => {
      const result = await userRepository.findByEmailVerificationToken('verification-token-123');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'emailVerificationToken not implemented in current User entity'
      );
    });

    it('should handle errors in findByEmailVerificationToken', async () => {
      // Force an error by making logger.warn throw
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect(
        userRepository.findByEmailVerificationToken('token')
      ).rejects.toThrow('Failed to find user by verification token: Logger error');
    });
  });

  describe('findByPasswordResetToken', () => {
    it('should return null and log warning (not implemented)', async () => {
      const result = await userRepository.findByPasswordResetToken('reset-token-123');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'passwordResetToken not implemented in current User entity'
      );
    });

    it('should handle errors in findByPasswordResetToken', async () => {
      // Force an error by making logger.warn throw
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect(
        userRepository.findByPasswordResetToken('token')
      ).rejects.toThrow('Failed to find user by reset token: Logger error');
    });
  });

  describe('markEmailAsVerified', () => {
    it('should mark email as verified successfully', async () => {
      const updateResult: UpdateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await userRepository.markEmailAsVerified('user-id-123');

      expect(mockRepository.update).toHaveBeenCalledWith('user-id-123', {
        emailVerifiedAt: expect.any(Date),
      });
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      const updateResult: UpdateResult = {
        affected: 0,
        raw: {},
        generatedMaps: [],
      };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await userRepository.markEmailAsVerified('non-existent-id');

      expect(result).toBe(false);
    });

    it('should return false when affected is undefined', async () => {
      const updateResult: UpdateResult = {
        affected: undefined,
        raw: {},
        generatedMaps: [],
      };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await userRepository.markEmailAsVerified('user-id-123');

      expect(result).toBe(false);
    });

    it('should handle markEmailAsVerified errors', async () => {
      const error = new Error('Update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(userRepository.markEmailAsVerified('user-id-123')).rejects.toThrow(
        'Failed to mark email as verified: Update failed'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updatePasswordHash', () => {
    it('should update password hash successfully', async () => {
      const updateResult: UpdateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
      mockRepository.update.mockResolvedValue(updateResult);
      const newHash = '$2b$10$newhashvalue';

      const result = await userRepository.updatePasswordHash('user-id-123', newHash);

      expect(mockRepository.update).toHaveBeenCalledWith('user-id-123', {
        passwordHash: newHash,
      });
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      const updateResult: UpdateResult = {
        affected: 0,
        raw: {},
        generatedMaps: [],
      };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await userRepository.updatePasswordHash(
        'non-existent-id',
        '$2b$10$newhash'
      );

      expect(result).toBe(false);
    });

    it('should handle updatePasswordHash errors', async () => {
      const error = new Error('Password update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        userRepository.updatePasswordHash('user-id-123', '$2b$10$newhash')
      ).rejects.toThrow('Failed to update password hash: Password update failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('setPasswordResetToken', () => {
    it('should return false and log warning (not implemented)', async () => {
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      const result = await userRepository.setPasswordResetToken(
        'user-id-123',
        'reset-token',
        expiresAt
      );

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Password reset tokens not implemented in current User entity'
      );
    });

    it('should handle errors in setPasswordResetToken', async () => {
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect(
        userRepository.setPasswordResetToken('user-id-123', 'token', new Date())
      ).rejects.toThrow('Failed to set password reset token: Logger error');
    });
  });

  describe('clearPasswordResetToken', () => {
    it('should return false and log warning (not implemented)', async () => {
      const result = await userRepository.clearPasswordResetToken('user-id-123');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Password reset tokens not implemented in current User entity'
      );
    });

    it('should handle errors in clearPasswordResetToken', async () => {
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect(
        userRepository.clearPasswordResetToken('user-id-123')
      ).rejects.toThrow('Failed to clear password reset token: Logger error');
    });
  });

  describe('findWithAccounts', () => {
    it('should find user with accounts successfully', async () => {
      const userWithAccounts = createMockUser({
        accounts: [
          { id: 'account-1', name: 'Checking' },
          { id: 'account-2', name: 'Savings' },
        ] as any,
      });
      mockRepository.findOne.mockResolvedValue(userWithAccounts);

      const result = await userRepository.findWithAccounts('user-id-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        relations: ['accounts'],
      });
      expect(result).toEqual(userWithAccounts);
      expect(result?.accounts).toHaveLength(2);
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
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findByDateRange', () => {
    it('should find users within date range', async () => {
      const startDate = new Date('2025-08-01T00:00:00Z');
      const endDate = new Date('2025-09-01T00:00:00Z');
      const users = [
        createMockUser({ createdAt: new Date('2025-08-15T00:00:00Z') }),
        createMockUser({ createdAt: new Date('2025-08-20T00:00:00Z') }),
      ];
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

    it('should return empty array when no users found in range', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await userRepository.findByDateRange(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      expect(result).toEqual([]);
    });

    it('should handle findByDateRange errors', async () => {
      const error = new Error('Date range query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        userRepository.findByDateRange(new Date(), new Date())
      ).rejects.toThrow('Failed to find users by date range: Date range query failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserStats', () => {
    it('should return comprehensive user statistics', async () => {
      mockRepository.count.mockResolvedValue(100);
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(75) // verified count
        .mockResolvedValueOnce(15); // recently created count

      const result = await userRepository.getUserStats();

      expect(mockRepository.count).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.emailVerifiedAt IS NOT NULL');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.createdAt >= :date',
        expect.objectContaining({ date: expect.any(Date) })
      );
      expect(result).toEqual({
        total: 100,
        verified: 75,
        unverified: 25,
        recentlyCreated: 15,
      });
    });

    it('should calculate stats with zero users', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await userRepository.getUserStats();

      expect(result).toEqual({
        total: 0,
        verified: 0,
        unverified: 0,
        recentlyCreated: 0,
      });
    });

    it('should calculate stats with all verified users', async () => {
      mockRepository.count.mockResolvedValue(50);
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(50) // all verified
        .mockResolvedValueOnce(10);

      const result = await userRepository.getUserStats();

      expect(result.unverified).toBe(0);
      expect(result.verified).toBe(50);
    });

    it('should use 7-day window for recently created', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      mockRepository.count.mockResolvedValue(100);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await userRepository.getUserStats();

      const callArgs = mockQueryBuilder.where.mock.calls.find(
        (call) => call[0] === 'user.createdAt >= :date'
      );
      expect(callArgs).toBeDefined();
      const dateArg = callArgs?.[1]?.date;
      expect(dateArg).toBeDefined();
      // Check date is approximately 7 days ago (within 1 second tolerance)
      expect(Math.abs(dateArg.getTime() - sevenDaysAgo.getTime())).toBeLessThan(1000);
    });

    it('should handle getUserStats errors', async () => {
      const error = new Error('Stats query failed');
      mockRepository.count.mockRejectedValue(error);

      await expect(userRepository.getUserStats()).rejects.toThrow(
        'Failed to get user stats: Stats query failed'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should log soft delete and return true', async () => {
      const result = await userRepository.softDelete('user-id-123');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Soft delete requested for user: user-id-123'
      );
      expect(result).toBe(true);
    });

    it('should handle softDelete errors', async () => {
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect(userRepository.softDelete('user-id-123')).rejects.toThrow(
        'Failed to soft delete user: Logger error'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search users by firstName', async () => {
      const users = [createMockUser({ firstName: 'John' })];
      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await userRepository.search('john');

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
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(users);
    });

    it('should search users by lastName', async () => {
      const users = [createMockUser({ lastName: 'Smith' })];
      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await userRepository.search('smith');

      expect(result).toEqual(users);
    });

    it('should search users by email', async () => {
      const users = [createMockUser({ email: 'test@example.com' })];
      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await userRepository.search('example.com');

      expect(result).toEqual(users);
    });

    it('should apply custom limit', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await userRepository.search('query', 50);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should use default limit of 10', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await userRepository.search('query');

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no matches found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await userRepository.search('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle partial matches', async () => {
      const users = [
        createMockUser({ firstName: 'Jonathan', lastName: 'Smith' }),
        createMockUser({ firstName: 'Johnny', lastName: 'Doe' }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await userRepository.search('jon');

      expect(result).toHaveLength(2);
    });

    it('should handle search errors', async () => {
      const error = new Error('Search query failed');
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(userRepository.search('query')).rejects.toThrow(
        'Failed to search users: Search query failed'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle special characters in search query', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await userRepository.search("john's email");

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.firstName) LIKE LOWER(:query)',
        { query: "%john's email%" }
      );
    });

    it('should be case-insensitive', async () => {
      const users = [createMockUser()];
      mockQueryBuilder.getMany.mockResolvedValue(users);

      await userRepository.search('JOHN');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.firstName) LIKE LOWER(:query)',
        { query: '%JOHN%' }
      );
    });
  });
});
