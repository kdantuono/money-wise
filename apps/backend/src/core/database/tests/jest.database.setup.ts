/**
 * Jest Database Test Setup
 * Per-test setup and teardown for database tests
 */

import { DataSource } from 'typeorm';
import { setupTestDatabase, cleanTestDatabase } from './database-test.config';

// Global test variables
let testDataSource: DataSource;

// Setup before each test file
beforeAll(async () => {
  // Setup test database
  testDataSource = await setupTestDatabase();

  // Make dataSource available globally for tests
  (global as typeof global & { testDataSource?: DataSource }).testDataSource = testDataSource;

  console.log('🔧 Database test setup completed');
});

// Cleanup after each test file
afterAll(async () => {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
  }

  console.log('🧹 Database test cleanup completed');
});

// Clean database between individual tests
beforeEach(async () => {
  if (testDataSource?.isInitialized) {
    await cleanTestDatabase();
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for database operations
jest.setTimeout(60000);

// Mock console methods in tests if needed
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only suppress known test warnings/errors
    const message = args.join(' ');
    if (
      !message.includes('TimescaleDB') &&
      !message.includes('Warning:') &&
      !message.includes('Connection terminated')
    ) {
      originalConsoleError(...args);
    }
  });

  console.warn = jest.fn((...args) => {
    const message = args.join(' ');
    if (!message.includes('TimescaleDB') && !message.includes('not available')) {
      originalConsoleWarn(...args);
    }
  });
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});