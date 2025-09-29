import { FindOptionsWhere, FindManyOptions, FindOneOptions, DeepPartial, UpdateResult, DeleteResult } from 'typeorm';

/**
 * Base repository interface defining common database operations
 * Provides type-safe CRUD operations with TypeORM integration
 */
export interface IBaseRepository<T> {
  /**
   * Find a single entity by ID
   * @param id - Entity ID
   * @param options - Additional find options
   * @returns Promise<T | null>
   */
  findById(id: string, options?: FindOneOptions<T>): Promise<T | null>;

  /**
   * Find a single entity by criteria
   * @param where - Search criteria
   * @param options - Additional find options
   * @returns Promise<T | null>
   */
  findOne(where: FindOptionsWhere<T>, options?: FindOneOptions<T>): Promise<T | null>;

  /**
   * Find multiple entities
   * @param options - Find options including where, order, pagination
   * @returns Promise<T[]>
   */
  find(options?: FindManyOptions<T>): Promise<T[]>;

  /**
   * Find entities with pagination
   * @param options - Find options
   * @returns Promise with entities and total count
   */
  findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]>;

  /**
   * Create a new entity
   * @param entityData - Entity data to create
   * @returns Promise<T>
   */
  create(entityData: DeepPartial<T>): Promise<T>;

  /**
   * Create multiple entities in bulk
   * @param entitiesData - Array of entity data
   * @returns Promise<T[]>
   */
  createBulk(entitiesData: DeepPartial<T>[]): Promise<T[]>;

  /**
   * Update an entity by ID
   * @param id - Entity ID
   * @param updateData - Data to update
   * @returns Promise<T | null>
   */
  update(id: string, updateData: DeepPartial<T>): Promise<T | null>;

  /**
   * Update entities by criteria
   * @param where - Update criteria
   * @param updateData - Data to update
   * @returns Promise<UpdateResult>
   */
  updateMany(where: FindOptionsWhere<T>, updateData: DeepPartial<T>): Promise<UpdateResult>;

  /**
   * Soft delete an entity by ID
   * @param id - Entity ID
   * @returns Promise<boolean>
   */
  softDelete(id: string): Promise<boolean>;

  /**
   * Hard delete an entity by ID
   * @param id - Entity ID
   * @returns Promise<boolean>
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete entities by criteria
   * @param where - Delete criteria
   * @returns Promise<DeleteResult>
   */
  deleteMany(where: FindOptionsWhere<T>): Promise<DeleteResult>;

  /**
   * Check if entity exists by ID
   * @param id - Entity ID
   * @returns Promise<boolean>
   */
  exists(id: string): Promise<boolean>;

  /**
   * Check if entity exists by criteria
   * @param where - Search criteria
   * @returns Promise<boolean>
   */
  existsBy(where: FindOptionsWhere<T>): Promise<boolean>;

  /**
   * Count entities
   * @param options - Count options
   * @returns Promise<number>
   */
  count(options?: FindManyOptions<T>): Promise<number>;

  /**
   * Save entity (create or update)
   * @param entity - Entity to save
   * @returns Promise<T>
   */
  save(entity: DeepPartial<T>): Promise<T>;

  /**
   * Restore soft-deleted entity
   * @param id - Entity ID
   * @returns Promise<boolean>
   */
  restore(id: string): Promise<boolean>;
}