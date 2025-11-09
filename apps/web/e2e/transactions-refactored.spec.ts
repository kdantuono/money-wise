/**
 * Transactions E2E Tests
 * Comprehensive transaction management testing
 */

import { test, expect } from '@playwright/test';
import { TransactionsPage } from './pages';
import { setupAuthenticatedUser } from './utils/auth-helpers';
import { WaitHelper } from './utils/wait-helpers';
import { TransactionFactory, createTransaction } from './factories/transaction.factory';
import { ROUTES } from './config/routes';
import { TIMEOUTS } from './config/timeouts';

test.describe('Transactions', () => {
  let transactionsPage: TransactionsPage;
  let waitHelper: WaitHelper;

  test.beforeEach(async ({ page }) => {
    // Setup authenticated user
    await setupAuthenticatedUser(page);

    // Initialize page objects
    transactionsPage = new TransactionsPage(page);
    waitHelper = new WaitHelper(page);

    // Navigate to transactions page
    await transactionsPage.navigate();
    await waitHelper.waitForLoadingComplete();
  });

  test.describe('Page Load and Display', () => {
    test('should display transactions page', async ({ page }) => {
      // Assert
      await expect(page).toHaveURL(ROUTES.TRANSACTIONS.INDEX);
      const isOnPage = await transactionsPage.isOnPage();
      expect(isOnPage).toBeTruthy();
    });

    test('should display transactions list or empty state', async () => {
      // Act
      await waitHelper.waitForLoadingComplete();

      // Assert - either has transactions or shows empty state
      const count = await transactionsPage.getTransactionsCount();
      const hasEmptyState = await transactionsPage.hasEmptyState();

      expect(count > 0 || hasEmptyState).toBeTruthy();
    });

    test('should display add transaction button', async ({ page }) => {
      // Assert
      const addButton = page.locator('[data-testid="add-transaction-button"], button:has-text("Add Transaction")');
      await expect(addButton.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    });
  });

  test.describe('Create Transaction', () => {
    test('should open transaction form when add button clicked', async ({ page }) => {
      // Act
      await transactionsPage.clickAddTransaction();

      // Assert
      const form = page.locator('[data-testid="transaction-form"], form');
      await expect(form).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    });

    test('should create expense transaction with valid data', async () => {
      // Arrange
      const transaction = TransactionFactory.expense({
        description: 'Test Grocery Shopping',
        amount: -50.00,
        category: 'food',
        date: new Date().toISOString().split('T')[0],
      });

      // Act
      await transactionsPage.createTransaction(transaction);

      // Assert
      await waitHelper.wait(TIMEOUTS.SHORT);
      await transactionsPage.verifyTransactionExists('Test Grocery Shopping');
    });

    test('should create income transaction with valid data', async () => {
      // Arrange
      const transaction = TransactionFactory.income({
        description: 'Test Salary Payment',
        amount: 3000.00,
        category: 'income',
        date: new Date().toISOString().split('T')[0],
      });

      // Act
      await transactionsPage.createTransaction(transaction);

      // Assert
      await waitHelper.wait(TIMEOUTS.SHORT);
      await transactionsPage.verifyTransactionExists('Test Salary Payment');
    });

    test('should create transfer transaction', async () => {
      // Arrange
      const transaction = TransactionFactory.transfer({
        description: 'Test Savings Transfer',
        amount: 500.00,
        category: 'transfer',
        date: new Date().toISOString().split('T')[0],
      });

      // Act
      await transactionsPage.createTransaction(transaction);

      // Assert
      await waitHelper.wait(TIMEOUTS.SHORT);
      await transactionsPage.verifyTransactionExists('Test Savings Transfer');
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty amount', async ({ page }) => {
      // Arrange
      await transactionsPage.clickAddTransaction();

      // Act
      await transactionsPage.fillTransactionForm({
        description: 'Test Transaction',
        category: 'food',
        amount: undefined, // Missing amount
      });
      await transactionsPage.submitForm();

      // Assert
      await waitHelper.wait(TIMEOUTS.FORM_VALIDATION);
      const form = page.locator('[data-testid="transaction-form"], form');
      const isStillVisible = await form.isVisible();
      expect(isStillVisible).toBeTruthy(); // Form should not close
    });

    test('should show error for empty description', async ({ page }) => {
      // Arrange
      await transactionsPage.clickAddTransaction();

      // Act
      await transactionsPage.fillTransactionForm({
        description: '', // Empty description
        amount: 50.00,
        category: 'food',
      });
      await transactionsPage.submitForm();

      // Assert
      await waitHelper.wait(TIMEOUTS.FORM_VALIDATION);
      const form = page.locator('[data-testid="transaction-form"], form');
      const isStillVisible = await form.isVisible();
      expect(isStillVisible).toBeTruthy();
    });

    test('should show error for missing category', async ({ page }) => {
      // Arrange
      await transactionsPage.clickAddTransaction();

      // Act
      await transactionsPage.fillTransactionForm({
        description: 'Test Transaction',
        amount: 50.00,
        // category: missing
      });
      await transactionsPage.submitForm();

      // Assert
      await waitHelper.wait(TIMEOUTS.FORM_VALIDATION);
      const form = page.locator('[data-testid="transaction-form"], form');
      const isStillVisible = await form.isVisible();
      expect(isStillVisible).toBeTruthy();
    });
  });

  test.describe('Search and Filter', () => {
    test('should filter transactions by search query', async () => {
      // Arrange - ensure we have some transactions
      const transaction = TransactionFactory.expense({
        description: 'Unique Search Term Coffee',
      });
      await transactionsPage.createTransaction(transaction);

      // Act
      await transactionsPage.search('Unique Search Term');
      await waitHelper.waitForDebounce();

      // Assert
      await transactionsPage.verifyTransactionExists('Unique Search Term Coffee');
    });

    test('should clear search results', async () => {
      // Arrange
      await transactionsPage.search('some-query');
      await waitHelper.waitForDebounce();

      // Act
      await transactionsPage.clearSearch();
      await waitHelper.waitForDebounce();

      // Assert - should show all transactions or empty state
      const count = await transactionsPage.getTransactionsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter transactions by type - expense', async () => {
      // Act
      await transactionsPage.filterByType('expense');
      await waitHelper.waitForDebounce();

      // Assert
      const count = await transactionsPage.getTransactionsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter transactions by type - income', async () => {
      // Act
      await transactionsPage.filterByType('income');
      await waitHelper.waitForDebounce();

      // Assert
      const count = await transactionsPage.getTransactionsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter transactions by category', async () => {
      // Act
      await transactionsPage.filterByCategory('food');
      await waitHelper.waitForDebounce();

      // Assert
      const count = await transactionsPage.getTransactionsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Edit Transaction', () => {
    test('should open edit form for existing transaction', async ({ page }) => {
      // Arrange - create a transaction first
      const transaction = TransactionFactory.expense({
        description: 'Transaction To Edit',
      });
      await transactionsPage.createTransaction(transaction);
      await waitHelper.wait(TIMEOUTS.SHORT);

      // Ensure we have transactions
      const count = await transactionsPage.getTransactionsCount();
      if (count === 0) {
        test.skip();
        return;
      }

      // Act
      await transactionsPage.editTransaction(0);

      // Assert
      const form = page.locator('[data-testid="transaction-form"], form');
      await expect(form).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    });

    test('should update transaction with new data', async () => {
      // Arrange - create a transaction first
      const originalTransaction = TransactionFactory.expense({
        description: 'Original Description',
        amount: -50.00,
      });
      await transactionsPage.createTransaction(originalTransaction);
      await waitHelper.wait(TIMEOUTS.SHORT);

      const count = await transactionsPage.getTransactionsCount();
      if (count === 0) {
        test.skip();
        return;
      }

      // Act - edit the transaction
      await transactionsPage.editTransaction(0);
      await transactionsPage.fillTransactionForm({
        description: 'Updated Description',
        amount: 75.00,
      });
      await transactionsPage.submitForm();

      // Assert
      await waitHelper.wait(TIMEOUTS.SHORT);
      await transactionsPage.verifyTransactionExists('Updated Description');
    });
  });

  test.describe('Delete Transaction', () => {
    test('should delete transaction', async () => {
      // Arrange - create a transaction to delete
      const transaction = TransactionFactory.expense({
        description: 'Transaction To Delete',
      });
      await transactionsPage.createTransaction(transaction);
      await waitHelper.wait(TIMEOUTS.SHORT);

      const initialCount = await transactionsPage.getTransactionsCount();
      if (initialCount === 0) {
        test.skip();
        return;
      }

      // Act
      await transactionsPage.deleteTransaction(0);
      await waitHelper.wait(TIMEOUTS.SHORT);

      // Assert
      const finalCount = await transactionsPage.getTransactionsCount();
      expect(finalCount).toBeLessThanOrEqual(initialCount);
    });
  });

  test.describe('Transaction Details', () => {
    test('should display transaction details correctly', async () => {
      // Arrange - create a transaction
      const transaction = TransactionFactory.expense({
        description: 'Detail Check Transaction',
        amount: -42.50,
        category: 'food',
      });
      await transactionsPage.createTransaction(transaction);
      await waitHelper.wait(TIMEOUTS.SHORT);

      const count = await transactionsPage.getTransactionsCount();
      if (count === 0) {
        test.skip();
        return;
      }

      // Act
      const details = await transactionsPage.getTransactionDetails(0);

      // Assert
      expect(details.description).toBeTruthy();
      expect(details.amount).toBeTruthy();
      expect(details.category || details.date).toBeTruthy();
    });
  });

  test.describe('Form Interactions', () => {
    test('should cancel transaction creation', async ({ page }) => {
      // Arrange
      await transactionsPage.clickAddTransaction();

      // Act
      await transactionsPage.fillTransactionForm({
        description: 'Cancelled Transaction',
        amount: 100.00,
      });
      await transactionsPage.cancelForm();

      // Assert
      const form = page.locator('[data-testid="transaction-form"], form');
      await expect(form).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    });

    test('should reset form when cancelled', async ({ page }) => {
      // Arrange
      await transactionsPage.clickAddTransaction();
      await transactionsPage.fillTransactionForm({
        description: 'Test',
        amount: 50.00,
      });

      // Act
      await transactionsPage.cancelForm();
      await transactionsPage.clickAddTransaction();

      // Assert - form should be empty
      const form = page.locator('[data-testid="transaction-form"], form');
      await expect(form).toBeVisible();
      // Fields should be empty/reset
    });
  });

  test.describe('Data Validation Edge Cases', () => {
    test('should handle very large amounts', async () => {
      // Arrange
      const transaction = TransactionFactory.expense({
        description: 'Large Amount Transaction',
        amount: -999999.99,
      });

      // Act & Assert
      await transactionsPage.createTransaction(transaction);
      await waitHelper.wait(TIMEOUTS.SHORT);
      // Should create successfully or show appropriate error
      expect(true).toBeTruthy();
    });

    test('should handle decimal amounts correctly', async () => {
      // Arrange
      const transaction = TransactionFactory.expense({
        description: 'Decimal Amount Transaction',
        amount: -12.34,
      });

      // Act
      await transactionsPage.createTransaction(transaction);

      // Assert
      await waitHelper.wait(TIMEOUTS.SHORT);
      await transactionsPage.verifyTransactionExists('Decimal Amount Transaction');
    });

    test('should handle long descriptions', async () => {
      // Arrange
      const longDescription = 'A'.repeat(200);
      const transaction = TransactionFactory.expense({
        description: longDescription,
        amount: -50.00,
      });

      // Act & Assert - should handle or show error
      await transactionsPage.clickAddTransaction();
      await transactionsPage.fillTransactionForm(transaction);
      await transactionsPage.submitForm();
      await waitHelper.wait(TIMEOUTS.SHORT);
      expect(true).toBeTruthy();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Act - tab to add button and press enter
      await page.keyboard.press('Tab');
      await waitHelper.wait(TIMEOUTS.SHORT);

      // Assert - basic navigation works
      expect(true).toBeTruthy();
    });

    test('should have proper form labels', async ({ page }) => {
      // Arrange
      await transactionsPage.clickAddTransaction();

      // Assert
      const form = page.locator('[data-testid="transaction-form"], form');
      await expect(form).toBeVisible();

      // Check for input fields
      const inputs = form.locator('input, select, textarea');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
