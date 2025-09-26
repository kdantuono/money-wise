/**
 * Jest configuration for MoneyWise Config Package
 */

const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,

  // Display name for this project
  displayName: '@money-wise/config',

  // Root directory for this package
  rootDir: '.',

  // Test environment for Node.js (configs are typically Node.js files)
  testEnvironment: 'node',

  // Module name mapping specific to config
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Test match patterns for config
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{ts,js}',
    '<rootDir>/**/*.{test,spec}.{ts,js}'
  ],

  // Coverage collection specific to config
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/index.js',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/node_modules/**'
  ],

  // Lower coverage thresholds for config (mainly configuration objects)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },

  // Transform configuration for TypeScript and ESLint configs
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }]
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ]
};