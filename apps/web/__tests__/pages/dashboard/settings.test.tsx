/**
 * Tests for SettingsPage component
 * Tests empty state placeholder with CTA
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import SettingsPage from '../../../app/dashboard/settings/page';

describe('SettingsPage', () => {
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

      const headerIcon = container.querySelector('.bg-gray-100 svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state title', () => {
      render(<SettingsPage />);

      // Settings page has "Settings" as the empty state title
      const headings = screen.getAllByRole('heading', { level: 2 });
      expect(headings.some(h => h.textContent === 'Settings')).toBe(true);
    });

    it('renders empty state description', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/Profile settings, notifications, security/)).toBeInTheDocument();
    });

    it('renders large icon in empty state', () => {
      const { container } = render(<SettingsPage />);

      const emptyStateIcon = container.querySelector('.h-12.w-12.text-gray-300');
      expect(emptyStateIcon).toBeInTheDocument();
    });
  });

  describe('CTA Button', () => {
    it('renders Edit Profile button', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
    });

    it('button is disabled', () => {
      render(<SettingsPage />);

      const button = screen.getByRole('button', { name: /Edit Profile/i });
      expect(button).toBeDisabled();
    });

    it('button has Coming soon title attribute', () => {
      render(<SettingsPage />);

      const button = screen.getByRole('button', { name: /Edit Profile/i });
      expect(button).toHaveAttribute('title', 'Coming soon');
    });

    it('renders Coming soon text below button', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Coming soon')).toBeInTheDocument();
    });
  });
});
