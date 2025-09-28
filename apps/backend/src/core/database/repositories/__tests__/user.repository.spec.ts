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
describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<User>>;
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
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
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
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email is taken', async () => {
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
      expect(result).toBe(false);
    });

    it('should exclude specific user when checking email availability', async () => {
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
      );
    });
  });

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
});