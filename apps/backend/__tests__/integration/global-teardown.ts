// Global Test Teardown
// TASK-003-002: Test Database Configuration

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test database...');

  if (global.testDataSource && global.testDataSource.isInitialized) {
    try {
      await global.testDataSource.destroy();
      console.log('✅ Test database connection closed');
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error);
    }
  }
}