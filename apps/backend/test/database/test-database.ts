/**
 * Test Database Configuration and Utilities
 * Provides isolated database setup for testing
 */

import { DataSource } from 'typeorm';

/**
 * Test database manager for isolated testing
 */
export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private dataSource: DataSource | null = null;

  private constructor() {}

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  /**
   * Initialize test database connection
   */
  async start(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource;
    }

    console.log('🚀 Initializing test database...');

    // Create DataSource for test database
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'moneywise_test',
      schema: process.env.DB_SCHEMA || 'public',
      synchronize: true, // Always true for tests
      logging: false,
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/database/migrations/**/*.ts'],
      dropSchema: false, // Don't drop schema automatically
    });

    try {
      await this.dataSource.initialize();
      console.log('✅ Test database ready');
      return this.dataSource;
    } catch (error) {
      console.error('❌ Failed to initialize test database:', error);
      throw error;
    }
  }

  /**
   * Close test database connection
   */
  async stop(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }

    console.log('🛑 Test database stopped');
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
   * Clean all data from database
   */
  async clean(): Promise<void> {
    const dataSource = this.getDataSource();
    const entities = dataSource.entityMetadatas;

    try {
      // Use CASCADE delete for PostgreSQL
      await dataSource.query('SET session_replication_role = replica;');

      // Clear all tables in reverse order to handle foreign keys
      for (const entity of entities.reverse()) {
        const tableName = entity.tableName;
        await dataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
      }

      await dataSource.query('SET session_replication_role = DEFAULT;');
    } catch (error) {
      console.warn('Warning: Could not clean database:', error.message);
      // Fallback: clear each repository individually
      for (const entity of entities) {
        try {
          const repository = dataSource.getRepository(entity.name);
          await repository.clear();
        } catch (e) {
          console.warn(`Could not clear ${entity.name}:`, e.message);
        }
      }
    }
  }

  /**
   * Seed database with test data
   */
  async seed(): Promise<void> {
    const dataSource = this.getDataSource();

    // Seed test data here
    // This would typically involve creating test users, accounts, etc.

    console.log('🌱 Database seeded with test data');
  }

  /**
   * Reset database to clean state
   */
  async reset(): Promise<void> {
    await this.clean();
    await this.seed();
  }
}

/**
 * Test database utilities for common operations
 */
export class TestDatabaseUtils {
  constructor(private dataSource: DataSource) {}

  /**
   * Create test user
   */
  async createTestUser(userData = {}) {
    const userRepository = this.dataSource.getRepository('User');

    const defaultUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: '$2a$10$hashedpassword',
      isEmailVerified: true,
      ...userData,
    };

    const user = userRepository.create(defaultUser);
    return await userRepository.save(user);
  }

  /**
   * Create test account
   */
  async createTestAccount(userId: number, accountData = {}) {
    const accountRepository = this.dataSource.getRepository('Account');

    const defaultAccount = {
      name: 'Test Account',
      type: 'checking',
      balance: 1000.00,
      currency: 'USD',
      userId,
      ...accountData,
    };

    const account = accountRepository.create(defaultAccount);
    return await accountRepository.save(account);
  }

  /**
   * Create test transaction
   */
  async createTestTransaction(accountId: number, userId: number, transactionData = {}) {
    const transactionRepository = this.dataSource.getRepository('Transaction');

    const defaultTransaction = {
      amount: 100.00,
      description: 'Test Transaction',
      category: 'food',
      date: new Date(),
      accountId,
      userId,
      ...transactionData,
    };

    const transaction = transactionRepository.create(defaultTransaction);
    return await transactionRepository.save(transaction);
  }

  /**
   * Create test budget
   */
  async createTestBudget(userId: number, budgetData = {}) {
    const budgetRepository = this.dataSource.getRepository('Budget');

    const defaultBudget = {
      name: 'Test Budget',
      amount: 500.00,
      category: 'food',
      period: 'monthly',
      userId,
      ...budgetData,
    };

    const budget = budgetRepository.create(defaultBudget);
    return await budgetRepository.save(budget);
  }

  /**
   * Create complete test scenario
   */
  async createTestScenario() {
    const user = await this.createTestUser();
    const account = await this.createTestAccount(user.id);
    const transaction = await this.createTestTransaction(account.id, user.id);
    const budget = await this.createTestBudget(user.id);

    return {
      user,
      account,
      transaction,
      budget,
    };
  }

  /**
   * Execute raw SQL query
   */
  async query(sql: string, parameters?: any[]): Promise<any> {
    return await this.dataSource.query(sql, parameters);
  }

  /**
   * Get repository for entity
   */
  getRepository<T>(entity: new () => T) {
    return this.dataSource.getRepository(entity);
  }
}

/**
 * Setup test database for Jest tests
 */
export const setupTestDatabase = async (): Promise<{
  dataSource: DataSource;
  utils: TestDatabaseUtils;
  manager: TestDatabaseManager;
}> => {
  const manager = TestDatabaseManager.getInstance();
  const dataSource = await manager.start();
  const utils = new TestDatabaseUtils(dataSource);

  return { dataSource, utils, manager };
};

/**
 * Teardown test database
 */
export const teardownTestDatabase = async (): Promise<void> => {
  const manager = TestDatabaseManager.getInstance();
  await manager.stop();
};