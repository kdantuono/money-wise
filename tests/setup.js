/**
 * Jest Test Setup
 * Global test setup and configuration for the MoneyWise test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log in tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
global.testUtils = {
  // Helper to create mock file system data
  createMockMetrics: (overrides = {}) => ({
    metadata: {
      issue_number: 36,
      epic_number: 32,
      feature_name: 'Infrastructure Auto-Healing v2.0',
      version: '2.0.0',
      ...overrides.metadata
    },
    current_metrics: {
      failure_detection: {
        detection_accuracy: '95%',
        mean_detection_time: '< 2 minutes',
        confidence_threshold: 0.85,
        ...overrides.failure_detection
      },
      recovery_orchestration: {
        success_rate_target: '90%',
        mean_recovery_time: '< 5 minutes',
        rollback_capability: 'enabled',
        ...overrides.recovery_orchestration
      },
      safety_mechanisms: {
        circuit_breaker_enabled: true,
        circuit_breaker_threshold: 3,
        manual_override: 'available',
        ...overrides.safety_mechanisms
      },
      ...overrides.current_metrics
    },
    status: {
      overall_health: 'operational',
      engine_status: 'initialized',
      auto_healing_enabled: true,
      ...overrides.status
    }
  }),

  // Helper to create mock workflow content
  createMockWorkflow: (overrides = {}) => `
name: 🏥 Infrastructure Auto-Healing v2.0

env:
  AUTO_HEALING_VERSION: "${overrides.version || '2.0.0'}"
  MAX_RECOVERY_ATTEMPTS: ${overrides.maxAttempts || 3}
  CONFIDENCE_THRESHOLD: ${overrides.threshold || 0.85}

on:
  workflow_run:
    types: [completed]
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:

jobs:
  initialize-engine:
    runs-on: ubuntu-latest
    steps:
      - name: Initialize Auto-Healing Engine
        run: echo "Initializing..."
  `,

  // Helper to simulate file system operations
  mockFileSystem: {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
  },

  // Helper to reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
    global.testUtils.mockFileSystem.existsSync.mockClear();
    global.testUtils.mockFileSystem.readFileSync.mockClear();
    global.testUtils.mockFileSystem.writeFileSync.mockClear();
  }
};

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock external dependencies that might not be available in test environment
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock child_process for workflow simulation tests
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
  exec: jest.fn()
}));