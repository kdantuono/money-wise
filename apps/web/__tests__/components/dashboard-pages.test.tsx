/**
 * Tests for Dashboard Placeholder Pages
 * Verifies that all dashboard sub-pages render correctly with proper content
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../utils/test-utils';

// Import placeholder dashboard page components
// Note: AccountsPage and TransactionsPage are now full implementations (not placeholders)
// and have their own dedicated test files
import InvestmentsPage from '../../app/dashboard/investments/page';
import GoalsPage from '../../app/dashboard/goals/page';
import SettingsPage from '../../app/dashboard/settings/page';

describe('Dashboard Placeholder Pages', () => {
  // Note: AccountsPage and TransactionsPage tests have been moved to dedicated test files
  // since they are now full implementations rather than placeholder pages

  describe('InvestmentsPage', () => {
    it('renders the investments page with correct heading', () => {
      render(<InvestmentsPage />);

      expect(screen.getByRole('heading', { name: /investments/i, level: 1 })).toBeInTheDocument();
    });

    it('renders investments description', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText(/track and manage your investment portfolio/i)).toBeInTheDocument();
    });

    it('renders empty state message', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText(/no investments tracked/i)).toBeInTheDocument();
    });

    it('renders coming soon message', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
  });

  describe('GoalsPage', () => {
    it('renders the goals page with correct heading', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('heading', { name: /goals/i, level: 1 })).toBeInTheDocument();
    });

    it('renders goals description', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/set and track your financial goals/i)).toBeInTheDocument();
    });

    it('renders empty state message', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/no goals set/i)).toBeInTheDocument();
    });

    it('renders coming soon message', () => {
      render(<GoalsPage />);

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
  });

  describe('SettingsPage', () => {
    it('renders the settings page with correct heading', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /settings/i, level: 1 })).toBeInTheDocument();
    });

    it('renders settings description', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/manage your account settings/i)).toBeInTheDocument();
    });

    it('renders coming soon message', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
  });

  describe('Common Layout Elements', () => {
    // Only placeholder pages - full implementations (Accounts, Transactions) have dedicated tests
    const pages = [
      { name: 'InvestmentsPage', Component: InvestmentsPage },
      { name: 'GoalsPage', Component: GoalsPage },
      { name: 'SettingsPage', Component: SettingsPage },
    ];

    pages.forEach(({ name, Component }) => {
      it(`${name} has consistent structure with icon header`, () => {
        const { container } = render(<Component />);

        // Should have the icon+header container
        const headerContainer = container.querySelector('.flex.items-center.gap-3');
        expect(headerContainer).toBeInTheDocument();
      });

      it(`${name} has white card container`, () => {
        const { container } = render(<Component />);

        // Should have the white rounded card
        const card = container.querySelector('.bg-white.rounded-xl.border');
        expect(card).toBeInTheDocument();
      });

      it(`${name} has centered content in empty state`, () => {
        const { container } = render(<Component />);

        // Should have text-center class for empty state
        const centeredContent = container.querySelector('.text-center');
        expect(centeredContent).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    // Only placeholder pages - full implementations (Accounts, Transactions) have dedicated tests
    const pages = [
      { name: 'Investments', Component: InvestmentsPage },
      { name: 'Goals', Component: GoalsPage },
      { name: 'Settings', Component: SettingsPage },
    ];

    pages.forEach(({ name, Component }) => {
      it(`${name} page has proper heading hierarchy`, () => {
        render(<Component />);

        // Should have h1 as main heading
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();

        // h2 may or may not be visible depending on loading/data state
        // This is valid as long as h1 exists for accessibility
      });
    });
  });
});
