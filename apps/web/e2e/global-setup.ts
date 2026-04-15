/**
 * Global setup for Playwright E2E tests
 *
 * Post-Supabase migration: user provisioning goes through Supabase Auth
 * directly (signUp/signInWithPassword) instead of the deleted NestJS backend.
 *
 * Runs once before all tests to prepare test environment.
 */

import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
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

// Supabase configuration (same env vars the frontend uses)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test user credentials
// Password must NOT contain firstName, lastName, or email parts
// Password requirements: 12+ chars, uppercase, lowercase, digits, special chars
const TEST_USER = {
  email: 'e2e-test@moneywise.app',
  password: 'Secure#Finance2025!',
  firstName: 'E2E',
  lastName: 'Automation',
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
  console.log(`📍 Supabase URL: ${SUPABASE_URL ? '✅ configured' : '❌ missing'}`);

  try {
    // Step 1: Verify Supabase configuration
    checkSupabaseConfig();

    // Step 2: Wait for frontend to be ready
    await waitForFrontend();

    // Step 3: Clean up previous auth state
    cleanupAuthState();

    // Step 4: Create test user pool via Supabase Auth
    await createTestUserPool();

    // Step 5: Create authenticated user session via browser
    await createAuthenticatedSession(config);

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Verify that Supabase environment variables are configured.
 * Without these, E2E tests cannot create users or authenticate.
 */
function checkSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase configuration is required for E2E tests.\n\n' +
      'Please set the following environment variables:\n' +
      '  NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL\n' +
      '  NEXT_PUBLIC_SUPABASE_ANON_KEY - Your Supabase anon/public key\n\n' +
      'These can be found in your Supabase Dashboard → Settings → API.'
    );
  }
  console.log('✅ Supabase configuration verified');
}

/**
 * Wait for the frontend dev server to be ready.
 * Replaces the old backend health check.
 */
async function waitForFrontend() {
  console.log('🌐 Waiting for frontend...');

  const maxRetries = 30;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(FRONTEND_URL, {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok || response.status === 200 || response.status === 304) {
        console.log('✅ Frontend is ready');
        return;
      }
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(`⏳ Frontend not ready (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay / 1000}s...`);
      }
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    `Frontend is not responding after ${maxRetries} attempts. ` +
    `Please ensure the dev server is running at ${FRONTEND_URL}`
  );
}

/**
 * Clean up any existing auth state
 */
function cleanupAuthState() {
  console.log('🧹 Cleaning up previous auth state...');

  if (fs.existsSync(AUTH_FILE)) {
    fs.unlinkSync(AUTH_FILE);
    console.log('✅ Removed previous auth state');
  } else {
    console.log('✅ No previous auth state found');
  }
}

/**
 * Create test user pool via Supabase Auth for parallel test execution.
 * Uses signUp() which works with the anon key.
 */
async function createTestUserPool() {
  console.log('👥 Creating test user pool via Supabase Auth...');

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  // Ensure .auth directory exists
  const authDir = path.dirname(TEST_USERS_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const createdUsers: Array<{ email: string; password: string }> = [];
  const failedUsers: Array<{ email: string; error: string }> = [];

  // Create shard users for parallel execution
  for (let i = 0; i < 8; i++) {
    const user = {
      email: `e2e-shard-${i}@moneywise.test`,
      password: 'SecureTest#2025!',
      firstName: 'E2E',
      lastName: `Shard${i}`,
    };

    try {
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            first_name: user.firstName,
            last_name: user.lastName,
          },
        },
      });

      if (error) {
        // "User already registered" is fine — means the user exists
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          createdUsers.push({ email: user.email, password: user.password });
          console.log(`  ✅ User ${i + 1}/8: ${user.email} (existing)`);
        } else {
          failedUsers.push({ email: user.email, error: error.message });
          console.warn(`  ⚠️ User ${i + 1}/8 failed: ${user.email} - ${error.message}`);
        }
      } else {
        createdUsers.push({ email: user.email, password: user.password });
        console.log(`  ✅ User ${i + 1}/8: ${user.email}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      failedUsers.push({ email: user.email, error: errorMsg });
      console.warn(`  ⚠️ User ${i + 1}/8 error: ${user.email} - ${errorMsg}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Also add the pre-defined test users
  for (const user of TEST_USERS) {
    try {
      const { error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            first_name: user.firstName,
            last_name: user.lastName,
          },
        },
      });

      if (!error || error.message?.includes('already registered') || error.message?.includes('already exists')) {
        createdUsers.push({ email: user.email, password: user.password });
        console.log(`  ✅ Predefined user: ${user.email}`);
      } else {
        console.warn(`  ⚠️ Predefined user failed: ${user.email} - ${error.message}`);
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
    throw new Error('Failed to create any test users. Please check Supabase connection and auth settings.');
  }
}

/**
 * Create authenticated user session via browser UI login.
 *
 * Uses UI-based login because Supabase Auth sets HttpOnly cookies
 * that need to go through the same-origin frontend middleware.
 */
async function createAuthenticatedSession(config: FullConfig) {
  console.log('👤 Creating authenticated user session...');

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Ensure primary test user exists via Supabase Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
      options: {
        data: {
          first_name: TEST_USER.firstName,
          last_name: TEST_USER.lastName,
        },
      },
    });

    if (signUpError && !signUpError.message?.includes('already registered') && !signUpError.message?.includes('already exists')) {
      console.warn(`⚠️ Test user signUp issue: ${signUpError.message}`);
      // Continue anyway — user might already exist and signUp returns an error
    } else {
      console.log('✅ Primary test user ready');
    }

    // Step 2: Login to get auth state via UI
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
 * Login via UI to get auth cookies
 *
 * IMPORTANT: Must use UI-based login because:
 * 1. Supabase Auth sets HttpOnly cookies through the middleware
 * 2. The frontend cookie refresh mechanism only works with same-origin requests
 * 3. Direct API signIn doesn't set browser cookies properly
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
      timeout: 10000,
    });

    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_USER.email);
    await page.fill('[data-testid="password-input"]', TEST_USER.password);

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 15000 }),
      page.click('[data-testid="login-button"]'),
    ]);

    // Verify we're logged in
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
