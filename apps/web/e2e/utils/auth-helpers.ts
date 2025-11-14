/**
 * Authentication Helpers
 * Utilities for handling authentication in E2E tests
 */

import { Page, expect } from '@playwright/test';
import { ROUTES, API_ROUTES } from '../config/routes';
import { TIMEOUTS } from '../config/timeouts';
import { TEST_IDS } from '../config/test-ids';
import { UserData, createUser, DEFAULT_TEST_USER } from '../factories/user.factory';
import * as path from 'path';
import * as fs from 'fs';

// Test user pool for parallel shard execution
interface TestUserPool {
  users: Array<{ email: string; password: string }>;
}

let TEST_USERS_POOL: TestUserPool | null = null;
let userPoolIndex = 0;

/**
 * Authentication helper class
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Wait for backend API to be ready
   * Prevents race conditions when backend is still initializing
   */
  private async waitForBackend(): Promise<void> {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const healthUrl = `${backendUrl}/api/health`;
    const maxAttempts = 5;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          return; // Backend is ready
        }
      } catch (error) {
        // Backend not responding yet
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error(`Backend not ready after ${maxAttempts} attempts`);
  }

  /**
   * Get CSRF token from page with retry logic
   * Ensures token is fresh and valid
   */
  private async getCsrfToken(retries = 3): Promise<string> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const token = await this.page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content') || '';
      });

      if (token) {
        return token;
      }

      // Token not found, reload page to get fresh token
      if (attempt < retries - 1) {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Failed to retrieve CSRF token after ${retries} attempts`);
  }

  /**
   * Load test user pool from JSON file
   */
  private loadTestUserPool(): TestUserPool {
    if (TEST_USERS_POOL) {
      return TEST_USERS_POOL;
    }

    const testUsersFile = path.join(__dirname, '../.auth/test-users.json');

    if (!fs.existsSync(testUsersFile)) {
      throw new Error(
        `Test user pool not found at ${testUsersFile}. ` +
        'Run global setup first to create test users.'
      );
    }

    const fileContent = fs.readFileSync(testUsersFile, 'utf-8');
    TEST_USERS_POOL = JSON.parse(fileContent);
    return TEST_USERS_POOL!;
  }

  /**
   * Login with pre-created pooled user (recommended for parallel tests)
   * Uses round-robin distribution to avoid conflicts between shards
   */
  async loginWithPooledUser(): Promise<void> {
    // Ensure backend is ready
    await this.waitForBackend();

    // Load test user pool
    const pool = this.loadTestUserPool();

    if (!pool.users || pool.users.length === 0) {
      throw new Error('Test user pool is empty');
    }

    // Get next user from pool (round-robin)
    const userIndex = (userPoolIndex++) % pool.users.length;
    const { email, password } = pool.users[userIndex];

    // Navigate to login page
    await this.page.goto(ROUTES.AUTH.LOGIN);
    await this.page.waitForLoadState('domcontentloaded');

    // Get fresh CSRF token with retry logic
    const csrfToken = await this.getCsrfToken();

    // Login via API with proper error handling
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const response = await this.page.request.post(`${backendUrl}/api/auth/login`, {
        data: {
          email,
          password,
          csrfToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok()) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Login failed (${response.status()}): ${errorText}`);
      }

      // Wait for authentication to complete and navigate to dashboard
      await this.page.waitForURL('**/dashboard', {
        timeout: TIMEOUTS.PAGE_LOAD,
        waitUntil: 'domcontentloaded'
      });
    } catch (error) {
      throw new Error(
        `Failed to login with pooled user ${email}: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Register a new user
   */
  async register(userData: UserData = createUser()): Promise<UserData> {
    await this.page.goto(ROUTES.AUTH.REGISTER);

    // Fill registration form using TEST_IDS constants
    await this.page.fill(TEST_IDS.AUTH.FIRST_NAME_INPUT, userData.firstName);
    await this.page.fill(TEST_IDS.AUTH.LAST_NAME_INPUT, userData.lastName);
    await this.page.fill(TEST_IDS.AUTH.EMAIL_INPUT, userData.email);
    await this.page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, userData.password);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes(API_ROUTES.AUTH.REGISTER) && response.status() === 201,
      { timeout: TIMEOUTS.API_REQUEST }
    );

    await this.page.click(TEST_IDS.AUTH.REGISTER_BUTTON);
    await responsePromise;

    // Wait for redirect
    await this.page.waitForURL(/^\/(dashboard|auth\/login)/, { timeout: TIMEOUTS.PAGE_TRANSITION });

    return userData;
  }

  /**
   * Login with credentials
   */
  async login(email: string = DEFAULT_TEST_USER.email, password: string = DEFAULT_TEST_USER.password): Promise<void> {
    await this.page.goto(ROUTES.AUTH.LOGIN);

    // Fill login form using TEST_IDS constants
    await this.page.fill(TEST_IDS.AUTH.EMAIL_INPUT, email);
    await this.page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, password);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes(API_ROUTES.AUTH.LOGIN),
      { timeout: TIMEOUTS.API_REQUEST }
    );

    await this.page.click(TEST_IDS.AUTH.LOGIN_BUTTON);
    const response = await responsePromise;

    if (response.status() === 200) {
      // Wait for redirect to dashboard
      await this.page.waitForURL(ROUTES.DASHBOARD, { timeout: TIMEOUTS.PAGE_TRANSITION });
    }
  }

  /**
   * Login with user object
   */
  async loginWithUser(user: UserData): Promise<void> {
    await this.login(user.email, user.password);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    // Try to find and click logout button
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();

    if (await logoutButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await logoutButton.click();
      await this.page.waitForURL(ROUTES.AUTH.LOGIN, { timeout: TIMEOUTS.PAGE_TRANSITION });
    } else {
      // Fallback: clear cookies and local storage
      await this.clearAuth();
    }
  }

  /**
   * Clear authentication state
   * Firefox-safe implementation that handles security restrictions
   */
  async clearAuth(): Promise<void> {
    // Clear cookies (works in all browsers)
    await this.page.context().clearCookies();

    // Clear localStorage and sessionStorage
    // Firefox requires navigating to a valid page first to avoid "operation is insecure" error
    try {
      // Try to navigate to base URL if not already there
      const currentUrl = this.page.url();
      if (!currentUrl || currentUrl === 'about:blank' || !currentUrl.startsWith('http')) {
        await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
      }

      // Now safe to clear storage
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      // If evaluate fails (Firefox security restrictions), use alternative method
      // This clears storage by using addInitScript for future page loads
      await this.page.context().addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate to ensure script runs
      await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {
        // Ignore navigation errors, storage will be cleared on next real navigation
      });
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // Check for auth token in localStorage
    const hasToken = await this.page.evaluate(() => {
      const authData = localStorage.getItem('auth-store');
      if (!authData) return false;

      try {
        const parsed = JSON.parse(authData);
        return parsed.state?.token || parsed.state?.accessToken || false;
      } catch {
        return false;
      }
    });

    return !!hasToken;
  }

  /**
   * Get current auth token
   */
  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const authData = localStorage.getItem('auth-store');
      if (!authData) return null;

      try {
        const parsed = JSON.parse(authData);
        return parsed.state?.token || parsed.state?.accessToken || null;
      } catch {
        return null;
      }
    });
  }

  /**
   * Set auth token directly (bypass login UI)
   */
  async setAuthToken(token: string): Promise<void> {
    await this.page.evaluate((authToken) => {
      const authStore = {
        state: {
          token: authToken,
          accessToken: authToken,
          isAuthenticated: true,
        },
        version: 0,
      };
      localStorage.setItem('auth-store', JSON.stringify(authStore));
    }, token);
  }

  /**
   * Register and login in one step
   */
  async registerAndLogin(userData: UserData = createUser()): Promise<UserData> {
    await this.register(userData);

    // If not already on dashboard, login
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/dashboard')) {
      await this.login(userData.email, userData.password);
    }

    return userData;
  }

  /**
   * Verify user is on login page
   */
  async expectLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(ROUTES.AUTH.LOGIN, { timeout: TIMEOUTS.PAGE_TRANSITION });
    await expect(this.page.locator(TEST_IDS.AUTH.EMAIL_INPUT)).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }

  /**
   * Verify user is on dashboard (authenticated)
   */
  async expectDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(ROUTES.DASHBOARD, { timeout: TIMEOUTS.PAGE_TRANSITION });
  }

  /**
   * Verify error message is shown
   */
  async expectAuthError(message?: string): Promise<void> {
    const errorAlert = this.page.locator(TEST_IDS.AUTH.ERROR_MESSAGE);
    await expect(errorAlert).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });

    if (message) {
      await expect(errorAlert).toContainText(message);
    }
  }
}

/**
 * Create auth helper for a page
 */
export function createAuthHelper(page: Page): AuthHelper {
  return new AuthHelper(page);
}

/**
 * Fixture for authenticated user
 * Use this in test.beforeEach to start with authenticated user
 */
export async function setupAuthenticatedUser(page: Page, userData?: UserData): Promise<UserData> {
  const auth = new AuthHelper(page);
  const user = userData || createUser();
  await auth.registerAndLogin(user);
  return user;
}
