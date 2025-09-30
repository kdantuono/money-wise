/**
 * Base Repository Interface for MoneyWise Application
 * Provides common CRUD operations for all entities
 */

import { FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm';

export interface IBaseRepository<T> {
  /**
   * Create a new entity
   */
  create(entityData: Partial<T>): Promise<T>;

  /**
   * Save an entity
   */
  save(entity: T): Promise<T>;

  /**
   * Find entity by ID
   */
  findById(id: string, options?: FindOneOptions<T>): Promise<T | null>;

  /**
   * Find entity by criteria
   */
  findOne(criteria: FindOptionsWhere<T> | FindOneOptions<T>): Promise<T | null>;

  /**
   * Find multiple entities by criteria
   */
  find(criteria?: FindManyOptions<T>): Promise<T[]>;

  /**
   * Find entities with count
   */
  findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]>;

  /**
   * Find entities with pagination
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: FindManyOptions<T>
  ): Promise<{ data: T[]; total: number; page: number; limit: number }>;

  /**
   * Update entity by ID
   */
  update(id: string, updateData: Partial<T>): Promise<T | null>;

  /**
   * Soft delete entity by ID
   */
  softDelete(id: string): Promise<boolean>;

  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete entities by criteria
   */
  deleteBy(criteria: FindOptionsWhere<T>): Promise<number>;

  /**
   * Restore soft-deleted entity
   */
  restore(id: string): Promise<boolean>;

  /**
   * Count entities
   */
  count(options?: FindManyOptions<T>): Promise<number>;

  /**
   * Check if entity exists by ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Check if entity exists by criteria
   */
  existsBy(criteria: FindOptionsWhere<T>): Promise<boolean>;

  /**
   * Execute bulk operations
   */
  createBulk(entities: Partial<T>[]): Promise<T[]>;
  bulkInsert(entities: Partial<T>[]): Promise<T[]>;
  bulkUpdate(criteria: FindOptionsWhere<T>, updateData: Partial<T>): Promise<number>;

  /**
   * Execute raw query (use with caution)
   */
  query(sql: string, parameters?: any[]): Promise<any>;
}