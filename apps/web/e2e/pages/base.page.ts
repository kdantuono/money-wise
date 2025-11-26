import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Base Page Object class providing common functionality for all pages
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * Wait for page to load completely
   * Using 'domcontentloaded' instead of 'networkidle' to avoid hanging
   * on pages with long-polling or WebSocket connections
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(
    selector: string,
    timeout: number = 10000
  ): Promise<Locator> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible({ timeout });
    return element;
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementToHide(
    selector: string,
    timeout: number = 10000
  ): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toBeHidden({ timeout });
  }

  /**
   * Click element with retry logic
   */
  async clickElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.click();
  }

  /**
   * Fill input field
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.fill(value);
  }

  /**
   * Get text content of element
   */
  async getElementText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return (await element.textContent()) || '';
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.waitForElement(selector, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for API response
   */
  async waitForResponse(
    urlPattern: string | RegExp,
    timeout: number = 10000
  ): Promise<void> {
    await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Clear and fill input
   */
  async clearAndFill(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.clear();
    await element.fill(value);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.selectOption(value);
  }

  /**
   * Check checkbox
   */
  async checkCheckbox(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.check();
  }

  /**
   * Uncheck checkbox
   */
  async uncheckCheckbox(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.uncheck();
  }

  /**
   * Hover over element
   */
  async hoverElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.hover();
  }

  /**
   * Press key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Wait for URL to contain specific text
   */
  async waitForUrl(
    urlPattern: string | RegExp,
    timeout: number = 10000
  ): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  /**
   * Get attribute value
   */
  async getElementAttribute(
    selector: string,
    attribute: string
  ): Promise<string | null> {
    const element = await this.waitForElement(selector);
    return await element.getAttribute(attribute);
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.scrollIntoViewIfNeeded();
  }
}
