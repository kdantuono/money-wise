/**
 * Transactions Page Object
 * Page object model for transactions page interactions
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../config/routes';
import { TEST_IDS } from '../config/test-ids';
import { TIMEOUTS } from '../config/timeouts';
import { TransactionData } from '../factories/transaction.factory';

export class TransactionsPage extends BasePage {
  // Selectors
  private readonly container = TEST_IDS.TRANSACTIONS.CONTAINER;
  private readonly transactionsList = TEST_IDS.TRANSACTIONS.LIST;
  private readonly transactionItem = TEST_IDS.TRANSACTIONS.ITEM;
  private readonly addButton = TEST_IDS.TRANSACTIONS.ADD_BUTTON;
  private readonly searchInput = TEST_IDS.TRANSACTIONS.SEARCH_INPUT;

  // Form selectors
  private readonly form = TEST_IDS.TRANSACTIONS.FORM;
  private readonly amountInput = TEST_IDS.TRANSACTIONS.AMOUNT_INPUT;
  private readonly descriptionInput = TEST_IDS.TRANSACTIONS.DESCRIPTION_INPUT;
  private readonly categorySelect = TEST_IDS.TRANSACTIONS.CATEGORY_SELECT;
  private readonly dateInput = TEST_IDS.TRANSACTIONS.DATE_INPUT;
  private readonly accountSelect = TEST_IDS.TRANSACTIONS.ACCOUNT_SELECT;
  private readonly notesInput = TEST_IDS.TRANSACTIONS.NOTES_INPUT;
  private readonly submitButton = TEST_IDS.TRANSACTIONS.SUBMIT_BUTTON;
  private readonly cancelButton = TEST_IDS.TRANSACTIONS.CANCEL_BUTTON;

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to transactions page
   */
  async navigate(): Promise<void> {
    await this.goto(ROUTES.TRANSACTIONS.INDEX);
    await this.waitForPageLoad();
  }

  /**
   * Wait for transactions page to load
   */
  async waitForLoad(): Promise<void> {
    await this.waitForElement(this.container, TIMEOUTS.PAGE_LOAD);
  }

  /**
   * Check if on transactions page
   */
  async isOnPage(): Promise<boolean> {
    return await this.isElementVisible(this.container);
  }

  /**
   * Get all transactions displayed
   */
  async getTransactions(): Promise<Locator> {
    return this.page.locator(this.transactionItem);
  }

  /**
   * Get transactions count
   */
  async getTransactionsCount(): Promise<number> {
    const transactions = await this.getTransactions();
    return await transactions.count();
  }

  /**
   * Click add transaction button
   */
  async clickAddTransaction(): Promise<void> {
    await this.clickElement(this.addButton);
    await this.waitForElement(this.form, TIMEOUTS.DEFAULT);
  }

  /**
   * Fill transaction form
   */
  async fillTransactionForm(transaction: Partial<TransactionData>): Promise<void> {
    if (transaction.amount !== undefined) {
      await this.fillInput(this.amountInput, Math.abs(transaction.amount).toString());
    }

    if (transaction.description) {
      await this.fillInput(this.descriptionInput, transaction.description);
    }

    if (transaction.category) {
      await this.selectOption(this.categorySelect, transaction.category);
    }

    if (transaction.date) {
      await this.fillInput(this.dateInput, transaction.date);
    }

    if (transaction.notes) {
      await this.fillInput(this.notesInput, transaction.notes);
    }

    if (transaction.accountId) {
      await this.selectOption(this.accountSelect, transaction.accountId);
    }
  }

  /**
   * Submit transaction form
   */
  async submitForm(): Promise<void> {
    await this.clickElement(this.submitButton);
  }

  /**
   * Cancel transaction form
   */
  async cancelForm(): Promise<void> {
    await this.clickElement(this.cancelButton);
  }

  /**
   * Create a new transaction (complete flow)
   */
  async createTransaction(transaction: Partial<TransactionData>): Promise<void> {
    await this.clickAddTransaction();
    await this.fillTransactionForm(transaction);
    await this.submitForm();

    // Wait for form to close
    await this.waitForElementToHide(this.form, TIMEOUTS.DEFAULT);
  }

  /**
   * Search for transactions
   */
  async search(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
    await this.page.waitForTimeout(TIMEOUTS.DEBOUNCE); // Wait for debounce
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.clearAndFill(this.searchInput, '');
    await this.page.waitForTimeout(TIMEOUTS.DEBOUNCE);
  }

  /**
   * Filter by transaction type
   */
  async filterByType(type: 'income' | 'expense' | 'transfer' | 'all'): Promise<void> {
    const typeFilter = TEST_IDS.TRANSACTIONS.TYPE_FILTER;
    if (await this.isElementVisible(typeFilter)) {
      await this.selectOption(typeFilter, type);
    }
  }

  /**
   * Filter by category
   */
  async filterByCategory(category: string): Promise<void> {
    const categoryFilter = TEST_IDS.TRANSACTIONS.CATEGORY_FILTER;
    if (await this.isElementVisible(categoryFilter)) {
      await this.selectOption(categoryFilter, category);
    }
  }

  /**
   * Filter by date range
   */
  async filterByDateRange(startDate: string, endDate: string): Promise<void> {
    const dateRangeFilter = TEST_IDS.TRANSACTIONS.DATE_RANGE_FILTER;
    if (await this.isElementVisible(dateRangeFilter)) {
      await this.clickElement(dateRangeFilter);
      // Assuming a date range picker appears
      await this.fillInput('[data-testid="start-date"]', startDate);
      await this.fillInput('[data-testid="end-date"]', endDate);
      await this.clickElement('[data-testid="apply-date-filter"]');
    }
  }

  /**
   * Click edit on a transaction
   */
  async editTransaction(index: number = 0): Promise<void> {
    const transactions = await this.getTransactions();
    const editButton = transactions.nth(index).locator(TEST_IDS.TRANSACTIONS.EDIT_BUTTON);
    await editButton.click();
    await this.waitForElement(this.form, TIMEOUTS.DEFAULT);
  }

  /**
   * Click delete on a transaction
   */
  async deleteTransaction(index: number = 0): Promise<void> {
    const transactions = await this.getTransactions();
    const deleteButton = transactions.nth(index).locator(TEST_IDS.TRANSACTIONS.DELETE_BUTTON);
    await deleteButton.click();

    // Wait for confirmation dialog if it appears
    const confirmButton = this.page.locator('[data-testid="confirm-delete"]');
    if (await confirmButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await confirmButton.click();
    }
  }

  /**
   * Get transaction details by index
   */
  async getTransactionDetails(index: number = 0): Promise<{
    description: string;
    amount: string;
    category: string;
    date: string;
  }> {
    const transactions = await this.getTransactions();
    const transaction = transactions.nth(index);

    const description = await transaction.locator('[data-testid="transaction-description"]').textContent() || '';
    const amount = await transaction.locator('[data-testid="transaction-amount"]').textContent() || '';
    const category = await transaction.locator('[data-testid="transaction-category"]').textContent() || '';
    const date = await transaction.locator('[data-testid="transaction-date"]').textContent() || '';

    return {
      description: description.trim(),
      amount: amount.trim(),
      category: category.trim(),
      date: date.trim(),
    };
  }

  /**
   * Verify transaction appears in list
   */
  async verifyTransactionExists(description: string): Promise<void> {
    const transaction = this.page.locator(this.transactionItem).filter({ hasText: description });
    await expect(transaction).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  /**
   * Verify transaction does not appear in list
   */
  async verifyTransactionNotExists(description: string): Promise<void> {
    const transaction = this.page.locator(this.transactionItem).filter({ hasText: description });
    await expect(transaction).not.toBeVisible({ timeout: TIMEOUTS.SHORT });
  }

  /**
   * Check if empty state is shown
   */
  async hasEmptyState(): Promise<boolean> {
    const emptyState = this.page.locator('[data-testid="empty-state"], text=No transactions');
    return await emptyState.isVisible({ timeout: TIMEOUTS.SHORT });
  }

  /**
   * Verify form validation error
   */
  async expectFormError(field: string, errorMessage?: string): Promise<void> {
    const errorElement = this.page.locator(`[data-testid="${field}-error"]`);
    await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.FORM_VALIDATION });

    if (errorMessage) {
      await expect(errorElement).toContainText(errorMessage);
    }
  }

  /**
   * Verify success message after creating/updating transaction
   */
  async expectSuccessMessage(message?: string): Promise<void> {
    const successAlert = this.page.locator('[data-testid="success-message"], [role="alert"]').first();
    await expect(successAlert).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    if (message) {
      await expect(successAlert).toContainText(message);
    }
  }
}
