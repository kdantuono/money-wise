/**
 * Jest Global Teardown for Database Tests
 * Runs once after all database tests complete
 */

export default async function globalTeardown() {
  console.log('🧹 Starting global database test teardown...');

  // Clean up any global resources
  // Note: Individual test cleanup is handled in setup files

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Global database test teardown completed');
}