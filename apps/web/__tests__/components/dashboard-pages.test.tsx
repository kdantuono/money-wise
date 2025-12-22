/**
 * Tests for Dashboard Placeholder Pages
 * Verifies that all dashboard sub-pages render correctly with proper content
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../utils/test-utils';

// Import placeholder dashboard page components
// Note: AccountsPage and TransactionsPage are now full implementations (not placeholders)
// and have their own dedicated test files
import InvestmentsPage from '../../app/dashboard/investments/page';
import GoalsPage from '../../app/dashboard/goals/page';
import SettingsPage from '../../app/dashboard/settings/page';
import { useAuthStore } from '../../src/stores/auth-store';

// Mock auth store for SettingsPage (now a full implementation)
vi.mock('../../src/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

// Mock user for SettingsPage tests
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  status: 'ACTIVE',
  timezone: 'America/New_York',
  currency: 'USD',
  preferences: {
    theme: 'auto',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      categories: true,
      budgets: true,
    },
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  isEmailVerified: true,
};

describe('Dashboard Placeholder Pages', () => {
  // Note: AccountsPage and TransactionsPage tests have been moved to dedicated test files
  // since they are now full implementations rather than placeholder pages

  beforeEach(() => {
    // Reset auth store mock before each test
    mockUseAuthStore.mockReturnValue({
      user: null,
      setUser: vi.fn(),
    });
  });

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
    beforeEach(() => {
      // SettingsPage requires authenticated user
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        setUser: vi.fn(),
      });
    });

    it('renders the settings page with correct heading', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /settings/i, level: 1 })).toBeInTheDocument();
    });

    it('renders settings description', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/manage your account settings and preferences/i)).toBeInTheDocument();
    });

    it('renders profile information section', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /profile information/i })).toBeInTheDocument();
    });

    it('renders regional settings section', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /regional settings/i })).toBeInTheDocument();
    });

    it('renders appearance section', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /appearance/i })).toBeInTheDocument();
    });

    it('renders notifications section', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    });

    it('renders account information section', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /account information/i })).toBeInTheDocument();
    });

    it('shows loading state when user is not loaded', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: vi.fn(),
      });

      const { container } = render(<SettingsPage />);

      // Should show loading spinner
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('pre-fills form with user data', () => {
      render(<SettingsPage />);

      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;

      expect(firstNameInput.value).toBe('Test');
      expect(lastNameInput.value).toBe('User');
      expect(emailInput.value).toBe('test@example.com');
    });

    it('renders save button', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });

  describe('Common Layout Elements', () => {
    beforeEach(() => {
      // Settings page needs auth
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        setUser: vi.fn(),
      });
    });

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
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      // Settings page needs auth
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        setUser: vi.fn(),
      });
    });

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
