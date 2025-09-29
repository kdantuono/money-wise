<<<<<<< HEAD
import { Injectable, Logger } from '@nestjs/common';
=======
/**
 * Base Repository Implementation for MoneyWise Application
 * Provides common CRUD operations using TypeORM
 */

>>>>>>> origin/epic/milestone-1-foundation
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
<<<<<<< HEAD
  DeepPartial,
  UpdateResult,
  DeleteResult,
  EntityTarget,
  DataSource,
} from 'typeorm';
import { IBaseRepository } from '../interfaces/base-repository.interface';

/**
 * Base repository implementation providing common database operations
 * Uses TypeORM Repository pattern with error handling and logging
 */
@Injectable()
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected readonly logger: Logger;
  protected readonly repository: Repository<T>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly entityTarget: EntityTarget<T>,
    loggerContext?: string,
  ) {
    this.repository = this.dataSource.getRepository(entityTarget);
    this.logger = new Logger(loggerContext || this.constructor.name);
  }

  async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    try {
      this.logger.debug(`Finding entity by ID: ${id}`);

      const result = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
        ...options,
      });

      this.logger.debug(`Found entity by ID ${id}: ${result ? 'success' : 'not found'}`);
      return result;
    } catch (error) {
      this.logger.error(`Error finding entity by ID ${id}:`, error);
      throw new Error(`Failed to find entity by ID: ${error.message}`);
    }
  }

  async findOne(where: FindOptionsWhere<T>, options?: FindOneOptions<T>): Promise<T | null> {
    try {
      this.logger.debug(`Finding entity with criteria:`, where);

      const result = await this.repository.findOne({
        where,
        ...options,
      });

      this.logger.debug(`Found entity: ${result ? 'success' : 'not found'}`);
      return result;
    } catch (error) {
      this.logger.error(`Error finding entity:`, error);
      throw new Error(`Failed to find entity: ${error.message}`);
    }
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      this.logger.debug(`Finding entities with options:`, options);

      const results = await this.repository.find(options);

      this.logger.debug(`Found ${results.length} entities`);
      return results;
    } catch (error) {
      this.logger.error(`Error finding entities:`, error);
      throw new Error(`Failed to find entities: ${error.message}`);
    }
  }

  async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    try {
      this.logger.debug(`Finding and counting entities with options:`, options);

      const [results, count] = await this.repository.findAndCount(options);

      this.logger.debug(`Found ${results.length} entities, total count: ${count}`);
      return [results, count];
    } catch (error) {
      this.logger.error(`Error finding and counting entities:`, error);
      throw new Error(`Failed to find and count entities: ${error.message}`);
    }
  }

  async create(entityData: DeepPartial<T>): Promise<T> {
    try {
      this.logger.debug(`Creating entity:`, entityData);

      const entity = this.repository.create(entityData);
      const result = await this.repository.save(entity);

      this.logger.debug(`Created entity with ID: ${(result as any).id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating entity:`, error);
=======
  EntityTarget,
  DataSource,
} from 'typeorm';
import { Logger } from '@nestjs/common';
import { IBaseRepository } from '../interfaces/base.repository.interface';

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected readonly logger = new Logger(this.constructor.name);
  protected repository: Repository<T>;

  constructor(
    protected readonly dataSource: DataSource,
    private readonly entity: EntityTarget<T>,
  ) {
    this.repository = this.dataSource.getRepository(entity);
  }

  async create(entityData: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(entityData as any);
      const savedEntity = await this.repository.save(entity) as T;
      this.logger.debug(`Created entity with ID: ${(savedEntity as any).id}`);
      return savedEntity;
    } catch (error) {
      this.logger.error(`Failed to create entity: ${error.message}`, error.stack);
>>>>>>> origin/epic/milestone-1-foundation
      throw new Error(`Failed to create entity: ${error.message}`);
    }
  }

<<<<<<< HEAD
  async createBulk(entitiesData: DeepPartial<T>[]): Promise<T[]> {
    try {
      this.logger.debug(`Creating ${entitiesData.length} entities in bulk`);

      const entities = this.repository.create(entitiesData);
      const results = await this.repository.save(entities);

      this.logger.debug(`Created ${results.length} entities in bulk`);
      return results;
    } catch (error) {
      this.logger.error(`Error creating entities in bulk:`, error);
      throw new Error(`Failed to create entities in bulk: ${error.message}`);
    }
  }

  async update(id: string, updateData: DeepPartial<T>): Promise<T | null> {
    try {
      this.logger.debug(`Updating entity ${id}:`, updateData);

      await this.repository.update(id, updateData);
      const result = await this.findById(id);

      this.logger.debug(`Updated entity ${id}: ${result ? 'success' : 'not found'}`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating entity ${id}:`, error);
=======
  async save(entity: T): Promise<T> {
    try {
      const savedEntity = await this.repository.save(entity);
      this.logger.debug(`Saved entity with ID: ${(savedEntity as any).id}`);
      return savedEntity;
    } catch (error) {
      this.logger.error(`Failed to save entity: ${error.message}`, error.stack);
      throw new Error(`Failed to save entity: ${error.message}`);
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const entity = await this.repository.findOne({
        where: { id } as any,
      });
      return entity || null;
    } catch (error) {
      this.logger.error(`Failed to find entity by ID ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to find entity by ID: ${error.message}`);
    }
  }

  async findOne(criteria: FindOptionsWhere<T> | FindOneOptions<T>): Promise<T | null> {
    try {
      const entity = await this.repository.findOne(criteria as FindOneOptions<T>);
      return entity || null;
    } catch (error) {
      this.logger.error(`Failed to find entity: ${error.message}`, error.stack);
      throw new Error(`Failed to find entity: ${error.message}`);
    }
  }

  async find(criteria?: FindManyOptions<T>): Promise<T[]> {
    try {
      const entities = await this.repository.find(criteria);
      this.logger.debug(`Found ${entities.length} entities`);
      return entities;
    } catch (error) {
      this.logger.error(`Failed to find entities: ${error.message}`, error.stack);
      throw new Error(`Failed to find entities: ${error.message}`);
    }
  }

  async findWithPagination(
    page: number,
    limit: number,
    criteria?: FindManyOptions<T>,
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await this.repository.findAndCount({
        ...criteria,
        skip,
        take: limit,
      });

      this.logger.debug(`Found ${data.length} entities (page ${page}, total ${total})`);

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to find entities with pagination: ${error.message}`, error.stack);
      throw new Error(`Failed to find entities with pagination: ${error.message}`);
    }
  }

  async update(id: string, updateData: Partial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, updateData as any);
      const updatedEntity = await this.findById(id);
      this.logger.debug(`Updated entity with ID: ${id}`);
      return updatedEntity;
    } catch (error) {
      this.logger.error(`Failed to update entity with ID ${id}: ${error.message}`, error.stack);
>>>>>>> origin/epic/milestone-1-foundation
      throw new Error(`Failed to update entity: ${error.message}`);
    }
  }

<<<<<<< HEAD
  async updateMany(where: FindOptionsWhere<T>, updateData: DeepPartial<T>): Promise<UpdateResult> {
    try {
      this.logger.debug(`Updating multiple entities:`, { where, updateData });

      const result = await this.repository.update(where, updateData);

      this.logger.debug(`Updated ${result.affected} entities`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating multiple entities:`, error);
      throw new Error(`Failed to update entities: ${error.message}`);
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Soft deleting entity: ${id}`);

      const result = await this.repository.softDelete(id);
      const success = result.affected > 0;

      this.logger.debug(`Soft deleted entity ${id}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error soft deleting entity ${id}:`, error);
      throw new Error(`Failed to soft delete entity: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting entity: ${id}`);

      const result = await this.repository.delete(id);
      const success = result.affected > 0;

      this.logger.debug(`Deleted entity ${id}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error deleting entity ${id}:`, error);
=======
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      const deleted = !!(result.affected && result.affected > 0);
      this.logger.debug(`Deleted entity with ID: ${id} - Success: ${deleted}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete entity with ID ${id}: ${error.message}`, error.stack);
>>>>>>> origin/epic/milestone-1-foundation
      throw new Error(`Failed to delete entity: ${error.message}`);
    }
  }

<<<<<<< HEAD
  async deleteMany(where: FindOptionsWhere<T>): Promise<DeleteResult> {
    try {
      this.logger.debug(`Deleting multiple entities:`, where);

      const result = await this.repository.delete(where);

      this.logger.debug(`Deleted ${result.affected} entities`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting multiple entities:`, error);
=======
  async deleteBy(criteria: FindOptionsWhere<T>): Promise<number> {
    try {
      const result = await this.repository.delete(criteria);
      const deletedCount = result.affected || 0;
      this.logger.debug(`Deleted ${deletedCount} entities`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete entities: ${error.message}`, error.stack);
>>>>>>> origin/epic/milestone-1-foundation
      throw new Error(`Failed to delete entities: ${error.message}`);
    }
  }

<<<<<<< HEAD
  async exists(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if entity exists: ${id}`);

      const count = await this.repository.count({
        where: { id } as FindOptionsWhere<T>,
      });

      const exists = count > 0;
      this.logger.debug(`Entity ${id} exists: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(`Error checking if entity exists ${id}:`, error);
      throw new Error(`Failed to check entity existence: ${error.message}`);
    }
  }

  async existsBy(where: FindOptionsWhere<T>): Promise<boolean> {
    try {
      this.logger.debug(`Checking if entity exists by criteria:`, where);

      const count = await this.repository.count({ where });
      const exists = count > 0;

      this.logger.debug(`Entity exists by criteria: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(`Error checking if entity exists by criteria:`, error);
      throw new Error(`Failed to check entity existence: ${error.message}`);
    }
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    try {
      this.logger.debug(`Counting entities with options:`, options);

      const count = await this.repository.count(options);

      this.logger.debug(`Entity count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`Error counting entities:`, error);
=======
  async count(criteria?: FindOptionsWhere<T>): Promise<number> {
    try {
      const count = await this.repository.count({ where: criteria });
      return count;
    } catch (error) {
      this.logger.error(`Failed to count entities: ${error.message}`, error.stack);
>>>>>>> origin/epic/milestone-1-foundation
      throw new Error(`Failed to count entities: ${error.message}`);
    }
  }

<<<<<<< HEAD
  async save(entity: DeepPartial<T>): Promise<T> {
    try {
      this.logger.debug(`Saving entity:`, entity);

      const result = await this.repository.save(entity);

      this.logger.debug(`Saved entity with ID: ${(result as any).id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error saving entity:`, error);
      throw new Error(`Failed to save entity: ${error.message}`);
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Restoring entity: ${id}`);

      const result = await this.repository.restore(id);
      const success = result.affected > 0;

      this.logger.debug(`Restored entity ${id}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error restoring entity ${id}:`, error);
      throw new Error(`Failed to restore entity: ${error.message}`);
    }
  }

  /**
   * Protected method to get the query builder for complex queries
   */
  protected createQueryBuilder(alias?: string) {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * Protected method to get the repository manager
   */
  protected get manager() {
    return this.repository.manager;
  }
=======
  async exists(criteria: FindOptionsWhere<T>): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: criteria });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check entity existence: ${error.message}`, error.stack);
      throw new Error(`Failed to check entity existence: ${error.message}`);
    }
  }

  async bulkInsert(entities: Partial<T>[]): Promise<T[]> {
    try {
      const createdEntities = this.repository.create(entities as any[]);
      const savedEntities = await this.repository.save(createdEntities);
      this.logger.debug(`Bulk inserted ${savedEntities.length} entities`);
      return savedEntities;
    } catch (error) {
      this.logger.error(`Failed to bulk insert entities: ${error.message}`, error.stack);
      throw new Error(`Failed to bulk insert entities: ${error.message}`);
    }
  }

  async bulkUpdate(criteria: FindOptionsWhere<T>, updateData: Partial<T>): Promise<number> {
    try {
      const result = await this.repository.update(criteria, updateData as any);
      const updatedCount = result.affected || 0;
      this.logger.debug(`Bulk updated ${updatedCount} entities`);
      return updatedCount;
    } catch (error) {
      this.logger.error(`Failed to bulk update entities: ${error.message}`, error.stack);
      throw new Error(`Failed to bulk update entities: ${error.message}`);
    }
  }

  async query(sql: string, parameters?: any[]): Promise<any> {
    try {
      this.logger.warn(`Executing raw query: ${sql}`);
      const result = await this.repository.query(sql, parameters);
      return result;
    } catch (error) {
      this.logger.error(`Failed to execute query: ${error.message}`, error.stack);
      throw new Error(`Failed to execute query: ${error.message}`);
    }
  }
>>>>>>> origin/epic/milestone-1-foundation
}