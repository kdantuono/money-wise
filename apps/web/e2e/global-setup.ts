/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests to prepare test environment
 */

import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// __dirname is not available in ESM; derive from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

    // Step 4: Seed categories for test users
    await seedCategoriesForTestUsers();

    // Step 5: Create authenticated user session
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

  const maxRetries = 30;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (response.ok) {
        // Some environments return additional fields; prefer status==='ok' if present
        let healthy = true;
        try {
          const data = await response.json();
          healthy = !data?.status || data.status === 'ok';
        } catch {
          // Non-JSON response is fine; treat as healthy
        }
        if (healthy) {
          console.log('✅ Backend health check passed');
          return;
        }
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
 * Default categories to seed for each test user
 */
const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: 'Food & Dining', type: 'EXPENSE', color: '#F59E0B', icon: 'Utensils' },
  { name: 'Transportation', type: 'EXPENSE', color: '#3B82F6', icon: 'Car' },
  { name: 'Shopping', type: 'EXPENSE', color: '#EC4899', icon: 'ShoppingBag' },
  { name: 'Bills & Utilities', type: 'EXPENSE', color: '#8B5CF6', icon: 'FileText' },
  { name: 'Entertainment', type: 'EXPENSE', color: '#10B981', icon: 'Film' },
  // Income categories
  { name: 'Salary', type: 'INCOME', color: '#22C55E', icon: 'Wallet' },
  { name: 'Freelance', type: 'INCOME', color: '#14B8A6', icon: 'Laptop' },
  { name: 'Investments', type: 'INCOME', color: '#6366F1', icon: 'TrendingUp' },
];

/**
 * Seed default categories for all test users
 * Logs in as each user and creates default categories
 */
async function seedCategoriesForTestUsers() {
  console.log('📂 Seeding categories for test users...');

  // Read the test users file
  if (!fs.existsSync(TEST_USERS_FILE)) {
    console.warn('⚠️ No test users file found, skipping category seeding');
    return;
  }

  const userPool = JSON.parse(fs.readFileSync(TEST_USERS_FILE, 'utf-8'));
  const users = userPool.users || [];

  if (users.length === 0) {
    console.warn('⚠️ No test users found, skipping category seeding');
    return;
  }

  let seededCount = 0;

  for (const user of users) {
    try {
      // Step 1: Login to get access token (returned as HttpOnly cookie)
      const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password })
      });

      if (!loginResponse.ok) {
        console.warn(`  ⚠️ Login failed for ${user.email}: ${loginResponse.status}`);
        continue;
      }

      // Extract accessToken from Set-Cookie header (HttpOnly cookie)
      // The header format is: accessToken=xxx; Path=/; HttpOnly; ...
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      let accessToken: string | null = null;
      let cookieHeader = '';

      if (setCookieHeader) {
        // Handle multiple cookies - they may be separated by commas
        const cookieParts = setCookieHeader.split(/,\s*(?=[a-zA-Z]+=)/);
        for (const part of cookieParts) {
          // Extract just the name=value part before the first semicolon
          const nameValue = part.split(';')[0].trim();
          if (nameValue.startsWith('accessToken=')) {
            accessToken = nameValue.substring('accessToken='.length);
            cookieHeader = nameValue; // Use as cookie header
            break;
          }
        }
      }

      if (!accessToken) {
        console.warn(`  ⚠️ No access token cookie for ${user.email}`);
        continue;
      }

      // Step 2: Check if user already has categories
      // Use Cookie header (primary) and Authorization header (fallback)
      const existingResponse = await fetch(`${BACKEND_URL}/api/categories`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        if (existing && existing.length > 0) {
          console.log(`  ℹ️ ${user.email}: Already has ${existing.length} categories`);
          seededCount++;
          continue;
        }
      }

      // Step 3: Create default categories
      let created = 0;
      for (const category of DEFAULT_CATEGORIES) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/categories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieHeader,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(category)
          });

          if (response.ok || response.status === 409) {
            created++;
          }
        } catch {
          // Ignore individual category errors
        }
      }

      console.log(`  ✅ ${user.email}: Seeded ${created} categories`);
      seededCount++;

      // Small delay between users
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.warn(`  ⚠️ Error seeding ${user.email}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`✅ Categories seeded for ${seededCount}/${users.length} users`);
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
    await page.goto(`${FRONTEND_URL}/auth/register`);
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
