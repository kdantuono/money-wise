/**
 * Base Repository Implementation for MoneyWise Application
 * Provides common CRUD operations using TypeORM
 */

import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
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
      throw new Error(`Failed to create entity: ${error.message}`);
    }
  }

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

  async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    try {
      const entity = await this.repository.findOne({
        ...options,
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

  async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    try {
      const result = await this.repository.findAndCount(options);
      this.logger.debug(`Found ${result[0].length} entities, total ${result[1]}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to find and count entities: ${error.message}`, error.stack);
      throw new Error(`Failed to find and count entities: ${error.message}`);
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
      throw new Error(`Failed to update entity: ${error.message}`);
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.softDelete(id);
      const deleted = !!(result.affected && result.affected > 0);
      this.logger.debug(`Soft deleted entity with ID: ${id} - Success: ${deleted}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to soft delete entity with ID ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to soft delete entity: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      const deleted = !!(result.affected && result.affected > 0);
      this.logger.debug(`Deleted entity with ID: ${id} - Success: ${deleted}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete entity with ID ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to delete entity: ${error.message}`);
    }
  }

  async deleteMany(where: FindOptionsWhere<T>) {
    try {
      const result = await this.repository.delete(where);
      this.logger.debug(`Deleted ${result.affected || 0} entities`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete many entities: ${error.message}`, error.stack);
      throw new Error(`Failed to delete many entities: ${error.message}`);
    }
  }

  async deleteBy(criteria: FindOptionsWhere<T>): Promise<number> {
    try {
      const result = await this.repository.delete(criteria);
      const deletedCount = result.affected || 0;
      this.logger.debug(`Deleted ${deletedCount} entities`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete entities: ${error.message}`, error.stack);
      throw new Error(`Failed to delete entities: ${error.message}`);
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      const result = await this.repository.restore(id);
      const restored = !!(result.affected && result.affected > 0);
      this.logger.debug(`Restored entity with ID: ${id} - Success: ${restored}`);
      return restored;
    } catch (error) {
      this.logger.error(`Failed to restore entity with ID ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to restore entity: ${error.message}`);
    }
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    try {
      const count = await this.repository.count(options);
      return count;
    } catch (error) {
      this.logger.error(`Failed to count entities: ${error.message}`, error.stack);
      throw new Error(`Failed to count entities: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { id } as any });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check entity existence: ${error.message}`, error.stack);
      throw new Error(`Failed to check entity existence: ${error.message}`);
    }
  }

  async existsBy(criteria: FindOptionsWhere<T>): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: criteria });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check entity existence: ${error.message}`, error.stack);
      throw new Error(`Failed to check entity existence: ${error.message}`);
    }
  }

  async createBulk(entitiesData: Partial<T>[]): Promise<T[]> {
    try {
      const createdEntities = this.repository.create(entitiesData as any[]);
      const savedEntities = await this.repository.save(createdEntities);
      this.logger.debug(`Bulk created ${savedEntities.length} entities`);
      return savedEntities;
    } catch (error) {
      this.logger.error(`Failed to bulk create entities: ${error.message}`, error.stack);
      throw new Error(`Failed to bulk create entities: ${error.message}`);
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

  async updateMany(where: FindOptionsWhere<T>, updateData: Partial<T>) {
    try {
      const result = await this.repository.update(where, updateData as any);
      this.logger.debug(`Updated ${result.affected || 0} entities`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update many entities: ${error.message}`, error.stack);
      throw new Error(`Failed to update many entities: ${error.message}`);
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

  /**
   * Create a query builder for advanced queries
   */
  protected createQueryBuilder(alias?: string) {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * Get the entity manager for transactions
   */
  protected get manager() {
    return this.repository.manager;
  }
}