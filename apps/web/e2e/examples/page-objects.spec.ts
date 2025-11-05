import { test, expect } from '@playwright/test';
import { createPageObjects } from '../pages';

/**
 * Example test demonstrating page objects usage
 * This file serves as documentation and reference for using page objects
 */
test.describe('Page Objects Example Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup MSW for E2E tests if needed
    await page.addInitScript(() => {
      if (process.env.NODE_ENV === 'test') {
        // Initialize MSW for browser environment
        import('/__mocks__/api/browser.js').then(({ startWorker }) => {
          return startWorker();
        });
      }
    });
  });

  test('should demonstrate login page object usage', async ({ page }) => {
    const pageObjects = createPageObjects(page);

    // Navigate to login page
    await pageObjects.login.navigateToLogin();

    // Verify we're on login page
    expect(await pageObjects.login.isOnLoginPage()).toBe(true);

    // Verify form elements are present
    await pageObjects.login.verifyLoginFormElements();

    // Test login with valid credentials
    await pageObjects.login.loginWithValidCredentials();

    // Verify we're redirected to dashboard
    expect(await pageObjects.dashboard.isOnDashboard()).toBe(true);
  });

  test('should demonstrate dashboard page object usage', async ({ page }) => {
    const pageObjects = createPageObjects(page);

    // Login first
    await pageObjects.login.navigateToLogin();
    await pageObjects.login.loginWithValidCredentials();

    // Now on dashboard
    await pageObjects.dashboard.waitForDashboardLoad();

    // Verify dashboard components
    await pageObjects.dashboard.verifyDashboardComponents();

    // Get account information
    const accountsCount = await pageObjects.dashboard.getAccountsCount();
    console.log(`Found ${accountsCount} accounts`);

    if (accountsCount > 0) {
      const accountNames = await pageObjects.dashboard.getAccountNames();
      console.log('Account names:', accountNames);
    }

    // Get transaction information
    const transactionsCount =
      await pageObjects.dashboard.getTransactionsCount();
    console.log(`Found ${transactionsCount} transactions`);

    if (transactionsCount > 0) {
      const recentTransactions =
        await pageObjects.dashboard.getRecentTransactions();
      console.log('Recent transactions:', recentTransactions);
    }
  });

  test('should demonstrate error handling with page objects', async ({
    page,
  }) => {
    const pageObjects = createPageObjects(page);

    // Navigate to login page
    await pageObjects.login.navigateToLogin();

    // Test login with invalid credentials
    await pageObjects.login.loginWithInvalidCredentials();

    // Verify error message appears
    const errorMessage = await pageObjects.login.getErrorMessage();
    expect(errorMessage).toContain('Invalid credentials');

    // Verify we're still on login page
    expect(await pageObjects.login.isOnLoginPage()).toBe(true);
  });

  test('should demonstrate logout flow', async ({ page }) => {
    const pageObjects = createPageObjects(page);

    // Login first
    await pageObjects.login.navigateToLogin();
    await pageObjects.login.loginWithValidCredentials();

    // Verify we're on dashboard
    await pageObjects.dashboard.waitForDashboardLoad();
    await pageObjects.dashboard.verifyUserAuthenticated();

    // Logout
    await pageObjects.dashboard.logout();

    // Verify we're back on login page
    expect(await pageObjects.login.isOnLoginPage()).toBe(true);
  });

  test('should demonstrate form validation', async ({ page }) => {
    const pageObjects = createPageObjects(page);

    // Navigate to login page
    await pageObjects.login.navigateToLogin();

    // Test empty form submission
    await pageObjects.login.testEmptyFormSubmission();

    // Check for validation errors (this depends on form implementation)
    // The actual validation behavior will depend on the form's implementation
  });

  test('should demonstrate page navigation and URL verification', async ({
    page,
  }) => {
    const pageObjects = createPageObjects(page);

    // Start on login page
    await pageObjects.login.navigateToLogin();
    expect(page.url()).toContain('/auth/login');

    // Login and verify dashboard URL
    await pageObjects.login.loginWithValidCredentials();
    expect(page.url()).toContain('/dashboard');

    // Verify dashboard title
    const title = await pageObjects.dashboard.getDashboardTitle();
    expect(title).toBeTruthy();
  });

  test('should demonstrate wait helpers and loading states', async ({
    page,
  }) => {
    const pageObjects = createPageObjects(page);

    // Login
    await pageObjects.login.navigateToLogin();
    await pageObjects.login.fillEmail('test@example.com');
    await pageObjects.login.fillPassword('password');
    await pageObjects.login.clickLogin();

    // Check if loading state appears and wait for it to complete
    if (await pageObjects.login.isLoading()) {
      await pageObjects.login.waitForLoadingToComplete();
    }

    // Wait for dashboard to load
    await pageObjects.dashboard.waitForDashboardLoad();

    // Wait for data to load
    await pageObjects.dashboard.waitForDataLoad();
  });
});
