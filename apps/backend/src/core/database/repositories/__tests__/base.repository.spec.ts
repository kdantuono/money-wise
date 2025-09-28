import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { BaseRepository } from '../impl/base.repository';
import { User } from '../../entities';

/**
 * Test implementation of BaseRepository for testing purposes
 */
class TestRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    super(dataSource, User, 'TestRepository');
  }
}

/**
 * Unit tests for BaseRepository
 *
 * These tests validate the common CRUD operations and error handling
 * that all repositories inherit from the base class.
 */
describe('BaseRepository', () => {
  let testRepository: TestRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
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
      createQueryBuilder: jest.fn(),
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
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    testRepository = new TestRepository(mockDataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find entity by ID successfully', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const mockUser = createMockUser({ id });
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await testRepository.findById(id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should return null when entity not found', async () => {
      // Arrange
      const id = 'nonexistent-id';
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await testRepository.findById(id);

      // Assert
      expect(result).toBeNull();
    });

    it('should pass additional options to findOne', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const options = { relations: ['accounts'] };
      mockRepository.findOne.mockResolvedValue(createMockUser({ id }));

      // Act
      await testRepository.findById(id, options);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['accounts'],
      });
    });

    it('should throw descriptive error when database fails', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const dbError = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(dbError);

      // Act & Assert
      await expect(testRepository.findById(id)).rejects.toThrow(
        'Failed to find entity by ID: Database connection failed'
      );
    });
  });

  describe('create', () => {
    it('should create entity successfully', async () => {
      // Arrange
      const entityData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const mockEntity = createMockUser();
      const savedEntity = createMockUser({ id: '123' });

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(savedEntity);

      // Act
      const result = await testRepository.create(entityData);

      // Assert
      expect(result).toEqual(savedEntity);
      expect(mockRepository.create).toHaveBeenCalledWith(entityData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockEntity);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const entityData = { email: 'invalid' };
      const error = new Error('Validation failed');
      mockRepository.create.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      await expect(testRepository.create(entityData)).rejects.toThrow(
        'Failed to create entity: Validation failed'
      );
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { firstName: 'Updated' };
      const updatedEntity = createMockUser({ id, firstName: 'Updated' });

      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue(updatedEntity);

      // Act
      const result = await testRepository.update(id, updateData);

      // Assert
      expect(result).toEqual(updatedEntity);
      expect(mockRepository.update).toHaveBeenCalledWith(id, updateData);
    });

    it('should return null when entity not found for update', async () => {
      // Arrange
      const id = 'nonexistent-id';
      const updateData = { firstName: 'Updated' };

      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await testRepository.update(id, updateData);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await testRepository.delete(id);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
    });

    it('should return false when entity not found for deletion', async () => {
      // Arrange
      const id = 'nonexistent-id';
      mockRepository.delete.mockResolvedValue({ affected: 0 } as any);

      // Act
      const result = await testRepository.delete(id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockRepository.count.mockResolvedValue(1);

      // Act
      const result = await testRepository.exists(id);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should return false when entity does not exist', async () => {
      // Arrange
      const id = 'nonexistent-id';
      mockRepository.count.mockResolvedValue(0);

      // Act
      const result = await testRepository.exists(id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findAndCount', () => {
    it('should return entities and count', async () => {
      // Arrange
      const mockUsers = [createMockUser(), createMockUser()];
      const totalCount = 10;
      mockRepository.findAndCount.mockResolvedValue([mockUsers, totalCount]);

      // Act
      const [entities, count] = await testRepository.findAndCount({
        take: 2,
        skip: 0,
      });

      // Assert
      expect(entities).toEqual(mockUsers);
      expect(count).toBe(totalCount);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        take: 2,
        skip: 0,
      });
    });
  });

  describe('createBulk', () => {
    it('should create multiple entities', async () => {
      // Arrange
      const entitiesData = [
        { email: 'user1@example.com', firstName: 'User1', lastName: 'Test' },
        { email: 'user2@example.com', firstName: 'User2', lastName: 'Test' },
      ];
      const mockEntities = entitiesData.map((data, index) =>
        createMockUser({ id: `id-${index}`, ...data })
      );

      mockRepository.create.mockReturnValue(mockEntities as any);
      mockRepository.save.mockResolvedValue(mockEntities as any);

      // Act
      const result = await testRepository.createBulk(entitiesData);

      // Assert
      expect(result).toEqual(mockEntities);
      expect(mockRepository.create).toHaveBeenCalledWith(entitiesData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockEntities);
    });
  });

  describe('error handling and logging', () => {
    it('should log debug information for successful operations', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const mockUser = createMockUser({ id });
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Mock logger to verify debug calls
      const loggerSpy = jest.spyOn((testRepository as any).logger, 'debug');

      // Act
      await testRepository.findById(id);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(`Finding entity by ID: ${id}`);
      expect(loggerSpy).toHaveBeenCalledWith(`Found entity by ID ${id}: success`);
    });

    it('should log errors with context', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const dbError = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(dbError);

      // Mock logger to verify error calls
      const loggerSpy = jest.spyOn((testRepository as any).logger, 'error');

      // Act & Assert
      await expect(testRepository.findById(id)).rejects.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(`Error finding entity by ID ${id}:`, dbError);
    });

    it('should provide meaningful error messages', async () => {
      // Arrange
      const operations = [
        { method: 'findById', args: ['test-id'], error: 'Failed to find entity by ID' },
        { method: 'create', args: [{}], error: 'Failed to create entity' },
        { method: 'update', args: ['test-id', {}], error: 'Failed to update entity' },
        { method: 'delete', args: ['test-id'], error: 'Failed to delete entity' },
      ];

      // Act & Assert
      for (const operation of operations) {
        const dbError = new Error('Database error');
        (mockRepository as any)[operation.method.replace(/([A-Z])/g, '_$1').toLowerCase()] = jest.fn().mockRejectedValue(dbError);

        await expect((testRepository as any)[operation.method](...operation.args)).rejects.toThrow(
          expect.stringContaining(operation.error)
        );
      }
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
    user.role = 'user' as any;
    user.status = 'active' as any;
    user.currency = 'USD';
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.accounts = [];

    return Object.assign(user, overrides);
  }
});