/**
 * Authentication Helpers
 * Utilities for handling authentication in E2E tests
 */

import { Page, expect } from '@playwright/test';
import { ROUTES, API_ROUTES } from '../config/routes';
import { TIMEOUTS } from '../config/timeouts';
import { UserData, createUser, DEFAULT_TEST_USER } from '../factories/user.factory';

/**
 * Authentication helper class
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Register a new user
   */
  async register(userData: UserData = createUser()): Promise<UserData> {
    await this.page.goto(ROUTES.AUTH.REGISTER);

    // Fill registration form
    await this.page.fill('input[name="firstName"]', userData.firstName);
    await this.page.fill('input[name="lastName"]', userData.lastName);
    await this.page.fill('input[name="email"]', userData.email);
    await this.page.fill('input[name="password"]', userData.password);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes(API_ROUTES.AUTH.REGISTER) && response.status() === 201,
      { timeout: TIMEOUTS.API_REQUEST }
    );

    await this.page.click('button:has-text("Sign Up")');
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

    // Fill login form
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes(API_ROUTES.AUTH.LOGIN),
      { timeout: TIMEOUTS.API_REQUEST }
    );

    await this.page.click('button:has-text("Sign In")');
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
   */
  async clearAuth(): Promise<void> {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
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
    await expect(this.page.locator('input[name="email"]')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
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
    const errorAlert = this.page.locator('[role="alert"]').first();
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
