/**
 * Test Database Configuration
 * Re-exports from the main test database utilities
 * @deprecated Import directly from src/core/database/tests/database-test.config.ts
 */

export {
  DatabaseTestConfig,
  DatabaseTestManager,
  setupTestDatabase,
  teardownTestDatabase,
  cleanTestDatabase,
  getTestDataFactory,
} from '../../../../src/core/database/tests/database-test.config';
