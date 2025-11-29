/**
 * Dashboard Tests
 * 
 * Tests for dashboard functionality:
 * - User name display
 * - Financial data widgets
 * - Navigation
 * - Quick actions
 */

import { test, expect } from '@playwright/test';
import { ROUTES } from '../../config/routes';
import { TEST_IDS } from '../../config/test-ids';

// Helper to login before each test
test.beforeEach(async ({ page }) => {
  // Login
  await page.goto(ROUTES.AUTH.LOGIN);
  await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
  await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-3@moneywise.test');
  await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login')),
    page.click(TEST_IDS.AUTH.LOGIN_BUTTON)
  ]);
  
  await expect(page).toHaveURL(ROUTES.DASHBOARD);
});

test.describe('Dashboard', () => {
  test('should display user name', async ({ page }) => {
    // Verify welcome message with user name
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 });
    
    // Verify user name element is visible
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  });

  test('should display financial data widgets', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 });
    
    // Verify Total Balance widget
    await expect(page.locator(TEST_IDS.DASHBOARD.CURRENT_BALANCE)).toBeVisible();
    await expect(page.locator(TEST_IDS.DASHBOARD.CURRENT_BALANCE)).toContainText('Total Balance');
    await expect(page.locator(TEST_IDS.DASHBOARD.CURRENT_BALANCE)).toContainText('$');
    
    // Verify Recent Transactions widget
    await expect(page.locator(TEST_IDS.DASHBOARD.RECENT_TRANSACTIONS)).toBeVisible();
    await expect(page.locator(TEST_IDS.DASHBOARD.RECENT_TRANSACTIONS)).toContainText('Recent Transactions');
    
    // Verify Category Breakdown widget
    await expect(page.locator(TEST_IDS.DASHBOARD.CATEGORY_BREAKDOWN)).toBeVisible();
    await expect(page.locator(TEST_IDS.DASHBOARD.CATEGORY_BREAKDOWN)).toContainText('Budget Overview');
  });

  test('should have working navigation', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 });
    
    // Verify main navigation links are present
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Accounts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Transactions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Investments' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Goals' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    
    // Verify logout button is present
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('should display quick actions', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 });
    
    // Scroll to quick actions section if needed
    const quickActionsSection = page.locator('text=Quick Actions').first();
    await quickActionsSection.scrollIntoViewIfNeeded();
    
    // Verify quick action links are present (these are Link elements, not buttons)
    await expect(page.getByRole('link', { name: /add account/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /add transaction/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /set budget/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /schedule payment/i })).toBeVisible();
  });
});
