/**
 * Jest Configuration for Database Tests
 * Specialized configuration for database testing with performance optimizations
 */

const baseConfig = require('../../../../jest.config');

module.exports = {
  ...baseConfig,

  // Display name for database tests
  displayName: 'Database Tests',

  // Root directory for database tests
  rootDir: '.',

  // Test environment
  testEnvironment: 'node',

  // TypeScript preset
  preset: 'ts-jest',

  // Test match patterns - only database tests
  testMatch: [
    '<rootDir>/**/*.test.ts'
  ],

  // Setup files for database testing
  setupFilesAfterEnv: [
    '<rootDir>/jest.database.setup.ts'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/jest.database.global-setup.ts',
  globalTeardown: '<rootDir>/jest.database.global-teardown.ts',

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../$1',
    '^@money-wise/types$': '<rootDir>/../../../../../packages/types/src',
    '^@money-wise/utils$': '<rootDir>/../../../../../packages/utils/src',
  },

  // Coverage collection for database code
  collectCoverageFrom: [
    '../entities/**/*.ts',
    '../migrations/**/*.ts',
    './factories/**/*.ts',
    './database-test.config.ts',
    '!**/*.d.ts',
    '!**/*.interface.ts',
    '!**/node_modules/**',
  ],

  // Coverage thresholds for database tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Test timeout for database operations
  testTimeout: 60000, // 60 seconds

  // Max workers for parallel tests
  maxWorkers: '50%',

  // Verbose output for detailed reporting
  verbose: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@faker-js|@testcontainers)/)'
  ],

  // Additional Jest options for database testing
  bail: false, // Don't stop on first failure
  passWithNoTests: false, // Require tests to exist
};