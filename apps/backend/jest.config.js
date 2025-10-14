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
    '!src/**/*.spec.ts',                           // Exclude test files from coverage
    '!src/**/*.test.ts',                           // Exclude test files from coverage
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
    '!src/core/database/repositories/impl/index.ts', // Repository barrel exports
    '!src/core/monitoring/test-sentry.controller.ts', // Test-only Sentry endpoint
    '!src/docs/**',                                // OpenAPI/documentation files
  ],

  // Coverage thresholds for backend (STORY-1.5.7 Phase 2 - Current Baseline)
  // Current actual coverage: 71.51% statements (with .spec.ts exclusion)
  // Phase 2 Target: Baseline at 70%, CI/CD enforces 80% (will fail until coverage improves)
  // Phase 5 will increase to 90% across all metrics
  coverageThreshold: {
    global: {
      statements: 70,  // Current baseline 71.51% (Phase 2 CI/CD: 80%, Phase 5: 90%)
      branches: 60,    // Current baseline ~60% (Phase 5: 90%)
      functions: 70,   // Current baseline ~70% (Phase 5: 90%)
      lines: 70,       // Current baseline ~70% (Phase 5: 90%)
    },
    // High-priority modules - thresholds set to current baseline
    // Phase 5 will increase these to 90%+
    './src/auth/services/**/*.ts': {
      branches: 65,  // Current: 65.45% (password-reset), Phase 5: 85%
      functions: 90,  // Current: 90.9% (email-verification), Phase 5: 95%
      lines: 89,  // Current: 89.75%, Phase 5: 95%
      statements: 89,  // Current: 89.91%, Phase 5: 95%
    },
    './src/core/database/repositories/**/*.ts': {
      branches: 80,  // Current: 80.59% (category.repository), Phase 5: 90%
      functions: 90,  // Phase 5: 95%
      lines: 98,  // Maintain high standards
      statements: 98,  // Maintain high standards
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
