/**
 * OverBudgetAlert Component Tests
 * Tests alert rendering and display of over-budget items
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { OverBudgetAlert } from '../../../src/components/budgets/OverBudgetAlert';
import type { Budget } from '../../../src/services/budgets.client';

// Mock budget data - note: isOverBudget must be true for items to show
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
  spent: 600,
  remaining: -100,
  percentage: 120,
  progressStatus: 'over',
  isOverBudget: true,
  isExpired: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('OverBudgetAlert', () => {
  describe('rendering', () => {
    it('renders alert with correct test id', () => {
      const budgets = [createMockBudget()];

      render(<OverBudgetAlert budgets={budgets} />);

      expect(screen.getByTestId('over-budget-alert')).toBeInTheDocument();
    });

    it('renders alert heading for single budget', () => {
      const budgets = [createMockBudget()];

      render(<OverBudgetAlert budgets={budgets} />);

      expect(screen.getByText('Budget Exceeded')).toBeInTheDocument();
    });

    it('renders nothing when no budgets are over', () => {
      const { container } = render(<OverBudgetAlert budgets={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for budgets that are not over', () => {
      const budget = createMockBudget({ isOverBudget: false });
      const { container } = render(<OverBudgetAlert budgets={[budget]} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('budget display', () => {
    it('displays the name of over-budget items', () => {
      const budgets = [
        createMockBudget({ id: '1', name: 'Groceries' }),
        createMockBudget({ id: '2', name: 'Entertainment' }),
      ];

      render(<OverBudgetAlert budgets={budgets} />);

      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Entertainment')).toBeInTheDocument();
    });

    it('displays spent and budget amounts', () => {
      const budgets = [
        createMockBudget({ spent: 600, amount: 500 }),
      ];

      render(<OverBudgetAlert budgets={budgets} />);

      // Component shows "($600 of $500)"
      expect(screen.getByText(/\$600/)).toBeInTheDocument();
      expect(screen.getByText(/\$500/)).toBeInTheDocument();
    });

    it('displays total over-budget amount', () => {
      const budgets = [
        createMockBudget({ id: '1', remaining: -100 }),
        createMockBudget({ id: '2', remaining: -50 }),
      ];

      render(<OverBudgetAlert budgets={budgets} />);

      // Total should be $150 over
      expect(screen.getByText(/\$150/)).toBeInTheDocument();
    });
  });

  describe('multiple budgets', () => {
    it('displays plural heading for multiple over-budget items', () => {
      const budgets = [
        createMockBudget({ id: '1', name: 'Budget 1' }),
        createMockBudget({ id: '2', name: 'Budget 2' }),
        createMockBudget({ id: '3', name: 'Budget 3' }),
      ];

      render(<OverBudgetAlert budgets={budgets} />);

      // Should say "3 Budgets Exceeded"
      expect(screen.getByText('3 Budgets Exceeded')).toBeInTheDocument();
    });

    it('handles single over-budget item with singular text', () => {
      const budgets = [createMockBudget({ name: 'Single Budget' })];

      render(<OverBudgetAlert budgets={budgets} />);

      expect(screen.getByText('Budget Exceeded')).toBeInTheDocument();
    });
  });

  describe('dismissible functionality', () => {
    it('shows dismiss button when dismissible is true', () => {
      const budgets = [createMockBudget()];

      render(<OverBudgetAlert budgets={budgets} dismissible />);

      expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
    });

    it('hides dismiss button when dismissible is false', () => {
      const budgets = [createMockBudget()];

      render(<OverBudgetAlert budgets={budgets} dismissible={false} />);

      expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
    });

    it('hides alert when dismiss button is clicked', async () => {
      const budgets = [createMockBudget()];

      const { user } = render(<OverBudgetAlert budgets={budgets} dismissible />);

      await user.click(screen.getByLabelText('Dismiss alert'));

      expect(screen.queryByTestId('over-budget-alert')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const budgets = [createMockBudget()];

      const { container } = render(
        <OverBudgetAlert budgets={budgets} className="custom-alert-class" />
      );

      expect(container.querySelector('.custom-alert-class')).toBeInTheDocument();
    });

    it('has red styling classes', () => {
      const budgets = [createMockBudget()];

      const { container } = render(<OverBudgetAlert budgets={budgets} />);

      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
      expect(container.querySelector('.border-red-200')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has alert role for screen readers', () => {
      const budgets = [createMockBudget()];

      render(<OverBudgetAlert budgets={budgets} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
