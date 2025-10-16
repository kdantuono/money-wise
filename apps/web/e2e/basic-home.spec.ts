/**
 * Basic Home Page E2E Tests
 * Simple tests for the current minimal homepage
 */

import { test, expect } from '@playwright/test';

test.describe('Basic Home Page', () => {
  test('should display homepage with MoneyWise heading', async ({ page }) => {
    await page.goto('/');

    // Check main heading exists and has correct text
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('MoneyWise');

    // Check subtitle exists
    const subtitle = page.getByText('AI-powered Personal Finance Management');
    await expect(subtitle).toBeVisible();
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads without errors
    await expect(page).toHaveTitle(/MoneyWise/);

    // Check basic layout structure
    const container = page.locator('div').first();
    await expect(container).toBeVisible();

    // Verify responsive design classes are applied
    const mainDiv = page.locator('div.min-h-screen');
    await expect(mainDiv).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check content is still visible on mobile
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    const subtitle = page.getByText('AI-powered Personal Finance Management');
    await expect(subtitle).toBeVisible();
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Check main content is visible
    await expect(page.locator('h1')).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});