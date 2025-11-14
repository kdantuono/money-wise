/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests to prepare test environment
 */

import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');
const TEST_USERS_FILE = path.join(__dirname, '.auth/test-users.json');
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

    // Step 3: Create test user pool for parallel shards
    console.log('👥 Creating test user pool for parallel execution...');
    await createTestUserPool(page);

    // Step 4: Save auth state
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
    // Changed from 'networkidle' to 'domcontentloaded' to avoid timeout issues
    // with continuous polling/websockets in the dashboard
    await page.waitForLoadState('domcontentloaded');

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

/**
 * Create pool of test users for parallel shard execution
 * This eliminates race conditions from concurrent user registrations
 */
async function createTestUserPool(page: any) {
  const SHARD_COUNT = 8; // Number of parallel test shards
  const testUsers: Array<{ email: string; password: string }> = [];

  console.log(`Creating ${SHARD_COUNT} test users for parallel execution...`);

  for (let i = 0; i < SHARD_COUNT; i++) {
    const testEmail = `e2e-shard-${i}@moneywise.test`;
    const testPassword = 'TestUser#2025!Shard';

    try {
      // Navigate to frontend to get domain context (needed for CSRF)
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('domcontentloaded');

      // Get CSRF token from page meta tag
      const csrfToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content') || '';
      });

      if (!csrfToken) {
        console.warn(`⚠️  No CSRF token found for user ${i}, skipping CSRF`);
      }

      // Register user via API
      const registerResponse = await page.request.post(`${BACKEND_URL}/api/auth/register`, {
        data: {
          email: testEmail,
          password: testPassword,
          firstName: 'E2E',
          lastName: `Shard${i}`,
          csrfToken: csrfToken || undefined
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (registerResponse.ok() || registerResponse.status() === 409) {
        // Success or user already exists (both are fine)
        testUsers.push({ email: testEmail, password: testPassword });
        console.log(`✓ User ${i + 1}/${SHARD_COUNT}: ${testEmail} ${registerResponse.ok() ? 'created' : 'already exists'}`);
      } else {
        const errorText = await registerResponse.text().catch(() => 'Unknown error');
        console.warn(`⚠️  Failed to create user ${i}: ${registerResponse.status()} - ${errorText}`);
        // Still add to pool in case user exists
        testUsers.push({ email: testEmail, password: testPassword });
      }
    } catch (error) {
      console.warn(`⚠️  Error creating user ${i}:`, error instanceof Error ? error.message : error);
      // Add to pool anyway - user might exist
      testUsers.push({ email: testEmail, password: testPassword });
    }
  }

  // Save user pool to JSON file
  try {
    const authDir = path.dirname(TEST_USERS_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    fs.writeFileSync(
      TEST_USERS_FILE,
      JSON.stringify({ users: testUsers }, null, 2),
      'utf-8'
    );

    console.log(`✅ Test user pool saved to ${TEST_USERS_FILE}`);
    console.log(`📊 Created ${testUsers.length}/${SHARD_COUNT} users for parallel test execution`);
  } catch (error) {
    console.error('❌ Failed to save test user pool:', error);
    throw error;
  }
}

export default globalSetup;
