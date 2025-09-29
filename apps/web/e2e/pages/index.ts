/**
 * Page Objects Index
 * Central export for all page objects used in E2E tests
 */

export { BasePage } from './base.page';
export { LoginPage } from './login.page';
export { DashboardPage } from './dashboard.page';

// Helper function to create page objects
import type { Page } from '@playwright/test';

export class PageObjects {
  public readonly login: LoginPage;
  public readonly dashboard: DashboardPage;

  constructor(page: Page) {
    this.login = new LoginPage(page);
    this.dashboard = new DashboardPage(page);
  }
}

/**
 * Factory function to create page objects instance
 */
export function createPageObjects(page: Page): PageObjects {
  return new PageObjects(page);
}
