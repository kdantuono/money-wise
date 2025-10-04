// Global Test Setup
// TASK-003-002: Test Database Configuration

import { DataSource } from 'typeorm';
import { testDbConfig } from './setup';

export default async function globalSetup() {
  console.log('🧪 Setting up test database...');

  // Create test database connection
  const dataSource = new DataSource(testDbConfig);

  try {
    await dataSource.initialize();
    console.log('✅ Test database connected');

    // Run migrations
    await dataSource.runMigrations();
    console.log('✅ Test database migrations completed');

    // Store reference for cleanup
    global.testDataSource = dataSource;

  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}