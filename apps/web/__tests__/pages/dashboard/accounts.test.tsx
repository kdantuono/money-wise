/**
 * Tests for AccountsPage component
 * Tests empty state placeholder with CTA
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import AccountsPage from '../../../app/dashboard/accounts/page';

describe('AccountsPage', () => {
  describe('Header', () => {
    it('renders the page heading', () => {
      render(<AccountsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Accounts');
    });

    it('renders the description text', () => {
      render(<AccountsPage />);

      expect(screen.getByText('Manage your bank accounts and financial connections')).toBeInTheDocument();
    });

    it('renders the Wallet icon in header', () => {
      const { container } = render(<AccountsPage />);

      const headerIcon = container.querySelector('.bg-blue-100 svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state title', () => {
      render(<AccountsPage />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No accounts connected');
    });

    it('renders empty state description', () => {
      render(<AccountsPage />);

      expect(screen.getByText(/Connect your bank accounts to automatically track/)).toBeInTheDocument();
    });

    it('renders large icon in empty state', () => {
      const { container } = render(<AccountsPage />);

      const emptyStateIcon = container.querySelector('.h-12.w-12.text-gray-300');
      expect(emptyStateIcon).toBeInTheDocument();
    });
  });

  describe('CTA Button', () => {
    it('renders Connect Account button', () => {
      render(<AccountsPage />);

      expect(screen.getByRole('button', { name: /Connect Account/i })).toBeInTheDocument();
    });

    it('button is disabled', () => {
      render(<AccountsPage />);

      const button = screen.getByRole('button', { name: /Connect Account/i });
      expect(button).toBeDisabled();
    });

    it('button has Coming soon title attribute', () => {
      render(<AccountsPage />);

      const button = screen.getByRole('button', { name: /Connect Account/i });
      expect(button).toHaveAttribute('title', 'Coming soon');
    });

    it('renders Coming soon text below button', () => {
      render(<AccountsPage />);

      expect(screen.getByText('Coming soon')).toBeInTheDocument();
    });
  });
});
