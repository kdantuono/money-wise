/**
 * Basic Home Page E2E Tests
 * Simple tests for the current minimal homepage
 * Tags: @smoke (quick sanity check)
 */

import { test, expect } from '@playwright/test';

test.describe('Basic Home Page @smoke', () => {
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

  test('should have Sign In and Sign Up buttons', async ({ page }) => {
    await page.goto('/');

    // Check Sign In button
    const signInButton = page.getByRole('link', { name: /sign in/i });
    await expect(signInButton).toBeVisible();

    // Check Sign Up button
    const signUpButton = page.getByRole('link', { name: /sign up/i });
    await expect(signUpButton).toBeVisible();
  });

  test('should navigate to login page when Sign In clicked', async ({ page }) => {
    await page.goto('/');

    const signInButton = page.getByRole('link', { name: /sign in/i });
    await signInButton.click();

    // Should redirect to login page
    await expect(page).toHaveURL('/auth/login');
  });

  test('should navigate to register page when Sign Up clicked', async ({ page }) => {
    await page.goto('/');

    const signUpButton = page.getByRole('link', { name: /sign up/i });
    await signUpButton.click();

    // Should redirect to register page
    await expect(page).toHaveURL('/auth/register');
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

    // Check buttons are visible
    const signInButton = page.getByRole('link', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });
});
