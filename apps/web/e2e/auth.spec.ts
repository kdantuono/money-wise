import { test, expect } from '@playwright/test';
import { generateTestData, apiEndpoints } from './fixtures/test-data';

test.describe('Authentication - Critical User Journey', () => {
  const testUser = generateTestData.user();

  test.describe('User Registration', () => {
    test('should successfully register a new user with valid data', async ({ page }) => {
      await page.goto('/auth/register');

      // Fill registration form
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Submit form
      await page.click('button:has-text("Sign Up")');

      // Wait for redirect to dashboard or login confirmation
      await expect(page).toHaveURL(/^\/(dashboard|auth\/login)/, { timeout: 10000 });
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/auth/register');

      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', testUser.password);

      await page.click('button:has-text("Sign Up")');

      // Should show validation error
      const errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();
    });

    test('should show validation error for weak password', async ({ page }) => {
      await page.goto('/auth/register');

      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', '123456'); // Weak password

      await page.click('button:has-text("Sign Up")');

      // Should show password validation error
      const errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // First register a user
      await page.goto('/auth/register');
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button:has-text("Sign Up")');

      // Wait for redirect
      await page.waitForTimeout(2000);

      // Now login
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button:has-text("Sign In")');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button:has-text("Sign In")');

      // Should show error alert
      const errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();
    });

    test('should persist login session after page refresh', async ({ page, context }) => {
      // Register and login
      await page.goto('/auth/register');
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button:has-text("Sign Up")');

      // Wait for successful login
      await expect(page).toHaveURL(/^\/(dashboard|auth\/login)/, { timeout: 10000 });

      // Refresh page
      await page.reload();

      // Should still be authenticated
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/');
    });
  });

  test.describe('Session Management', () => {
    test('should have authentication token in localStorage after login', async ({ page }) => {
      await page.goto('/auth/register');
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button:has-text("Sign Up")');

      await page.waitForTimeout(2000);

      // Check localStorage for auth tokens
      const hasToken = await page.evaluate(() => {
        const authData = localStorage.getItem('auth-store');
        return authData ? authData.includes('token') || authData.includes('Bearer') : false;
      });

      expect(hasToken).toBeTruthy();
    });

    test('should redirect to login when accessing protected routes without auth', async ({ page }) => {
      // Clear localStorage to simulate no auth
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());

      // Try to access protected dashboard
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/auth/login', { timeout: 5000 });
    });
  });
});
