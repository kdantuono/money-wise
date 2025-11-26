/**
 * Smoke Tests - Fast Critical Path Validation
 * 
 * These tests run on every PR to catch critical failures quickly.
 * Goal: <2 minutes execution time with 2 workers
 * 
 * Tests:
 * 1. Home page loads
 * 2. Login page accessible
 * 3. Can login with valid credentials
 * 4. Dashboard loads after login
 * 5. Can logout
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helpers';
import { ROUTES } from '../../config/routes';
import { TEST_IDS } from '../../config/test-ids';

test.describe('Smoke Tests', () => {
  test('1. Home page loads', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loads
    await expect(page).toHaveURL('/');
    
    // Verify key content
    await expect(page.locator('h1')).toContainText('MoneyWise');
    
    // Verify auth links are present
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('2. Login page accessible', async ({ page }) => {
    await page.goto(ROUTES.AUTH.LOGIN);
    
    // Verify we're on login page
    await expect(page).toHaveURL(ROUTES.AUTH.LOGIN);
    
    // Wait for form to be hydrated (ClientOnly component)
    await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Verify form elements are present
    await expect(page.locator(TEST_IDS.AUTH.EMAIL_INPUT)).toBeVisible();
    await expect(page.locator(TEST_IDS.AUTH.PASSWORD_INPUT)).toBeVisible();
    await expect(page.locator(TEST_IDS.AUTH.LOGIN_BUTTON)).toBeVisible();
  });

  test('3. Can login with valid credentials', async ({ page }) => {
    const auth = new AuthHelper(page);
    
    // Use first test user from pool (created in global setup)
    await page.goto(ROUTES.AUTH.LOGIN);
    await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
    
    await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-0@moneywise.test');
    await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
    
    // Click login and wait for navigation
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/auth/login') && response.status() === 200
      ),
      page.click(TEST_IDS.AUTH.LOGIN_BUTTON)
    ]);
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(ROUTES.DASHBOARD, { timeout: 10000 });
    
    // Verify auth state
    expect(await auth.isAuthenticated()).toBe(true);
  });

  test('4. Dashboard loads after login', async ({ page }) => {
    // Login via UI
    await page.goto(ROUTES.AUTH.LOGIN);
    await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
    await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-0@moneywise.test');
    await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
    
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/login')),
      page.click(TEST_IDS.AUTH.LOGIN_BUTTON)
    ]);
    
    await expect(page).toHaveURL(ROUTES.DASHBOARD, { timeout: 10000 });
    
    // Verify dashboard content is visible (page loaded successfully)
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 });
    
    // Verify user name is displayed (first name from email prefix)
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    
    // Verify key dashboard widgets
    await expect(page.locator(TEST_IDS.DASHBOARD.CURRENT_BALANCE)).toBeVisible();
    await expect(page.locator(TEST_IDS.DASHBOARD.RECENT_TRANSACTIONS)).toBeVisible();
  });

  test('5. Can logout', async ({ page }) => {
    const auth = new AuthHelper(page);
    
    // Login first via UI
    await page.goto(ROUTES.AUTH.LOGIN);
    await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
    await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-0@moneywise.test');
    await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/login')),
      page.click(TEST_IDS.AUTH.LOGIN_BUTTON)
    ]);
    await expect(page).toHaveURL(ROUTES.DASHBOARD);
    
    // Logout
    await auth.logout();
    
    // Verify redirected to login
    await expect(page).toHaveURL(ROUTES.AUTH.LOGIN, { timeout: 10000 });
    
    // Verify no longer authenticated
    expect(await auth.isAuthenticated()).toBe(false);
  });
});
