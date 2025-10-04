/**
 * Jest Setup File for Backend Tests
 * Runs once before all test suites
 */

// Set test environment variables
// Use environment variables from .env.test or fall back to defaults matching docker-compose.dev.yml
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '1h';

// Database configuration matching docker-compose.dev.yml
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'moneywise_test';

process.env.DATABASE_URL = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
process.env.REDIS_URL = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}/1`;

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
};

// Setup global mocks if needed
beforeAll(async () => {
  // Global setup before all tests
});

afterAll(async () => {
  // Global cleanup after all tests
  await new Promise((resolve) => setTimeout(resolve, 500));
});