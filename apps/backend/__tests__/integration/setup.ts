// Test Setup Configuration
// TASK-003-002: Test Database Configuration

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createMockRedis } from '../mocks/redis.mock';

// Global test variables
declare global {
  var testApp: INestApplication;
  var testDataSource: DataSource;
}

// Test database configuration
// Uses environment variables from .env.test or CI/CD environment
export const testDbConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'moneywise_test',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/core/database/migrations/*.ts'],
  migrationsRun: true,
  synchronize: false,
  dropSchema: false,
  logging: false,
};

// Setup function called before each test
beforeEach(async () => {
  // Clear any test data if needed
  if (global.testDataSource && global.testDataSource.isInitialized) {
    await clearTestData();
  }
});

// Cleanup function
afterEach(async () => {
  // Additional cleanup if needed
});

// Clear test data function
async function clearTestData() {
  const entities = global.testDataSource.entityMetadatas;

  // Disable foreign key checks
  await global.testDataSource.query('SET session_replication_role = replica;');

  // Clear all tables
  for (const entity of entities) {
    const repository = global.testDataSource.getRepository(entity.name);
    await repository.clear();
  }

  // Re-enable foreign key checks
  await global.testDataSource.query('SET session_replication_role = DEFAULT;');
}

// Helper to create test module with database
export async function createTestModule(moduleConfig: any): Promise<TestingModule> {
  const mockRedis = createMockRedis();

  return await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(testDbConfig),
      ...moduleConfig.imports || []
    ],
    controllers: moduleConfig.controllers || [],
    providers: moduleConfig.providers || [],
  })
  .overrideProvider('default')  // Redis token from RedisModule
  .useValue(mockRedis)
  .compile();
}