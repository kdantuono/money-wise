/**
 * Test Database Configuration
 * Provides database setup/teardown utilities for unit tests
 */

import { DataSource } from 'typeorm';
import { User } from '@/core/database/entities/user.entity';
import { Account } from '@/core/database/entities/account.entity';
import { Category } from '@/core/database/entities/category.entity';
import { Transaction } from '@/core/database/entities/transaction.entity';
import { AuditLog } from '@/core/database/entities/audit-log.entity';
import { PasswordHistory } from '@/core/database/entities/password-history.entity';

let testDataSource: DataSource | null = null;

/**
 * Setup test database connection
 */
export async function setupTestDatabase(): Promise<DataSource> {
  if (testDataSource?.isInitialized) {
    return testDataSource;
  }

  testDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres', // Align with CI configuration
    password: process.env.DB_PASSWORD || 'password',
    database: 'moneywise_test',
    schema: 'public',
    synchronize: true,
    dropSchema: false,
    logging: false,
    entities: [User, Account, Category, Transaction, AuditLog, PasswordHistory],
  });

  await testDataSource.initialize();
  return testDataSource;
}

/**
 * Clean all data from test database
 */
export async function cleanTestDatabase(): Promise<void> {
  if (!testDataSource?.isInitialized) {
    return;
  }

  const entities = testDataSource.entityMetadatas;

  try {
    // Disable foreign key checks
    await testDataSource.query('SET session_replication_role = replica;');

    // Truncate all tables
    for (const entity of entities) {
      const tableName = entity.tableName;
      await testDataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    }

    // Re-enable foreign key checks
    await testDataSource.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.warn('Warning: Could not clean database:', error.message);

    // Fallback: clear each repository individually
    for (const entity of entities) {
      try {
        const repository = testDataSource.getRepository(entity.name);
        await repository.clear();
      } catch (e) {
        console.warn(`Could not clear ${entity.name}:`, e.message);
      }
    }
  }
}

/**
 * Teardown test database connection
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
    testDataSource = null;
  }
}
