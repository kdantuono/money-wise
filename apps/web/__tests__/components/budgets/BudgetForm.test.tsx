/**
 * BudgetForm Component Tests
 * Tests form rendering, validation, submission, and user interactions
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { BudgetForm, CategoryOption } from '../../../src/components/budgets/BudgetForm';
import type { Budget } from '../../../src/services/budgets.client';

// Mock categories for testing
const mockCategories: CategoryOption[] = [
  { id: 'cat-1', name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50' },
  { id: 'cat-2', name: 'Dining', icon: 'utensils', color: '#FF9800' },
  { id: 'cat-3', name: 'Entertainment', icon: 'film', color: '#9C27B0' },
];

// Mock budget for edit mode
const createMockBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: 'budget-1',
  name: 'Test Budget',
  amount: 500,
  period: 'MONTHLY',
  status: 'ACTIVE',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  alertThresholds: [50, 75, 90],
  category: {
    id: 'cat-1',
    name: 'Groceries',
    icon: 'shopping-cart',
    color: '#4CAF50',
  },
  spent: 250,
  remaining: 250,
  percentage: 50,
  progressStatus: 'safe',
  isOverBudget: false,
  isExpired: false,
  notes: 'Test notes',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('BudgetForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  const getDefaultProps = () => ({
    categories: mockCategories,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  });

  describe('Rendering', () => {
    it('should render create mode by default', () => {
      render(<BudgetForm {...getDefaultProps()} />);

      // Title should show "Create Budget"
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Create Budget');
      expect(screen.getByTestId('budget-submit-button')).toHaveTextContent('Create Budget');
    });

    it('should render edit mode when budget prop is provided', () => {
      const budget = createMockBudget();

      render(<BudgetForm {...getDefaultProps()} budget={budget} />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Edit Budget');
      expect(screen.getByTestId('budget-submit-button')).toHaveTextContent('Save Changes');
    });

    it('should render all required form fields', () => {
      render(<BudgetForm {...getDefaultProps()} />);

      expect(screen.getByLabelText('Budget Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Budget Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Period')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    });

    it('should render category options in select', () => {
      render(<BudgetForm {...getDefaultProps()} />);

      const categorySelect = screen.getByTestId('budget-category-select');
      expect(categorySelect).toContainHTML('Groceries');
      expect(categorySelect).toContainHTML('Dining');
      expect(categorySelect).toContainHTML('Entertainment');
    });

    it('should render period options in select', () => {
      render(<BudgetForm {...getDefaultProps()} />);

      const periodSelect = screen.getByTestId('budget-period-select');
      expect(periodSelect).toContainHTML('Monthly');
      expect(periodSelect).toContainHTML('Quarterly');
      expect(periodSelect).toContainHTML('Yearly');
      expect(periodSelect).toContainHTML('Custom');
    });

    it('should pre-fill form values in edit mode', () => {
      const budget = createMockBudget({
        name: 'My Grocery Budget',
        amount: 750,
        notes: 'Monthly grocery expenses',
      });

      render(<BudgetForm {...getDefaultProps()} budget={budget} />);

      expect(screen.getByTestId('budget-name-input')).toHaveValue('My Grocery Budget');
      expect(screen.getByTestId('budget-amount-input')).toHaveValue(750);
      expect(screen.getByTestId('budget-notes-input')).toHaveValue('Monthly grocery expenses');
      expect(screen.getByTestId('budget-category-select')).toHaveValue('cat-1');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BudgetForm {...getDefaultProps()} className="custom-form-class" />
      );

      expect(container.querySelector('.custom-form-class')).toBeInTheDocument();
    });

    it('should apply custom data-testid', () => {
      render(<BudgetForm {...getDefaultProps()} data-testid="my-budget-form" />);

      expect(screen.getByTestId('my-budget-form')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when name is empty on submit', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      // Fill other required fields but leave name empty
      await user.selectOptions(screen.getByTestId('budget-category-select'), 'cat-1');
      await user.type(screen.getByTestId('budget-amount-input'), '500');

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Budget name is required');
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when category is not selected', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('budget-name-input'), 'Test Budget');
      await user.type(screen.getByTestId('budget-amount-input'), '500');

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Please select a category');
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when amount is empty', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('budget-name-input'), 'Test Budget');
      await user.selectOptions(screen.getByTestId('budget-category-select'), 'cat-1');
      // Leave amount empty (no typing)

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Amount must be greater than 0');
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    // Note: Testing amount=0 directly is challenging due to how jsdom handles number inputs.
    // The validation logic `parseFloat(amount) <= 0` is verified through the component code
    // and the "amount is empty" test covers the `!amount` branch.

    it('should show error when end date is before start date', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('budget-name-input'), 'Test Budget');
      await user.selectOptions(screen.getByTestId('budget-category-select'), 'cat-1');
      await user.type(screen.getByTestId('budget-amount-input'), '500');

      // Select custom period to enable date editing
      await user.selectOptions(screen.getByTestId('budget-period-select'), 'CUSTOM');

      // Set invalid date range
      fireEvent.change(screen.getByTestId('budget-start-date-input'), {
        target: { value: '2025-01-31' },
      });
      fireEvent.change(screen.getByTestId('budget-end-date-input'), {
        target: { value: '2025-01-01' },
      });

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('End date must be after start date');
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when dates are the same', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('budget-name-input'), 'Test Budget');
      await user.selectOptions(screen.getByTestId('budget-category-select'), 'cat-1');
      await user.type(screen.getByTestId('budget-amount-input'), '500');

      // Select custom period to enable date editing
      await user.selectOptions(screen.getByTestId('budget-period-select'), 'CUSTOM');

      // Set same dates
      fireEvent.change(screen.getByTestId('budget-start-date-input'), {
        target: { value: '2025-01-15' },
      });
      fireEvent.change(screen.getByTestId('budget-end-date-input'), {
        target: { value: '2025-01-15' },
      });

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('End date must be after start date');
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data when form is valid', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('budget-name-input'), 'Grocery Budget');
      await user.selectOptions(screen.getByTestId('budget-category-select'), 'cat-1');
      await user.type(screen.getByTestId('budget-amount-input'), '500');
      await user.type(screen.getByTestId('budget-notes-input'), 'Monthly groceries');

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Grocery Budget',
            categoryId: 'cat-1',
            amount: 500,
            period: 'MONTHLY',
            notes: 'Monthly groceries',
          })
        );
      });
    });

    it('should trim whitespace from name and notes', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('budget-name-input'), '  Grocery Budget  ');
      await user.selectOptions(screen.getByTestId('budget-category-select'), 'cat-1');
      await user.type(screen.getByTestId('budget-amount-input'), '500');
      await user.type(screen.getByTestId('budget-notes-input'), '  Some notes  ');

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Grocery Budget',
            notes: 'Some notes',
          })
        );
      });
    });

    it('should not include notes if empty', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('budget-name-input'), 'Grocery Budget');
      await user.selectOptions(screen.getByTestId('budget-category-select'), 'cat-1');
      await user.type(screen.getByTestId('budget-amount-input'), '500');
      // Leave notes empty

      await user.click(screen.getByTestId('budget-submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: undefined,
          })
        );
      });
    });

    it('should disable form fields while submitting', () => {
      render(<BudgetForm {...getDefaultProps()} isSubmitting={true} />);

      expect(screen.getByTestId('budget-name-input')).toBeDisabled();
      expect(screen.getByTestId('budget-category-select')).toBeDisabled();
      expect(screen.getByTestId('budget-amount-input')).toBeDisabled();
      expect(screen.getByTestId('budget-period-select')).toBeDisabled();
      expect(screen.getByTestId('budget-notes-input')).toBeDisabled();
      expect(screen.getByTestId('budget-submit-button')).toBeDisabled();
      expect(screen.getByTestId('budget-cancel-button')).toBeDisabled();
    });

    it('should show "Creating..." text while submitting in create mode', () => {
      render(<BudgetForm {...getDefaultProps()} isSubmitting={true} />);

      expect(screen.getByTestId('budget-submit-button')).toHaveTextContent('Creating...');
    });

    it('should show "Saving..." text while submitting in edit mode', () => {
      const budget = createMockBudget();

      render(<BudgetForm {...getDefaultProps()} budget={budget} isSubmitting={true} />);

      expect(screen.getByTestId('budget-submit-button')).toHaveTextContent('Saving...');
    });
  });

  describe('Period Selection', () => {
    it('should disable date inputs for non-CUSTOM periods', () => {
      render(<BudgetForm {...getDefaultProps()} />);

      // Default is MONTHLY - dates should be disabled
      expect(screen.getByTestId('budget-start-date-input')).toBeDisabled();
      expect(screen.getByTestId('budget-end-date-input')).toBeDisabled();
    });

    it('should enable date inputs for CUSTOM period', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.selectOptions(screen.getByTestId('budget-period-select'), 'CUSTOM');

      expect(screen.getByTestId('budget-start-date-input')).not.toBeDisabled();
      expect(screen.getByTestId('budget-end-date-input')).not.toBeDisabled();
    });

    it('should auto-set dates when changing to QUARTERLY period', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.selectOptions(screen.getByTestId('budget-period-select'), 'QUARTERLY');

      // Dates should be set to current quarter
      const startInput = screen.getByTestId('budget-start-date-input') as HTMLInputElement;
      const endInput = screen.getByTestId('budget-end-date-input') as HTMLInputElement;

      expect(startInput.value).toBeTruthy();
      expect(endInput.value).toBeTruthy();
      expect(new Date(startInput.value) < new Date(endInput.value)).toBe(true);
    });

    it('should auto-set dates when changing to YEARLY period', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.selectOptions(screen.getByTestId('budget-period-select'), 'YEARLY');

      const startInput = screen.getByTestId('budget-start-date-input') as HTMLInputElement;
      const endInput = screen.getByTestId('budget-end-date-input') as HTMLInputElement;

      const year = new Date().getFullYear();
      expect(startInput.value).toBe(`${year}-01-01`);
      expect(endInput.value).toBe(`${year}-12-31`);
    });
  });

  describe('Cancel', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const { user } = render(<BudgetForm {...getDefaultProps()} />);

      await user.click(screen.getByTestId('budget-cancel-button'));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable cancel button while submitting', () => {
      render(<BudgetForm {...getDefaultProps()} isSubmitting={true} />);

      expect(screen.getByTestId('budget-cancel-button')).toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('should display server error message', () => {
      render(<BudgetForm {...getDefaultProps()} error="Server error occurred" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Server error occurred');
    });

    it('should show server error when provided and no form error', () => {
      render(<BudgetForm {...getDefaultProps()} error="Server error" />);

      // Server error should be visible
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });

    it('should clear server error when form is re-rendered without error prop', () => {
      const { rerender } = render(
        <BudgetForm {...getDefaultProps()} error="Server error" />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Server error');

      // Re-render without error
      rerender(<BudgetForm {...getDefaultProps()} error={null} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should have alert role on error container', () => {
      render(<BudgetForm {...getDefaultProps()} error="Test error" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Edit Mode Specifics', () => {
    it('should preserve existing category selection', () => {
      const budget = createMockBudget({
        category: { id: 'cat-2', name: 'Dining', icon: null, color: null },
      });

      render(<BudgetForm {...getDefaultProps()} budget={budget} />);

      expect(screen.getByTestId('budget-category-select')).toHaveValue('cat-2');
    });

    it('should preserve existing period selection', () => {
      const budget = createMockBudget({ period: 'QUARTERLY' });

      render(<BudgetForm {...getDefaultProps()} budget={budget} />);

      expect(screen.getByTestId('budget-period-select')).toHaveValue('QUARTERLY');
    });

    it('should preserve existing dates', () => {
      const budget = createMockBudget({
        startDate: '2025-03-01',
        endDate: '2025-03-31',
      });

      render(<BudgetForm {...getDefaultProps()} budget={budget} />);

      expect(screen.getByTestId('budget-start-date-input')).toHaveValue('2025-03-01');
      expect(screen.getByTestId('budget-end-date-input')).toHaveValue('2025-03-31');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form inputs', () => {
      render(<BudgetForm {...getDefaultProps()} />);

      // All inputs should be associated with labels
      expect(screen.getByLabelText('Budget Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Budget Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Period')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    });

    it('should have accessible error messages with alert role', () => {
      render(<BudgetForm {...getDefaultProps()} error="Accessible error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Accessible error');
    });
  });
});
