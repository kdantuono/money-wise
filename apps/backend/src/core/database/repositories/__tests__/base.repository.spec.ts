<<<<<<< HEAD
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
=======
/**
 * BaseRepository Unit Tests
 * Comprehensive test suite for BaseRepository with 95% coverage target
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { Logger } from '@nestjs/common';
import { BaseRepository } from '../impl/base.repository';

// Mock entity for testing
class TestEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

class TestRepository extends BaseRepository<TestEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, TestEntity);
  }
}

describe('BaseRepository', () => {
  let testRepository: TestRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<TestEntity>>;
  let mockLogger: jest.Mocked<Logger>;

  const mockEntity: TestEntity = {
    id: 'test-id-123',
    name: 'Test Entity',
    createdAt: new Date('2025-09-28T10:00:00Z'),
    updatedAt: new Date('2025-09-28T10:00:00Z'),
  };

  beforeEach(async () => {
    // Create mock repository with all required methods
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
      insert: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    } as any;

    // Create mock data source
>>>>>>> origin/epic/milestone-1-foundation
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

<<<<<<< HEAD
    const module: TestingModule = await Test.createTestingModule({
=======
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    } as any;

    await Test.createTestingModule({
>>>>>>> origin/epic/milestone-1-foundation
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
<<<<<<< HEAD
=======
        {
          provide: Logger,
          useValue: mockLogger,
        },
>>>>>>> origin/epic/milestone-1-foundation
      ],
    }).compile();

    testRepository = new TestRepository(mockDataSource);
<<<<<<< HEAD
=======
    // Manually inject the mock logger for testing
    (testRepository as any).logger = mockLogger;
>>>>>>> origin/epic/milestone-1-foundation
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

<<<<<<< HEAD
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
=======
  describe('constructor', () => {
    it('should initialize repository with correct entity', () => {
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TestEntity);
      expect(testRepository).toBeDefined();
>>>>>>> origin/epic/milestone-1-foundation
    });
  });

  describe('create', () => {
<<<<<<< HEAD
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
=======
    it('should create and save a new entity successfully', async () => {
      const entityData = { name: 'New Test Entity' };
      const createdEntity = { id: 'new-id', ...entityData };
      const savedEntity = { ...createdEntity, createdAt: new Date(), updatedAt: new Date() };

      mockRepository.create.mockReturnValue(createdEntity as any);
      mockRepository.save.mockResolvedValue(savedEntity as any);

      const result = await testRepository.create(entityData);

      expect(mockRepository.create).toHaveBeenCalledWith(entityData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(savedEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Created entity with ID: ${savedEntity.id}`);
    });

    it('should handle creation errors and throw descriptive error', async () => {
      const entityData = { name: 'Test Entity' };
      const error = new Error('Database connection failed');

      mockRepository.create.mockReturnValue({} as any);
      mockRepository.save.mockRejectedValue(error);

      await expect(testRepository.create(entityData)).rejects.toThrow(
        'Failed to create entity: Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create entity: Database connection failed',
        error.stack
      );
    });
  });

  describe('save', () => {
    it('should save an existing entity successfully', async () => {
      mockRepository.save.mockResolvedValue(mockEntity as any);

      const result = await testRepository.save(mockEntity);

      expect(mockRepository.save).toHaveBeenCalledWith(mockEntity);
      expect(result).toEqual(mockEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Saved entity with ID: ${mockEntity.id}`);
    });

    it('should handle save errors', async () => {
      const error = new Error('Validation failed');
      mockRepository.save.mockRejectedValue(error);

      await expect(testRepository.save(mockEntity)).rejects.toThrow(
        'Failed to save entity: Validation failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to save entity: Validation failed',
        error.stack
      );
    });
  });

  describe('findById', () => {
    it('should find entity by ID successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockEntity as any);

      const result = await testRepository.findById('test-id-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id-123' } as any,
      });
      expect(result).toEqual(mockEntity);
    });

    it('should return null when entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await testRepository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle findById errors', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(testRepository.findById('test-id')).rejects.toThrow(
        'Failed to find entity by ID: Database error'
      );
    });
  });

  describe('findOne', () => {
    it('should find one entity with FindOptionsWhere', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Test Entity' };
      mockRepository.findOne.mockResolvedValue(mockEntity as any);

      const result = await testRepository.findOne(criteria);

      expect(mockRepository.findOne).toHaveBeenCalledWith(criteria);
      expect(result).toEqual(mockEntity);
    });

    it('should find one entity with FindOneOptions', async () => {
      const options: FindOneOptions<TestEntity> = {
        where: { name: 'Test Entity' },
        relations: ['related'],
      };
      mockRepository.findOne.mockResolvedValue(mockEntity as any);

      const result = await testRepository.findOne(options);

      expect(mockRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockEntity);
    });

    it('should handle findOne errors', async () => {
      const error = new Error('Query failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(testRepository.findOne({ name: 'test' })).rejects.toThrow(
        'Failed to find entity: Query failed'
      );
    });
  });

  describe('find', () => {
    it('should find multiple entities with options', async () => {
      const entities = [mockEntity, { ...mockEntity, id: 'test-id-456' }];
      const options: FindManyOptions<TestEntity> = {
        where: { name: 'Test Entity' },
        order: { createdAt: 'DESC' },
        take: 10,
      };

      mockRepository.find.mockResolvedValue(entities as any);

      const result = await testRepository.find(options);

      expect(mockRepository.find).toHaveBeenCalledWith(options);
      expect(result).toEqual(entities);
    });

    it('should find all entities when no options provided', async () => {
      const entities = [mockEntity];
      mockRepository.find.mockResolvedValue(entities as any);

      const result = await testRepository.find();

      expect(mockRepository.find).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(entities);
    });

    it('should handle find errors', async () => {
      const error = new Error('Query execution failed');
      mockRepository.find.mockRejectedValue(error);

      await expect(testRepository.find()).rejects.toThrow(
        'Failed to find entities: Query execution failed'
      );
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated results', async () => {
      const entities = [mockEntity];
      const totalCount = 25;
      mockRepository.findAndCount.mockResolvedValue([entities as any, totalCount]);

      const result = await testRepository.findWithPagination(2, 10);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 10, // (page - 1) * limit = (2 - 1) * 10
        take: 10,
      });

      expect(result).toEqual({
        data: entities,
        total: totalCount,
        page: 2,
        limit: 10,
      });
    });

    it('should handle pagination with criteria', async () => {
      const entities = [mockEntity];
      const criteria: FindManyOptions<TestEntity> = {
        where: { name: 'Test' },
        order: { createdAt: 'DESC' },
      };

      mockRepository.findAndCount.mockResolvedValue([entities as any, 1]);

      const result = await testRepository.findWithPagination(1, 5, criteria);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        ...criteria,
        skip: 0,
        take: 5,
      });

      expect(result.data).toEqual(entities);
      expect(result.total).toBe(1);
    });

    it('should handle pagination errors', async () => {
      const error = new Error('Pagination failed');
      mockRepository.findAndCount.mockRejectedValue(error);

      await expect(testRepository.findWithPagination(1, 10)).rejects.toThrow(
        'Failed to find entities with pagination: Pagination failed'
>>>>>>> origin/epic/milestone-1-foundation
      );
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
<<<<<<< HEAD
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
=======
      const updateData = { name: 'Updated Name' };
      const updatedEntity = { ...mockEntity, ...updateData };
      const updateResult = { affected: 1, raw: {} };

      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(updatedEntity as any);

      const result = await testRepository.update('test-id-123', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('test-id-123', updateData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id-123' } as any,
      });
      expect(result).toEqual(updatedEntity);
    });

    it('should return null when entity to update not found', async () => {
      const updateResult = { affected: 1, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);
      mockRepository.findOne.mockResolvedValue(null);

      const result = await testRepository.update('non-existent-id', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(testRepository.update('test-id', { name: 'Updated' })).rejects.toThrow(
        'Failed to update entity: Update failed'
      );
    });
>>>>>>> origin/epic/milestone-1-foundation
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
<<<<<<< HEAD
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
=======
      const deleteResult = { affected: 1, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult as any);

      const result = await testRepository.delete('test-id-123');

      expect(mockRepository.delete).toHaveBeenCalledWith('test-id-123');
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Deleted entity with ID: test-id-123 - Success: true');
    });

    it('should return false when no entity was deleted', async () => {
      const deleteResult = { affected: 0, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult as any);

      const result = await testRepository.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockRepository.delete.mockRejectedValue(error);

      await expect(testRepository.delete('test-id')).rejects.toThrow(
        'Failed to delete entity: Delete failed'
      );
    });
  });

  describe('deleteBy', () => {
    it('should delete entities by criteria', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Test Entity' };
      const deleteResult = { affected: 3, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult as any);

      const result = await testRepository.deleteBy(criteria);

      expect(mockRepository.delete).toHaveBeenCalledWith(criteria);
      expect(result).toBe(3);
    });

    it('should handle deleteBy errors', async () => {
      const error = new Error('Bulk delete failed');
      mockRepository.delete.mockRejectedValue(error);

      await expect(testRepository.deleteBy({ name: 'test' })).rejects.toThrow(
        'Failed to delete entities: Bulk delete failed'
      );
    });
  });

  describe('count', () => {
    it('should count entities with criteria', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Test Entity' };
      mockRepository.count.mockResolvedValue(5);

      const result = await testRepository.count(criteria);

      expect(mockRepository.count).toHaveBeenCalledWith({ where: criteria });
      expect(result).toBe(5);
    });

    it('should count all entities when no criteria provided', async () => {
      mockRepository.count.mockResolvedValue(10);

      const result = await testRepository.count();

      expect(mockRepository.count).toHaveBeenCalledWith({});
      expect(result).toBe(10);
    });

    it('should handle count errors', async () => {
      const error = new Error('Count query failed');
      mockRepository.count.mockRejectedValue(error);

      await expect(testRepository.count()).rejects.toThrow(
        'Failed to count entities: Count query failed'
      );
    });
>>>>>>> origin/epic/milestone-1-foundation
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
<<<<<<< HEAD
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
=======
      mockRepository.count.mockResolvedValue(1);

      const result = await testRepository.exists({ name: 'Test Entity' });

      expect(result).toBe(true);
    });

    it('should return false when entity does not exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await testRepository.exists({ name: 'Non-existent' });

      expect(result).toBe(false);
    });

    it('should handle exists errors', async () => {
      const error = new Error('Exists check failed');
      mockRepository.count.mockRejectedValue(error);

      await expect(testRepository.exists({ name: 'test' })).rejects.toThrow(
        'Failed to check entity existence: Exists check failed'
      );
    });
  });

  describe('bulkInsert', () => {
    it('should perform bulk insert successfully', async () => {
      const entities = [
        { name: 'Entity 1' },
        { name: 'Entity 2' },
      ];
      const createdEntities = [
        { id: 'id-1', name: 'Entity 1' },
        { id: 'id-2', name: 'Entity 2' },
      ];
      const savedEntities = [
        { id: 'id-1', name: 'Entity 1' },
        { id: 'id-2', name: 'Entity 2' },
      ];

      mockRepository.create.mockReturnValue(createdEntities as any);
      mockRepository.save.mockResolvedValue(savedEntities as any);

      const result = await testRepository.bulkInsert(entities);

      expect(mockRepository.create).toHaveBeenCalledWith(entities);
      expect(mockRepository.save).toHaveBeenCalledWith(createdEntities);
      expect(result).toEqual(savedEntities);
      expect(mockLogger.debug).toHaveBeenCalledWith('Bulk inserted 2 entities');
    });

    it('should handle bulk insert errors', async () => {
      const error = new Error('Bulk insert failed');
      mockRepository.save.mockRejectedValue(error);

      await expect(testRepository.bulkInsert([{ name: 'test' }])).rejects.toThrow(
        'Failed to bulk insert entities: Bulk insert failed'
      );
    });
  });

  describe('bulkUpdate', () => {
    it('should perform bulk update successfully', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Old Name' };
      const updateData = { name: 'New Name' };
      const updateResult = { affected: 2, raw: {} };

      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await testRepository.bulkUpdate(criteria, updateData);

      expect(mockRepository.update).toHaveBeenCalledWith(criteria, updateData);
      expect(result).toBe(2);
      expect(mockLogger.debug).toHaveBeenCalledWith('Bulk updated 2 entities');
    });

    it('should handle bulk update errors', async () => {
      const error = new Error('Bulk update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        testRepository.bulkUpdate({ name: 'test' }, { name: 'updated' })
      ).rejects.toThrow('Failed to bulk update entities: Bulk update failed');
    });
  });

  describe('query', () => {
    it('should execute raw query successfully', async () => {
      const queryResult = [{ count: 5 }];
      const sql = 'SELECT COUNT(*) as count FROM test_entity';
      const parameters = [];

      mockRepository.query.mockResolvedValue(queryResult);

      const result = await testRepository.query(sql, parameters);

      expect(mockRepository.query).toHaveBeenCalledWith(sql, parameters);
      expect(result).toEqual(queryResult);
    });

    it('should execute parameterized query', async () => {
      const queryResult = [mockEntity];
      const sql = 'SELECT * FROM test_entity WHERE name = $1';
      const parameters = ['Test Entity'];

      mockRepository.query.mockResolvedValue(queryResult);

      const result = await testRepository.query(sql, parameters);

      expect(mockRepository.query).toHaveBeenCalledWith(sql, parameters);
      expect(result).toEqual(queryResult);
    });

    it('should handle query errors', async () => {
      const error = new Error('SQL syntax error');
      mockRepository.query.mockRejectedValue(error);

      await expect(testRepository.query('INVALID SQL')).rejects.toThrow(
        'Failed to execute query: SQL syntax error'
      );
    });
  });
>>>>>>> origin/epic/milestone-1-foundation
});