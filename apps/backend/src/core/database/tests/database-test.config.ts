/**
 * Database Test Configuration
 * Provides isolated test database setup with TestContainers
 */

import { DataSource } from 'typeorm';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { entities } from '../entities';

export interface DatabaseTestConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema: string;
}

/**
 * Database Test Manager
 * Manages isolated PostgreSQL instances for testing
 */
export class DatabaseTestManager {
  private static instance: DatabaseTestManager;
  private container: PostgreSqlContainer | null = null;
  private dataSource: DataSource | null = null;
  private config: DatabaseTestConfig | null = null;

  private constructor() {}

  static getInstance(): DatabaseTestManager {
    if (!DatabaseTestManager.instance) {
      DatabaseTestManager.instance = new DatabaseTestManager();
    }
    return DatabaseTestManager.instance;
  }

  /**
   * Start test database container and create DataSource
   */
  async start(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource;
    }

    // Determine if we should use TestContainers or local PostgreSQL
    const useTestContainers = process.env.USE_TEST_CONTAINERS !== 'false';

    if (useTestContainers && !process.env.CI) {
      console.log('🐳 Starting PostgreSQL test container...');
      await this.startContainer();
    } else {
      console.log('📦 Using local PostgreSQL for tests...');
      this.setupLocalConfig();
    }

    await this.initializeDataSource();
    return this.dataSource!;
  }

  /**
   * Start PostgreSQL container
   */
  private async startContainer(): Promise<void> {
    try {
      this.container = new PostgreSqlContainer('postgres:15-alpine')
        .withDatabase('moneywise_test')
        .withUsername('test_user')
        .withPassword('test_password')
        .withExposedPorts(5432);

      await this.container.start();

      this.config = {
        host: this.container.getHost(),
        port: this.container.getMappedPort(5432),
        username: this.container.getUsername(),
        password: this.container.getPassword(),
        database: this.container.getDatabase(),
        schema: 'public',
      };

      console.log(`✅ Test container started on port ${this.config.port}`);
    } catch (error) {
      console.error('❌ Failed to start test container:', error);
      throw error;
    }
  }

  /**
   * Setup local PostgreSQL configuration
   */
  private setupLocalConfig(): void {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'moneywise_test',
      schema: process.env.DB_SCHEMA || 'public',
    };
  }

  /**
   * Initialize TypeORM DataSource
   */
  private async initializeDataSource(): Promise<void> {
    if (!this.config) {
      throw new Error('Database configuration not set');
    }

    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      database: this.config.database,
      schema: this.config.schema,
      entities,
      synchronize: true,
      dropSchema: false,
      logging: process.env.NODE_ENV === 'test-debug',
      extra: {
        // Test-optimized connection settings
        max: 5,
        min: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      },
    });

    try {
      await this.dataSource.initialize();
      console.log('✅ Test database initialized');

      // Enable TimescaleDB extension if available
      try {
        await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS timescaledb');
        console.log('✅ TimescaleDB extension enabled');
      } catch (error) {
        console.warn('⚠️ TimescaleDB extension not available:', error.message);
      }
    } catch (error) {
      console.error('❌ Failed to initialize test database:', error);
      throw error;
    }
  }

  /**
   * Get current DataSource
   */
  getDataSource(): DataSource {
    if (!this.dataSource?.isInitialized) {
      throw new Error('Test database not initialized. Call start() first.');
    }
    return this.dataSource;
  }

  /**
   * Get database configuration
   */
  getConfig(): DatabaseTestConfig {
    if (!this.config) {
      throw new Error('Database configuration not available');
    }
    return this.config;
  }

  /**
   * Clean all data from database
   */
  async clean(): Promise<void> {
    const dataSource = this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Disable foreign key constraints
      await queryRunner.query('SET session_replication_role = replica');

      // Get all table names
      const tables = await queryRunner.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = $1
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_timescaledb_%'
      `, [this.config!.schema]);

      // Truncate all tables
      for (const table of tables) {
        await queryRunner.query(`TRUNCATE TABLE "${table.tablename}" RESTART IDENTITY CASCADE`);
      }

      // Re-enable foreign key constraints
      await queryRunner.query('SET session_replication_role = DEFAULT');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.warn('Warning: Could not clean database:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Stop database and cleanup
   */
  async stop(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }

    if (this.container) {
      await this.container.stop();
      this.container = null;
    }

    this.config = null;
    console.log('🛑 Test database stopped');
  }

  /**
   * Create TimescaleDB hypertable for transactions
   */
  async createHypertables(): Promise<void> {
    const dataSource = this.getDataSource();

    try {
      // Create hypertable for transactions by date
      await dataSource.query(`
        SELECT create_hypertable('transactions', 'date',
          chunk_time_interval => INTERVAL '1 month',
          if_not_exists => TRUE
        )
      `);
      console.log('✅ Transactions hypertable created');
    } catch (error) {
      console.warn('⚠️ Could not create hypertables:', error.message);
    }
  }
}

/**
 * Setup function for Jest tests
 */
export const setupTestDatabase = async (): Promise<DataSource> => {
  const manager = DatabaseTestManager.getInstance();
  const dataSource = await manager.start();
  await manager.clean();
  return dataSource;
};

/**
 * Teardown function for Jest tests
 */
export const teardownTestDatabase = async (): Promise<void> => {
  const manager = DatabaseTestManager.getInstance();
  await manager.stop();
};

/**
 * Clean database between tests
 */
export const cleanTestDatabase = async (): Promise<void> => {
  const manager = DatabaseTestManager.getInstance();
  await manager.clean();
};