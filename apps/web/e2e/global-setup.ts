/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';

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
  // Add any test data setup here
  // For example: creating test users, seeding database, etc.
  console.log('📦 Setting up test data...');

  // Example: Check if frontend is responding
  try {
    const response = await page.request.get(baseURL + '/');
    if (response.ok()) {
      console.log('✅ Frontend health check passed');
    } else {
      console.warn('⚠️ Frontend health check failed, tests may fail');
    }
  } catch (error) {
    console.warn('⚠️ Could not reach frontend:', (error as Error).message);
  }
}

export default globalSetup;