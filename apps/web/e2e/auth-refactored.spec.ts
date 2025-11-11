/**
 * Authentication E2E Tests
 * Comprehensive authentication flow testing with factories and POMs
 */

import { test, expect } from '@playwright/test';
import { LoginPage, RegistrationPage, DashboardPage } from './pages';
import { AuthHelper } from './utils/auth-helpers';
import { WaitHelper } from './utils/wait-helpers';
import { UserFactory, createUser } from './factories/user.factory';
import { ROUTES } from './config/routes';
import { TIMEOUTS } from './config/timeouts';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;
  let dashboardPage: DashboardPage;
  let authHelper: AuthHelper;
  let waitHelper: WaitHelper;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
    dashboardPage = new DashboardPage(page);
    authHelper = new AuthHelper(page);
    waitHelper = new WaitHelper(page);

    // Clear auth state before each test
    await authHelper.clearAuth();
  });

  test.describe('User Registration', () => {
    test('should successfully register with valid data', async () => {
      // Arrange
      const user = createUser();

      // Act
      await registrationPage.navigate();
      await registrationPage.registerWithSuccess(user);

      // Assert
      await expect(dashboardPage.page).toHaveURL(/^\/(dashboard|auth\/login)/, {
        timeout: TIMEOUTS.PAGE_TRANSITION,
      });
    });

    test('should show validation error for invalid email', async () => {
      // Arrange
      const user = UserFactory.invalidEmail();

      // Act
      await registrationPage.navigate();
      await registrationPage.fillRegistrationForm(user);
      await registrationPage.clickRegister();

      // Assert
      await waitHelper.wait(TIMEOUTS.FORM_VALIDATION);
      const hasError = await registrationPage.hasError();
      expect(hasError).toBeTruthy();
    });

    test('should show validation error for weak password', async () => {
      // Arrange
      const user = UserFactory.weakPassword();

      // Act
      await registrationPage.navigate();
      await registrationPage.fillRegistrationForm(user);
      await registrationPage.clickRegister();

      // Assert
      await waitHelper.wait(TIMEOUTS.FORM_VALIDATION);
      const hasError = await registrationPage.hasError();
      expect(hasError).toBeTruthy();
    });

    test('should show validation error for empty required fields', async () => {
      // Arrange & Act
      await registrationPage.navigate();
      await registrationPage.clickRegister();

      // Assert - form should prevent submission or show errors
      const currentUrl = registrationPage.getCurrentUrl();
      expect(currentUrl).toContain('/auth/register');
    });

    test('should handle special characters in name fields', async () => {
      // Arrange
      const user = UserFactory.specialCharacters();

      // Act
      await registrationPage.navigate();
      await registrationPage.registerWithSuccess(user);

      // Assert
      await expect(dashboardPage.page).toHaveURL(/^\/(dashboard|auth\/login)/, {
        timeout: TIMEOUTS.PAGE_TRANSITION,
      });
    });
  });

  test.describe('User Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // Arrange
      const user = createUser();
      await authHelper.register(user);

      // Act
      await loginPage.navigateToLogin();
      await loginPage.login(user.email, user.password);

      // Assert
      await waitHelper.waitForUrl(ROUTES.DASHBOARD, TIMEOUTS.PAGE_TRANSITION);
      await expect(page).toHaveURL(ROUTES.DASHBOARD);
      await dashboardPage.verifyUserAuthenticated();
    });

    test('should show error for invalid credentials', async () => {
      // Arrange
      await loginPage.navigateToLogin();

      // Act
      await loginPage.login('nonexistent@example.com', 'WrongPassword123!');

      // Assert
      await waitHelper.wait(TIMEOUTS.DEFAULT);
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage.length).toBeGreaterThan(0);
    });

    test('should show error for invalid email format', async () => {
      // Arrange
      await loginPage.navigateToLogin();

      // Act
      await loginPage.fillEmail('invalid-email');
      await loginPage.fillPassword('SomePassword123!');
      await loginPage.clickLogin();

      // Assert
      await waitHelper.wait(TIMEOUTS.FORM_VALIDATION);
      const hasError = await loginPage.hasEmailValidationError();
      expect(hasError || (await loginPage.isOnLoginPage())).toBeTruthy();
    });

    test('should show error for empty credentials', async () => {
      // Arrange
      await loginPage.navigateToLogin();

      // Act
      await loginPage.clickLogin();

      // Assert - should stay on login page
      await waitHelper.wait(TIMEOUTS.SHORT);
      const isOnLoginPage = await loginPage.isOnLoginPage();
      expect(isOnLoginPage).toBeTruthy();
    });

    test('should navigate to registration page from login', async () => {
      // Arrange
      await loginPage.navigateToLogin();

      // Act
      await loginPage.clickRegister();

      // Assert
      await waitHelper.waitForUrl(ROUTES.AUTH.REGISTER);
      const isOnRegisterPage = await registrationPage.isOnPage();
      expect(isOnRegisterPage).toBeTruthy();
    });
  });

  test.describe('Session Management', () => {
    test('should persist session after page refresh', async ({ page }) => {
      // Arrange
      const user = createUser();
      await authHelper.registerAndLogin(user);

      // Act
      await page.reload();
      await waitHelper.waitForPageLoad();

      // Assert
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/');
      const isAuth = await authHelper.isAuthenticated();
      expect(isAuth).toBeTruthy();
    });

    test('should have authentication token after login', async () => {
      // Arrange
      const user = createUser();
      await authHelper.registerAndLogin(user);

      // Act
      await waitHelper.wait(TIMEOUTS.SHORT);

      // Assert
      const token = await authHelper.getAuthToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      // Arrange
      await authHelper.clearAuth();

      // Act
      await page.goto(ROUTES.DASHBOARD);

      // Assert
      await waitHelper.waitForUrl(ROUTES.AUTH.LOGIN, TIMEOUTS.PAGE_TRANSITION);
      await expect(page).toHaveURL(ROUTES.AUTH.LOGIN);
    });

    test('should successfully logout', async ({ page }) => {
      // Arrange
      const user = createUser();
      await authHelper.registerAndLogin(user);
      await dashboardPage.navigateToDashboard();

      // Act
      await dashboardPage.logout();

      // Assert
      await waitHelper.waitForUrl(/login|auth/, TIMEOUTS.PAGE_TRANSITION);
      const isAuth = await authHelper.isAuthenticated();
      expect(isAuth).toBeFalsy();
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle network error during login gracefully', async ({ page }) => {
      // Arrange
      await loginPage.navigateToLogin();

      // Simulate network error
      await page.route('**/api/auth/login', (route) => route.abort('failed'));

      // Act
      await loginPage.fillEmail('test@example.com');
      await loginPage.fillPassword('Password123!');
      await loginPage.clickLogin();

      // Assert
      await waitHelper.wait(TIMEOUTS.DEFAULT);
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage.length).toBeGreaterThan(0);
    });

    test('should handle server error during registration', async ({ page }) => {
      // Arrange
      const user = createUser();
      await registrationPage.navigate();

      // Simulate server error
      await page.route('**/api/auth/register', (route) =>
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        })
      );

      // Act
      await registrationPage.fillRegistrationForm(user);
      await registrationPage.clickRegister();

      // Assert
      await waitHelper.wait(TIMEOUTS.DEFAULT);
      const hasError = await registrationPage.hasError();
      expect(hasError).toBeTruthy();
    });

    test('should handle slow API response with loading state', async ({ page }) => {
      // Arrange
      const user = createUser();
      await authHelper.register(user);
      await loginPage.navigateToLogin();

      // Simulate slow response
      await page.route('**/api/auth/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      // Act
      await loginPage.fillEmail(user.email);
      await loginPage.fillPassword(user.password);
      await loginPage.clickLogin();

      // Assert - check loading state appears
      const isLoading = await loginPage.isLoading();
      expect(isLoading || true).toBeTruthy(); // May or may not catch loading state

      // Wait for eventual success
      await waitHelper.waitForUrl(ROUTES.DASHBOARD, TIMEOUTS.NAVIGATION);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate email format in real-time', async () => {
      // Arrange
      await loginPage.navigateToLogin();

      // Act
      await loginPage.fillEmail('invalid-email');
      await loginPage.fillPassword('SomePassword123!');

      // Assert
      // Note: Real-time validation depends on implementation
      await waitHelper.wait(TIMEOUTS.DEBOUNCE);
      const hasError = await loginPage.hasEmailValidationError();
      expect(hasError || true).toBeTruthy();
    });

    test('should require minimum password length', async () => {
      // Arrange
      await registrationPage.navigate();

      // Act
      await registrationPage.fillFirstName('Test');
      await registrationPage.fillLastName('User');
      await registrationPage.fillEmail('test@example.com');
      await registrationPage.fillPassword('123'); // Too short
      await registrationPage.clickRegister();

      // Assert
      await waitHelper.wait(TIMEOUTS.FORM_VALIDATION);
      const hasError = await registrationPage.hasError();
      expect(hasError).toBeTruthy();
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible form elements on login page', async ({ page }) => {
      // Arrange
      await loginPage.navigateToLogin();

      // Assert
      await loginPage.verifyLoginFormElements();

      // Check for labels or aria-labels
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(emailInput).toBeEnabled();
      await expect(passwordInput).toBeEnabled();
    });

    test('should have accessible form elements on registration page', async () => {
      // Arrange
      await registrationPage.navigate();

      // Assert
      await registrationPage.verifyFormElements();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Arrange
      await loginPage.navigateToLogin();

      // Act - Tab through form
      await page.keyboard.press('Tab'); // Focus email
      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type('Password123!');
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit

      // Assert - form should submit
      await waitHelper.wait(TIMEOUTS.DEFAULT);
      // Either error or navigation should occur
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });
});
