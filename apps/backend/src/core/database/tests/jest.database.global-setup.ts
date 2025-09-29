/**
 * Jest Global Setup for Database Tests
 * Runs once before all database tests
 */

export default async function globalSetup() {
  console.log('🚀 Starting global database test setup...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.DB_LOGGING = 'false';

  // Check if Docker is available for TestContainers
  try {
    const { execSync } = require('child_process');
    execSync('docker --version', { stdio: 'ignore' });
    process.env.USE_TEST_CONTAINERS = 'true';
    console.log('✅ Docker available - will use TestContainers');
  } catch {
    process.env.USE_TEST_CONTAINERS = 'false';
    console.log('⚠️ Docker not available - will use local PostgreSQL');
  }

  // Set database configuration for tests
  if (!process.env.USE_TEST_CONTAINERS || process.env.USE_TEST_CONTAINERS === 'false') {
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_PORT = process.env.DB_PORT || '5432';
    process.env.DB_USERNAME = process.env.DB_USERNAME || 'postgres';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
    process.env.DB_NAME = process.env.DB_NAME || 'moneywise_test';
    process.env.DB_SCHEMA = process.env.DB_SCHEMA || 'public';
  }

  console.log('✅ Global database test setup completed');
}