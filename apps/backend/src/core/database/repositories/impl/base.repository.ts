import { Injectable, Logger } from '@nestjs/common';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
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
      throw new Error(`Failed to create entity: ${error.message}`);
    }
  }

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
      throw new Error(`Failed to update entity: ${error.message}`);
    }
  }

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
      throw new Error(`Failed to delete entity: ${error.message}`);
    }
  }

  async deleteMany(where: FindOptionsWhere<T>): Promise<DeleteResult> {
    try {
      this.logger.debug(`Deleting multiple entities:`, where);

      const result = await this.repository.delete(where);

      this.logger.debug(`Deleted ${result.affected} entities`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting multiple entities:`, error);
      throw new Error(`Failed to delete entities: ${error.message}`);
    }
  }

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
      throw new Error(`Failed to count entities: ${error.message}`);
    }
  }

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
}