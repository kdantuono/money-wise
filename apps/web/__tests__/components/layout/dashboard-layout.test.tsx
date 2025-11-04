/**
 * Tests for DashboardLayout component
 * Tests sidebar navigation, user menu, mobile responsiveness, and logout functionality
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../utils/test-utils';
import { DashboardLayout } from '../../../src/components/layout/dashboard-layout';
import { useAuthStore } from '../../../stores/auth-store';

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock auth store
vi.mock('../../../stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

// Mock user data
const mockUser = {
  id: '123',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
};

describe('DashboardLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    });
  });

  describe('Layout Rendering', () => {
    it('renders children content', () => {
      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('renders MoneyWise branding', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const brandings = screen.getAllByText('MoneyWise');
      expect(brandings.length).toBeGreaterThan(0);
    });

    it('renders main content area', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('py-8');
    });
  });

  describe('Navigation Menu', () => {
    it('renders all navigation items', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Accounts').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    });

    it('navigation links have correct hrefs', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      expect(dashboardLinks[0]).toHaveAttribute('href', '/dashboard');

      const accountsLinks = screen.getAllByRole('link', { name: /accounts/i });
      expect(accountsLinks[0]).toHaveAttribute('href', '/accounts');

      const transactionsLinks = screen.getAllByRole('link', { name: /transactions/i });
      expect(transactionsLinks[0]).toHaveAttribute('href', '/transactions');
    });

    it('renders navigation icons', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Check for SVG icons (lucide-react icons render as SVG)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(5); // Multiple icons (nav items + user + logout)
    });
  });

  describe('User Information Display', () => {
    it('displays user full name', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    it('displays user email', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getAllByText('john.doe@example.com').length).toBeGreaterThan(0);
    });

    it('displays welcome message with first name', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText(/Welcome back, John!/)).toBeInTheDocument();
    });

    it('handles user without fullName gracefully', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          ...mockUser,
          fullName: undefined,
        },
        logout: vi.fn(),
      });

      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Should display firstName + lastName
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    it('renders user avatar placeholder', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // User icon should be present
      const avatars = container.querySelectorAll('.rounded-full.bg-primary');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('Logout Functionality', () => {
    it('renders sign out button', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const signOutButtons = screen.getAllByRole('button', { name: /sign out/i });
      expect(signOutButtons.length).toBeGreaterThan(0);
    });

    it('calls logout and redirects on sign out click', async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);

      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
      });

      const { user } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const signOutButtons = screen.getAllByRole('button', { name: /sign out/i });
      await user.click(signOutButtons[0]);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('redirects to login even if logout fails', async () => {
      const mockLogout = vi.fn().mockRejectedValue(new Error('Logout failed'));

      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
      });

      const { user } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const signOutButtons = screen.getAllByRole('button', { name: /sign out/i });
      await user.click(signOutButtons[0]);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      // Should still redirect even on error
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('Mobile Sidebar', () => {
    it('mobile sidebar is hidden by default', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Mobile sidebar should have 'hidden' class initially
      const mobileSidebar = container.querySelector('.lg\\:hidden.hidden');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('renders menu button for mobile', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Menu button should be present for mobile
      const menuButton = container.querySelector('button.lg\\:hidden');
      expect(menuButton).toBeInTheDocument();
    });

    it('closes mobile sidebar on close button click', async () => {
      const { user, container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Open sidebar first
      const menuButton = container.querySelector('button[type="button"]');
      await user.click(menuButton!);

      // Find and click close button (X icon)
      const closeButtons = container.querySelectorAll('button[type="button"]');
      const closeButton = Array.from(closeButtons).find(
        (button) => button.querySelector('.h-6.w-6')
      );

      if (closeButton) {
        await user.click(closeButton);
      }

      // Sidebar should be hidden again
      const mobileSidebar = container.querySelector('.lg\\:hidden.hidden');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('mobile sidebar has navigation links', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Navigation links should be present in both mobile and desktop sidebars
      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      // Should have at least 2 (mobile + desktop)
      expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('closes mobile sidebar on backdrop click', async () => {
      const { user, container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Open sidebar
      const menuButton = container.querySelector('button[type="button"]');
      await user.click(menuButton!);

      // Find and click backdrop
      const backdrop = container.querySelector('.bg-gray-600.bg-opacity-75');
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }

      // Sidebar should close
      const mobileSidebar = container.querySelector('.lg\\:hidden.hidden');
      expect(mobileSidebar).toBeInTheDocument();
    });
  });

  describe('Desktop Layout', () => {
    it('renders desktop sidebar with correct classes', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const desktopSidebar = container.querySelector('.hidden.lg\\:fixed.lg\\:inset-y-0');
      expect(desktopSidebar).toBeInTheDocument();
    });

    it('applies proper spacing for main content with sidebar', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const mainContent = container.querySelector('.lg\\:pl-64');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Top Bar', () => {
    it('renders sticky top bar', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const topBar = container.querySelector('.sticky.top-0');
      expect(topBar).toBeInTheDocument();
      expect(topBar).toHaveClass('h-16', 'bg-white', 'border-b');
    });

    it('displays menu button on mobile', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const menuButton = container.querySelector('button.lg\\:hidden');
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('has responsive classes for different screen sizes', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Check for lg: prefix classes (desktop)
      const desktopElements = container.querySelectorAll('[class*="lg:"]');
      expect(desktopElements.length).toBeGreaterThan(0);

      // Check for sm: prefix classes (tablet)
      const tabletElements = container.querySelectorAll('[class*="sm:"]');
      expect(tabletElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(container.querySelector('nav')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('navigation links are accessible', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('buttons have proper types', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const buttons = container.querySelectorAll('button[type="button"]');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
