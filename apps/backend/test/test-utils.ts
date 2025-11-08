/**
 * Test utilities for integration tests
 */

/**
 * Get test database configuration
 * This is a simple config loader that returns a function for ConfigModule
 */
export const getTestDbConfig = () => {
  return {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/moneywise_test?schema=public',
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_EXPIRATION: '900s',
    JWT_REFRESH_EXPIRATION: '7d',
    BANKING_INTEGRATION_ENABLED: process.env.BANKING_INTEGRATION_ENABLED === 'true',
  };
};
