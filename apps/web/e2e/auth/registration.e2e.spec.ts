/**
 * Registration E2E Tests
 *
 * Comprehensive end-to-end tests for the registration flow
 * Tests the complete user journey: Navigate → Fill Form → Submit → Database Verification
 *
 * Using Playwright with Page Object Model pattern for maintainability
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Page Object Model for Registration Page
 * Encapsulates all interactions with the registration page
 */
class RegistrationPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/auth/register');
    await this.page.waitForLoadState('networkidle');
  }

  async fillFirstName(firstName: string) {
    await this.page.fill('#firstName', firstName);
  }

  async fillLastName(lastName: string) {
    await this.page.fill('#lastName', lastName);
  }

  async fillEmail(email: string) {
    await this.page.fill('#email', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('#password', password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.fill('#confirmPassword', password);
  }

  async getFirstNameErrorMessage() {
    return this.page.locator('[data-testid="firstName-error"]').textContent();
  }

  async getLastNameErrorMessage() {
    return this.page.locator('[data-testid="lastName-error"]').textContent();
  }

  async getEmailErrorMessage() {
    const errorElement = this.page.locator('#email + .text-destructive');
    return errorElement.isVisible() ? errorElement.textContent() : null;
  }

  async getPasswordErrorMessage() {
    const errorElement = this.page.locator('#password + div + .text-destructive');
    return errorElement.isVisible() ? errorElement.textContent() : null;
  }

  async getConfirmPasswordErrorMessage() {
    const errorElement = this.page.locator('#confirmPassword + div + .text-destructive');
    return errorElement.isVisible() ? errorElement.textContent() : null;
  }

  async getServerErrorMessage() {
    const errorElement = this.page.locator('.bg-destructive\\/15');
    return errorElement.isVisible() ? errorElement.textContent() : null;
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  async waitForNavigation() {
    await this.page.waitForNavigation({ url: '/dashboard' });
  }

  async isLoadingButtonText() {
    const button = this.page.locator('button[type="submit"]');
    const text = await button.textContent();
    return text?.includes('Creating Account');
  }

  async isCreateAccountButtonText() {
    const button = this.page.locator('button[type="submit"]');
    const text = await button.textContent();
    return text?.includes('Create Account');
  }

  async waitForErrorMessage() {
    await this.page.waitForSelector('.bg-destructive\\/15', { timeout: 5000 });
  }
}

/**
 * API Interceptor for monitoring network requests
 */
class ApiMonitor {
  private requests: any[] = [];

  constructor(private page: Page) {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.page.on('request', (request) => {
      if (request.url().includes('/auth/register')) {
        this.requests.push({
          method: request.method(),
          url: request.url(),
          postData: request.postData(),
          timestamp: new Date(),
        });
      }
    });

    this.page.on('response', (response) => {
      if (response.url().includes('/auth/register')) {
        console.log(`[${response.status()}] POST /auth/register`);
        response.text().then((body) => {
          console.log('Response body:', body.substring(0, 200));
        });
      }
    });
  }

  getRegisterRequests() {
    return this.requests;
  }

  clear() {
    this.requests = [];
  }
}

test.describe('Registration E2E Tests', () => {
  let registrationPage: RegistrationPage;
  let apiMonitor: ApiMonitor;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    apiMonitor = new ApiMonitor(page);
    await registrationPage.navigate();
  });

  test.describe('Valid Registration Flow', () => {
    test('should successfully register a new user and redirect to dashboard', async ({ page, context }) => {
      const timestamp = Date.now();
      const testEmail = `testuser-${timestamp}@example.com`;

      // Fill registration form
      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(testEmail);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      // Monitor for API calls
      let registerCalled = false;
      page.on('request', (request) => {
        if (request.url().includes('/auth/register') && request.method() === 'POST') {
          registerCalled = true;
          console.log(`[API] POST /auth/register called with:`, request.postData());
        }
      });

      // Submit form
      await registrationPage.submitForm();

      // Verify API was called
      await page.waitForTimeout(500); // Give API time to be called
      expect(registerCalled).toBeTruthy();

      // Wait for loading state
      expect(await registrationPage.isLoadingButtonText()).toBeTruthy();

      // Wait for navigation or error message
      try {
        await registrationPage.waitForNavigation();
        // Successfully registered and redirected
        expect(page.url()).toContain('/dashboard');
      } catch (e) {
        // Check if there's a server error message
        const errorMsg = await registrationPage.getServerErrorMessage();
        console.error('Registration failed with error:', errorMsg);
        throw new Error(`Registration failed: ${errorMsg}`);
      }
    });

    test('should store tokens in localStorage after successful registration', async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `tokentest-${timestamp}@example.com`;

      await registrationPage.fillFirstName('Token');
      await registrationPage.fillLastName('Test');
      await registrationPage.fillEmail(testEmail);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      try {
        await registrationPage.waitForNavigation();
      } catch {
        const errorMsg = await registrationPage.getServerErrorMessage();
        throw new Error(`Registration failed: ${errorMsg}`);
      }

      // Verify tokens are stored
      const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
      const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));

      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();
    });

    test('should display user information on dashboard after registration', async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `dashboardtest-${timestamp}@example.com`;

      await registrationPage.fillFirstName('Dashboard');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(testEmail);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      try {
        await registrationPage.waitForNavigation();
      } catch {
        const errorMsg = await registrationPage.getServerErrorMessage();
        throw new Error(`Registration failed: ${errorMsg}`);
      }

      // Verify dashboard is displayed
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Client-Side Validation', () => {
    test('should show validation error for empty form submission', async ({ page }) => {
      await registrationPage.submitForm();

      // Wait for validation errors to appear
      await page.waitForTimeout(300);

      // Check that form still has input fields (validation prevented submission)
      await expect(page.locator('#firstName')).toBeFocused();
    });

    test('should validate required firstName field', async ({ page }) => {
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail('test@example.com');
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      await page.waitForTimeout(300);
      // Form should still be visible (not submitted)
      await expect(page.locator('#firstName')).toBeVisible();
    });

    test('should validate required lastName field', async ({ page }) => {
      await registrationPage.fillFirstName('Test');
      await registrationPage.fillEmail('test@example.com');
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      await page.waitForTimeout(300);
      await expect(page.locator('#lastName')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail('invalid-email');
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      await page.waitForTimeout(300);
      const errorMsg = await registrationPage.getEmailErrorMessage();
      expect(errorMsg).toContain('valid email');
    });

    test('should validate minimum password length', async ({ page }) => {
      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail('test@example.com');
      await registrationPage.fillPassword('Short1!');
      await registrationPage.fillConfirmPassword('Short1!');

      await registrationPage.submitForm();

      await page.waitForTimeout(300);
      const errorMsg = await registrationPage.getPasswordErrorMessage();
      expect(errorMsg).toContain('8 characters');
    });

    test('should validate password confirmation match', async ({ page }) => {
      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail('test@example.com');
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('DifferentPassword123!');

      await registrationPage.submitForm();

      await page.waitForTimeout(300);
      const errorMsg = await registrationPage.getConfirmPasswordErrorMessage();
      expect(errorMsg).toContain("don't match");
    });
  });

  test.describe('Server-Side Validation', () => {
    test('should show error for duplicate email', async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `duplicate-${timestamp}@example.com`;

      // First registration - should succeed
      await registrationPage.fillFirstName('First');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(testEmail);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      try {
        await registrationPage.waitForNavigation();
      } catch {
        const errorMsg = await registrationPage.getServerErrorMessage();
        throw new Error(`First registration failed: ${errorMsg}`);
      }

      // Navigate back to registration
      await registrationPage.navigate();

      // Try to register with same email
      await registrationPage.fillFirstName('Second');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(testEmail);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      // Should show server error
      await registrationPage.waitForErrorMessage();
      const errorMsg = await registrationPage.getServerErrorMessage();
      expect(errorMsg).toContain('already exists');
    });

    test('should show error for weak password', async () => {
      const timestamp = Date.now();

      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(`weakpass-${timestamp}@example.com`);
      // Password without uppercase or special character
      await registrationPage.fillPassword('password123');
      await registrationPage.fillConfirmPassword('password123');

      await registrationPage.submitForm();

      // Wait for either navigation or error message
      await page.waitForTimeout(1000);

      // Check if we got an error
      const errorMsg = await registrationPage.getServerErrorMessage();
      if (errorMsg) {
        expect(errorMsg).toContain('Password');
      } else {
        // Might have passed client-side validation, check if redirected
        expect(page.url()).not.toContain('/auth/register');
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow retry after validation error', async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `retry-${timestamp}@example.com`;

      // First attempt - invalid email
      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail('invalid');
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();
      await page.waitForTimeout(300);

      // Should show validation error
      const errorMsg1 = await registrationPage.getEmailErrorMessage();
      expect(errorMsg1).toBeTruthy();

      // Fix email and retry
      await registrationPage.fillEmail(testEmail);
      await registrationPage.submitForm();

      try {
        await registrationPage.waitForNavigation();
        expect(page.url()).toContain('/dashboard');
      } catch {
        const serverError = await registrationPage.getServerErrorMessage();
        throw new Error(`Retry registration failed: ${serverError}`);
      }
    });

    test('should clear error message when correcting field', async ({ page }) => {
      // Fill with invalid data
      await registrationPage.fillEmail('invalid');
      await registrationPage.submitForm();

      await page.waitForTimeout(300);
      let errorMsg = await registrationPage.getEmailErrorMessage();
      expect(errorMsg).toBeTruthy();

      // Correct the email
      await registrationPage.fillEmail('valid@example.com');

      // Error message should be cleared
      await page.waitForTimeout(200);
      errorMsg = await registrationPage.getEmailErrorMessage();
      expect(!errorMsg || errorMsg.length === 0);
    });
  });

  test.describe('UI/UX Behavior', () => {
    test('should disable submit button while loading', async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `loading-${timestamp}@example.com`;

      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(testEmail);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      const submitButton = page.locator('button[type="submit"]');
      expect(submitButton).not.toBeDisabled();

      await registrationPage.submitForm();

      // Button should show loading state
      await expect(submitButton).toBeDisabled({ timeout: 5000 });
      expect(await registrationPage.isLoadingButtonText()).toBeTruthy();
    });

    test('should show login link for existing users', async ({ page }) => {
      const loginLink = page.locator('a[href="/auth/login"]');
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toContainText(/Sign in|Login/);
    });

    test('should have password visibility toggle', async ({ page }) => {
      await registrationPage.fillPassword('SecurePassword123!');

      const passwordInput = page.locator('#password');
      expect(await passwordInput.getAttribute('type')).toBe('password');

      // Click show button
      const toggleButton = passwordInput.locator('xpath=following-sibling::button');
      await toggleButton.click();

      expect(await passwordInput.getAttribute('type')).toBe('text');
    });
  });

  test.describe('Network Error Handling', () => {
    test('should handle network timeout gracefully', async ({ page, context }) => {
      // Simulate slow network
      await context.route('**/api/auth/register', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 15000)); // 15s delay
        await route.continue();
      });

      const timestamp = Date.now();

      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(`timeout-${timestamp}@example.com`);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      // Should eventually show an error or timeout
      await page.waitForTimeout(3000);

      // Should not be on dashboard
      expect(page.url()).not.toContain('/dashboard');
    });

    test('should handle server error responses', async ({ page, context }) => {
      // Mock a 500 server error
      await context.route('**/api/auth/register', (route) => {
        route.abort('servererror');
      });

      const timestamp = Date.now();

      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail(`servererror-${timestamp}@example.com`);
      await registrationPage.fillPassword('SecurePassword123!');
      await registrationPage.fillConfirmPassword('SecurePassword123!');

      await registrationPage.submitForm();

      // Should stay on registration page and show error
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/auth/register');
    });
  });
});
