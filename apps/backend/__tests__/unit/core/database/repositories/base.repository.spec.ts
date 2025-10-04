/**
 * BaseRepository Unit Tests
 * Comprehensive test suite for BaseRepository with 95% coverage target
 */

import { Test } from '@nestjs/testing';
import { DataSource, Repository, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { Logger } from '@nestjs/common';
import { BaseRepository } from '@/core/database/repositories/impl/base.repository';

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
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    testRepository = new TestRepository(mockDataSource);
    // Manually inject the mock logger for testing
    (testRepository as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize repository with correct entity', () => {
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TestEntity);
      expect(testRepository).toBeDefined();
    });
  });

  describe('create', () => {
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

    it('should return null when no entity found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await testRepository.findOne({ name: 'non-existent' });

      expect(result).toBeNull();
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
      );
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
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
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
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

    it('should return 0 when no entities match deletion criteria', async () => {
      const deleteResult = { affected: null, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult as any);

      const result = await testRepository.deleteBy({ name: 'non-existent' });

      expect(result).toBe(0);
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

      const result = await testRepository.count({ where: criteria });

      expect(mockRepository.count).toHaveBeenCalledWith({ where: criteria });
      expect(result).toBe(5);
    });

    it('should count all entities when no criteria provided', async () => {
      mockRepository.count.mockResolvedValue(10);

      const result = await testRepository.count();

      expect(mockRepository.count).toHaveBeenCalledWith(undefined);
      expect(result).toBe(10);
    });

    it('should handle count errors', async () => {
      const error = new Error('Count query failed');
      mockRepository.count.mockRejectedValue(error);

      await expect(testRepository.count()).rejects.toThrow(
        'Failed to count entities: Count query failed'
      );
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await testRepository.exists('test-entity-id');

      expect(result).toBe(true);
    });

    it('should return false when entity does not exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await testRepository.exists('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle exists errors', async () => {
      const error = new Error('Exists check failed');
      mockRepository.count.mockRejectedValue(error);

      await expect(testRepository.exists('test-id')).rejects.toThrow(
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

    it('should return 0 when no entities match update criteria', async () => {
      const updateResult = { affected: null, raw: {} };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await testRepository.bulkUpdate({ name: 'test' }, { name: 'updated' });

      expect(result).toBe(0);
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
      expect(mockLogger.warn).toHaveBeenCalledWith(`Executing raw query: ${sql}`);
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

  describe('softDelete', () => {
    beforeEach(() => {
      mockRepository.softDelete = jest.fn();
    });

    it('should soft delete entity successfully', async () => {
      const softDeleteResult = { affected: 1, raw: {}, generatedMaps: [] };
      mockRepository.softDelete.mockResolvedValue(softDeleteResult as any);

      const result = await testRepository.softDelete('test-id-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('test-id-123');
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Soft deleted entity with ID: test-id-123 - Success: true');
    });

    it('should return false when no entity was soft deleted', async () => {
      const softDeleteResult = { affected: 0, raw: {}, generatedMaps: [] };
      mockRepository.softDelete.mockResolvedValue(softDeleteResult as any);

      const result = await testRepository.softDelete('non-existent-id');

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('Soft deleted entity with ID: non-existent-id - Success: false');
    });

    it('should handle soft delete errors', async () => {
      const error = new Error('Soft delete failed');
      mockRepository.softDelete.mockRejectedValue(error);

      await expect(testRepository.softDelete('test-id')).rejects.toThrow(
        'Failed to soft delete entity: Soft delete failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to soft delete entity with ID test-id: Soft delete failed',
        error.stack
      );
    });

    it('should handle null affected count', async () => {
      const softDeleteResult = { affected: null, raw: {}, generatedMaps: [] };
      mockRepository.softDelete.mockResolvedValue(softDeleteResult as any);

      const result = await testRepository.softDelete('test-id');

      expect(result).toBe(false);
    });
  });

  describe('restore', () => {
    beforeEach(() => {
      mockRepository.restore = jest.fn();
    });

    it('should restore soft deleted entity successfully', async () => {
      const restoreResult = { affected: 1, raw: {}, generatedMaps: [] };
      mockRepository.restore.mockResolvedValue(restoreResult as any);

      const result = await testRepository.restore('test-id-123');

      expect(mockRepository.restore).toHaveBeenCalledWith('test-id-123');
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Restored entity with ID: test-id-123 - Success: true');
    });

    it('should return false when no entity was restored', async () => {
      const restoreResult = { affected: 0, raw: {}, generatedMaps: [] };
      mockRepository.restore.mockResolvedValue(restoreResult as any);

      const result = await testRepository.restore('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle restore errors', async () => {
      const error = new Error('Restore failed');
      mockRepository.restore.mockRejectedValue(error);

      await expect(testRepository.restore('test-id')).rejects.toThrow(
        'Failed to restore entity: Restore failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to restore entity with ID test-id: Restore failed',
        error.stack
      );
    });

    it('should handle undefined affected count', async () => {
      const restoreResult = { affected: undefined, raw: {}, generatedMaps: [] };
      mockRepository.restore.mockResolvedValue(restoreResult as any);

      const result = await testRepository.restore('test-id');

      expect(result).toBe(false);
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple entities by criteria', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Test Entity' };
      const deleteResult = { affected: 5, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult as any);

      const result = await testRepository.deleteMany(criteria);

      expect(mockRepository.delete).toHaveBeenCalledWith(criteria);
      expect(result.affected).toBe(5);
      expect(mockLogger.debug).toHaveBeenCalledWith('Deleted 5 entities');
    });

    it('should return 0 affected when no entities deleted', async () => {
      const deleteResult = { affected: 0, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult as any);

      const result = await testRepository.deleteMany({ name: 'non-existent' });

      expect(result.affected).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Deleted 0 entities');
    });

    it('should handle null affected count', async () => {
      const deleteResult = { affected: null, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult as any);

      const result = await testRepository.deleteMany({ name: 'test' });

      expect(mockLogger.debug).toHaveBeenCalledWith('Deleted 0 entities');
    });

    it('should handle deleteMany errors', async () => {
      const error = new Error('Bulk delete failed');
      mockRepository.delete.mockRejectedValue(error);

      await expect(testRepository.deleteMany({ name: 'test' })).rejects.toThrow(
        'Failed to delete many entities: Bulk delete failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete many entities: Bulk delete failed',
        error.stack
      );
    });
  });

  describe('findAndCount', () => {
    it('should find entities with total count', async () => {
      const entities = [mockEntity, { ...mockEntity, id: 'test-id-456' }];
      const totalCount = 25;
      const options: FindManyOptions<TestEntity> = {
        where: { name: 'Test Entity' },
        take: 10,
      };

      mockRepository.findAndCount.mockResolvedValue([entities as any, totalCount]);

      const [data, count] = await testRepository.findAndCount(options);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(options);
      expect(data).toEqual(entities);
      expect(count).toBe(25);
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 2 entities, total 25');
    });

    it('should find and count all entities without options', async () => {
      const entities = [mockEntity];
      mockRepository.findAndCount.mockResolvedValue([entities as any, 1]);

      const [data, count] = await testRepository.findAndCount();

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(undefined);
      expect(data).toEqual(entities);
      expect(count).toBe(1);
    });

    it('should handle empty result set', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const [data, count] = await testRepository.findAndCount();

      expect(data).toEqual([]);
      expect(count).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 0 entities, total 0');
    });

    it('should handle findAndCount errors', async () => {
      const error = new Error('Query failed');
      mockRepository.findAndCount.mockRejectedValue(error);

      await expect(testRepository.findAndCount()).rejects.toThrow(
        'Failed to find and count entities: Query failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to find and count entities: Query failed',
        error.stack
      );
    });
  });

  describe('createBulk', () => {
    it('should create multiple entities successfully', async () => {
      const entitiesData = [
        { name: 'Entity 1' },
        { name: 'Entity 2' },
        { name: 'Entity 3' },
      ];
      const createdEntities = [
        { id: 'id-1', name: 'Entity 1' },
        { id: 'id-2', name: 'Entity 2' },
        { id: 'id-3', name: 'Entity 3' },
      ];

      mockRepository.create.mockReturnValue(createdEntities as any);
      mockRepository.save.mockResolvedValue(createdEntities as any);

      const result = await testRepository.createBulk(entitiesData);

      expect(mockRepository.create).toHaveBeenCalledWith(entitiesData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdEntities);
      expect(result).toEqual(createdEntities);
      expect(mockLogger.debug).toHaveBeenCalledWith('Bulk created 3 entities');
    });

    it('should handle empty array', async () => {
      mockRepository.create.mockReturnValue([] as any);
      mockRepository.save.mockResolvedValue([] as any);

      const result = await testRepository.createBulk([]);

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith('Bulk created 0 entities');
    });

    it('should handle createBulk errors', async () => {
      const error = new Error('Bulk creation failed');
      mockRepository.create.mockReturnValue([] as any);
      mockRepository.save.mockRejectedValue(error);

      await expect(testRepository.createBulk([{ name: 'test' }])).rejects.toThrow(
        'Failed to bulk create entities: Bulk creation failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to bulk create entities: Bulk creation failed',
        error.stack
      );
    });
  });

  describe('updateMany', () => {
    it('should update multiple entities successfully', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Old Name' };
      const updateData = { name: 'New Name' };
      const updateResult = { affected: 3, raw: {}, generatedMaps: [] };

      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await testRepository.updateMany(criteria, updateData);

      expect(mockRepository.update).toHaveBeenCalledWith(criteria, updateData);
      expect(result.affected).toBe(3);
      expect(mockLogger.debug).toHaveBeenCalledWith('Updated 3 entities');
    });

    it('should handle zero updates', async () => {
      const updateResult = { affected: 0, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await testRepository.updateMany({ name: 'test' }, { name: 'updated' });

      expect(result.affected).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Updated 0 entities');
    });

    it('should handle null affected count', async () => {
      const updateResult = { affected: null, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult as any);

      const result = await testRepository.updateMany({ name: 'test' }, { name: 'updated' });

      expect(mockLogger.debug).toHaveBeenCalledWith('Updated 0 entities');
    });

    it('should handle updateMany errors', async () => {
      const error = new Error('Bulk update failed');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        testRepository.updateMany({ name: 'test' }, { name: 'updated' })
      ).rejects.toThrow('Failed to update many entities: Bulk update failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update many entities: Bulk update failed',
        error.stack
      );
    });
  });

  describe('existsBy', () => {
    it('should return true when entity exists by criteria', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Test Entity' };
      mockRepository.count.mockResolvedValue(1);

      const result = await testRepository.existsBy(criteria);

      expect(mockRepository.count).toHaveBeenCalledWith({ where: criteria });
      expect(result).toBe(true);
    });

    it('should return false when entity does not exist', async () => {
      const criteria: FindOptionsWhere<TestEntity> = { name: 'Non Existent' };
      mockRepository.count.mockResolvedValue(0);

      const result = await testRepository.existsBy(criteria);

      expect(result).toBe(false);
    });

    it('should return true when multiple entities match criteria', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await testRepository.existsBy({ name: 'Test' });

      expect(result).toBe(true);
    });

    it('should handle existsBy errors', async () => {
      const error = new Error('Count failed');
      mockRepository.count.mockRejectedValue(error);

      await expect(testRepository.existsBy({ name: 'test' })).rejects.toThrow(
        'Failed to check entity existence: Count failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to check entity existence: Count failed',
        error.stack
      );
    });
  });

  describe('protected methods', () => {
    describe('createQueryBuilder', () => {
      it('should create query builder with alias', () => {
        const mockQueryBuilder = { select: jest.fn(), where: jest.fn() };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = (testRepository as any).createQueryBuilder('testAlias');

        expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('testAlias');
        expect(result).toEqual(mockQueryBuilder);
      });

      it('should create query builder without alias', () => {
        const mockQueryBuilder = { select: jest.fn(), where: jest.fn() };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = (testRepository as any).createQueryBuilder();

        expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(undefined);
        expect(result).toEqual(mockQueryBuilder);
      });
    });

    describe('manager', () => {
      it('should access entity manager from repository', () => {
        const manager = (testRepository as any).manager;

        expect(manager).toBeDefined();
        expect(manager).toBe(mockRepository.manager);
      });
    });
  });

  describe('edge cases', () => {
    describe('findById with options', () => {
      it('should apply FindOneOptions when finding by ID', async () => {
        const options: FindOneOptions<TestEntity> = {
          relations: ['related'],
          select: ['id', 'name'],
        };
        mockRepository.findOne.mockResolvedValue(mockEntity as any);

        await testRepository.findById('test-id-123', options);

        expect(mockRepository.findOne).toHaveBeenCalledWith({
          ...options,
          where: { id: 'test-id-123' },
        });
      });
    });

    describe('delete with undefined affected', () => {
      it('should handle undefined affected count in delete', async () => {
        const deleteResult = { affected: undefined, raw: {} };
        mockRepository.delete.mockResolvedValue(deleteResult as any);

        const result = await testRepository.delete('test-id');

        expect(result).toBe(false);
      });
    });

    describe('update partial data', () => {
      it('should handle partial entity updates', async () => {
        const partialUpdate = { name: 'Only Name Updated' };
        const updateResult = { affected: 1, raw: {} };
        mockRepository.update.mockResolvedValue(updateResult as any);
        mockRepository.findOne.mockResolvedValue({ ...mockEntity, ...partialUpdate } as any);

        const result = await testRepository.update('test-id-123', partialUpdate);

        expect(result?.name).toBe('Only Name Updated');
      });
    });

    describe('findWithPagination edge cases', () => {
      it('should handle first page pagination', async () => {
        const entities = [mockEntity];
        mockRepository.findAndCount.mockResolvedValue([entities as any, 100]);

        const result = await testRepository.findWithPagination(1, 10);

        expect(mockRepository.findAndCount).toHaveBeenCalledWith({
          skip: 0,
          take: 10,
        });
        expect(result.page).toBe(1);
      });

      it('should handle large page numbers', async () => {
        mockRepository.findAndCount.mockResolvedValue([[], 100]);

        const result = await testRepository.findWithPagination(100, 10);

        expect(mockRepository.findAndCount).toHaveBeenCalledWith({
          skip: 990, // (100-1) * 10
          take: 10,
        });
      });

      it('should handle very large limit values', async () => {
        const entities = Array(1000).fill(mockEntity);
        mockRepository.findAndCount.mockResolvedValue([entities as any, 1000]);

        const result = await testRepository.findWithPagination(1, 1000);

        expect(result.data.length).toBe(1000);
        expect(result.limit).toBe(1000);
      });
    });

    describe('count with complex options', () => {
      it('should handle count with where and order options', async () => {
        const options: FindManyOptions<TestEntity> = {
          where: { name: 'Test' },
          order: { createdAt: 'DESC' },
        };
        mockRepository.count.mockResolvedValue(42);

        const result = await testRepository.count(options);

        expect(mockRepository.count).toHaveBeenCalledWith(options);
        expect(result).toBe(42);
      });
    });
  });
});