/**
 * Database Testing Utilities
 *
 * Helpers for database setup, teardown, and seeding in tests
 */

import { DataSource, EntityManager } from 'typeorm';

export class TestDatabase {
  private static instance: TestDatabase;
  private dataSource: DataSource | null = null;
  private transactionManager: EntityManager | null = null;

  private constructor() {}

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  /**
   * Initialize test database connection
   */
  async connect(dataSource: DataSource): Promise<void> {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    this.dataSource = dataSource;
  }

  /**
   * Clean all tables
   */
  async cleanAll(): Promise<void> {
    if (!this.dataSource) {
      throw new Error('Database not connected');
    }

    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities
      .map(e => `"${e.tableName}"`)
      .join(', ');

    if (tableNames) {
      await this.dataSource.query(`TRUNCATE ${tableNames} CASCADE`);
    }
  }

  /**
   * Clean specific tables
   */
  async cleanTables(tableNames: string[]): Promise<void> {
    if (!this.dataSource) {
      throw new Error('Database not connected');
    }

    const quotedNames = tableNames.map(name => `"${name}"`).join(', ');
    await this.dataSource.query(`TRUNCATE ${quotedNames} CASCADE`);
  }

  /**
   * Start a transaction
   */
  async beginTransaction(): Promise<void> {
    if (!this.dataSource) {
      throw new Error('Database not connected');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    this.transactionManager = queryRunner.manager;
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(): Promise<void> {
    if (this.transactionManager) {
      const queryRunner = this.transactionManager.queryRunner;
      await queryRunner?.rollbackTransaction();
      await queryRunner?.release();
      this.transactionManager = null;
    }
  }

  /**
   * Get entity manager (uses transaction if active)
   */
  getManager(): EntityManager {
    return this.transactionManager || this.dataSource!.manager;
  }

  /**
   * Seed database with data
   */
  async seed<T>(Entity: any, data: Partial<T>[]): Promise<T[]> {
    const manager = this.getManager();
    const repository = manager.getRepository(Entity);
    const entities = repository.create(data as any);
    return repository.save(entities);
  }

  /**
   * Count records
   */
  async count(Entity: any, where?: any): Promise<number> {
    const manager = this.getManager();
    return manager.getRepository(Entity).count({ where });
  }

  /**
   * Find records
   */
  async find<T>(Entity: any, options?: any): Promise<T[]> {
    const manager = this.getManager();
    return manager.getRepository(Entity).find(options);
  }

  /**
   * Find one record
   */
  async findOne<T>(Entity: any, options?: any): Promise<T | null> {
    const manager = this.getManager();
    return manager.getRepository(Entity).findOne(options);
  }

  /**
   * Execute raw query
   */
  async query(sql: string, parameters?: any[]): Promise<any> {
    if (!this.dataSource) {
      throw new Error('Database not connected');
    }
    return this.dataSource.query(sql, parameters);
  }

  /**
   * Disconnect database
   */
  async disconnect(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
    this.dataSource = null;
  }

  /**
   * Reset auto-increment sequences
   */
  async resetSequences(): Promise<void> {
    if (!this.dataSource) {
      throw new Error('Database not connected');
    }

    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      const tableName = entity.tableName;

      // PostgreSQL specific
      await this.dataSource.query(
        `ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1`
      ).catch(() => {
        // Ignore if sequence doesn't exist
      });
    }
  }

  /**
   * Create database snapshot
   */
  async createSnapshot(): Promise<string> {
    const timestamp = Date.now();
    const snapshotName = `snapshot_${timestamp}`;

    await this.query(`SAVEPOINT ${snapshotName}`);
    return snapshotName;
  }

  /**
   * Restore database snapshot
   */
  async restoreSnapshot(snapshotName: string): Promise<void> {
    await this.query(`ROLLBACK TO SAVEPOINT ${snapshotName}`);
  }
}

/**
 * Database test helpers
 */
export const testDb = TestDatabase.getInstance();

/**
 * Database test decorator
 */
export function DatabaseTest(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    await testDb.beginTransaction();
    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } finally {
      await testDb.rollbackTransaction();
    }
  };

  return descriptor;
}

/**
 * Wait for database condition
 */
export async function waitForDatabase(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Database condition timeout');
}

/**
 * Database connection options for tests
 */
export function getTestDatabaseConfig(overrides: any = {}) {
  return {
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    username: process.env.TEST_DB_USERNAME || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    database: process.env.TEST_DB_NAME || 'test_db',
    synchronize: true,
    dropSchema: true,
    logging: process.env.TEST_DB_LOGGING === 'true',
    ...overrides,
  };
}
