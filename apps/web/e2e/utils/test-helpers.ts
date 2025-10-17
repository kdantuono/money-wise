/**
 * E2E Test Helpers
 * Common utilities for Playwright E2E tests
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Authentication helpers
 */
export class AuthHelpers {
  constructor(private page: Page) {}

  async login(email: string = 'test@example.com', password: string = 'password123') {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);

    // FIX: Wait for API response + navigation simultaneously to avoid race condition
    const [response] = await Promise.all([
      this.page.waitForResponse(response =>
        response.url().includes('/api/auth/login') && response.status() === 200
      ),
      this.page.click('[data-testid="login-button"]')
    ]);

    // Wait for redirect to dashboard after API confirms success
    await this.page.waitForURL('/dashboard', { timeout: 5000 });
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 5000 });
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }

  async signup(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.page.goto('/signup');
    await this.page.fill('[data-testid="first-name"]', userData.firstName);
    await this.page.fill('[data-testid="last-name"]', userData.lastName);
    await this.page.fill('[data-testid="email"]', userData.email);
    await this.page.fill('[data-testid="password"]', userData.password);
    await this.page.fill('[data-testid="confirm-password"]', userData.password);

    // FIX: Wait for API response to avoid race condition
    await Promise.all([
      this.page.waitForResponse(response =>
        response.url().includes('/api/auth/signup') && response.status() === 201
      ),
      this.page.click('[data-testid="signup-button"]')
    ]);
  }
}

/**
 * Navigation helpers
 */
export class NavigationHelpers {
  constructor(private page: Page) {}

  async goToDashboard() {
    await this.page.click('[data-testid="nav-dashboard"]');
    await this.page.waitForURL('/dashboard');
  }

  async goToAccounts() {
    await this.page.click('[data-testid="nav-accounts"]');
    await this.page.waitForURL('/accounts');
  }

  async goToTransactions() {
    await this.page.click('[data-testid="nav-transactions"]');
    await this.page.waitForURL('/transactions');
  }

  async goToBudgets() {
    await this.page.click('[data-testid="nav-budgets"]');
    await this.page.waitForURL('/budgets');
  }

  async goToReports() {
    await this.page.click('[data-testid="nav-reports"]');
    await this.page.waitForURL('/reports');
  }
}

/**
 * Financial data helpers
 */
export class FinancialHelpers {
  constructor(private page: Page) {}

  async createAccount(accountData: {
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'investment';
    balance: number;
  }) {
    await this.page.click('[data-testid="add-account-button"]');
    await this.page.fill('[data-testid="account-name"]', accountData.name);
    await this.page.selectOption('[data-testid="account-type"]', accountData.type);
    await this.page.fill('[data-testid="account-balance"]', accountData.balance.toString());
    await this.page.click('[data-testid="save-account-button"]');

    // Wait for success message or redirect
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }

  async addTransaction(transactionData: {
    accountName: string;
    amount: number;
    description: string;
    category: string;
    date?: string;
  }) {
    await this.page.click('[data-testid="add-transaction-button"]');

    if (transactionData.accountName) {
      await this.page.selectOption('[data-testid="transaction-account"]', transactionData.accountName);
    }

    await this.page.fill('[data-testid="transaction-amount"]', transactionData.amount.toString());
    await this.page.fill('[data-testid="transaction-description"]', transactionData.description);
    await this.page.selectOption('[data-testid="transaction-category"]', transactionData.category);

    if (transactionData.date) {
      await this.page.fill('[data-testid="transaction-date"]', transactionData.date);
    }

    await this.page.click('[data-testid="save-transaction-button"]');
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }

  async createBudget(budgetData: {
    name: string;
    amount: number;
    category: string;
    period: 'monthly' | 'weekly' | 'yearly';
  }) {
    await this.page.click('[data-testid="add-budget-button"]');
    await this.page.fill('[data-testid="budget-name"]', budgetData.name);
    await this.page.fill('[data-testid="budget-amount"]', budgetData.amount.toString());
    await this.page.selectOption('[data-testid="budget-category"]', budgetData.category);
    await this.page.selectOption('[data-testid="budget-period"]', budgetData.period);
    await this.page.click('[data-testid="save-budget-button"]');

    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }
}

/**
 * Form helpers
 */
export class FormHelpers {
  constructor(private page: Page) {}

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      await this.page.fill(`[data-testid="${field}"]`, value);
    }
  }

  async submitForm(submitButtonTestId: string = 'submit-button') {
    await this.page.click(`[data-testid="${submitButtonTestId}"]`);
  }

  async waitForValidationError(field: string) {
    await expect(this.page.locator(`[data-testid="${field}-error"]`)).toBeVisible();
  }

  async waitForSuccessMessage() {
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }
}

/**
 * Wait helpers
 */
export class WaitHelpers {
  constructor(private page: Page) {}

  async waitForApiResponse(urlPattern: string | RegExp) {
    return this.page.waitForResponse(response =>
      typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())
    );
  }

  async waitForLoadingToFinish() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  }

  async waitForElementToBeVisible(selector: string, timeout: number = 5000) {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  async waitForElementToBeHidden(selector: string, timeout: number = 5000) {
    await expect(this.page.locator(selector)).not.toBeVisible({ timeout });
  }
}

/**
 * Assertion helpers
 */
export class AssertionHelpers {
  constructor(private page: Page) {}

  async assertUrl(expectedUrl: string | RegExp) {
    if (typeof expectedUrl === 'string') {
      await expect(this.page).toHaveURL(expectedUrl);
    } else {
      await expect(this.page).toHaveURL(expectedUrl);
    }
  }

  async assertPageTitle(expectedTitle: string | RegExp) {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  async assertElementText(selector: string, expectedText: string | RegExp) {
    await expect(this.page.locator(selector)).toHaveText(expectedText);
  }

  async assertElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async assertElementHidden(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async assertElementCount(selector: string, expectedCount: number) {
    await expect(this.page.locator(selector)).toHaveCount(expectedCount);
  }
}

/**
 * Test context with all helpers
 */
export class TestContext {
  public auth: AuthHelpers;
  public navigation: NavigationHelpers;
  public financial: FinancialHelpers;
  public form: FormHelpers;
  public wait: WaitHelpers;
  public assert: AssertionHelpers;

  constructor(public page: Page) {
    this.auth = new AuthHelpers(page);
    this.navigation = new NavigationHelpers(page);
    this.financial = new FinancialHelpers(page);
    this.form = new FormHelpers(page);
    this.wait = new WaitHelpers(page);
    this.assert = new AssertionHelpers(page);
  }
}