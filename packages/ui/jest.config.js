/**
 * Jest configuration for MoneyWise UI Package
 */

const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,

  // Display name for this project
  displayName: '@money-wise/ui',

  // Root directory for this package
  rootDir: '.',

  // Test environment for DOM testing
  testEnvironment: 'jsdom',

  // Module name mapping specific to UI components
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@money-wise/types$': '<rootDir>/../types/src',
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle static assets
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Setup files for React testing
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],

  // Test match patterns for UI components
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx,js,jsx}'
  ],

  // Coverage collection specific to UI components
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],

  // Coverage thresholds for UI components
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Transform configuration for React components
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }]
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@money-wise|@radix-ui)/)'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/storybook-static/',
    '/coverage/'
  ]
};