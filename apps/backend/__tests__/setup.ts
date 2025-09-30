/**
 * Jest Setup File for Backend Tests
 * Runs once before all test suites
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/moneywise_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

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