/**
 * EnhancedTransactionList Component Tests
 *
 * TDD tests for the EnhancedTransactionList component.
 * Tests edit flow, update handling, and accountId stripping behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { EnhancedTransactionList } from '@/components/transactions/EnhancedTransactionList';
import type { Transaction } from '@/services/transactions.client';
import * as transactionsStore from '@/store/transactions.store';
import * as accountsClient from '@/services/accounts.client';
import * as categoriesClient from '@/services/categories.client';

// =============================================================================
// Mocks
// =============================================================================

// Mock the transactions store
vi.mock('@/store/transactions.store', async () => {
  const actual = await vi.importActual('@/store/transactions.store');
  return {
    ...actual,
    useTransactionsStore: vi.fn(),
  };
});

// Mock API clients
vi.mock('@/services/accounts.client', () => ({
  accountsClient: {
    getAccounts: vi.fn(),
  },
  Account: {},
}));

vi.mock('@/services/categories.client', () => ({
  categoriesClient: {
    getOptions: vi.fn(),
  },
  CategoryOption: {},
}));

// =============================================================================
// Test Data
// =============================================================================

const mockTransaction: Transaction = {
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
};

const mockAccounts = [
  {
    id: 'acc-1',
    name: 'Checking Account',
    displayName: 'My Checking',
    type: 'CHECKING',
    currentBalance: 1500,
    currency: 'USD',
    isActive: true,
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Groceries',
    type: 'EXPENSE',
    icon: 'shopping-cart',
    color: '#4CAF50',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('EnhancedTransactionList', () => {
  const mockUpdateTransaction = vi.fn();
  const mockDeleteTransaction = vi.fn();
  const mockDeleteTransactions = vi.fn();
  const mockToggleSelection = vi.fn();
  const mockSelectAll = vi.fn();
  const mockDeselectAll = vi.fn();
  const mockBulkCategorize = vi.fn();
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup store mock
    vi.mocked(transactionsStore.useTransactionsStore).mockReturnValue({
      selectedIds: new Set<string>(),
      isUpdating: {},
      isDeleting: {},
      updateTransaction: mockUpdateTransaction,
      deleteTransaction: mockDeleteTransaction,
      deleteTransactions: mockDeleteTransactions,
      toggleSelection: mockToggleSelection,
      selectAll: mockSelectAll,
      deselectAll: mockDeselectAll,
      bulkCategorize: mockBulkCategorize,
    });

    // Setup API client mocks
    vi.mocked(accountsClient.accountsClient.getAccounts).mockResolvedValue(mockAccounts as never);
    vi.mocked(categoriesClient.categoriesClient.getOptions).mockResolvedValue(mockCategories as never);
  });

  describe('rendering', () => {
    it('should render the transaction list with transactions', () => {
      render(
        <EnhancedTransactionList
          transactions={[mockTransaction]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
    });

    it('should render empty state when no transactions', () => {
      render(
        <EnhancedTransactionList
          transactions={[]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('No transactions found')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <EnhancedTransactionList
          transactions={[]}
          isLoading={true}
          onRefresh={mockOnRefresh}
        />
      );

      // Loading state shows a spinner (svg with aria-hidden)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('edit transaction flow', () => {
    it('should strip accountId when updating a transaction', async () => {
      const user = userEvent.setup();

      // Resolve the update immediately
      mockUpdateTransaction.mockResolvedValueOnce(mockTransaction);

      render(
        <EnhancedTransactionList
          transactions={[mockTransaction]}
          onRefresh={mockOnRefresh}
        />
      );

      // Find and click the edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // The form should be pre-filled - find and click submit
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify updateTransaction was called
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalled();
      });

      // Get the call arguments
      const callArgs = mockUpdateTransaction.mock.calls[0];
      const [id, updateData] = callArgs;

      // Verify the ID is correct
      expect(id).toBe('tx-1');

      // The critical assertion: accountId should NOT be in the update data
      expect(updateData).not.toHaveProperty('accountId');

      // But other fields should still be present
      expect(updateData).toHaveProperty('amount');
      expect(updateData).toHaveProperty('description');
    });

    it('should call onRefresh after successful update', async () => {
      const user = userEvent.setup();

      mockUpdateTransaction.mockResolvedValueOnce(mockTransaction);

      render(
        <EnhancedTransactionList
          transactions={[mockTransaction]}
          onRefresh={mockOnRefresh}
        />
      );

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Wait for form and submit
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify onRefresh was called after update
      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('update data format', () => {
    it('should include only allowed update fields in UpdateTransactionData', async () => {
      const user = userEvent.setup();

      mockUpdateTransaction.mockResolvedValueOnce(mockTransaction);

      render(
        <EnhancedTransactionList
          transactions={[mockTransaction]}
          onRefresh={mockOnRefresh}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalled();
      });

      const [, updateData] = mockUpdateTransaction.mock.calls[0];

      // List of fields that SHOULD NOT be in update data
      // (because they're immutable or not part of UpdateTransactionDto)
      const forbiddenFields = ['accountId', 'plaidTransactionId', 'id'];

      for (const field of forbiddenFields) {
        expect(updateData).not.toHaveProperty(field);
      }
    });
  });

  // ===========================================================================
  // Filter Tests
  // ===========================================================================

  describe('filtering functionality', () => {
    const multipleTransactions: Transaction[] = [
      {
        ...mockTransaction,
        id: 'tx-1',
        description: 'Grocery Shopping',
        merchantName: 'Whole Foods',
        amount: 125.5,
        type: 'DEBIT',
        categoryId: 'cat-1',
        date: '2024-01-15',
      },
      {
        ...mockTransaction,
        id: 'tx-2',
        description: 'Salary Deposit',
        merchantName: 'ACME Corp',
        amount: 5000,
        type: 'CREDIT',
        categoryId: 'cat-2',
        date: '2024-01-10',
      },
      {
        ...mockTransaction,
        id: 'tx-3',
        description: 'Coffee Shop',
        merchantName: 'Starbucks',
        amount: 5.5,
        type: 'DEBIT',
        categoryId: null,
        date: '2024-01-20',
      },
      {
        ...mockTransaction,
        id: 'tx-4',
        description: 'Restaurant Dinner',
        merchantName: 'The Fancy Place',
        amount: 85,
        type: 'DEBIT',
        categoryId: 'cat-1',
        date: '2024-01-12',
      },
    ];

    describe('search filter', () => {
      it('should filter transactions by description', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const searchInput = screen.getByPlaceholderText(/search transactions/i);
        await user.type(searchInput, 'Grocery');

        // Should show matching transaction
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
        // Should not show non-matching transactions
        expect(screen.queryByText('Salary Deposit')).not.toBeInTheDocument();
        expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument();
      });

      it('should filter transactions by merchant name', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const searchInput = screen.getByPlaceholderText(/search transactions/i);
        await user.type(searchInput, 'Starbucks');

        expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
        expect(screen.queryByText('Grocery Shopping')).not.toBeInTheDocument();
      });

      it('should be case-insensitive', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const searchInput = screen.getByPlaceholderText(/search transactions/i);
        await user.type(searchInput, 'GROCERY');

        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
      });
    });

    describe('type filter', () => {
      it('should filter by DEBIT type', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        // Open filters
        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        // Select DEBIT type
        const typeSelect = screen.getByLabelText(/type/i);
        await user.selectOptions(typeSelect, 'DEBIT');

        // Should show DEBIT transactions
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
        // Should not show CREDIT transactions
        expect(screen.queryByText('Salary Deposit')).not.toBeInTheDocument();
      });

      it('should filter by CREDIT type', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        const typeSelect = screen.getByLabelText(/type/i);
        await user.selectOptions(typeSelect, 'CREDIT');

        expect(screen.getByText('Salary Deposit')).toBeInTheDocument();
        expect(screen.queryByText('Grocery Shopping')).not.toBeInTheDocument();
      });
    });

    describe('category filter', () => {
      it('should filter by specific category', async () => {
        const user = userEvent.setup();

        const categoryMap = new Map([
          ['cat-1', 'Groceries'],
          ['cat-2', 'Income'],
        ]);

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            categoryMap={categoryMap}
            onRefresh={mockOnRefresh}
          />
        );

        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        // Wait for categories to load
        await waitFor(() => {
          expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        });

        const categorySelect = screen.getByLabelText(/category/i);
        await user.selectOptions(categorySelect, 'cat-1');

        // Should show transactions with cat-1
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
        expect(screen.getByText('Restaurant Dinner')).toBeInTheDocument();
        // Should not show other categories
        expect(screen.queryByText('Salary Deposit')).not.toBeInTheDocument();
        expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument();
      });

      it('should filter by uncategorized', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        await waitFor(() => {
          expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        });

        const categorySelect = screen.getByLabelText(/category/i);
        await user.selectOptions(categorySelect, 'uncategorized');

        // Should show only uncategorized transaction
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
        expect(screen.queryByText('Grocery Shopping')).not.toBeInTheDocument();
      });
    });

    describe('amount range filter', () => {
      it('should filter by minimum amount', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        const minAmountInput = screen.getByLabelText(/min amount/i);
        await user.type(minAmountInput, '100');

        // Should show transactions >= 100
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument(); // 125.5
        expect(screen.getByText('Salary Deposit')).toBeInTheDocument(); // 5000
        // Should not show transactions < 100
        expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument(); // 5.5
        expect(screen.queryByText('Restaurant Dinner')).not.toBeInTheDocument(); // 85
      });

      it('should filter by maximum amount', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        const maxAmountInput = screen.getByLabelText(/max amount/i);
        await user.type(maxAmountInput, '100');

        // Should show transactions <= 100
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument(); // 5.5
        expect(screen.getByText('Restaurant Dinner')).toBeInTheDocument(); // 85
        // Should not show transactions > 100
        expect(screen.queryByText('Grocery Shopping')).not.toBeInTheDocument(); // 125.5
        expect(screen.queryByText('Salary Deposit')).not.toBeInTheDocument(); // 5000
      });

      it('should filter by amount range (min and max)', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        const minAmountInput = screen.getByLabelText(/min amount/i);
        const maxAmountInput = screen.getByLabelText(/max amount/i);
        await user.type(minAmountInput, '50');
        await user.type(maxAmountInput, '150');

        // Should show transactions in range 50-150
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument(); // 125.5
        expect(screen.getByText('Restaurant Dinner')).toBeInTheDocument(); // 85
        // Should not show transactions outside range
        expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument(); // 5.5
        expect(screen.queryByText('Salary Deposit')).not.toBeInTheDocument(); // 5000
      });
    });

    describe('multiple filters (intersection)', () => {
      it('should apply multiple filters together', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        // Search filter
        const searchInput = screen.getByPlaceholderText(/search transactions/i);
        await user.type(searchInput, 'o'); // matches "Grocery", "Coffee", "Salary" (Corp)

        // Open filters
        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        // Type filter
        const typeSelect = screen.getByLabelText(/type/i);
        await user.selectOptions(typeSelect, 'DEBIT');

        // Min amount filter
        const minAmountInput = screen.getByLabelText(/min amount/i);
        await user.type(minAmountInput, '10');

        // Should only show transactions matching ALL filters
        // - Contains 'o' in description/merchant
        // - Type is DEBIT
        // - Amount >= 10
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument(); // matches all: has 'o', DEBIT, >= 10
        expect(screen.queryByText('Restaurant Dinner')).not.toBeInTheDocument(); // no 'o' in desc/merchant
        expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument(); // amount < 10
        expect(screen.queryByText('Salary Deposit')).not.toBeInTheDocument(); // CREDIT type
      });
    });

    describe('clear filters', () => {
      it('should clear all filters when clicking clear button', async () => {
        const user = userEvent.setup();

        render(
          <EnhancedTransactionList
            transactions={multipleTransactions}
            onRefresh={mockOnRefresh}
          />
        );

        // Apply search filter
        const searchInput = screen.getByPlaceholderText(/search transactions/i);
        await user.type(searchInput, 'Grocery');

        // Only one transaction should be visible
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
        expect(screen.queryByText('Salary Deposit')).not.toBeInTheDocument();

        // Open filters
        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);

        // Clear filters
        const clearButton = screen.getByRole('button', { name: /clear all filters/i });
        await user.click(clearButton);

        // All transactions should be visible again
        await waitFor(() => {
          expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
          expect(screen.getByText('Salary Deposit')).toBeInTheDocument();
          expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
        });
      });
    });
  });

  // ===========================================================================
  // Sort Tests
  // ===========================================================================

  describe('sorting functionality', () => {
    const sortableTransactions: Transaction[] = [
      {
        ...mockTransaction,
        id: 'tx-1',
        description: 'Alpha Transaction',
        amount: 100,
        date: '2024-01-15',
        categoryId: 'cat-2',
      },
      {
        ...mockTransaction,
        id: 'tx-2',
        description: 'Beta Transaction',
        amount: 50,
        date: '2024-01-10',
        categoryId: 'cat-1',
      },
      {
        ...mockTransaction,
        id: 'tx-3',
        description: 'Gamma Transaction',
        amount: 200,
        date: '2024-01-20',
        categoryId: 'cat-3',
      },
    ];

    const categoryMap = new Map([
      ['cat-1', 'Groceries'],
      ['cat-2', 'Entertainment'],
      ['cat-3', 'Utilities'],
    ]);

    it('should sort by date descending by default', () => {
      render(
        <EnhancedTransactionList
          transactions={sortableTransactions}
          categoryMap={categoryMap}
          onRefresh={mockOnRefresh}
        />
      );

      // Get all transaction descriptions in order
      const descriptions = screen.getAllByText(/Transaction$/);
      const descTexts = descriptions.map((el) => el.textContent);

      // Default sort is date descending (newest first)
      // Jan 20 (Gamma), Jan 15 (Alpha), Jan 10 (Beta)
      expect(descTexts[0]).toBe('Gamma Transaction');
      expect(descTexts[1]).toBe('Alpha Transaction');
      expect(descTexts[2]).toBe('Beta Transaction');
    });

    it('should toggle sort direction when clicking same sort button', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedTransactionList
          transactions={sortableTransactions}
          categoryMap={categoryMap}
          onRefresh={mockOnRefresh}
        />
      );

      // Open filters to access sort buttons
      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Click date sort button to toggle to ascending
      const dateSortButton = screen.getByRole('button', { name: /date/i });
      await user.click(dateSortButton);

      // Now should be ascending (oldest first)
      const descriptions = screen.getAllByText(/Transaction$/);
      const descTexts = descriptions.map((el) => el.textContent);

      expect(descTexts[0]).toBe('Beta Transaction'); // Jan 10
      expect(descTexts[1]).toBe('Alpha Transaction'); // Jan 15
      expect(descTexts[2]).toBe('Gamma Transaction'); // Jan 20
    });

    it('should sort by amount', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedTransactionList
          transactions={sortableTransactions}
          categoryMap={categoryMap}
          onRefresh={mockOnRefresh}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const amountSortButton = screen.getByRole('button', { name: /amount/i });
      await user.click(amountSortButton);

      const descriptions = screen.getAllByText(/Transaction$/);
      const descTexts = descriptions.map((el) => el.textContent);

      // Amount descending (highest first): 200, 100, 50
      expect(descTexts[0]).toBe('Gamma Transaction'); // 200
      expect(descTexts[1]).toBe('Alpha Transaction'); // 100
      expect(descTexts[2]).toBe('Beta Transaction'); // 50
    });

    it('should sort by description alphabetically', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedTransactionList
          transactions={sortableTransactions}
          categoryMap={categoryMap}
          onRefresh={mockOnRefresh}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const descSortButton = screen.getByRole('button', { name: /a-z/i });
      await user.click(descSortButton);

      const descriptions = screen.getAllByText(/Transaction$/);
      const descTexts = descriptions.map((el) => el.textContent);

      // A-Z ascending (default on first click for alphabetical sort)
      expect(descTexts[0]).toBe('Alpha Transaction');
      expect(descTexts[1]).toBe('Beta Transaction');
      expect(descTexts[2]).toBe('Gamma Transaction');
    });

    it('should sort by category name', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedTransactionList
          transactions={sortableTransactions}
          categoryMap={categoryMap}
          onRefresh={mockOnRefresh}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const categorySortButton = screen.getByRole('button', { name: /category/i });
      await user.click(categorySortButton);

      const descriptions = screen.getAllByText(/Transaction$/);
      const descTexts = descriptions.map((el) => el.textContent);

      // Category descending (Z-A): Utilities, Groceries, Entertainment
      expect(descTexts[0]).toBe('Gamma Transaction'); // Utilities
      expect(descTexts[1]).toBe('Beta Transaction'); // Groceries
      expect(descTexts[2]).toBe('Alpha Transaction'); // Entertainment
    });
  });

  // ===========================================================================
  // Filter Count Badge Tests
  // ===========================================================================

  describe('filter count badge', () => {
    it('should show correct count of active filters', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedTransactionList
          transactions={[mockTransaction]}
          onRefresh={mockOnRefresh}
        />
      );

      // Open filters
      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Apply type filter
      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, 'DEBIT');

      // Apply min amount filter
      const minAmountInput = screen.getByLabelText(/min amount/i);
      await user.type(minAmountInput, '10');

      // Badge should show 2 active filters
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Results Count Tests
  // ===========================================================================

  describe('results count display', () => {
    it('should display correct filtered/total count', async () => {
      const user = userEvent.setup();

      const transactions = [
        { ...mockTransaction, id: 'tx-1', description: 'Test One', type: 'DEBIT' as const },
        { ...mockTransaction, id: 'tx-2', description: 'Test Two', type: 'DEBIT' as const },
        { ...mockTransaction, id: 'tx-3', description: 'Test Three', type: 'CREDIT' as const },
      ];

      render(
        <EnhancedTransactionList
          transactions={transactions}
          onRefresh={mockOnRefresh}
        />
      );

      // Initially shows all
      expect(screen.getByText(/showing/i)).toHaveTextContent('3');
      expect(screen.getByText(/of/i)).toHaveTextContent('3');

      // Open filters
      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Apply DEBIT filter
      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, 'DEBIT');

      // Should now show 2 of 3
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });
});
