/**
 * Jest configuration for MoneyWise Mobile (React Native/Expo)
 */

const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,

  // Display name for this project
  displayName: '@money-wise/mobile',

  // Root directory for this package
  rootDir: '.',

  // Use Jest Expo preset for React Native testing
  preset: 'jest-expo',

  // Test environment for React Native
  testEnvironment: 'node',

  // Module name mapping specific to mobile
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@money-wise/types$': '<rootDir>/../../packages/types/src',
    '^@money-wise/utils$': '<rootDir>/../../packages/utils/src',
    '^@money-wise/config$': '<rootDir>/../../packages/config',
    // Handle asset imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/assetMock.js'
  },

  // Setup files for React Native testing
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],

  // Test match patterns for mobile
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx,js,jsx}',
    '<rootDir>/__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}'
  ],

  // Coverage collection specific to mobile
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/app.json',
    '!src/expo-plugins/**'
  ],

  // Coverage thresholds for mobile
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 65,
      lines: 65,
      statements: 65
    }
  },

  // Transform configuration for React Native
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }]
  },

  // Transform ignore patterns for React Native
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|expo|@expo|@money-wise)'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.expo/',
    '/coverage/'
  ]
};