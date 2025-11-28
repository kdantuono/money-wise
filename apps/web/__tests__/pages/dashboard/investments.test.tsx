/**
 * Tests for InvestmentsPage component
 * Tests empty state placeholder with CTA
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import InvestmentsPage from '../../../app/dashboard/investments/page';

describe('InvestmentsPage', () => {
  describe('Header', () => {
    it('renders the page heading', () => {
      render(<InvestmentsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Investments');
    });

    it('renders the description text', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Track and manage your investment portfolio')).toBeInTheDocument();
    });

    it('renders the TrendingUp icon in header', () => {
      const { container } = render(<InvestmentsPage />);

      const headerIcon = container.querySelector('.bg-purple-100 svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state title', () => {
      render(<InvestmentsPage />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No investments tracked');
    });

    it('renders empty state description', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText(/Start tracking your stocks, ETFs, crypto/)).toBeInTheDocument();
    });

    it('renders large icon in empty state', () => {
      const { container } = render(<InvestmentsPage />);

      const emptyStateIcon = container.querySelector('.h-12.w-12.text-gray-300');
      expect(emptyStateIcon).toBeInTheDocument();
    });
  });

  describe('CTA Button', () => {
    it('renders Add Investment button', () => {
      render(<InvestmentsPage />);

      expect(screen.getByRole('button', { name: /Add Investment/i })).toBeInTheDocument();
    });

    it('button is disabled', () => {
      render(<InvestmentsPage />);

      const button = screen.getByRole('button', { name: /Add Investment/i });
      expect(button).toBeDisabled();
    });

    it('button has Coming soon title attribute', () => {
      render(<InvestmentsPage />);

      const button = screen.getByRole('button', { name: /Add Investment/i });
      expect(button).toHaveAttribute('title', 'Coming soon');
    });

    it('renders Coming soon text below button', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Coming soon')).toBeInTheDocument();
    });
  });
});
