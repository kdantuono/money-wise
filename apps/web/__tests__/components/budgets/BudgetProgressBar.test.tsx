/**
 * BudgetProgressBar Component Tests
 * Tests progress bar rendering, colors, and percentage display
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { BudgetProgressBar } from '../../../src/components/budgets/BudgetProgressBar';
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

describe('BudgetProgressBar', () => {
  describe('rendering', () => {
    it('renders the budget name when showLabel is true', () => {
      const budget = createMockBudget();
      render(<BudgetProgressBar budget={budget} showLabel />);

      expect(screen.getByText('Test Budget')).toBeInTheDocument();
    });

    it('does not render the budget name when showLabel is false', () => {
      const budget = createMockBudget();
      render(<BudgetProgressBar budget={budget} showLabel={false} />);

      expect(screen.queryByText('Test Budget')).not.toBeInTheDocument();
    });

    it('renders amount information when showAmount is true', () => {
      const budget = createMockBudget({ spent: 250, amount: 500 });
      render(<BudgetProgressBar budget={budget} showAmount />);

      expect(screen.getByText(/\$250 spent/)).toBeInTheDocument();
      expect(screen.getByText(/\$500 budget/)).toBeInTheDocument();
    });

    it('renders percentage display', () => {
      const budget = createMockBudget({ percentage: 50 });
      render(<BudgetProgressBar budget={budget} showLabel />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('progress status colors', () => {
    it('renders green progress bar for safe status', () => {
      const budget = createMockBudget({
        percentage: 40,
        progressStatus: 'safe',
      });
      const { container } = render(<BudgetProgressBar budget={budget} />);

      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders yellow progress bar for warning status', () => {
      const budget = createMockBudget({
        percentage: 85,
        progressStatus: 'warning',
      });
      const { container } = render(<BudgetProgressBar budget={budget} />);

      const progressBar = container.querySelector('.bg-yellow-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders red progress bar for over status', () => {
      const budget = createMockBudget({
        percentage: 110,
        progressStatus: 'over',
        isOverBudget: true,
      });
      const { container } = render(<BudgetProgressBar budget={budget} />);

      const progressBar = container.querySelector('.bg-red-500');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('progress bar width', () => {
    it('sets progress bar width based on percentage', () => {
      const budget = createMockBudget({ percentage: 75 });
      const { container } = render(<BudgetProgressBar budget={budget} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('caps progress bar width at 100% for over budget', () => {
      const budget = createMockBudget({
        percentage: 150,
        progressStatus: 'over',
        isOverBudget: true,
      });
      const { container } = render(<BudgetProgressBar budget={budget} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('category display', () => {
    it('renders category name in parentheses when showLabel is true', () => {
      const budget = createMockBudget();
      render(<BudgetProgressBar budget={budget} showLabel />);

      expect(screen.getByText('(Test Category)')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      const budget = createMockBudget({ percentage: 50 });
      const { container } = render(<BudgetProgressBar budget={budget} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has descriptive aria-label', () => {
      const budget = createMockBudget({ name: 'Groceries', percentage: 75 });
      const { container } = render(<BudgetProgressBar budget={budget} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-label', 'Groceries budget: 75% used');
    });
  });
});
