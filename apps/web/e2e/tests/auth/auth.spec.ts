/**
 * Authentication Tests
 * 
 * Comprehensive tests for authentication flows:
 * - Login with valid/invalid credentials
 * - Form validation
 * - Registration flow
 * - Protected route behavior
 * - Session persistence
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helpers';
import { createUser } from '../../factories/user.factory';
import { ROUTES } from '../../config/routes';
import { TEST_IDS } from '../../config/test-ids';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      const auth = new AuthHelper(page);
      
      await page.goto(ROUTES.AUTH.LOGIN);
      await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
      
      // Use existing test user
      await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-1@moneywise.test');
      await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
      
      // Wait for API response and navigation
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/auth/login') && r.status() === 200),
        page.click(TEST_IDS.AUTH.LOGIN_BUTTON)
      ]);
      
      // Verify redirect to dashboard
      await expect(page).toHaveURL(ROUTES.DASHBOARD, { timeout: 10000 });
      
      // Verify authenticated
      expect(await auth.isAuthenticated()).toBe(true);
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto(ROUTES.AUTH.LOGIN);
      await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
      
      await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'invalid@example.com');
      await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'wrongpassword');
      
      // Wait for API response
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/auth/login')),
        page.click(TEST_IDS.AUTH.LOGIN_BUTTON)
      ]);
      
      // Should stay on login page
      await expect(page).toHaveURL(ROUTES.AUTH.LOGIN);
      
      // Verify error message is shown
      await expect(page.locator(TEST_IDS.AUTH.ERROR_MESSAGE)).toBeVisible();
      await expect(page.locator(TEST_IDS.AUTH.ERROR_MESSAGE)).toContainText(/invalid/i);
    });

    test('should validate email format', async ({ page }) => {
      await page.goto(ROUTES.AUTH.LOGIN);
      await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
      
      // Fill invalid email
      await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'not-an-email');
      await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'somepassword');
      
      // Click submit button
      await page.click(TEST_IDS.AUTH.LOGIN_BUTTON);
      
      // Wait a moment for any potential API call
      await page.waitForTimeout(1000);
      
      // Should stay on login page (form validation prevents submission)
      await expect(page).toHaveURL(ROUTES.AUTH.LOGIN);
      
      // Verify login button is still visible (didn't navigate away)
      await expect(page.locator(TEST_IDS.AUTH.LOGIN_BUTTON)).toBeVisible();
    });
  });

  test.describe('Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      // Create user with timestamp to ensure uniqueness
      const timestamp = Date.now();
      const userData = createUser({
        email: `test-${timestamp}@example.com`
      });
      
      await page.goto(ROUTES.AUTH.REGISTER);
      await page.waitForSelector(TEST_IDS.AUTH.REGISTER_FORM, { state: 'visible' });
      
      // Fill registration form
      await page.fill(TEST_IDS.AUTH.FIRST_NAME_INPUT, userData.firstName);
      await page.fill(TEST_IDS.AUTH.LAST_NAME_INPUT, userData.lastName);
      await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, userData.email);
      await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, userData.password);
      await page.fill(TEST_IDS.AUTH.CONFIRM_PASSWORD_INPUT, userData.password);
      
      // Wait for API response and navigation
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/auth/register') && r.status() === 201),
        page.click(TEST_IDS.AUTH.REGISTER_BUTTON)
      ]);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(ROUTES.DASHBOARD, { timeout: 10000 });
      
      // Verify user name is displayed
      await expect(page.locator('h1')).toContainText(`Welcome back, ${userData.firstName}`);
    });

    test('should show error when registering with existing email', async ({ page }) => {
      await page.goto(ROUTES.AUTH.REGISTER);
      await page.waitForSelector(TEST_IDS.AUTH.REGISTER_FORM, { state: 'visible' });
      
      // Use existing user email
      await page.fill(TEST_IDS.AUTH.FIRST_NAME_INPUT, 'Test');
      await page.fill(TEST_IDS.AUTH.LAST_NAME_INPUT, 'User');
      await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-1@moneywise.test');
      await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
      await page.fill(TEST_IDS.AUTH.CONFIRM_PASSWORD_INPUT, 'SecureTest#2025!');
      
      // Wait for API response
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/auth/register')),
        page.click(TEST_IDS.AUTH.REGISTER_BUTTON)
      ]);
      
      // Should stay on registration page
      await expect(page).toHaveURL(ROUTES.AUTH.REGISTER);
      
      // Verify error message
      await expect(page.locator(TEST_IDS.AUTH.ERROR_MESSAGE_REGISTER)).toBeVisible();
      await expect(page.locator(TEST_IDS.AUTH.ERROR_MESSAGE_REGISTER)).toContainText(/already/i);
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto(ROUTES.AUTH.REGISTER);
      await page.waitForSelector(TEST_IDS.AUTH.REGISTER_FORM, { state: 'visible' });
      
      await page.fill(TEST_IDS.AUTH.FIRST_NAME_INPUT, 'Test');
      await page.fill(TEST_IDS.AUTH.LAST_NAME_INPUT, 'User');
      await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'test@example.com');
      await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'Password123!');
      await page.fill(TEST_IDS.AUTH.CONFIRM_PASSWORD_INPUT, 'DifferentPassword123!');
      
      // Blur to trigger validation
      await page.locator(TEST_IDS.AUTH.CONFIRM_PASSWORD_INPUT).blur();
      
      // Try to submit
      await page.click(TEST_IDS.AUTH.REGISTER_BUTTON);
      
      // Should show validation error
      const confirmError = page.locator('[data-testid="confirm-password-error"]');
      await expect(confirmError).toBeVisible({ timeout: 5000 });
      await expect(confirmError).toContainText(/don't match/i);
    });
  });

  test.describe('Protected Routes', () => {
    test('should require authentication for dashboard', async ({ browser }) => {
      // Fresh context with no cookies/state
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      try {
        await page.goto(ROUTES.DASHBOARD, { waitUntil: 'domcontentloaded' });

        // Middleware should redirect unauthenticated users to login
        // Wait for the redirect to complete
        await page.waitForURL(/\/auth\/login/, { timeout: 10000 });

        // Verify redirected to login page with returnUrl
        const url = page.url();
        expect(url).toContain('/auth/login');
        expect(url).toContain('returnUrl=%2Fdashboard');
      } finally {
        await context.close();
      }
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session across page refresh', async ({ page }) => {
      const auth = new AuthHelper(page);
      
      // Login
      await page.goto(ROUTES.AUTH.LOGIN);
      await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
      await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-2@moneywise.test');
      await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/auth/login')),
        page.click(TEST_IDS.AUTH.LOGIN_BUTTON)
      ]);
      
      await expect(page).toHaveURL(ROUTES.DASHBOARD);
      
      // Verify authenticated
      expect(await auth.isAuthenticated()).toBe(true);
      
      // Refresh page
      await page.reload();
      
      // Should still be on dashboard
      await expect(page).toHaveURL(ROUTES.DASHBOARD);
      await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 });
      
      // Should still be authenticated
      expect(await auth.isAuthenticated()).toBe(true);
    });
  });
});
