import { type Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Dashboard Page Object for main application dashboard
 */
export class DashboardPage extends BasePage {
  // Selectors
  private readonly pageHeading =
    '[data-testid="dashboard-heading"], h1:has-text("Dashboard")';
  private readonly userMenu =
    '[data-testid="user-menu"], .user-menu, .profile-dropdown';
  private readonly logoutButton =
    '[data-testid="logout-button"], button:has-text("Logout"), button:has-text("Sign Out")';
  private readonly accountsSection =
    '[data-testid="accounts-section"], .accounts, .account-cards';
  private readonly transactionsSection =
    '[data-testid="transactions-section"], .transactions, .transaction-list';
  private readonly analyticsSection =
    '[data-testid="analytics-section"], .analytics, .charts';
  private readonly addAccountButton =
    '[data-testid="add-account"], button:has-text("Add Account")';
  private readonly addTransactionButton =
    '[data-testid="add-transaction"], button:has-text("Add Transaction")';
  private readonly balanceDisplay =
    '[data-testid="total-balance"], .total-balance, .balance-display';
  private readonly accountCard = '[data-testid="account-card"], .account-card';
  private readonly transactionRow =
    '[data-testid="transaction-row"], .transaction-row, .transaction-item';
  private readonly loadingState =
    '[data-testid="loading"], .loading, .skeleton';
  private readonly errorState = '[data-testid="error"], .error, .alert-error';
  private readonly emptyState = '[data-testid="empty-state"], .empty-state';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to dashboard page
   */
  async navigateToDashboard(): Promise<void> {
    await this.goto('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Check if we're on the dashboard page
   */
  async isOnDashboard(): Promise<boolean> {
    return await this.isElementVisible(this.pageHeading);
  }

  /**
   * Wait for dashboard to load completely
   */
  async waitForDashboardLoad(): Promise<void> {
    await this.waitForElement(this.pageHeading);

    // Wait for main sections to load
    await this.waitForElement(this.accountsSection);

    // Wait for any loading states to complete
    if (await this.isElementVisible(this.loadingState)) {
      await this.waitForElementToHide(this.loadingState, 15000);
    }
  }

  /**
   * Get total balance displayed
   */
  async getTotalBalance(): Promise<string> {
    return await this.getElementText(this.balanceDisplay);
  }

  /**
   * Get number of accounts displayed
   */
  async getAccountsCount(): Promise<number> {
    const accounts = this.page.locator(this.accountCard);
    return await accounts.count();
  }

  /**
   * Get account names
   */
  async getAccountNames(): Promise<string[]> {
    const accounts = this.page.locator(this.accountCard);
    const count = await accounts.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const accountName = await accounts
        .nth(i)
        .locator('[data-testid="account-name"], .account-name, h3, h4')
        .textContent();
      if (accountName) {
        names.push(accountName.trim());
      }
    }

    return names;
  }

  /**
   * Click on specific account by name
   */
  async clickAccount(accountName: string): Promise<void> {
    const account = this.page
      .locator(this.accountCard)
      .filter({ hasText: accountName });
    await account.click();
  }

  /**
   * Get number of transactions displayed
   */
  async getTransactionsCount(): Promise<number> {
    const transactions = this.page.locator(this.transactionRow);
    return await transactions.count();
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(): Promise<
    Array<{ description: string; amount: string; date: string }>
  > {
    const transactions = this.page.locator(this.transactionRow);
    const count = Math.min(await transactions.count(), 5); // Get max 5 recent transactions
    const transactionData: Array<{
      description: string;
      amount: string;
      date: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const transaction = transactions.nth(i);
      const description = await transaction
        .locator('[data-testid="transaction-description"], .description')
        .textContent();
      const amount = await transaction
        .locator('[data-testid="transaction-amount"], .amount')
        .textContent();
      const date = await transaction
        .locator('[data-testid="transaction-date"], .date')
        .textContent();

      transactionData.push({
        description: description?.trim() || '',
        amount: amount?.trim() || '',
        date: date?.trim() || '',
      });
    }

    return transactionData;
  }

  /**
   * Click Add Account button
   */
  async clickAddAccount(): Promise<void> {
    await this.clickElement(this.addAccountButton);
  }

  /**
   * Click Add Transaction button
   */
  async clickAddTransaction(): Promise<void> {
    await this.clickElement(this.addTransactionButton);
  }

  /**
   * Open user menu
   */
  async openUserMenu(): Promise<void> {
    await this.clickElement(this.userMenu);
  }

  /**
   * Logout from the application
   */
  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.clickElement(this.logoutButton);

    // Wait for navigation to login page
    await this.waitForUrl(/login|auth/, 10000);
  }

  /**
   * Check if analytics section is visible
   */
  async isAnalyticsVisible(): Promise<boolean> {
    return await this.isElementVisible(this.analyticsSection);
  }

  /**
   * Verify dashboard components are present
   */
  async verifyDashboardComponents(): Promise<void> {
    await expect(this.page.locator(this.pageHeading)).toBeVisible();
    await expect(this.page.locator(this.accountsSection)).toBeVisible();
    await expect(this.page.locator(this.userMenu)).toBeVisible();
  }

  /**
   * Check if page shows empty state
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.isElementVisible(this.emptyState);
  }

  /**
   * Check if page shows error state
   */
  async hasErrorState(): Promise<boolean> {
    return await this.isElementVisible(this.errorState);
  }

  /**
   * Wait for data to load (accounts and transactions)
   */
  async waitForDataLoad(): Promise<void> {
    // Wait for either content to appear or empty state
    const contentSelector = `${this.accountCard}, ${this.emptyState}`;
    await this.waitForElement(contentSelector);
  }

  /**
   * Refresh the dashboard page
   */
  async refreshDashboard(): Promise<void> {
    await this.page.reload();
    await this.waitForDashboardLoad();
  }

  /**
   * Get page title
   */
  async getDashboardTitle(): Promise<string> {
    return await this.getElementText(this.pageHeading);
  }

  /**
   * Verify user is authenticated and on dashboard
   */
  async verifyUserAuthenticated(): Promise<void> {
    await expect(this.page.locator(this.pageHeading)).toBeVisible();
    await expect(this.page.locator(this.userMenu)).toBeVisible();

    // Verify we're not on login page
    const currentUrl = this.getCurrentUrl();
    expect(currentUrl).not.toContain('/login');
    expect(currentUrl).not.toContain('/auth');
  }

  /**
   * Search for transaction
   */
  async searchTransaction(query: string): Promise<void> {
    const searchInput =
      '[data-testid="transaction-search"], input[placeholder*="Search"]';
    if (await this.isElementVisible(searchInput)) {
      await this.fillInput(searchInput, query);
      await this.pressKey('Enter');
    }
  }

  /**
   * Filter transactions by category
   */
  async filterByCategory(category: string): Promise<void> {
    const categoryFilter =
      '[data-testid="category-filter"], .category-filter select';
    if (await this.isElementVisible(categoryFilter)) {
      await this.selectOption(categoryFilter, category);
    }
  }
}
