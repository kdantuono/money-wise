/**
 * Authentication fixture for E2E tests
 * Provides authenticated page context using stored auth state
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

/**
 * Extended test fixture with authenticated page
 */
export const test = base.extend<{
  /**
   * Page that is already authenticated using stored auth state
   * Use this instead of regular `page` for tests that require authentication
   */
  authenticatedPage: Page;

  /**
   * Browser context that is already authenticated
   * Use this when you need to create multiple authenticated pages
   */
  authenticatedContext: BrowserContext;
}>({
  authenticatedContext: async ({ browser }, use) => {
    // Check if auth state file exists
    if (!fs.existsSync(AUTH_FILE)) {
      throw new Error(
        `❌ Authentication state file not found at: ${AUTH_FILE}\n\n` +
        `This usually means the global setup did not run successfully.\n\n` +
        `To fix this issue:\n` +
        `  1. Make sure the backend is running: pnpm --filter @money-wise/backend dev\n` +
        `  2. Make sure the frontend is running: pnpm --filter @money-wise/web dev\n` +
        `  3. Run global setup manually: pnpm --filter @money-wise/web exec playwright test --global-setup\n` +
        `  4. Or run E2E tests normally (global setup runs automatically): pnpm test:e2e\n\n` +
        `If the problem persists, check:\n` +
        `  - Backend health endpoint: http://localhost:3001/api/health\n` +
        `  - Frontend health endpoint: http://localhost:3000\n` +
        `  - Check logs in global-setup.ts for error details`
      );
    }

    let authState;
    try {
      // Load and parse auth state
      const authData = fs.readFileSync(AUTH_FILE, 'utf-8');
      authState = JSON.parse(authData);
    } catch (error) {
      throw new Error(
        `❌ Failed to read authentication state from: ${AUTH_FILE}\n\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `The file exists but could not be parsed. This might indicate:\n` +
        `  1. Corrupted auth state file\n` +
        `  2. Invalid JSON format\n` +
        `  3. File permissions issue\n\n` +
        `To fix:\n` +
        `  1. Delete the corrupted file: rm ${AUTH_FILE}\n` +
        `  2. Re-run global setup: pnpm --filter @money-wise/web exec playwright test --global-setup`
      );
    }

    // Verify auth state has required data
    if (!authState.cookies || !Array.isArray(authState.cookies)) {
      throw new Error(
        `❌ Invalid authentication state: missing or invalid cookies\n\n` +
        `The auth state file exists but doesn't contain valid cookie data.\n\n` +
        `To fix:\n` +
        `  1. Delete the invalid file: rm ${AUTH_FILE}\n` +
        `  2. Re-run global setup: pnpm --filter @money-wise/web exec playwright test --global-setup`
      );
    }

    // Create context with stored auth state
    const context = await browser.newContext({
      storageState: authState
    });

    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    // Create a new page in the authenticated context
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';

/**
 * Helper function to manually check if auth state is available
 * Useful for tests that want to conditionally skip if auth is not set up
 */
export function isAuthStateAvailable(): boolean {
  return fs.existsSync(AUTH_FILE);
}

/**
 * Helper function to get auth state file path
 * Useful for debugging or manual inspection
 */
export function getAuthStateFilePath(): string {
  return AUTH_FILE;
}
