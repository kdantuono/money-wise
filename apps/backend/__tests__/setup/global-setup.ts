/**
 * Global setup - runs ONCE before all test suites
 *
 * Initializes shared PostgreSQL container that will be reused
 * across all test files for maximum performance.
 *
 * Note: We defer actual container initialization to individual test files
 * because global setup runs before TypeScript compilation in Jest.
 */
export default async function globalSetup() {
  console.log('\n🚀 Global Test Setup - Preparing test infrastructure\n');

  try {
    // Set environment variables for test mode
    process.env.NODE_ENV = 'test';
    process.env.TEST_MODE = 'true';

    console.log('✅ Global test setup complete\n');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}
