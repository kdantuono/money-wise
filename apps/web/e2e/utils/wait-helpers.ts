/**
 * Wait Helpers
 * Utilities for waiting on various conditions in E2E tests
 */

import { Page, Locator, expect } from '@playwright/test';
import { TIMEOUTS, POLLING } from '../config/timeouts';

/**
 * Wait helper class
 */
export class WaitHelper {
  constructor(private page: Page) {}

  /**
   * Wait for API response matching pattern
   */
  async waitForApiResponse(
    urlPattern: string | RegExp,
    options: {
      status?: number;
      timeout?: number;
    } = {}
  ): Promise<void> {
    const timeout = options.timeout || TIMEOUTS.API_REQUEST;
    const expectedStatus = options.status;

    await this.page.waitForResponse(
      (response) => {
        const urlMatches =
          typeof urlPattern === 'string'
            ? response.url().includes(urlPattern)
            : urlPattern.test(response.url());

        const statusMatches = expectedStatus ? response.status() === expectedStatus : true;

        return urlMatches && statusMatches;
      },
      { timeout }
    );
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE });
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('load');
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string | Locator, timeout?: number): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toBeVisible({ timeout: timeout || TIMEOUTS.ELEMENT_VISIBLE });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string | Locator, timeout?: number): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toBeHidden({ timeout: timeout || TIMEOUTS.ELEMENT_VISIBLE });
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete(timeout?: number): Promise<void> {
    const spinner = this.page.locator(
      '[data-testid="loading-spinner"], [aria-busy="true"], .loading, .spinner'
    );

    // Check if spinner exists first
    const count = await spinner.count();
    if (count > 0) {
      await this.waitForHidden(spinner, timeout || TIMEOUTS.LONG);
    }
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForUrl(pattern: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForURL(pattern, { timeout: timeout || TIMEOUTS.PAGE_TRANSITION });
  }

  /**
   * Wait for condition to be true
   */
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {}
  ): Promise<void> {
    const timeout = options.timeout || TIMEOUTS.DEFAULT;
    const interval = options.interval || POLLING.DEFAULT;
    const message = options.message || 'Condition not met within timeout';

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.wait(interval);
    }

    throw new Error(message);
  }

  /**
   * Wait for element count to match expected
   */
  async waitForElementCount(
    selector: string | Locator,
    expectedCount: number,
    timeout?: number
  ): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toHaveCount(expectedCount, { timeout: timeout || TIMEOUTS.DEFAULT });
  }

  /**
   * Wait for text to appear on page
   */
  async waitForText(text: string | RegExp, timeout?: number): Promise<void> {
    const locator = typeof text === 'string'
      ? this.page.getByText(text, { exact: false })
      : this.page.getByText(text);

    await expect(locator).toBeVisible({
      timeout: timeout || TIMEOUTS.DEFAULT,
    });
  }

  /**
   * @deprecated Use waitForResponse(), waitForLoadState(), or expect() instead of arbitrary delays.
   * Wait for specific time (use ONLY as last resort for animations with no better alternative)
   *
   * This method uses waitForTimeout which is an anti-pattern. Consider:
   * - waitForResponse() for API calls
   * - waitForLoadState('networkidle') for page loads
   * - expect().toBeVisible() for element visibility
   * - waitForSelector() for specific elements
   */
  async wait(ms: number): Promise<void> {
    console.warn(
      `⚠️  waitForTimeout(${ms}ms) is deprecated and can cause flaky tests.\n` +
      `   Consider using waitForResponse(), waitForLoadState(), or expect() instead.`
    );
    await this.page.waitForTimeout(ms);
  }

  /**
   * Wait for animation to complete
   */
  async waitForAnimation(): Promise<void> {
    await this.wait(TIMEOUTS.ANIMATION);
  }

  /**
   * Wait for debounce to complete (e.g., after typing in search)
   */
  async waitForDebounce(): Promise<void> {
    await this.wait(TIMEOUTS.DEBOUNCE);
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: timeout || TIMEOUTS.NAVIGATION });
  }

  /**
   * Wait for element to be enabled
   */
  async waitForEnabled(selector: string | Locator, timeout?: number): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toBeEnabled({ timeout: timeout || TIMEOUTS.DEFAULT });
  }

  /**
   * Wait for element to be disabled
   */
  async waitForDisabled(selector: string | Locator, timeout?: number): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toBeDisabled({ timeout: timeout || TIMEOUTS.DEFAULT });
  }

  /**
   * Wait for selector to be attached to DOM
   */
  async waitForSelector(selector: string, timeout?: number): Promise<Locator> {
    return await this.page.waitForSelector(selector, { timeout: timeout || TIMEOUTS.DEFAULT });
  }

  /**
   * Retry action until it succeeds
   */
  async retry<T>(
    action: () => Promise<T>,
    options: {
      retries?: number;
      delay?: number;
      onError?: (error: Error, attempt: number) => void;
    } = {}
  ): Promise<T> {
    const maxRetries = options.retries || 3;
    const delay = options.delay || TIMEOUTS.SHORT;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;

        if (options.onError) {
          options.onError(lastError, attempt);
        }

        if (attempt < maxRetries) {
          await this.wait(delay);
        }
      }
    }

    throw lastError || new Error('Retry failed');
  }
}

/**
 * Create wait helper for a page
 */
export function createWaitHelper(page: Page): WaitHelper {
  return new WaitHelper(page);
}

/**
 * Standalone wait functions
 */

export async function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitUntil(
  condition: () => boolean | Promise<boolean>,
  timeout: number = TIMEOUTS.DEFAULT,
  interval: number = POLLING.DEFAULT
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await waitFor(interval);
  }

  throw new Error('Condition not met within timeout');
}
