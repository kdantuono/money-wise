/**
 * Base Jest configuration for MoneyWise monorepo
 * Provides shared configuration for all packages and apps
 */

module.exports = {
  // Use TypeScript preset for all projects
  preset: 'ts-jest',

  // Clear mocks automatically between every test
  clearMocks: true,

  // Continue running tests even after failures (bail disabled for comprehensive test reporting)
  bail: false,

  // Collect coverage information
  collectCoverage: false, // Enable per-package as needed

  // Coverage collection patterns
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/index.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**'
  ],

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],

  // Coverage thresholds DISABLED due to Jest bug in CI
  // Bug: "Cannot read properties of undefined (reading 'sync')" in _checkThreshold
  // See: https://github.com/jestjs/jest/issues/11381
  // Coverage is manually verified via json-summary output
  // Target: 70% statements, 65% branches, 70% functions, 70% lines
  coverageThreshold: undefined,

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],

  // Module paths mapping (will be overridden in individual configs)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@money-wise/types$': '<rootDir>/../../packages/types/src',
    '^@money-wise/utils$': '<rootDir>/../../packages/utils/src',
    '^@money-wise/ui$': '<rootDir>/../../packages/ui/src',
    '^@money-wise/config$': '<rootDir>/../../packages/config'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [],

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/test/**/*.{test,spec}.{ts,tsx}'
  ],

  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@money-wise)/)'
  ],

  // Verbose output
  verbose: true,

  // Exit process when tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Maximum number of workers
  maxWorkers: '50%',

  // STRICT: Fail if no tests are found (ensures test discovery works)
  // Packages without tests must use explicit skip scripts (see .claude/quality/test-debt.md)
  passWithNoTests: false,

  // Global setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Watch plugins for better DX
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};