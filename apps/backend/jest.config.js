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
    // Exclude infrastructure/setup files (no business logic to test)
    '!src/instrument.ts',                         // Sentry initialization
    '!src/config/**',                              // Simple config exports
    '!src/database/index.ts',                      // Simple database exports
    '!src/core/database/migrations/**',            // One-time database migrations
    '!src/core/database/tests/**',                 // Test infrastructure itself
    '!src/core/config/index.ts',                   // Config barrel exports
    '!src/core/database/repositories/index.ts',    // Repository barrel exports
    '!src/docs/**',                                // OpenAPI/documentation files
  ],

  // Coverage thresholds for backend (STORY-1.5.7 - Hardening to 90%)
  // Current baseline (with exclusions): Statements 86.24%, Branches 76.68%, Functions 82.99%, Lines 87.01%
  // Target: 90% across all metrics (work in progress)
  coverageThreshold: {
    global: {
      branches: 76,    // Current: 76.68%, prevent regression
      functions: 82,   // Current: 82.99%, prevent regression
      lines: 87,       // Current: 87.01%, prevent regression
      statements: 86,  // Current: 86.24%, prevent regression
    },
    // High-priority modules that MUST maintain excellence
    './src/auth/services/**/*.ts': {
      branches: 85,  // Auth services critical for security
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/core/database/repositories/**/*.ts': {
      branches: 85,  // Database operations must be reliable
      functions: 90,
      lines: 98,
      statements: 98,
    },
    // Modules being actively improved (looser thresholds to allow work)
    './src/core/health/**/*.ts': {
      branches: 50,
      functions: 80,
      lines: 80,
      statements: 80,
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
