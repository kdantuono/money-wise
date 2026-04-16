/**
 * Tests for DashboardLayout component
 *
 * Smoke tests for the Figma-redesigned layout: sidebar navigation with Italian labels,
 * "Zecca" branding, framer-motion animated mobile drawer, TopBar, logout, and user info.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { DashboardLayout } from '../../../src/components/layout/dashboard-layout';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: vi.fn() }),
  usePathname: () => mockPathname,
}));

vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock TopBar to isolate layout concerns
vi.mock('../../../src/components/layout/top-bar', () => ({
  TopBar: () => <div data-testid="top-bar">TopBar</div>,
}));

// Mock framer-motion — AnimatePresence renders children, motion.div renders a plain div
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(
      props: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
      ref: React.Ref<HTMLDivElement>,
    ) {
      // strip framer-specific props so React doesn't warn
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        variants, layout, layoutId, onAnimationComplete,
        ...rest
      } = props;
      return <div ref={ref} {...rest} />;
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuthStore } from '../../../src/store/auth.store';
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

const mockUser = {
  id: '123',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard';
    mockUseAuthStore.mockReturnValue({ user: mockUser, logout: vi.fn() });
  });

  // ---- Layout rendering ----

  describe('Layout Rendering', () => {
    it('renders children content', () => {
      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>,
      );
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('renders Zecca branding', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      const brandings = screen.getAllByText('Zecca');
      expect(brandings.length).toBeGreaterThan(0);
    });

    it('renders main content area', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('flex-1', 'overflow-y-auto');
    });

    it('renders TopBar', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    });
  });

  // ---- Navigation ----

  describe('Navigation Menu', () => {
    it('renders all main navigation items in Italian', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      // Main nav
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Conti').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Investimenti').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Spese').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Budget').length).toBeGreaterThan(0);
    });

    it('renders tools navigation', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(screen.getAllByText('Categorizzazione AI').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Obiettivi').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Analisi AI').length).toBeGreaterThan(0);
    });

    it('renders section labels', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(screen.getByText('Finanze')).toBeInTheDocument();
      expect(screen.getByText('Strumenti')).toBeInTheDocument();
      expect(screen.getByText('Altro')).toBeInTheDocument();
    });

    it('navigation links have correct hrefs', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      const dashboardLinks = screen.getAllByRole('link', { name: /Dashboard/ });
      expect(dashboardLinks[0]).toHaveAttribute('href', '/dashboard');

      const accountLinks = screen.getAllByRole('link', { name: /Conti/ });
      expect(accountLinks[0]).toHaveAttribute('href', '/dashboard/accounts');

      const transactionLinks = screen.getAllByRole('link', { name: /Spese/ });
      expect(transactionLinks[0]).toHaveAttribute('href', '/dashboard/transactions');
    });

    it('renders navigation icons as SVGs', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(5);
    });
  });

  // ---- User info ----

  describe('User Information Display', () => {
    it('displays user full name', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    it('displays user email in sidebar', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('renders user initials avatar', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      // Initials are "JD"
      expect(screen.getAllByText('JD').length).toBeGreaterThan(0);
    });
  });

  // ---- Logout ----

  describe('Logout Functionality', () => {
    it('renders logout button with data-testid', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });

    it('calls logout and redirects on click', async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      mockUseAuthStore.mockReturnValue({ user: mockUser, logout: mockLogout });

      const { user } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      await user.click(screen.getByTestId('logout-button'));

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/auth/login');
    });
  });

  // ---- Mobile ----

  describe('Mobile Layout', () => {
    it('renders mobile header with Zecca brand', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      // Mobile header is md:hidden
      const mobileHeader = container.querySelector('.md\\:hidden');
      expect(mobileHeader).toBeInTheDocument();
    });

    it('renders "Nuova Transazione" button in sidebar', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(screen.getByText('Nuova Transazione')).toBeInTheDocument();
    });
  });

  // ---- Semantic HTML ----

  describe('Accessibility', () => {
    it('uses semantic HTML elements', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      expect(container.querySelector('nav')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
      expect(container.querySelector('aside')).toBeInTheDocument();
    });

    it('navigation links are accessible', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      const links = screen.getAllByRole('link', { name: /Dashboard/ });
      expect(links.length).toBeGreaterThan(0);
    });
  });

  // ---- Responsive classes ----

  describe('Responsive Behavior', () => {
    it('has md: responsive classes', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );
      const mdElements = container.querySelectorAll('[class*="md:"]');
      expect(mdElements.length).toBeGreaterThan(0);
    });
  });
});
