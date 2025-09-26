/**
 * Global teardown for Playwright E2E tests
 * Runs once after all tests
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  // Cleanup test data
  await cleanupTestData();

  console.log('✅ Global teardown completed');
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');

  // Add any cleanup logic here
  // For example: clearing test database, removing test files, etc.

  // Example: You might want to clean up test users or reset database state
  // This would typically involve API calls to your backend
}

export default globalTeardown;