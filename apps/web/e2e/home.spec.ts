/**
 * Home Page E2E Tests
 * Tests the main landing page functionality
 */

import { test, expect } from '@playwright/test';
import { TestContext } from './utils/test-helpers';

test.describe('Home Page', () => {
  test('should display home page correctly', async ({ page }) => {
    const ctx = new TestContext(page);

    await page.goto('/');

    // Check page title
    await ctx.assert.assertPageTitle(/MoneyWise/);

    // Check main heading
    await ctx.assert.assertElementVisible('[data-testid="hero-heading"]');

    // Check navigation elements
    await ctx.assert.assertElementVisible('[data-testid="nav-home"]');
    await ctx.assert.assertElementVisible('[data-testid="nav-features"]');
    await ctx.assert.assertElementVisible('[data-testid="nav-about"]');

    // Check call-to-action buttons
    await ctx.assert.assertElementVisible('[data-testid="cta-signup"]');
    await ctx.assert.assertElementVisible('[data-testid="cta-login"]');
  });

  test('should navigate to signup from home page', async ({ page }) => {
    const ctx = new TestContext(page);

    await page.goto('/');

    // Click signup button
    await page.click('[data-testid="cta-signup"]');

    // Should redirect to signup page
    await ctx.assert.assertUrl('/auth/register');
    await ctx.assert.assertElementVisible('[data-testid="signup-form"]');
  });

  test('should navigate to login from home page', async ({ page }) => {
    const ctx = new TestContext(page);

    await page.goto('/');

    // Click login button
    await page.click('[data-testid="cta-login"]');

    // Should redirect to login page
    await ctx.assert.assertUrl('/auth/login');
    await ctx.assert.assertElementVisible('[data-testid="login-form"]');
  });

  test('should display features section', async ({ page }) => {
    const ctx = new TestContext(page);

    await page.goto('/');

    // Scroll to features section
    await page.locator('[data-testid="features-section"]').scrollIntoViewIfNeeded();

    // Check feature cards
    await ctx.assert.assertElementVisible('[data-testid="feature-budgeting"]');
    await ctx.assert.assertElementVisible('[data-testid="feature-tracking"]');
    await ctx.assert.assertElementVisible('[data-testid="feature-reports"]');

    // Check feature descriptions
    await ctx.assert.assertElementText(
      '[data-testid="feature-budgeting"] h3',
      /Budget Management/
    );
    await ctx.assert.assertElementText(
      '[data-testid="feature-tracking"] h3',
      /Transaction Tracking/
    );
    await ctx.assert.assertElementText(
      '[data-testid="feature-reports"] h3',
      /Financial Reports/
    );
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Check mobile menu items
    await expect(page.locator('[data-testid="mobile-nav-features"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-about"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-cta-signup"]')).toBeVisible();
  });

  test('should handle 404 error gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');

    // Should show 404 page
    await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="404-heading"]')).toHaveText(/404/);
    await expect(page.locator('[data-testid="back-to-home"]')).toBeVisible();

    // Click back to home
    await page.click('[data-testid="back-to-home"]');
    await expect(page).toHaveURL('/');
  });
});