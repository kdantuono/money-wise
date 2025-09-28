/**
 * UserRepository Unit Tests
 * Comprehensive test suite for UserRepository with 92% coverage target
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
import { UserRepository } from '../impl/user.repository';
import { User } from '../../entities';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<User>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<User>>;
  let mockLogger: jest.Mocked<Logger>;

  const mockUser: User = {
    id: 'user-id-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    emailVerified: false,
    emailVerificationToken: 'verification-token',
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date('2025-09-28T10:00:00Z'),
    updatedAt: new Date('2025-09-28T10:00:00Z'),
  } as User;

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
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

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
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email is taken', async () => {
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

      expect(result).toBe(false);
    });

    it('should exclude specific user when checking email availability', async () => {
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
      );
    });
  });

  describe('findByEmailVerificationToken', () => {
    it('should find user by email verification token', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmailVerificationToken('verification-token');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { emailVerificationToken: 'verification-token' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when token not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await userRepository.findByEmailVerificationToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should handle findByEmailVerificationToken errors', async () => {
      const error = new Error('Token lookup failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(
        userRepository.findByEmailVerificationToken('verification-token')
      ).rejects.toThrow('Failed to find user by verification token: Token lookup failed');
    });
  });

  describe('findByPasswordResetToken', () => {
    it('should find user by password reset token', async () => {
      const userWithResetToken = { ...mockUser, passwordResetToken: 'reset-token' };
      mockRepository.findOne.mockResolvedValue(userWithResetToken);

      const result = await userRepository.findByPasswordResetToken('reset-token');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { passwordResetToken: 'reset-token' },
      });
      expect(result).toEqual(userWithResetToken);
    });

    it('should return null when reset token not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await userRepository.findByPasswordResetToken('invalid-reset-token');

      expect(result).toBeNull();
    });

    it('should handle findByPasswordResetToken errors', async () => {
      const error = new Error('Reset token lookup failed');
      mockRepository.findOne.mockRejectedValue(error);

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
        emailVerified: true,
        emailVerificationToken: null,
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
    it('should set password reset token successfully', async () => {
      const updateResult = { affected: 1, raw: {} };
      const expiresAt = new Date('2025-09-28T12:00:00Z');
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await userRepository.setPasswordResetToken(
        'user-id-123',
        'reset-token',
        expiresAt
      );

      expect(mockRepository.update).toHaveBeenCalledWith('user-id-123', {
        passwordResetToken: 'reset-token',
        passwordResetExpires: expiresAt,
      });
      expect(result).toBe(true);
    });

    it('should handle setPasswordResetToken errors', async () => {
      const error = new Error('Token set failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        userRepository.setPasswordResetToken('user-id-123', 'token', new Date())
      ).rejects.toThrow('Failed to set password reset token: Token set failed');
    });
  });

  describe('clearPasswordResetToken', () => {
    it('should clear password reset token successfully', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await userRepository.clearPasswordResetToken('user-id-123');

      expect(mockRepository.update).toHaveBeenCalledWith('user-id-123', {
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      expect(result).toBe(true);
    });

    it('should handle clearPasswordResetToken errors', async () => {
      const error = new Error('Token clear failed');
      mockRepository.update.mockRejectedValue(error);

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
      const users = [mockUser, { ...mockUser, id: 'user-id-456' }];
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
      // Mock the complex query builder for recentlyCreated
      const mockManagerQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('mocked-query'),
      };

      (mockRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockManagerQueryBuilder);

      // Mock the Promise.all calls
      mockRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75) // verified
        .mockResolvedValueOnce(5); // recentlyCreated

      const result = await userRepository.getUserStats();

      expect(result).toEqual({
        total: 100,
        verified: 75,
        unverified: 25,
        recentlyCreated: 5,
      });

      expect(mockRepository.count).toHaveBeenCalledTimes(3);
      expect(mockRepository.count).toHaveBeenNthCalledWith(1);
      expect(mockRepository.count).toHaveBeenNthCalledWith(2, { where: { emailVerified: true } });
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
      const users = [mockUser, { ...mockUser, id: 'user-id-456' }];
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
});