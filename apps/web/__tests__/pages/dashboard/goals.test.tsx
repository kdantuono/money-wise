/**
 * Tests for GoalsPage component
 * Tests empty state placeholder with CTA
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import GoalsPage from '../../../app/dashboard/goals/page';

describe('GoalsPage', () => {
  describe('Header', () => {
    it('renders the page heading', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Goals');
    });

    it('renders the description text', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Set and track your financial goals')).toBeInTheDocument();
    });

    it('renders the Target icon in header', () => {
      const { container } = render(<GoalsPage />);

      const headerIcon = container.querySelector('.bg-orange-100 svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state title', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No goals set');
    });

    it('renders empty state description', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/Create savings goals, debt payoff targets/)).toBeInTheDocument();
    });

    it('renders large icon in empty state', () => {
      const { container } = render(<GoalsPage />);

      const emptyStateIcon = container.querySelector('.h-12.w-12.text-gray-300');
      expect(emptyStateIcon).toBeInTheDocument();
    });
  });

  describe('CTA Button', () => {
    it('renders Create Goal button', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('button', { name: /Create Goal/i })).toBeInTheDocument();
    });

    it('button is disabled', () => {
      render(<GoalsPage />);

      const button = screen.getByRole('button', { name: /Create Goal/i });
      expect(button).toBeDisabled();
    });

    it('button has Coming soon title attribute', () => {
      render(<GoalsPage />);

      const button = screen.getByRole('button', { name: /Create Goal/i });
      expect(button).toHaveAttribute('title', 'Coming soon');
    });

    it('renders Coming soon text below button', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Coming soon')).toBeInTheDocument();
    });
  });
});
