/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';

// Backend API URL (can be overridden by environment)
const BACKEND_URL = process.env.PLAYWRIGHT_BACKEND_URL || 'http://localhost:3001';

// Test users to create (from test-data.ts fixtures)
const TEST_USERS = [
  {
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
  },
  {
    email: 'admin@moneywise.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
  },
  {
    email: 'jane.smith@example.com',
    password: 'NewPassword123!',
    firstName: 'Jane',
    lastName: 'Smith',
  },
];

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(baseURL);

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    console.log('✅ Application is ready');

    // Setup test data if needed
    await setupTestData(page, baseURL);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global setup completed');
}

async function setupTestData(page: any, baseURL: string) {
  console.log('📦 Setting up test data...');

  // Check if frontend is responding
  try {
    const response = await page.request.get(baseURL + '/');
    if (response.ok()) {
      console.log('✅ Frontend health check passed');
    } else {
      console.warn('⚠️  Frontend health check failed, tests may fail');
    }
  } catch (error) {
    console.warn('⚠️ Could not reach frontend:', (error as Error).message);
  }

  // Check if backend is responding
  try {
    const healthResponse = await page.request.get(`${BACKEND_URL}/api/health`);
    if (healthResponse.ok()) {
      console.log('✅ Backend health check passed');
    } else {
      console.warn('⚠️ Backend health check failed, tests may fail');
    }
  } catch (error) {
    console.warn('⚠️ Could not reach backend:', (error as Error).message);
  }

  // Create test users via the test-only endpoint
  console.log('👥 Creating test users...');
  for (const user of TEST_USERS) {
    try {
      const response = await page.request.post(`${BACKEND_URL}/api/auth/test/create-user`, {
        data: user,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok()) {
        console.log(`✅ Test user created/verified: ${user.email}`);
      } else {
        const status = response.status();
        const body = await response.text().catch(() => 'Unable to read response');
        console.warn(`⚠️ Failed to create test user ${user.email}: ${status} - ${body}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error creating test user ${user.email}:`, (error as Error).message);
    }
  }

  console.log('✅ Test data setup completed');
}

export default globalSetup;