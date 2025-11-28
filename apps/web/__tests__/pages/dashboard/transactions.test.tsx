/**
 * Tests for TransactionsPage component
 * Tests empty state placeholder with CTA
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import TransactionsPage from '../../../app/dashboard/transactions/page';

describe('TransactionsPage', () => {
  describe('Header', () => {
    it('renders the page heading', () => {
      render(<TransactionsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Transactions');
    });

    it('renders the description text', () => {
      render(<TransactionsPage />);

      expect(screen.getByText('View and manage your transaction history')).toBeInTheDocument();
    });

    it('renders the CreditCard icon in header', () => {
      const { container } = render(<TransactionsPage />);

      const headerIcon = container.querySelector('.bg-green-100 svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state title', () => {
      render(<TransactionsPage />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No transactions yet');
    });

    it('renders empty state description', () => {
      render(<TransactionsPage />);

      expect(screen.getByText(/Once you connect your accounts, your transactions will appear/)).toBeInTheDocument();
    });

    it('renders large icon in empty state', () => {
      const { container } = render(<TransactionsPage />);

      const emptyStateIcon = container.querySelector('.h-12.w-12.text-gray-300');
      expect(emptyStateIcon).toBeInTheDocument();
    });
  });

  describe('CTA Button', () => {
    it('renders Add Transaction button', () => {
      render(<TransactionsPage />);

      expect(screen.getByRole('button', { name: /Add Transaction/i })).toBeInTheDocument();
    });

    it('button is disabled', () => {
      render(<TransactionsPage />);

      const button = screen.getByRole('button', { name: /Add Transaction/i });
      expect(button).toBeDisabled();
    });

    it('button has Coming soon title attribute', () => {
      render(<TransactionsPage />);

      const button = screen.getByRole('button', { name: /Add Transaction/i });
      expect(button).toHaveAttribute('title', 'Coming soon');
    });

    it('renders Coming soon text below button', () => {
      render(<TransactionsPage />);

      expect(screen.getByText('Coming soon')).toBeInTheDocument();
    });
  });
});
