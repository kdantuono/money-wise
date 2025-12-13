/**
 * RecategorizeDialog Component Tests
 *
 * TDD tests for the RecategorizeDialog component.
 * Tests cover rendering, category selection, and bulk categorization.
 *
 * @module __tests__/components/transactions/RecategorizeDialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { RecategorizeDialog } from '@/components/transactions/RecategorizeDialog';
import type { CategoryOption } from '@/services/categories.client';

// =============================================================================
// Test Data
// =============================================================================

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

// =============================================================================
// Tests
// =============================================================================

describe('RecategorizeDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RecategorizeDialog
          isOpen={false}
          transactionIds={['tx-1', 'tx-2']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render dialog when isOpen is true', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1', 'tx-2']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should display transaction count in title', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1', 'tx-2', 'tx-3']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/categorize 3 transactions/i)).toBeInTheDocument();
    });

    it('should display singular when only one transaction', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/categorize 1 transaction/i)).toBeInTheDocument();
    });

    it('should render category selector', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
    });

    it('should render cancel and confirm buttons', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Category Selection Tests
  // ===========================================================================

  describe('Category Selection', () => {
    it('should allow selecting a category', async () => {
      const { user } = render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const categoryCombobox = screen.getByRole('combobox', { name: /category/i });
      await user.click(categoryCombobox);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Groceries'));

      // Apply button should be enabled after selection
      expect(screen.getByRole('button', { name: /apply/i })).not.toBeDisabled();
    });

    it('should disable apply button when no category selected', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const { user } = render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onConfirm with category when apply clicked', async () => {
      const { user } = render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1', 'tx-2']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Select category
      const categoryCombobox = screen.getByRole('combobox', { name: /category/i });
      await user.click(categoryCombobox);
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Groceries'));

      // Click apply
      await user.click(screen.getByRole('button', { name: /apply/i }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('cat-1');
      });
    });

    it('should close on escape key', async () => {
      const { user } = render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading state when isProcessing is true', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={true}
        />
      );

      expect(screen.getByTestId('processing-spinner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have proper dialog role', () => {
      render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should trap focus within dialog', async () => {
      const { user } = render(
        <RecategorizeDialog
          isOpen={true}
          transactionIds={['tx-1']}
          categories={mockCategories}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Tab through elements, should stay within dialog
      await user.tab();
      await user.tab();
      await user.tab();

      // Focus should still be within the dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });
});
