/**
 * Global teardown - runs ONCE after all test suites
 *
 * Gracefully shuts down the shared PostgreSQL container
 * and cleans up resources.
 */
export default async function globalTeardown() {
  console.log('\n🛑 Global Test Teardown - Cleaning up test infrastructure\n');

  try {
    // Cleanup handled by individual test files

    console.log('✅ Global test teardown complete\n');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw - allow tests to complete even if cleanup fails
  }
}
