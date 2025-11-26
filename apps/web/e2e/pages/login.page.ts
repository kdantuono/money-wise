import { type Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Login Page Object for authentication flows
 */
export class LoginPage extends BasePage {
  // Selectors
  private readonly emailInput =
    '[data-testid="email-input"], input[type="email"], input[name="email"]';
  private readonly passwordInput =
    '[data-testid="password-input"], input[type="password"], input[name="password"]';
  private readonly loginButton =
    '[data-testid="login-button"], button[type="submit"], button:has-text("Login"), button:has-text("Sign In")';
  private readonly forgotPasswordLink =
    '[data-testid="forgot-password"], a:has-text("Forgot"), a:has-text("Reset")';
  private readonly registerLink =
    '[data-testid="register-link"], a:has-text("Register"), a:has-text("Sign Up")';
  private readonly errorMessage = '[data-testid="error-message"]';
  private readonly successMessage =
    '[data-testid="success-message"], .success, .alert-success';
  private readonly loadingSpinner =
    '[data-testid="loading"], .loading, .spinner';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    await this.goto('/auth/login');
    await this.waitForPageLoad();
  }

  /**
   * Check if we're on the login page
   */
  async isOnLoginPage(): Promise<boolean> {
    return await this.isElementVisible(this.loginButton);
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.clearAndFill(this.emailInput, email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.clearAndFill(this.passwordInput, password);
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.clickElement(this.loginButton);
  }

  /**
   * Perform complete login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  /**
   * Login with valid credentials and wait for success
   */
  async loginWithValidCredentials(
    email: string = 'test@example.com',
    password: string = 'password'
  ): Promise<void> {
    await this.login(email, password);

    // Wait for navigation away from login page (to dashboard)
    await this.waitForUrl(/dashboard|home/, 15000);
  }

  /**
   * Attempt login with invalid credentials
   */
  async loginWithInvalidCredentials(
    email: string = 'invalid@example.com',
    password: string = 'wrongpassword'
  ): Promise<void> {
    await this.login(email, password);

    // Wait for error message to appear
    await this.waitForElement(this.errorMessage, 10000);
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.clickElement(this.forgotPasswordLink);
  }

  /**
   * Click register link
   */
  async clickRegister(): Promise<void> {
    await this.clickElement(this.registerLink);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.getElementText(this.errorMessage);
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    return await this.getElementText(this.successMessage);
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.isElementVisible(this.loadingSpinner);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete(): Promise<void> {
    if (await this.isLoading()) {
      await this.waitForElementToHide(this.loadingSpinner, 15000);
    }
  }

  /**
   * Verify login form is present and functional
   */
  async verifyLoginFormElements(): Promise<void> {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.loginButton)).toBeVisible();
    await expect(this.page.locator(this.loginButton)).toBeEnabled();
  }

  /**
   * Test form validation
   */
  async testEmptyFormSubmission(): Promise<void> {
    await this.clickLogin();
    // Should show validation errors or prevent submission
    // This will depend on the actual form implementation
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.clearAndFill(this.emailInput, '');
    await this.clearAndFill(this.passwordInput, '');
  }

  /**
   * Check if email field has validation error
   */
  async hasEmailValidationError(): Promise<boolean> {
    const emailField = this.page.locator(this.emailInput);
    const isInvalid = await emailField.getAttribute('aria-invalid');
    return isInvalid === 'true';
  }

  /**
   * Check if password field has validation error
   */
  async hasPasswordValidationError(): Promise<boolean> {
    const passwordField = this.page.locator(this.passwordInput);
    const isInvalid = await passwordField.getAttribute('aria-invalid');
    return isInvalid === 'true';
  }

  /**
   * Get page heading/title
   */
  async getPageHeading(): Promise<string> {
    const headingSelectors = 'h1, h2, [data-testid="page-heading"]';
    return await this.getElementText(headingSelectors);
  }
}
