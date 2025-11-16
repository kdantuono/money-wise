/**
 * Registration Page Object
 * Page object model for user registration
 */

import { type Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES, API_ROUTES } from '../config/routes';
import { TEST_IDS } from '../config/test-ids';
import { TIMEOUTS } from '../config/timeouts';
import { UserData } from '../factories/user.factory';

export class RegistrationPage extends BasePage {
  // Selectors
  private readonly form = TEST_IDS.AUTH.REGISTER_FORM;
  private readonly firstNameInput = TEST_IDS.AUTH.FIRST_NAME_INPUT;
  private readonly lastNameInput = TEST_IDS.AUTH.LAST_NAME_INPUT;
  private readonly emailInput = TEST_IDS.AUTH.EMAIL_INPUT;
  private readonly passwordInput = TEST_IDS.AUTH.PASSWORD_INPUT;
  private readonly confirmPasswordInput = TEST_IDS.AUTH.CONFIRM_PASSWORD_INPUT;
  private readonly registerButton = TEST_IDS.AUTH.REGISTER_BUTTON;
  private readonly loginLink = '[data-testid="login-link"], a:has-text("Login"), a:has-text("Sign In")';
  private readonly errorMessage = TEST_IDS.AUTH.ERROR_MESSAGE;
  private readonly successMessage = TEST_IDS.AUTH.SUCCESS_MESSAGE;
  private readonly loadingSpinner = TEST_IDS.AUTH.LOADING_SPINNER;

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to registration page
   */
  async navigate(): Promise<void> {
    await this.goto(ROUTES.AUTH.REGISTER);
    await this.waitForPageLoad();
  }

  /**
   * Check if on registration page
   */
  async isOnPage(): Promise<boolean> {
    return await this.isElementVisible(this.registerButton);
  }

  /**
   * Fill first name
   */
  async fillFirstName(firstName: string): Promise<void> {
    await this.fillInput(this.firstNameInput, firstName);
  }

  /**
   * Fill last name
   */
  async fillLastName(lastName: string): Promise<void> {
    await this.fillInput(this.lastNameInput, lastName);
  }

  /**
   * Fill email
   */
  async fillEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  /**
   * Fill password
   */
  async fillPassword(password: string): Promise<void> {
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Fill confirm password
   * Uses standard fillInput() just like the password field
   */
  async fillConfirmPassword(password: string): Promise<void> {
    await this.fillInput(this.confirmPasswordInput, password);
  }

  /**
   * Click register button
   */
  async clickRegister(): Promise<void> {
    await this.clickElement(this.registerButton);
  }

  /**
   * Fill complete registration form
   */
  async fillRegistrationForm(userData: UserData): Promise<void> {
    // Wait for the form to be fully rendered (ClientOnly wrapper may delay rendering)
    // Use PAGE_LOAD timeout since client-side hydration can take time in CI
    await this.waitForElement(this.form, TIMEOUTS.PAGE_LOAD);

    await this.fillFirstName(userData.firstName);
    await this.fillLastName(userData.lastName);
    await this.fillEmail(userData.email);
    await this.fillPassword(userData.password);

    // Fill confirm password - wait with longer timeout for CI environments
    // The ClientOnly wrapper may delay this field's availability
    await this.waitForElement(this.confirmPasswordInput, TIMEOUTS.PAGE_LOAD);
    await this.fillConfirmPassword(userData.password);
  }

  /**
   * Complete registration flow
   */
  async register(userData: UserData): Promise<void> {
    await this.fillRegistrationForm(userData);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes(API_ROUTES.AUTH.REGISTER),
      { timeout: TIMEOUTS.API_REQUEST }
    );

    await this.clickRegister();
    await responsePromise;
  }

  /**
   * Register and wait for success
   */
  async registerWithSuccess(userData: UserData): Promise<void> {
    await this.fillRegistrationForm(userData);

    // Wait for successful API response
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes(API_ROUTES.AUTH.REGISTER) && response.status() === 201,
      { timeout: TIMEOUTS.API_REQUEST }
    );

    await this.clickRegister();
    await responsePromise;

    // Wait for redirect
    await this.page.waitForURL(/^\/(dashboard|auth\/login)/, { timeout: TIMEOUTS.PAGE_TRANSITION });
  }

  /**
   * Click login link
   */
  async clickLoginLink(): Promise<void> {
    await this.clickElement(this.loginLink);
    await this.waitForUrl(ROUTES.AUTH.LOGIN);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.getElementText(this.errorMessage);
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.isElementVisible(this.errorMessage);
  }

  /**
   * Check if success message is visible
   */
  async hasSuccess(): Promise<boolean> {
    return await this.isElementVisible(this.successMessage);
  }

  /**
   * Check if loading
   */
  async isLoading(): Promise<boolean> {
    return await this.isElementVisible(this.loadingSpinner);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(): Promise<void> {
    if (await this.isLoading()) {
      await this.waitForElementToHide(this.loadingSpinner, TIMEOUTS.LONG);
    }
  }

  /**
   * Verify registration form is present
   */
  async verifyFormElements(): Promise<void> {
    await expect(this.page.locator(this.firstNameInput)).toBeVisible();
    await expect(this.page.locator(this.lastNameInput)).toBeVisible();
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.registerButton)).toBeVisible();
    await expect(this.page.locator(this.registerButton)).toBeEnabled();
  }

  /**
   * Verify field has validation error
   */
  async expectFieldError(fieldName: string, errorMessage?: string): Promise<void> {
    const errorElement = this.page.locator(`[data-testid="${fieldName}-error"]`);
    await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.FORM_VALIDATION });

    if (errorMessage) {
      await expect(errorElement).toContainText(errorMessage);
    }
  }

  /**
   * Verify error alert is shown
   */
  async expectErrorAlert(message?: string): Promise<void> {
    const errorAlert = this.page.locator(this.errorMessage);
    await expect(errorAlert).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    if (message) {
      await expect(errorAlert).toContainText(message);
    }
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.clearAndFill(this.firstNameInput, '');
    await this.clearAndFill(this.lastNameInput, '');
    await this.clearAndFill(this.emailInput, '');
    await this.clearAndFill(this.passwordInput, '');

    if (await this.isElementVisible(this.confirmPasswordInput)) {
      await this.clearAndFill(this.confirmPasswordInput, '');
    }
  }
}
