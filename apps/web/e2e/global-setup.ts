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

    // Step 3: Create test user pool for parallel execution
    await createTestUserPool();

    // Step 4: Create authenticated user session
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
 * Create test user pool for parallel test execution
 * Creates 8 users (one per shard) to avoid race conditions
 */
async function createTestUserPool() {
  console.log('👥 Creating test user pool for parallel execution...');

  // Ensure .auth directory exists
  const authDir = path.dirname(TEST_USERS_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const createdUsers: Array<{ email: string; password: string }> = [];
  const failedUsers: Array<{ email: string; error: string }> = [];

  // Create 8 users for parallel shards (matching Playwright default workers)
  for (let i = 0; i < 8; i++) {
    const user = {
      email: `e2e-shard-${i}@moneywise.test`,
      password: 'SecureTest#2025!',
      firstName: 'E2E',
      lastName: `Shard${i}`
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (response.ok || response.status === 409 || response.status === 400) {
        // Success or user already exists (both are fine)
        createdUsers.push({ email: user.email, password: user.password });
        console.log(`  ✅ User ${i + 1}/8: ${user.email}`);
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        failedUsers.push({ email: user.email, error: `${response.status}: ${errorText}` });
        console.warn(`  ⚠️ User ${i + 1}/8 failed: ${user.email} - ${errorText}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      failedUsers.push({ email: user.email, error: errorMsg });
      console.warn(`  ⚠️ User ${i + 1}/8 error: ${user.email} - ${errorMsg}`);
    }

    // Small delay to avoid overwhelming backend
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Also add the pre-defined test users from TEST_USERS array
  for (const user of TEST_USERS) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (response.ok || response.status === 409 || response.status === 400) {
        createdUsers.push({ email: user.email, password: user.password });
        console.log(`  ✅ Predefined user: ${user.email}`);
      }
    } catch (error) {
      console.warn(`  ⚠️ Predefined user failed: ${user.email}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Save user pool to file
  const userPool = { users: createdUsers };
  fs.writeFileSync(TEST_USERS_FILE, JSON.stringify(userPool, null, 2));

  console.log(`✅ Test user pool created: ${createdUsers.length} users available`);
  console.log(`💾 Saved to: ${TEST_USERS_FILE}`);

  if (failedUsers.length > 0) {
    console.warn(`⚠️ ${failedUsers.length} users failed to create (tests will use available users)`);
  }

  if (createdUsers.length === 0) {
    throw new Error('Failed to create any test users. Please check backend connection and logs.');
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

    // Step 2: Login to get auth state via UI
    // Using UI-based login for HttpOnly cookie auth (required for BFF pattern)
    await loginViaUI(page);

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
 * Login via UI to get auth cookies
 *
 * IMPORTANT: Must use UI-based login because:
 * 1. HttpOnly cookies require same-origin requests through the BFF
 * 2. page.request.post() creates a separate HTTP context that doesn't share cookies
 * 3. The frontend uses Next.js BFF pattern (/api routes proxy to backend)
 */
async function loginViaUI(page: any) {
  console.log('🔐 Logging in via UI...');

  try {
    // Navigate to login page
    await page.goto(`${FRONTEND_URL}/auth/login`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="login-form"]', {
      state: 'visible',
      timeout: 10000
    });

    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_USER.email);
    await page.fill('[data-testid="password-input"]', TEST_USER.password);

    // Submit form and wait for response + navigation
    await Promise.all([
      page.waitForResponse(
        (r: any) => r.url().includes('/api/auth/login') && r.status() === 200,
        { timeout: 15000 }
      ),
      page.click('[data-testid="login-button"]')
    ]);

    // Wait for redirect to dashboard
    await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 15000 });

    // Verify we're logged in by checking we're on dashboard
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      throw new Error(`Login verification failed: expected /dashboard, got ${currentUrl}`);
    }

    console.log('✅ Login successful via UI');
  } catch (error) {
    console.error('❌ UI Login failed:', error);
    // Take screenshot for debugging
    try {
      await page.screenshot({ path: 'e2e/.auth/login-failure.png' });
      console.log('📸 Screenshot saved to e2e/.auth/login-failure.png');
    } catch {
      // Ignore screenshot errors
    }
    throw error;
  }
}

export default globalSetup;
