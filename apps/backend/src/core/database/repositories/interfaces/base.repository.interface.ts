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
  findById(id: string): Promise<T | null>;

  /**
   * Find entity by criteria
   */
  findOne(criteria: FindOptionsWhere<T> | FindOneOptions<T>): Promise<T | null>;

  /**
   * Find multiple entities by criteria
   */
  find(criteria?: FindManyOptions<T>): Promise<T[]>;

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
   * Delete entity by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete entities by criteria
   */
  deleteBy(criteria: FindOptionsWhere<T>): Promise<number>;

  /**
   * Count entities by criteria
   */
  count(criteria?: FindOptionsWhere<T>): Promise<number>;

  /**
   * Check if entity exists by criteria
   */
  exists(criteria: FindOptionsWhere<T>): Promise<boolean>;

  /**
   * Execute bulk operations
   */
  bulkInsert(entities: Partial<T>[]): Promise<T[]>;
  bulkUpdate(criteria: FindOptionsWhere<T>, updateData: Partial<T>): Promise<number>;

  /**
   * Execute raw query (use with caution)
   */
  query(sql: string, parameters?: any[]): Promise<any>;
}