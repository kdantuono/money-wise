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

  // Module name mapping specific to backend
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@money-wise/types$': '<rootDir>/../../packages/types/src',
    '^@money-wise/utils$': '<rootDir>/../../packages/utils/src',
    '^@money-wise/test-utils$': '<rootDir>/../../packages/test-utils/src',
  },

  // Setup files for NestJS testing
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  // Test match patterns for backend (consolidated __tests__ structure)
  testMatch: [
    '<rootDir>/__tests__/**/*.{test,spec}.{ts,js}',
  ],

  // Ignore OpenAPI spec files and other non-test files
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/src/docs/', // Exclude docs directory from test discovery
    '.*/.*\\.e2e\\.spec\\.ts$', // Exclude E2E tests from unit test runs
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

};
