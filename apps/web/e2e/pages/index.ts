/**
 * Page Objects Index
 * Central export for all page objects used in E2E tests
 */

export { BasePage } from './base.page';
export { LoginPage } from './login.page';
export { RegistrationPage } from './registration.page';
export { DashboardPage } from './dashboard.page';
export { TransactionsPage } from './transactions.page';

// Helper function to create page objects
import type { Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { RegistrationPage } from './registration.page';
import { DashboardPage } from './dashboard.page';
import { TransactionsPage } from './transactions.page';

export class PageObjects {
  public readonly login: LoginPage;
  public readonly registration: RegistrationPage;
  public readonly dashboard: DashboardPage;
  public readonly transactions: TransactionsPage;

  constructor(page: Page) {
    this.login = new LoginPage(page);
    this.registration = new RegistrationPage(page);
    this.dashboard = new DashboardPage(page);
    this.transactions = new TransactionsPage(page);
  }
}

/**
 * Factory function to create page objects instance
 */
export function createPageObjects(page: Page): PageObjects {
  return new PageObjects(page);
}
