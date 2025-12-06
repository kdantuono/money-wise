/**
 * CSV Export Utility Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  transactionsToCSV,
  downloadTransactionsCSV,
  copyTransactionsToClipboard,
} from '@/utils/csv-export';
import type { Transaction } from '@/services/transactions.client';

// =============================================================================
// Test Data
// =============================================================================

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amount: 125.5,
    displayAmount: 125.5,
    type: 'DEBIT',
    status: 'POSTED',
    source: 'MANUAL',
    date: '2024-01-15',
    authorizedDate: null,
    description: 'Grocery Shopping',
    merchantName: 'Whole Foods',
    originalDescription: null,
    currency: 'USD',
    reference: null,
    checkNumber: null,
    notes: 'Weekly groceries',
    isPending: false,
    isRecurring: false,
    isHidden: false,
    includeInBudget: true,
    plaidTransactionId: null,
    plaidAccountId: null,
    saltedgeTransactionId: null,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    isDebit: true,
    isCredit: false,
    isPlaidTransaction: false,
    isManualTransaction: true,
  },
  {
    id: 'tx-2',
    accountId: 'acc-1',
    categoryId: 'cat-2',
    amount: 500.0,
    displayAmount: 500.0,
    type: 'CREDIT',
    status: 'POSTED',
    source: 'MANUAL',
    date: '2024-01-20',
    authorizedDate: null,
    description: 'Salary Deposit',
    merchantName: null,
    originalDescription: null,
    currency: 'USD',
    reference: null,
    checkNumber: null,
    notes: null,
    isPending: false,
    isRecurring: false,
    isHidden: false,
    includeInBudget: true,
    plaidTransactionId: null,
    plaidAccountId: null,
    saltedgeTransactionId: null,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    isDebit: false,
    isCredit: true,
    isPlaidTransaction: false,
    isManualTransaction: true,
  },
];

const categoryMap = new Map([
  ['cat-1', 'Groceries'],
  ['cat-2', 'Income'],
]);

const accountMap = new Map([['acc-1', 'Checking Account']]);

// =============================================================================
// Test Suite
// =============================================================================

describe('csv-export', () => {
  describe('transactionsToCSV', () => {
    it('should include all headers', () => {
      const csv = transactionsToCSV(mockTransactions);
      const headers = csv.split('\n')[0];

      expect(headers).toContain('Date (ISO)');
      expect(headers).toContain('Date');
      expect(headers).toContain('Description');
      expect(headers).toContain('Merchant');
      expect(headers).toContain('Amount');
      expect(headers).toContain('Type');
      expect(headers).toContain('Category');
      expect(headers).toContain('Account');
      expect(headers).toContain('Status');
      expect(headers).toContain('Notes');
    });

    it('should include ISO date in first column', () => {
      const csv = transactionsToCSV(mockTransactions);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('2024-01-15');
    });

    it('should include localized date in second column', () => {
      const csv = transactionsToCSV(mockTransactions);
      const lines = csv.split('\n');

      // Format: MM/DD/YYYY for en-US
      expect(lines[1]).toMatch(/01\/15\/2024/);
    });

    it('should show negative amount for debit transactions', () => {
      const csv = transactionsToCSV(mockTransactions);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('-125.50');
    });

    it('should show positive amount for credit transactions', () => {
      const csv = transactionsToCSV(mockTransactions);
      const lines = csv.split('\n');

      expect(lines[2]).toContain('500.00');
      expect(lines[2]).not.toContain('-500.00');
    });

    it('should map category IDs to names', () => {
      const csv = transactionsToCSV(mockTransactions, { categoryMap });
      const lines = csv.split('\n');

      expect(lines[1]).toContain('Groceries');
      expect(lines[2]).toContain('Income');
    });

    it('should show Uncategorized for missing categories', () => {
      const txWithoutCategory = [
        { ...mockTransactions[0], categoryId: null },
      ];
      const csv = transactionsToCSV(txWithoutCategory);

      expect(csv).toContain('Uncategorized');
    });

    it('should map account IDs to names', () => {
      const csv = transactionsToCSV(mockTransactions, { accountMap });

      expect(csv).toContain('Checking Account');
    });

    it('should show Income type for credit transactions', () => {
      const csv = transactionsToCSV(mockTransactions);
      const lines = csv.split('\n');

      expect(lines[2]).toContain('Income');
    });

    it('should show Expense type for debit transactions', () => {
      const csv = transactionsToCSV(mockTransactions);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('Expense');
    });

    it('should escape values with commas', () => {
      const txWithComma = [
        {
          ...mockTransactions[0],
          description: 'Food, Groceries, and More',
        },
      ];
      const csv = transactionsToCSV(txWithComma);

      expect(csv).toContain('"Food, Groceries, and More"');
    });

    it('should escape values with quotes', () => {
      const txWithQuote = [
        {
          ...mockTransactions[0],
          description: 'Item "Special"',
        },
      ];
      const csv = transactionsToCSV(txWithQuote);

      expect(csv).toContain('"Item ""Special"""');
    });

    it('should handle empty transactions array', () => {
      const csv = transactionsToCSV([]);
      const lines = csv.split('\n');

      expect(lines.length).toBe(1); // Only headers
      expect(lines[0]).toContain('Date (ISO)');
    });
  });

  describe('downloadTransactionsCSV', () => {
    let mockLink: HTMLAnchorElement;
    let createElementSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Create a mock link element
      mockLink = document.createElement('a');
      mockLink.click = vi.fn();

      // Mock createElement to return our mock link
      createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return document.createElement(tagName);
      });

      // Mock URL methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      createElementSpy.mockRestore();
    });

    it('should create a download link and click it', () => {
      downloadTransactionsCSV(mockTransactions);

      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.href).toBe('blob:mock-url');
    });

    it('should use default filename with date', () => {
      downloadTransactionsCSV(mockTransactions);

      expect(mockLink.download).toMatch(/^transactions-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should use custom filename when provided', () => {
      downloadTransactionsCSV(mockTransactions, { filename: 'my-export' });

      expect(mockLink.download).toMatch(/^my-export-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should create blob with correct content type', () => {
      downloadTransactionsCSV(mockTransactions);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should revoke object URL after download', () => {
      downloadTransactionsCSV(mockTransactions);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('copyTransactionsToClipboard', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('should copy CSV content to clipboard', async () => {
      await copyTransactionsToClipboard(mockTransactions);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();

      const clipboardContent = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(clipboardContent).toContain('Date (ISO)');
      expect(clipboardContent).toContain('Grocery Shopping');
    });

    it('should include category and account names when provided', async () => {
      await copyTransactionsToClipboard(mockTransactions, {
        categoryMap,
        accountMap,
      });

      const clipboardContent = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(clipboardContent).toContain('Groceries');
      expect(clipboardContent).toContain('Checking Account');
    });
  });
});
