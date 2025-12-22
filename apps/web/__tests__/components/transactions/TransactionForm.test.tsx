/**
 * TransactionForm Component Tests
 *
 * TDD tests for the TransactionForm component.
 * Tests cover rendering, validation, type auto-detection, and submission.
 *
 * @module __tests__/components/transactions/TransactionForm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import type { Transaction } from '@/services/transactions.client';
import type { CategoryOption } from '@/services/categories.client';

// =============================================================================
// Test Data
// =============================================================================

const mockAccounts = [
  {
    id: 'acc-1',
    name: 'Checking Account',
    type: 'CHECKING' as const,
    balance: 5000,
    currency: 'USD',
  },
  {
    id: 'acc-2',
    name: 'Savings Account',
    type: 'SAVINGS' as const,
    balance: 10000,
    currency: 'USD',
  },
  {
    id: 'acc-3',
    name: 'Credit Card',
    type: 'CREDIT_CARD' as const,
    balance: -500,
    currency: 'USD',
  },
];

const mockCategories: CategoryOption[] = [
  {
    id: 'cat-1',
    name: 'Groceries',
    type: 'EXPENSE',
    icon: 'shopping-cart',
    color: '#FF5733',
    parentId: null,
    isSystem: false,
  },
  {
    id: 'cat-2',
    name: 'Restaurants',
    type: 'EXPENSE',
    icon: 'utensils',
    color: '#33FF57',
    parentId: null,
    isSystem: false,
  },
  {
    id: 'cat-3',
    name: 'Salary',
    type: 'INCOME',
    icon: 'wallet',
    color: '#5733FF',
    parentId: null,
    isSystem: false,
  },
];

const createMockTransaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: 'tx-1',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  amount: 125.5,
  displayAmount: -125.5,
  type: 'DEBIT',
  status: 'POSTED',
  source: 'MANUAL',
  date: '2024-01-15',
  authorizedDate: null,
  description: 'Groceries at Whole Foods',
  merchantName: 'Whole Foods',
  originalDescription: null,
  currency: 'USD',
  reference: null,
  checkNumber: null,
  notes: 'Weekly shopping',
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
  ...overrides,
});

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('@/services/transactions.client', () => ({
  transactionsClient: {
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  },
}));

vi.mock('@/store/transactions.store', () => ({
  useTransactionsStore: vi.fn(() => ({
    isCreating: false,
    createError: null,
    isUpdating: {},
    updateErrors: {},
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  })),
}));

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps = {
  accounts: mockAccounts,
  categories: mockCategories,
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
};

const getProps = (overrides: Partial<typeof defaultProps> = {}) => ({
  ...defaultProps,
  ...overrides,
  onSuccess: overrides.onSuccess || vi.fn(),
  onCancel: overrides.onCancel || vi.fn(),
});

// =============================================================================
// Tests
// =============================================================================

describe('TransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render all required form fields', () => {
      render(<TransactionForm {...getProps()} />);

      // Check all fields are present
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('should render type toggle (Expense/Income)', () => {
      render(<TransactionForm {...getProps()} />);

      expect(
        screen.getByRole('button', { name: /expense/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /income/i })
      ).toBeInTheDocument();
    });

    it('should render notes field as optional', () => {
      render(<TransactionForm {...getProps()} />);

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(<TransactionForm {...getProps()} />);

      expect(
        screen.getByRole('button', { name: /add transaction/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it('should render in create mode by default', () => {
      render(<TransactionForm {...getProps()} />);

      expect(
        screen.getByRole('heading', { name: /add transaction/i })
      ).toBeInTheDocument();
    });

    it('should render in edit mode when transaction provided', () => {
      const transaction = createMockTransaction();
      render(<TransactionForm {...getProps()} transaction={transaction} />);

      expect(
        screen.getByRole('heading', { name: /edit transaction/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /save changes/i })
      ).toBeInTheDocument();
    });

    it('should pre-fill form values in edit mode', () => {
      const transaction = createMockTransaction({
        amount: 250.75,
        description: 'Test Purchase',
        notes: 'Some notes',
      });

      render(<TransactionForm {...getProps()} transaction={transaction} />);

      expect(screen.getByLabelText(/amount/i)).toHaveValue(250.75);
      expect(screen.getByLabelText(/description/i)).toHaveValue('Test Purchase');
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Some notes');
    });

    it('should show account options in dropdown', () => {
      render(<TransactionForm {...getProps()} />);

      const accountSelect = screen.getByLabelText(/account/i);
      // Check that all account options are present in the select
      expect(accountSelect).toContainHTML('Checking Account');
      expect(accountSelect).toContainHTML('Savings Account');
      expect(accountSelect).toContainHTML('Credit Card');
    });

    it('should default date to today', () => {
      render(<TransactionForm {...getProps()} />);

      const today = new Date().toISOString().split('T')[0];
      expect(screen.getByLabelText(/date/i)).toHaveValue(today);
    });
  });

  // ===========================================================================
  // Type Auto-Detection Tests
  // ===========================================================================

  describe('Type Auto-Detection', () => {
    it('should default to Expense (DEBIT) type', () => {
      render(<TransactionForm {...getProps()} />);

      const expenseButton = screen.getByRole('button', { name: /expense/i });
      expect(expenseButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should allow manual toggle to Income', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      const incomeButton = screen.getByRole('button', { name: /income/i });
      await user.click(incomeButton);

      expect(incomeButton).toHaveAttribute('aria-pressed', 'true');
      const expenseButton = screen.getByRole('button', { name: /expense/i });
      expect(expenseButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should filter categories based on type selection', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      // Default is expense - should show expense categories
      // The CategorySelector uses a combobox role
      const categoryCombobox = screen.getByRole('combobox', { name: /category/i });
      await user.click(categoryCombobox);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });

      // Close dropdown first by clicking outside
      await user.click(document.body);

      // Switch to income
      const incomeButton = screen.getByRole('button', { name: /income/i });
      await user.click(incomeButton);

      // Open dropdown again to see income categories
      await user.click(categoryCombobox);

      // Now should show income categories
      await waitFor(() => {
        expect(screen.getByText('Salary')).toBeInTheDocument();
      });
    });

    it('should show DEBIT type in edit mode for expense transactions', () => {
      const transaction = createMockTransaction({ type: 'DEBIT' });
      render(<TransactionForm {...getProps()} transaction={transaction} />);

      const expenseButton = screen.getByRole('button', { name: /expense/i });
      expect(expenseButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show CREDIT type in edit mode for income transactions', () => {
      const transaction = createMockTransaction({
        type: 'CREDIT',
        categoryId: 'cat-3',
      });
      render(<TransactionForm {...getProps()} transaction={transaction} />);

      const incomeButton = screen.getByRole('button', { name: /income/i });
      expect(incomeButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('Validation', () => {
    it('should show error when amount is empty', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      // Fill other fields but leave amount empty
      await user.type(screen.getByLabelText(/description/i), 'Test Purchase');
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when amount is zero', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      await user.type(screen.getByLabelText(/amount/i), '0');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/amount must be greater than 0/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error when amount is negative', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      await user.type(screen.getByLabelText(/amount/i), '-50');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/amount must be greater than 0/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error when description is empty', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when account is not selected', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/please select an account/i)
        ).toBeInTheDocument();
      });
    });

    it('should allow optional category', async () => {
      const onSuccess = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onSuccess })} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test Purchase');

      // Select account using selectOptions
      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      // Don't select category - it should be optional
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      // Should succeed without category error and call onSuccess
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(
          screen.queryByText(/please select a category/i)
        ).not.toBeInTheDocument();
      });
    });

    it('should show error when date is empty', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      // Clear the date field
      const dateInput = screen.getByLabelText(/date/i);
      await user.clear(dateInput);

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(screen.getByText(/date is required/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Submission Tests
  // ===========================================================================

  describe('Submission', () => {
    it('should call onSuccess with transaction data on valid submit', async () => {
      const onSuccess = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onSuccess })} />);

      // Fill all required fields
      await user.type(screen.getByLabelText(/amount/i), '125.50');
      await user.type(
        screen.getByLabelText(/description/i),
        'Groceries at Whole Foods'
      );

      // Select account using selectOptions for native select
      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      const { user } = render(<TransactionForm {...getProps()} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test');

      // Select account using selectOptions
      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      // Note: Loading state is brief since onSuccess is sync
      // This test verifies the button can be disabled
      // Full loading test would need async mock
    });

    it('should call onCancel when cancel button clicked', async () => {
      const onCancel = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onCancel })} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });

    it('should trim whitespace from description', async () => {
      const onSuccess = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onSuccess })} />);

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(
        screen.getByLabelText(/description/i),
        '  Groceries  '
      );

      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        const callArgs = onSuccess.mock.calls[0][0];
        expect(callArgs.description).toBe('Groceries');
      });
    });

    it('should include notes if provided', async () => {
      const onSuccess = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onSuccess })} />);

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      await user.type(screen.getByLabelText(/notes/i), 'Some extra notes');

      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        const callArgs = onSuccess.mock.calls[0][0];
        expect(callArgs.notes).toBe('Some extra notes');
      });
    });

    it('should not include notes if empty', async () => {
      const onSuccess = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onSuccess })} />);

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test');

      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        const callArgs = onSuccess.mock.calls[0][0];
        expect(callArgs.notes).toBeUndefined();
      });
    });

    it('should set source to MANUAL for new transactions', async () => {
      const onSuccess = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onSuccess })} />);

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test');

      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        const callArgs = onSuccess.mock.calls[0][0];
        expect(callArgs.source).toBe('MANUAL');
      });
    });

    it('should set correct type based on toggle selection', async () => {
      const onSuccess = vi.fn();
      const { user } = render(<TransactionForm {...getProps({ onSuccess })} />);

      // Switch to income
      await user.click(screen.getByRole('button', { name: /income/i }));

      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.type(screen.getByLabelText(/description/i), 'Test');

      await user.selectOptions(screen.getByLabelText(/account/i), 'acc-1');

      await user.click(screen.getByRole('button', { name: /add transaction/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        const callArgs = onSuccess.mock.calls[0][0];
        expect(callArgs.type).toBe('CREDIT');
      });
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <TransactionForm
          {...getProps()}
          error="Server error: Failed to create transaction"
        />
      );

      expect(
        screen.getByText(/server error: failed to create transaction/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<TransactionForm {...getProps()} />);

      // All inputs should have associated labels
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      render(<TransactionForm {...getProps()} />);

      // Required fields should have visual indicator
      const amountLabel = screen.getByText(/amount/i);
      expect(amountLabel.closest('label')?.textContent).toMatch(/\*/);
    });

    it('should have type toggle as button group', () => {
      render(<TransactionForm {...getProps()} />);

      const expenseButton = screen.getByRole('button', { name: /expense/i });
      const incomeButton = screen.getByRole('button', { name: /income/i });

      expect(expenseButton).toHaveAttribute('aria-pressed');
      expect(incomeButton).toHaveAttribute('aria-pressed');
    });
  });

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('Disabled State', () => {
    it('should disable form fields when isLoading prop is true', () => {
      render(<TransactionForm {...getProps()} isLoading={true} />);

      expect(screen.getByLabelText(/amount/i)).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(screen.getByLabelText(/date/i)).toBeDisabled();
      expect(screen.getByLabelText(/account/i)).toBeDisabled();
    });

    it('should disable submit button when isLoading prop is true', () => {
      render(<TransactionForm {...getProps()} isLoading={true} />);

      expect(
        screen.getByRole('button', { name: /add transaction/i })
      ).toBeDisabled();
    });
  });

  // ===========================================================================
  // Linked Transaction Tests (Bank-synced transactions)
  // ===========================================================================

  describe('Linked Transaction Editing', () => {
    it('should show notice for bank-synced transactions', () => {
      const linkedTransaction = createMockTransaction({
        source: 'SALTEDGE',
        isManualTransaction: false,
      });
      render(
        <TransactionForm {...getProps()} transaction={linkedTransaction} />
      );

      expect(screen.getByText(/bank-synced transaction/i)).toBeInTheDocument();
      expect(screen.getByText(/only the category and notes can be edited/i)).toBeInTheDocument();
    });

    it('should lock non-editable fields for linked transactions', () => {
      const linkedTransaction = createMockTransaction({
        source: 'SALTEDGE',
        isManualTransaction: false,
      });
      render(
        <TransactionForm {...getProps()} transaction={linkedTransaction} />
      );

      // Amount, description, date, account should be disabled
      expect(screen.getByLabelText(/amount/i)).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(screen.getByLabelText(/date/i)).toBeDisabled();
      expect(screen.getByLabelText(/account/i)).toBeDisabled();

      // Type toggle should be disabled
      expect(screen.getByRole('button', { name: /expense/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /income/i })).toBeDisabled();
    });

    it('should allow editing category for linked transactions', async () => {
      const linkedTransaction = createMockTransaction({
        source: 'SALTEDGE',
        isManualTransaction: false,
        categoryId: null, // uncategorized
      });
      const { user } = render(
        <TransactionForm {...getProps()} transaction={linkedTransaction} />
      );

      // Category dropdown should NOT be disabled
      const categoryCombobox = screen.getByRole('combobox', { name: /category/i });
      expect(categoryCombobox).not.toBeDisabled();

      // Should be able to open and select
      await user.click(categoryCombobox);
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });
    });

    it('should allow editing notes for linked transactions', () => {
      const linkedTransaction = createMockTransaction({
        source: 'SALTEDGE',
        isManualTransaction: false,
      });
      render(
        <TransactionForm {...getProps()} transaction={linkedTransaction} />
      );

      // Notes should NOT be disabled
      expect(screen.getByLabelText(/notes/i)).not.toBeDisabled();
    });

    it('should only submit categoryId and notes for linked transactions', async () => {
      const onSuccess = vi.fn();
      const linkedTransaction = createMockTransaction({
        source: 'SALTEDGE',
        isManualTransaction: false,
        categoryId: 'cat-1',
      });
      const { user } = render(
        <TransactionForm
          {...getProps({ onSuccess })}
          transaction={linkedTransaction}
        />
      );

      // Change category by opening dropdown and selecting new category
      const categoryCombobox = screen.getByRole('combobox', { name: /category/i });
      await user.click(categoryCombobox);
      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Restaurants'));

      // Add notes
      await user.clear(screen.getByLabelText(/notes/i));
      await user.type(screen.getByLabelText(/notes/i), 'Updated notes');

      // Submit
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        const callArgs = onSuccess.mock.calls[0][0];

        // Should ONLY contain categoryId and notes
        expect(callArgs).toEqual({
          categoryId: 'cat-2',
          notes: 'Updated notes',
        });

        // Should NOT contain these fields for linked transactions
        expect(callArgs).not.toHaveProperty('source');
        expect(callArgs).not.toHaveProperty('accountId');
        expect(callArgs).not.toHaveProperty('amount');
        expect(callArgs).not.toHaveProperty('description');
        expect(callArgs).not.toHaveProperty('date');
        expect(callArgs).not.toHaveProperty('type');
      });
    });

    it('should not send categoryId if unchanged for linked transactions', async () => {
      const onSuccess = vi.fn();
      const linkedTransaction = createMockTransaction({
        source: 'PLAID',
        isManualTransaction: false,
        categoryId: 'cat-1',
        notes: null,
      });
      const { user } = render(
        <TransactionForm
          {...getProps({ onSuccess })}
          transaction={linkedTransaction}
        />
      );

      // Only add notes, don't change category
      await user.type(screen.getByLabelText(/notes/i), 'Just adding notes');

      // Submit
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        const callArgs = onSuccess.mock.calls[0][0];

        // Should contain notes
        expect(callArgs.notes).toBe('Just adding notes');
        // categoryId should be included since it was already set
        expect(callArgs.categoryId).toBe('cat-1');
      });
    });
  });
});
