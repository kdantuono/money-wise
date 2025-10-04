/**
 * Jest configuration for MoneyWise Backend (NestJS)
 */

const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,

  // Display name for this project
  displayName: '@money-wise/backend',

  // Root directory for this package
  rootDir: '.',

  // Test environment for Node.js
  testEnvironment: 'node',

  // Use TypeScript preset
  preset: 'ts-jest',

  // Transform ES modules from node_modules (allow @faker-js, uuid, and ioredis to be transformed)
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js|uuid|ioredis)/)',
  ],

  // Module name mapping specific to backend
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@money-wise/types$': '<rootDir>/../../packages/types/src',
    '^@money-wise/utils$': '<rootDir>/../../packages/utils/src',
    '^@money-wise/test-utils$': '<rootDir>/../../packages/test-utils/src',
    // Mock @faker-js/faker as it's an ES module causing issues
    '^@faker-js/faker$': '<rootDir>/__mocks__/@faker-js/faker.ts',
    // Mock uuid as it's an ES module
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
  },

  // Setup files for NestJS testing
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  // Global setup/teardown disabled - causing Jest hangs
  // Container lifecycle managed by TestDatabaseModule and TestApp
  // globalSetup: '<rootDir>/__tests__/setup/global-setup.ts',
  // globalTeardown: '<rootDir>/__tests__/setup/global-teardown.ts',

  // Test match patterns for backend (consolidated __tests__ structure)
  testMatch: [
    '<rootDir>/__tests__/**/*.{test,spec}.{ts,js}',
  ],

  // Parallel execution for faster test runs
  maxWorkers: '50%', // Use 50% of available CPU cores

  // Timeout configuration
  testTimeout: 30000, // 30 seconds max per test

  // Ignore OpenAPI spec files and other non-test files
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/src/docs/', // Exclude docs directory from test discovery
    // E2E tests now included in main test runs
  ],

  // Coverage collection specific to backend
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],

  // Coverage thresholds for backend (MVP phase - progressive improvement)
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 15,
      lines: 15,
      statements: 15,
    },
  },

  // Coverage reporters - include json-summary for CI/CD
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'json-summary',
    'html',
  ],

  // Coverage directory for output
  coverageDirectory: '<rootDir>/coverage',

};
