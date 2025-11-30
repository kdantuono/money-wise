/**
 * BudgetList Component Tests
 * Tests list rendering, loading state, empty state, and user interactions
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { BudgetList } from '../../../src/components/budgets/BudgetList';
import type { Budget } from '../../../src/services/budgets.client';

// Mock budget data
const createMockBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: 'test-budget-id',
  name: 'Test Budget',
  amount: 500,
  period: 'MONTHLY',
  status: 'ACTIVE',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  alertThresholds: [50, 75, 90],
  category: {
    id: 'test-category-id',
    name: 'Test Category',
    icon: 'shopping-cart',
    color: '#4CAF50',
  },
  spent: 250,
  remaining: 250,
  percentage: 50,
  progressStatus: 'safe',
  isOverBudget: false,
  isExpired: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('BudgetList', () => {
  describe('loading state', () => {
    it('renders loading skeletons when isLoading is true', () => {
      const { container } = render(<BudgetList budgets={[]} isLoading />);

      // Should show loading skeletons (animate-pulse class)
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders with correct test id when loading', () => {
      render(<BudgetList budgets={[]} isLoading />);

      expect(screen.getByTestId('budgets-list-loading')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when no budgets exist', () => {
      render(<BudgetList budgets={[]} />);

      expect(screen.getByTestId('budgets-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/no budgets yet/i)).toBeInTheDocument();
    });

    it('shows helpful message in empty state', () => {
      render(<BudgetList budgets={[]} />);

      expect(screen.getByText(/create your first budget/i)).toBeInTheDocument();
    });
  });

  describe('budget list rendering', () => {
    it('renders all budgets in the list', () => {
      const budgets = [
        createMockBudget({ id: '1', name: 'Groceries' }),
        createMockBudget({ id: '2', name: 'Entertainment' }),
        createMockBudget({ id: '3', name: 'Transportation' }),
      ];

      render(<BudgetList budgets={budgets} />);

      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Entertainment')).toBeInTheDocument();
      expect(screen.getByText('Transportation')).toBeInTheDocument();
    });

    it('renders budget with correct test id', () => {
      const budgets = [createMockBudget({ id: 'unique-id' })];

      render(<BudgetList budgets={budgets} />);

      expect(screen.getByTestId('budget-item-unique-id')).toBeInTheDocument();
    });

    it('renders date range for each budget', () => {
      const budgets = [createMockBudget({ startDate: '2025-01-01', endDate: '2025-01-31' })];

      render(<BudgetList budgets={budgets} />);

      expect(screen.getByText(/Jan 1, 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 31, 2025/i)).toBeInTheDocument();
    });

    it('renders period badge for each budget', () => {
      const budgets = [createMockBudget({ period: 'MONTHLY' })];

      render(<BudgetList budgets={budgets} />);

      expect(screen.getByText('MONTHLY')).toBeInTheDocument();
    });

    it('renders notes when present', () => {
      const budgets = [createMockBudget({ notes: 'This is a test note' })];

      render(<BudgetList budgets={budgets} />);

      expect(screen.getByText('This is a test note')).toBeInTheDocument();
    });
  });

  describe('edit functionality', () => {
    it('renders edit button for each budget when onEdit is provided', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];
      const onEdit = vi.fn();

      render(<BudgetList budgets={budgets} onEdit={onEdit} />);

      expect(screen.getByTestId('budget-edit-test-id')).toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', async () => {
      const budget = createMockBudget({ id: 'test-id' });
      const onEdit = vi.fn();

      const { user } = render(<BudgetList budgets={[budget]} onEdit={onEdit} />);

      await user.click(screen.getByTestId('budget-edit-test-id'));

      expect(onEdit).toHaveBeenCalledWith(budget);
    });

    it('does not render edit button when onEdit is not provided', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];

      render(<BudgetList budgets={budgets} />);

      expect(screen.queryByTestId('budget-edit-test-id')).not.toBeInTheDocument();
    });
  });

  describe('delete functionality', () => {
    it('renders delete button for each budget when onDelete is provided', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];
      const onDelete = vi.fn();

      render(<BudgetList budgets={budgets} onDelete={onDelete} />);

      expect(screen.getByTestId('budget-delete-test-id')).toBeInTheDocument();
    });

    it('calls onDelete when delete button is clicked', async () => {
      const budget = createMockBudget({ id: 'test-id' });
      const onDelete = vi.fn();

      const { user } = render(<BudgetList budgets={[budget]} onDelete={onDelete} />);

      await user.click(screen.getByTestId('budget-delete-test-id'));

      expect(onDelete).toHaveBeenCalledWith(budget);
    });

    it('does not render delete button when onDelete is not provided', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];

      render(<BudgetList budgets={budgets} />);

      expect(screen.queryByTestId('budget-delete-test-id')).not.toBeInTheDocument();
    });
  });

  describe('updating/deleting states', () => {
    it('disables buttons when budget is being updated', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
        <BudgetList
          budgets={budgets}
          onEdit={onEdit}
          onDelete={onDelete}
          updatingIds={['test-id']}
        />
      );

      expect(screen.getByTestId('budget-edit-test-id')).toBeDisabled();
      expect(screen.getByTestId('budget-delete-test-id')).toBeDisabled();
    });

    it('disables buttons when budget is being deleted', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
        <BudgetList
          budgets={budgets}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingIds={['test-id']}
        />
      );

      expect(screen.getByTestId('budget-edit-test-id')).toBeDisabled();
      expect(screen.getByTestId('budget-delete-test-id')).toBeDisabled();
    });

    it('shows "Saving..." text when updating', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];
      const onEdit = vi.fn();

      render(
        <BudgetList budgets={budgets} onEdit={onEdit} updatingIds={['test-id']} />
      );

      expect(screen.getByText(/Saving/i)).toBeInTheDocument();
    });

    it('shows "Deleting..." text when deleting', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];
      const onDelete = vi.fn();

      render(
        <BudgetList budgets={budgets} onDelete={onDelete} deletingIds={['test-id']} />
      );

      expect(screen.getByText(/Deleting/i)).toBeInTheDocument();
    });

    it('applies opacity to card when deleting', () => {
      const budgets = [createMockBudget({ id: 'test-id' })];

      const { container } = render(
        <BudgetList budgets={budgets} deletingIds={['test-id']} />
      );

      const card = container.querySelector('.opacity-50');
      expect(card).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('applies custom className', () => {
      const budgets = [createMockBudget()];

      const { container } = render(
        <BudgetList budgets={budgets} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies custom data-testid', () => {
      const budgets = [createMockBudget()];

      render(<BudgetList budgets={budgets} data-testid="custom-test-id" />);

      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
    });
  });
});
