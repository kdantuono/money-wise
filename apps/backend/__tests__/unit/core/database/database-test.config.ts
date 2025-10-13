/**
 * Test Database Configuration
 * Provides database setup/teardown utilities for unit tests
 */

import { DataSource } from 'typeorm';
import { User } from '../../generated/prisma';
import { Account } from '../../generated/prisma';
import { Category } from '../../generated/prisma';
import { Transaction } from '../../generated/prisma';
import { AuditLog } from '../../generated/prisma';
import { PasswordHistory } from '../../generated/prisma';

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
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'moneywise_test',
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
