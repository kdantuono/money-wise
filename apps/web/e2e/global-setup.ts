/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests to prepare test environment
 */

import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Test user credentials
// Password must NOT contain firstName, lastName, or email parts
// Password requirements: 12+ chars, uppercase, lowercase, digits, special chars, score >= 60
const TEST_USER = {
  email: 'e2e-test@moneywise.app',
  password: 'Secure#Finance2025!',  // 19 chars, no user info
  firstName: 'E2E',
  lastName: 'Automation'  // Changed from 'TestUser' to avoid confusion
};

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
  console.log(`📍 Frontend URL: ${FRONTEND_URL}`);
  console.log(`📍 Backend URL: ${BACKEND_URL}`);

  try {
    // Step 1: Check backend health
    await checkBackendHealth();

    // Step 2: Clean up previous auth state
    await cleanupAuthState();

    // Step 3: Create authenticated user session
    await createAuthenticatedSession(config);

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Check if backend API is healthy and responding
 */
async function checkBackendHealth() {
  console.log('🏥 Checking backend health...');

  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('✅ Backend health check passed');
        return;
      } else {
        console.warn(`⚠️ Backend health check failed (attempt ${attempt}/${maxRetries}): ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`⚠️ Backend health check error (attempt ${attempt}/${maxRetries}):`, error instanceof Error ? error.message : error);
    }

    if (attempt < maxRetries) {
      console.log(`⏳ Retrying in ${retryDelay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    `Backend API is not responding after ${maxRetries} attempts. ` +
    `Please ensure the backend is running at ${BACKEND_URL}/api/health`
  );
}

/**
 * Clean up any existing auth state
 */
async function cleanupAuthState() {
  console.log('🧹 Cleaning up previous auth state...');

  if (fs.existsSync(AUTH_FILE)) {
    fs.unlinkSync(AUTH_FILE);
    console.log('✅ Removed previous auth state');
  } else {
    console.log('✅ No previous auth state found');
  }
}

/**
 * Create authenticated user session
 */
async function createAuthenticatedSession(config: FullConfig) {
  console.log('👤 Creating authenticated user session...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  try {
    // Step 1: Try to create test user via API
    const userCreated = await createTestUserViaAPI();

    if (!userCreated) {
      console.log('⚠️ API user creation failed, trying browser registration...');
      await createTestUserViaBrowser(page);
    }

    // Step 2: Login to get auth state
    console.log('🔐 Logging in to capture auth state...');
    await loginViaAPI(page);

    // Step 3: Save auth state
    console.log('💾 Saving auth state...');
    await context.storageState({ path: AUTH_FILE });

    console.log(`✅ Auth state saved to ${AUTH_FILE}`);
  } catch (error) {
    console.error('❌ Failed to create authenticated session:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Create test user via API (preferred method)
 */
async function createTestUserViaAPI(): Promise<boolean> {
  console.log('📝 Creating test user via API...');

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName
      })
    });

    if (response.ok) {
      console.log('✅ Test user created successfully via API');
      return true;
    } else if (response.status === 409 || response.status === 400) {
      // User already exists - this is fine
      console.log('ℹ️ Test user already exists (will use existing account)');
      return true;
    } else {
      const errorText = await response.text();
      console.warn(`⚠️ API registration failed (${response.status}):`, errorText);
      return false;
    }
  } catch (error) {
    console.warn('⚠️ API registration error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Create test user via browser registration (fallback method)
 */
async function createTestUserViaBrowser(page: any) {
  console.log('📝 Creating test user via browser...');

  try {
    await page.goto(`${FRONTEND_URL}/register`);
    await page.waitForLoadState('networkidle');

    // Fill registration form
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for either success or error
    await Promise.race([
      page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 10000 }),
      page.waitForSelector('[role="alert"]', { timeout: 10000 })
    ]);

    // Check if we're on dashboard (success)
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Test user created successfully via browser');
      return;
    }

    // Check for "user already exists" error
    const alertText = await page.textContent('[role="alert"]').catch(() => '');
    if (alertText.toLowerCase().includes('already exists') || alertText.toLowerCase().includes('409')) {
      console.log('ℹ️ Test user already exists (will use existing account)');
      return;
    }

    throw new Error(`Registration failed: ${alertText}`);
  } catch (error) {
    console.error('❌ Browser registration failed:', error);
    throw error;
  }
}

/**
 * Login via API to get auth cookies
 */
async function loginViaAPI(page: any) {
  try {
    // Navigate to app first to establish domain context
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Perform login via API route
    const response = await page.request.post(`${BACKEND_URL}/api/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(`Login failed (${response.status()}): ${errorText}`);
    }

    // Navigate to dashboard to verify login
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verify we're logged in
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      throw new Error('Login verification failed: not redirected to dashboard');
    }

    console.log('✅ Login successful');
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
}

export default globalSetup;
