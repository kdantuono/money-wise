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
});
