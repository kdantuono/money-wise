/**
 * Tests for RecentTransactions component
 *
 * Tests the dashboard widget that displays recent transactions
 * and the "View All" navigation link.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { RecentTransactions } from '../../../src/components/dashboard/RecentTransactions';
import type { Transaction } from '../../../src/types/dashboard.types';

describe('RecentTransactions', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      description: 'Grocery Store',
      amount: 50.25,
      type: 'expense',
      category: 'Food & Groceries',
      date: '2025-12-01',
    },
    {
      id: '2',
      description: 'Salary Deposit',
      amount: 3000.0,
      type: 'income',
      category: 'Income',
      date: '2025-12-01',
    },
    {
      id: '3',
      description: 'Electric Bill',
      amount: 125.00,
      type: 'expense',
      category: 'Utilities',
      date: '2025-11-30',
    },
  ];

  describe('Rendering', () => {
    it('renders the component title', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });

    it('renders transactions list when transactions provided', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
      expect(screen.getByText('Salary Deposit')).toBeInTheDocument();
      expect(screen.getByText('Electric Bill')).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      render(<RecentTransactions isLoading={true} />);

      expect(screen.getByTestId('recent-transactions-skeleton')).toBeInTheDocument();
    });

    it('renders empty state when no transactions', () => {
      render(<RecentTransactions transactions={[]} />);

      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
      expect(screen.getByText('Link a bank account or add transactions manually')).toBeInTheDocument();
    });

    it('renders empty state when transactions is undefined', () => {
      render(<RecentTransactions />);

      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    });
  });

  describe('View All Link', () => {
    it('renders View all link', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      expect(viewAllLink).toBeInTheDocument();
    });

    it('View all link points to /dashboard/transactions', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      expect(viewAllLink).toHaveAttribute('href', '/dashboard/transactions');
    });

    it('View all link is present in empty state', () => {
      render(<RecentTransactions transactions={[]} />);

      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      expect(viewAllLink).toHaveAttribute('href', '/dashboard/transactions');
    });

    it('View all link does NOT point to /transactions (regression test)', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      // Ensure the bug where link pointed to /transactions is not reintroduced
      expect(viewAllLink.getAttribute('href')).not.toBe('/transactions');
    });
  });

  describe('Transaction Display', () => {
    it('displays income transactions with positive sign and green color', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      // Income transaction should show +$3,000.00
      const incomeAmount = screen.getByText('+$3,000.00');
      expect(incomeAmount).toBeInTheDocument();
      expect(incomeAmount).toHaveClass('text-green-600');
    });

    it('displays expense transactions with negative sign', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      // Expense transaction should show -$50.25
      expect(screen.getByText('-$50.25')).toBeInTheDocument();
    });

    it('displays transaction category', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      expect(screen.getByText('Food & Groceries')).toBeInTheDocument();
      expect(screen.getByText('Income')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();
    });

    it('displays formatted date', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      // Dates should be formatted as "Dec 1" or "Nov 30"
      // Multiple transactions on Dec 1, so use getAllByText
      const dec1Dates = screen.getAllByText('Dec 1');
      expect(dec1Dates.length).toBeGreaterThan(0);
      expect(screen.getByText('Nov 30')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      // Title should be rendered (via CardTitle which uses semantic heading)
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });

    it('transactions container has data-testid', () => {
      render(<RecentTransactions transactions={mockTransactions} />);

      expect(screen.getByTestId('recent-transactions')).toBeInTheDocument();
    });

    it('empty state container has data-testid', () => {
      render(<RecentTransactions transactions={[]} />);

      expect(screen.getByTestId('recent-transactions')).toBeInTheDocument();
    });
  });
});
