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
    '^@money-wise/config$': '<rootDir>/../../packages/config'
  },

  // Setup files for NestJS testing
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts'
  ],

  // Test match patterns for backend
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,js}',
    '<rootDir>/src/**/*.{test,spec}.{ts,js}',
    '<rootDir>/test/**/*.{test,spec}.{ts,js}'
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
    '!src/**/__mocks__/**'
  ],

  // Coverage thresholds for backend
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ]
};