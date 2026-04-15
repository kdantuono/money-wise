/**
 * Tests for SettingsPage component
 *
 * Tests the full settings form including profile fields, theme selection,
 * notification preferences, and save functionality.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import SettingsPage from '../../../app/dashboard/settings/page';

// Mock auth store
vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock useTheme hook
vi.mock('../../../src/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    resolvedTheme: 'light',
    isDark: false,
    setTheme: vi.fn(),
  })),
}));

// Mock CSRF utility
vi.mock('../../../src/utils/csrf', () => ({
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
}));

import { useAuthStore } from '../../../src/store/auth.store';
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

// Mock user matching the User interface
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'USER',
  status: 'ACTIVE',
  timezone: 'America/New_York',
  currency: 'USD',
  preferences: {
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      categories: true,
      budgets: true,
    },
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  fullName: 'John Doe',
  isEmailVerified: true,
  isActive: true,
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      setUser: vi.fn(),
    });
  });

  describe('Header', () => {
    it('renders the page heading', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    });

    it('renders the description text', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Manage your account settings and preferences')).toBeInTheDocument();
    });

    it('renders the Settings icon in header', () => {
      const { container } = render(<SettingsPage />);

      const headerIcon = container.querySelector('.bg-muted svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Profile Information Form', () => {
    it('renders Profile Information section heading', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('renders first name input with user value', () => {
      render(<SettingsPage />);

      const firstNameInput = screen.getByLabelText('First Name');
      expect(firstNameInput).toBeInTheDocument();
      expect(firstNameInput).toHaveValue('John');
    });

    it('renders last name input with user value', () => {
      render(<SettingsPage />);

      const lastNameInput = screen.getByLabelText('Last Name');
      expect(lastNameInput).toBeInTheDocument();
      expect(lastNameInput).toHaveValue('Doe');
    });

    it('renders email input with user value', () => {
      render(<SettingsPage />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveValue('john@example.com');
    });
  });

  describe('Regional Settings', () => {
    it('renders Regional Settings section heading', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Regional Settings')).toBeInTheDocument();
    });

    it('renders timezone select', () => {
      render(<SettingsPage />);

      const timezoneSelect = screen.getByLabelText('Timezone');
      expect(timezoneSelect).toBeInTheDocument();
    });

    it('renders currency select', () => {
      render(<SettingsPage />);

      const currencySelect = screen.getByLabelText(/Preferred Currency/i);
      expect(currencySelect).toBeInTheDocument();
    });
  });

  describe('Appearance', () => {
    it('renders Appearance section heading', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    it('renders theme options: Light, Dark, System', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  describe('Notifications', () => {
    it('renders Notifications section heading', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('renders notification toggle options', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      expect(screen.getByText('Budget Alerts')).toBeInTheDocument();
      expect(screen.getByText('Category Insights')).toBeInTheDocument();
    });
  });

  describe('Account Information', () => {
    it('renders Account Information section', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    it('displays user account status', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Account Status')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });
  });

  describe('Save Button', () => {
    it('renders Save Changes button', () => {
      render(<SettingsPage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('Save Changes button is enabled by default', () => {
      render(<SettingsPage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('Save Changes button is a submit button', () => {
      render(<SettingsPage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Loading State', () => {
    it('renders loading spinner when user is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: vi.fn(),
      });

      const { container } = render(<SettingsPage />);

      // When user is null, a Loader2 spinner is shown
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not render form when user is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
    });
  });
});
