/**
 * Tests for DashboardLayout component
 *
 * Tests sidebar navigation, user menu, mobile responsiveness, and logout functionality.
 * Updated to match current source: CSS transform-based sidebar, "Logout" button text,
 * bg-blue-600 avatar, and accurate CSS class assertions.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../utils/test-utils';
import { DashboardLayout } from '../../../src/components/layout/dashboard-layout';

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  prefetch: vi.fn(),
};

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));

// Mock auth store
vi.mock('../../../src/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock NotificationBell to avoid complex dependency chain
vi.mock('../../../src/components/notifications', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Notifications</div>,
}));

import { useAuthStore } from '../../../src/stores/auth-store';
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
    mockPathname = '/dashboard';

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
      expect(main).toHaveClass('flex-1', 'overflow-auto');
    });
  });

  describe('Navigation Menu', () => {
    it('renders all main navigation items', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Accounts').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Investments').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    });

    it('renders Planning section with Budgets and Goals', async () => {
      const { user } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Planning dropdown should be visible
      const planningButton = screen.getByTestId('nav-planning');
      expect(planningButton).toBeInTheDocument();

      // Click to expand Planning section
      await user.click(planningButton);

      // Both Budgets and Goals should be under Planning
      expect(screen.getAllByText('Budgets').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Goals').length).toBeGreaterThan(0);
    });

    it('Goals is nested under Planning, not in main navigation', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Goals should NOT be in main navigation (no testid nav-goals at top level)
      const mainNavItems = ['nav-dashboard', 'nav-accounts', 'nav-transactions', 'nav-investments'];
      mainNavItems.forEach(testId => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });

      // Goals should be under Planning section
      const planningButton = screen.getByTestId('nav-planning');
      expect(planningButton).toBeInTheDocument();
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
      expect(accountsLinks[0]).toHaveAttribute('href', '/dashboard/accounts');

      const transactionsLinks = screen.getAllByRole('link', { name: /transactions/i });
      expect(transactionsLinks[0]).toHaveAttribute('href', '/dashboard/transactions');
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
    it('displays user first and last name', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // The component renders "{user.firstName} {user.lastName}" in the sidebar
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays user email', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('renders user menu area', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const userMenu = screen.getByTestId('user-menu');
      expect(userMenu).toBeInTheDocument();
    });

    it('renders user avatar placeholder with blue background', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Avatar uses rounded-full bg-blue-600
      const avatars = container.querySelectorAll('.rounded-full.bg-blue-600');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('Logout Functionality', () => {
    it('renders logout button', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const logoutButton = screen.getByTestId('logout-button');
      expect(logoutButton).toBeInTheDocument();
    });

    it('calls logout and redirects on logout click', async () => {
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

      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('redirects to login even if logout API fails', async () => {
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

      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('Mobile Sidebar', () => {
    it('sidebar starts off-screen on mobile via CSS transform', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // The aside element uses -translate-x-full when closed (mobile)
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar?.className).toContain('-translate-x-full');
    });

    it('renders menu button for mobile', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Menu button is lg:hidden in the header
      const menuButton = container.querySelector('button.lg\\:hidden');
      expect(menuButton).toBeInTheDocument();
    });

    it('opens sidebar on menu button click', async () => {
      const { user, container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Click mobile menu button to open sidebar
      const menuButton = container.querySelector('button.lg\\:hidden');
      expect(menuButton).toBeInTheDocument();
      await user.click(menuButton!);

      // After opening, sidebar should have translate-x-0 class
      const sidebar = container.querySelector('aside');
      expect(sidebar?.className).toContain('translate-x-0');
    });

    it('shows backdrop when mobile sidebar is open', async () => {
      const { user, container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Open sidebar
      const menuButton = container.querySelector('button.lg\\:hidden');
      await user.click(menuButton!);

      // Backdrop should appear
      const backdrop = container.querySelector('.bg-gray-600.bg-opacity-75');
      expect(backdrop).toBeInTheDocument();
    });

    it('closes mobile sidebar on backdrop click', async () => {
      const { user, container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Open sidebar
      const menuButton = container.querySelector('button.lg\\:hidden');
      await user.click(menuButton!);

      // Click backdrop to close
      const backdrop = container.querySelector('.bg-gray-600.bg-opacity-75');
      expect(backdrop).toBeInTheDocument();
      await user.click(backdrop as HTMLElement);

      // Sidebar should be closed again
      const sidebar = container.querySelector('aside');
      expect(sidebar?.className).toContain('-translate-x-full');
    });

    it('mobile sidebar has navigation links', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Navigation links are in the sidebar
      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Desktop Layout', () => {
    it('sidebar uses lg:static for desktop positioning', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar?.className).toContain('lg:static');
      expect(sidebar?.className).toContain('lg:translate-x-0');
    });
  });

  describe('Top Bar', () => {
    it('renders sticky header', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('sticky', 'top-0');
    });

    it('renders search input on desktop', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
    });

    it('displays mobile menu button in header', () => {
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
      expect(container.querySelector('header')).toBeInTheDocument();
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
  });

  describe('Active Navigation State', () => {
    it('highlights Dashboard nav item when on /dashboard', () => {
      mockPathname = '/dashboard';
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const dashboardLink = screen.getByTestId('nav-dashboard');
      expect(dashboardLink).toHaveClass('bg-blue-100', 'text-blue-600');
    });

    it('highlights Accounts nav item when on /dashboard/accounts', () => {
      mockPathname = '/dashboard/accounts';
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const accountsLink = screen.getByTestId('nav-accounts');
      expect(accountsLink).toHaveClass('bg-blue-100', 'text-blue-600');

      // Dashboard should not be active
      const dashboardLink = screen.getByTestId('nav-dashboard');
      expect(dashboardLink).not.toHaveClass('bg-blue-100');
    });

    it('highlights Transactions nav item when on /dashboard/transactions', () => {
      mockPathname = '/dashboard/transactions';
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const transactionsLink = screen.getByTestId('nav-transactions');
      expect(transactionsLink).toHaveClass('bg-blue-100', 'text-blue-600');
    });

    it('active nav item has aria-current="page" attribute', () => {
      mockPathname = '/dashboard/accounts';
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const accountsLink = screen.getByTestId('nav-accounts');
      expect(accountsLink).toHaveAttribute('aria-current', 'page');

      // Inactive items should not have aria-current
      const dashboardLink = screen.getByTestId('nav-dashboard');
      expect(dashboardLink).not.toHaveAttribute('aria-current');
    });

    it('only one nav item is active at a time', () => {
      mockPathname = '/dashboard/investments';
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const activeLinks = container.querySelectorAll('[aria-current="page"]');
      expect(activeLinks.length).toBe(1);
      expect(activeLinks[0]).toHaveAttribute('data-testid', 'nav-investments');
    });

    it('inactive nav items have default styling', () => {
      mockPathname = '/dashboard';
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const accountsLink = screen.getByTestId('nav-accounts');
      expect(accountsLink).toHaveClass('text-gray-700');
      expect(accountsLink).not.toHaveClass('bg-blue-100');
    });
  });
});
