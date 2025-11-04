/* eslint-disable no-console */
/**
 * Database Test Configuration
 * Provides isolated test database setup with TestContainers
 * Console statements are intentionally used for test infrastructure logging
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '../../../../generated/prisma';

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
 * Manages isolated PostgreSQL instances for testing with Prisma
 */
export class DatabaseTestManager {
  private static instance: DatabaseTestManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private container: any = null;
  private prismaClient: PrismaClient | null = null;
  private config: DatabaseTestConfig | null = null;

  private constructor() {}

  static getInstance(): DatabaseTestManager {
    if (!DatabaseTestManager.instance) {
      DatabaseTestManager.instance = new DatabaseTestManager();
    }
    return DatabaseTestManager.instance;
  }

  /**
   * Start test database container and initialize Prisma
   */
  async start(): Promise<PrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
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

    await this.initializePrisma();

    if (!this.prismaClient) {
      throw new Error('Failed to initialize test database Prisma client');
    }

    return this.prismaClient;
  }

  /**
   * Start PostgreSQL container
   */
  private async startContainer(): Promise<void> {
    try {
      const container = await new PostgreSqlContainer('postgres:15-alpine')
        .withDatabase('moneywise_test')
        .withUsername('test_user')
        .withPassword('test_password')
        .withExposedPorts(5432)
        .start();

      this.container = container;

      this.config = {
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: 'test_user',
        password: 'test_password',
        database: 'moneywise_test',
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
      password: process.env.DB_PASSWORD || 'password', // Match docker-compose.dev.yml default
      database: process.env.DB_NAME || 'moneywise_test',
      schema: process.env.DB_SCHEMA || 'public',
    };
  }

  /**
   * Initialize Prisma Client and apply schema
   */
  private async initializePrisma(): Promise<void> {
    if (!this.config) {
      throw new Error('Database configuration not set');
    }

    // Build DATABASE_URL for test database
    const databaseUrl = `postgresql://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}?schema=${this.config.schema}`;

    // Set DATABASE_URL for Prisma
    process.env.DATABASE_URL = databaseUrl;

    try {
      // Initialize Prisma Client
      this.prismaClient = new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
        log: process.env.NODE_ENV === 'test-debug' ? ['query', 'error', 'warn'] : ['error'],
      });

      // Connect to database
      await this.prismaClient.$connect();
      console.log('✅ Prisma client connected to test database');

      // Apply Prisma migrations
      // This applies all migrations from prisma/migrations/ directory
      console.log('📦 Applying Prisma migrations to test database...');
      console.log(`   Database URL: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`);

      try {
        const output = execSync('pnpm prisma migrate deploy', {
          cwd: join(__dirname, '../../..'),
          env: { ...process.env, DATABASE_URL: databaseUrl },
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        console.log('✅ Prisma migrations applied successfully');
        if (process.env.NODE_ENV === 'test-debug') {
          console.log('Prisma output:', output);
        }
      } catch (error) {
        console.error('❌ Failed to apply Prisma migrations:');
        console.error('Error:', error.message);
        if (error.stdout) console.error('Stdout:', error.stdout.toString());
        if (error.stderr) console.error('Stderr:', error.stderr.toString());
        throw error;
      }

      // Enable TimescaleDB extension if available (optional)
      try {
        await this.prismaClient.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS timescaledb');
        console.log('✅ TimescaleDB extension enabled');
      } catch (error) {
        console.warn('⚠️ TimescaleDB extension not available:', error.message);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Prisma test database:', error);
      throw error;
    }
  }

  /**
   * Get current Prisma Client
   */
  getPrismaClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Test database not initialized. Call start() first.');
    }
    return this.prismaClient;
  }

  /**
   * Get current DataSource (legacy compatibility - returns Prisma client)
   * @deprecated Use getPrismaClient() instead
   */
  getDataSource(): PrismaClient {
    return this.getPrismaClient();
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
   * Clean all data from database using Prisma
   */
  async clean(): Promise<void> {
    const prisma = this.getPrismaClient();
    const config = this.getConfig();

    try {
      // Get all table names from Prisma schema
      const tables: { tablename: string }[] = await prisma.$queryRawUnsafe(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = '${config.schema}'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_timescaledb_%'
        AND tablename != '_prisma_migrations'
      `);

      // Disable foreign key constraints
      await prisma.$executeRawUnsafe('SET session_replication_role = replica');

      // Truncate all tables
      for (const table of tables) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table.tablename}" RESTART IDENTITY CASCADE`);
      }

      // Re-enable foreign key constraints
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT');

      console.log(`✅ Cleaned ${tables.length} tables from test database`);
    } catch (error) {
      console.warn('Warning: Could not clean database:', error.message);
      throw error;
    }
  }

  /**
   * Stop database and cleanup
   */
  async stop(): Promise<void> {
    if (this.prismaClient) {
      try {
        await this.prismaClient.$disconnect();
      } catch (error) {
        // Ignore disconnect errors (connection may already be closed by NestJS)
        console.warn('⚠️  Prisma disconnect warning (may already be closed):', error.message);
      }
      this.prismaClient = null;
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
    const prisma = this.getPrismaClient();

    try {
      // Create hypertable for transactions by date
      await prisma.$executeRawUnsafe(`
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
 * Returns PrismaClient for test database
 */
export const setupTestDatabase = async (): Promise<PrismaClient> => {
  const manager = DatabaseTestManager.getInstance();
  const prismaClient = await manager.start();
  await manager.clean();
  return prismaClient;
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

/**
 * Get Prisma test data factory
 * Use this for integration tests to create test data
 */
export const getTestDataFactory = async () => {
  const { PrismaTestDataFactory } = await import('./factories/prisma-test-data.factory');
  const manager = DatabaseTestManager.getInstance();
  const prisma = manager.getPrismaClient();
  return new PrismaTestDataFactory(prisma);
};