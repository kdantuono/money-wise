/**
 * E2E Test Setup for MoneyWise Backend
 * Provides database integration and test utilities for end-to-end tests
 */

import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Global test configuration
jest.setTimeout(60000);

// Test database connection
let testDataSource: DataSource;

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'moneywise_test';
process.env.DB_SYNCHRONIZE = 'true';
process.env.DB_LOGGING = 'false';
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
process.env.REDIS_URL = 'redis://localhost:6379/15'; // Use different Redis DB for tests

/**
 * Initialize test database connection
 */
export const initializeTestDatabase = async (): Promise<DataSource> => {
  if (testDataSource?.isInitialized) {
    return testDataSource;
  }

  testDataSource = new DataSource({
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
  });

  await testDataSource.initialize();
  return testDataSource;
};

/**
 * Clean database before/after tests
 */
export const cleanDatabase = async (): Promise<void> => {
  if (!testDataSource?.isInitialized) {
    await initializeTestDatabase();
  }

  const entities = testDataSource.entityMetadatas;

  // Disable foreign key checks
  await testDataSource.query('SET foreign_key_checks = 0;');

  // Truncate all tables
  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.clear();
  }

  // Re-enable foreign key checks
  await testDataSource.query('SET foreign_key_checks = 1;');
};

/**
 * Close test database connection
 */
export const closeTestDatabase = async (): Promise<void> => {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
  }
};

/**
 * Global test utilities
 */
declare global {
  namespace NodeJS {
    interface Global {
      testApp: INestApplication;
      testDataSource: DataSource;
      testUtils: {
        cleanDatabase: typeof cleanDatabase;
        createTestApp: typeof createTestApp;
        closeTestApp: typeof closeTestApp;
      };
    }
  }
}

/**
 * Create test application instance
 */
export const createTestApp = async (
  moduleBuilder: (builder: typeof Test) => TestingModule | Promise<TestingModule>
): Promise<INestApplication> => {
  const module = await moduleBuilder(Test);
  const app = module.createNestApplication();

  // Apply global pipes, filters, interceptors as needed
  // app.useGlobalPipes(new ValidationPipe());

  await app.init();
  return app;
};

/**
 * Close test application
 */
export const closeTestApp = async (app: INestApplication): Promise<void> => {
  await app.close();
};

// Setup global test utilities
global.testUtils = {
  cleanDatabase,
  createTestApp,
  closeTestApp,
};

// Global setup - run once before all tests
beforeAll(async () => {
  await initializeTestDatabase();
});

// Global teardown - run once after all tests
afterAll(async () => {
  await closeTestDatabase();
});

// Clean database before each test
beforeEach(async () => {
  await cleanDatabase();
});