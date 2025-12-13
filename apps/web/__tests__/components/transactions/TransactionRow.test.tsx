/**
 * TransactionRow Component Tests
 *
 * TDD tests for the TransactionRow component.
 * Tests rendering, actions, selection, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import type { Transaction } from '@/services/transactions.client';

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

const mockCreditTransaction: Transaction = {
  ...mockTransaction,
  id: 'tx-2',
  type: 'CREDIT',
  amount: 500.0,
  displayAmount: 500.0,
  description: 'Salary Deposit',
  merchantName: null,
  isDebit: false,
  isCredit: true,
};

const mockPendingTransaction: Transaction = {
  ...mockTransaction,
  id: 'tx-3',
  status: 'PENDING',
  isPending: true,
  description: 'Pending Payment',
};

// =============================================================================
// Test Suite
// =============================================================================

describe('TransactionRow', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRow = (
    transaction: Transaction = mockTransaction,
    props: Partial<{
      isSelected: boolean;
      isSelectable: boolean;
      isUpdating: boolean;
      isDeleting: boolean;
      categoryName?: string;
      accountName?: string;
    }> = {}
  ) => {
    return render(
      <TransactionRow
        transaction={transaction}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
        isSelected={props.isSelected ?? false}
        isSelectable={props.isSelectable ?? true}
        isUpdating={props.isUpdating ?? false}
        isDeleting={props.isDeleting ?? false}
        categoryName={props.categoryName}
        accountName={props.accountName}
      />
    );
  };

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render transaction description', () => {
      renderRow();
      expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
    });

    it('should render merchant name when available', () => {
      renderRow();
      expect(screen.getByText('Whole Foods')).toBeInTheDocument();
    });

    it('should render transaction date', () => {
      renderRow();
      // Date should be formatted
      expect(screen.getByText(/Jan.*15.*2024/i)).toBeInTheDocument();
    });

    it('should render amount with currency formatting', () => {
      renderRow();
      expect(screen.getByText(/\$125\.50/)).toBeInTheDocument();
    });

    it('should show negative sign for debit transactions', () => {
      renderRow();
      const amountElement = screen.getByText(/125\.50/);
      expect(amountElement.textContent).toMatch(/[-−]/);
    });

    it('should show positive sign for credit transactions', () => {
      renderRow(mockCreditTransaction);
      const amountElement = screen.getByText(/500\.00/);
      expect(amountElement.textContent).toMatch(/\+/);
    });

    it('should apply green color for credit transactions', () => {
      renderRow(mockCreditTransaction);
      const amountElement = screen.getByText(/\+\$500\.00/);
      expect(amountElement).toHaveClass('text-green-600');
    });

    it('should show pending badge for pending transactions', () => {
      renderRow(mockPendingTransaction);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display category name when provided', () => {
      renderRow(mockTransaction, { categoryName: 'Groceries' });
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    it('should display account name when provided', () => {
      renderRow(mockTransaction, { accountName: 'Checking Account' });
      expect(screen.getByText('Checking Account')).toBeInTheDocument();
    });

    it('should show "Uncategorized" when no category', () => {
      const txWithoutCategory = { ...mockTransaction, categoryId: null };
      renderRow(txWithoutCategory);
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Selection Tests
  // ===========================================================================

  describe('Selection', () => {
    it('should render checkbox when selectable', () => {
      renderRow(mockTransaction, { isSelectable: true });
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should not render checkbox when not selectable', () => {
      renderRow(mockTransaction, { isSelectable: false });
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should show checked state when selected', () => {
      renderRow(mockTransaction, { isSelected: true });
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should show unchecked state when not selected', () => {
      renderRow(mockTransaction, { isSelected: false });
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('should call onSelect when checkbox is clicked', async () => {
      const { user } = renderRow();
      await user.click(screen.getByRole('checkbox'));
      expect(mockOnSelect).toHaveBeenCalledWith('tx-1');
    });

    it('should have accessible label for checkbox', () => {
      renderRow();
      expect(
        screen.getByRole('checkbox', { name: /select.*grocery shopping/i })
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Action Button Tests
  // ===========================================================================

  describe('Action Buttons', () => {
    it('should render edit button', () => {
      renderRow();
      expect(
        screen.getByRole('button', { name: /edit/i })
      ).toBeInTheDocument();
    });

    it('should render delete button', () => {
      renderRow();
      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', async () => {
      const { user } = renderRow();
      await user.click(screen.getByRole('button', { name: /edit/i }));
      expect(mockOnEdit).toHaveBeenCalledWith(mockTransaction);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const { user } = renderRow();
      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(mockOnDelete).toHaveBeenCalledWith('tx-1');
    });

    it('should disable edit button while updating', () => {
      renderRow(mockTransaction, { isUpdating: true });
      expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
    });

    it('should disable delete button while deleting', () => {
      renderRow(mockTransaction, { isDeleting: true });
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('should show loading indicator while updating', () => {
      renderRow(mockTransaction, { isUpdating: true });
      expect(screen.getByTestId('updating-spinner')).toBeInTheDocument();
    });

    it('should show loading indicator while deleting', () => {
      renderRow(mockTransaction, { isDeleting: true });
      expect(screen.getByTestId('deleting-spinner')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible row structure', () => {
      renderRow();
      // Row should be focusable or have proper structure
      const row = screen.getByRole('article');
      expect(row).toBeInTheDocument();
    });

    it('should have proper aria-label for amount', () => {
      renderRow();
      expect(
        screen.getByLabelText(/expense.*125\.50/i)
      ).toBeInTheDocument();
    });

    it('should have proper aria-label for credit amount', () => {
      renderRow(mockCreditTransaction);
      expect(
        screen.getByLabelText(/income.*500\.00/i)
      ).toBeInTheDocument();
    });

    it('should indicate loading state accessibly', () => {
      renderRow(mockTransaction, { isUpdating: true });
      expect(screen.getByRole('button', { name: /edit/i })).toHaveAttribute(
        'aria-busy',
        'true'
      );
    });
  });

  // ===========================================================================
  // Visual Indicator Tests
  // ===========================================================================

  describe('Visual Indicators', () => {
    it('should show green indicator for credit', () => {
      renderRow(mockCreditTransaction);
      const indicator = screen.getByTestId('type-indicator');
      expect(indicator).toHaveClass('bg-green-500');
    });

    it('should show red indicator for debit', () => {
      renderRow();
      const indicator = screen.getByTestId('type-indicator');
      expect(indicator).toHaveClass('bg-red-500');
    });

    it('should highlight row when selected', () => {
      renderRow(mockTransaction, { isSelected: true });
      const row = screen.getByRole('article');
      expect(row).toHaveClass('bg-blue-50');
    });
  });
});
