/**
 * Authentication E2E Tests
 * Tests login, signup, and authentication flows
 */

import { test, expect } from '@playwright/test';
import { TestContext } from '../utils/test-helpers';
import { testUsers, generateTestData } from '../fixtures/test-data';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      const ctx = new TestContext(page);

      await page.goto('/auth/login');

      // Fill login form
      await ctx.form.fillForm({
        email: testUsers.validUser.email,
        password: testUsers.validUser.password,
      });

      // Submit form
      await ctx.form.submitForm('login-button');

      // Should redirect to dashboard
      await ctx.assert.assertUrl('/dashboard');
      await ctx.assert.assertElementVisible('[data-testid="dashboard"]');

      // Should show user information
      await ctx.assert.assertElementText(
        '[data-testid="user-name"]',
        `${testUsers.validUser.firstName} ${testUsers.validUser.lastName}`
      );
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const ctx = new TestContext(page);

      await page.goto('/auth/login');

      // Fill login form with invalid credentials
      await ctx.form.fillForm({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });

      // Submit form
      await ctx.form.submitForm('login-button');

      // Should show error message
      await ctx.assert.assertElementVisible('[data-testid="error-message"]');
      await ctx.assert.assertElementText(
        '[data-testid="error-message"]',
        /Invalid email or password/
      );

      // Should stay on login page
      await ctx.assert.assertUrl('/auth/login');
    });

    test('should validate required fields', async ({ page }) => {
      const ctx = new TestContext(page);

      await page.goto('/auth/login');

      // Try to submit empty form
      await ctx.form.submitForm('login-button');

      // Should show validation errors
      await ctx.form.waitForValidationError('email');
      await ctx.form.waitForValidationError('password');

      // Check error messages
      await ctx.assert.assertElementText(
        '[data-testid="email-error"]',
        /Email is required/
      );
      await ctx.assert.assertElementText(
        '[data-testid="password-error"]',
        /Password is required/
      );
    });

    test('should validate email format', async ({ page }) => {
      const ctx = new TestContext(page);

      await page.goto('/auth/login');

      // Fill invalid email
      await ctx.form.fillForm({
        email: 'invalid-email',
        password: 'password123',
      });

      await ctx.form.submitForm('login-button');

      // Should show email format error
      await ctx.form.waitForValidationError('email');
      await ctx.assert.assertElementText(
        '[data-testid="email-error"]',
        /Please enter a valid email/
      );
    });
  });

  test.describe('Signup', () => {
    test('should signup with valid information', async ({ page }) => {
      const ctx = new TestContext(page);
      const newUser = generateTestData.user();

      await page.goto('/auth/register');

      // Fill signup form
      await ctx.auth.signup(newUser);

      // Should redirect to email verification or dashboard
      await expect(page).toHaveURL(/\/(verify-email|dashboard)/);

      if (page.url().includes('verify-email')) {
        await ctx.assert.assertElementVisible('[data-testid="verification-message"]');
      } else {
        await ctx.assert.assertElementVisible('[data-testid="dashboard"]');
      }
    });

    test('should show error for existing email', async ({ page }) => {
      const ctx = new TestContext(page);

      await page.goto('/auth/register');

      // Try to signup with existing email
      await ctx.auth.signup(testUsers.validUser);

      // Should show error message
      await ctx.assert.assertElementVisible('[data-testid="error-message"]');
      await ctx.assert.assertElementText(
        '[data-testid="error-message"]',
        /Email already exists/
      );
    });

    test('should validate password strength', async ({ page }) => {
      const ctx = new TestContext(page);

      await page.goto('/auth/register');

      // Fill form with weak password
      await ctx.form.fillForm({
        'first-name': 'Test',
        'last-name': 'User',
        email: 'test@example.com',
        password: '123',
        'confirm-password': '123',
      });

      await ctx.form.submitForm('signup-button');

      // Should show password strength error
      await ctx.form.waitForValidationError('password');
      await ctx.assert.assertElementText(
        '[data-testid="password-error"]',
        /Password must be at least 8 characters/
      );
    });

    test('should validate password confirmation', async ({ page }) => {
      const ctx = new TestContext(page);

      await page.goto('/auth/register');

      // Fill form with mismatched passwords
      await ctx.form.fillForm({
        'first-name': 'Test',
        'last-name': 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        'confirm-password': 'DifferentPassword123!',
      });

      await ctx.form.submitForm('signup-button');

      // Should show password confirmation error
      await ctx.form.waitForValidationError('confirm-password');
      await ctx.assert.assertElementText(
        '[data-testid="confirm-password-error"]',
        /Passwords do not match/
      );
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      const ctx = new TestContext(page);

      // Login first
      await ctx.auth.login();

      // Should be on dashboard
      await ctx.assert.assertUrl('/dashboard');

      // Logout
      await ctx.auth.logout();

      // Should redirect to login page
      await ctx.assert.assertUrl('/auth/login');

      // Should not have access to protected routes
      await page.goto('/dashboard');
      await ctx.assert.assertUrl('/auth/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login for unauthenticated users', async ({ page }) => {
      const protectedRoutes = ['/dashboard', '/accounts', '/transactions', '/budgets', '/reports'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL('/auth/login');
      }
    });

    test('should allow access to protected routes after login', async ({ page }) => {
      const ctx = new TestContext(page);

      // Login first
      await ctx.auth.login();

      const protectedRoutes = [
        { path: '/dashboard', testId: 'dashboard' },
        { path: '/accounts', testId: 'accounts-page' },
        { path: '/transactions', testId: 'transactions-page' },
        { path: '/budgets', testId: 'budgets-page' },
        { path: '/reports', testId: 'reports-page' },
      ];

      for (const route of protectedRoutes) {
        await page.goto(route.path);
        await ctx.assert.assertUrl(route.path);
        await ctx.assert.assertElementVisible(`[data-testid="${route.testId}"]`);
      }
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page refreshes', async ({ page }) => {
      const ctx = new TestContext(page);

      // Login
      await ctx.auth.login();
      await ctx.assert.assertUrl('/dashboard');

      // Refresh page
      await page.reload();

      // Should still be logged in
      await ctx.assert.assertUrl('/dashboard');
      await ctx.assert.assertElementVisible('[data-testid="dashboard"]');
    });

    test('should handle expired session gracefully', async ({ page }) => {
      const ctx = new TestContext(page);

      // Login
      await ctx.auth.login();

      // Simulate expired session by clearing auth token
      await page.evaluate(() => {
        localStorage.removeItem('auth-token');
        sessionStorage.removeItem('auth-token');
      });

      // Try to access protected route
      await page.goto('/accounts');

      // Should redirect to login
      await ctx.assert.assertUrl('/auth/login');
      await ctx.assert.assertElementVisible('[data-testid="session-expired-message"]');
    });
  });
});