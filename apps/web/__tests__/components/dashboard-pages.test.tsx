/**
 * Tests for Dashboard Pages
 * Verifies that InvestmentsPage, GoalsPage, and SettingsPage render correctly.
 *
 * After the Figma Design Sprint, all pages use framer-motion, Italian text,
 * and completely new component structures.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../utils/test-utils';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target: unknown, prop: string | symbol) => {
      if (prop === '__esModule') return false;
      return ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, ...rest }: Record<string, unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag as string, rest, children as React.ReactNode);
      };
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock recharts (used by InvestmentsPage)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// Mock auth store (used by SettingsPage)
vi.mock('../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock useTheme hook (used by SettingsPage)
vi.mock('../../src/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'dracula',
    setTheme: vi.fn(),
  })),
}));

// Mock CategoryManager (used by SettingsPage categories tab)
vi.mock('../../src/components/categories/CategoryManager', () => ({
  CategoryManager: () => <div data-testid="category-manager">CategoryManager</div>,
}));

// Mock Supabase client
vi.mock('../../src/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  })),
}));

import InvestmentsPage from '../../app/dashboard/investments/page';
import GoalsPage from '../../app/dashboard/goals/page';
import SettingsPage from '../../app/dashboard/settings/page';
import { useAuthStore } from '../../src/store/auth.store';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

// Mock user for SettingsPage tests
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  status: 'ACTIVE',
  timezone: 'Europe/Rome',
  currency: 'EUR',
  preferences: {
    theme: 'dracula',
    language: 'it',
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

describe('Dashboard Pages', () => {
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

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Investimenti');
    });

    it('renders investments description in Italian', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Gestisci il tuo portafoglio di investimenti')).toBeInTheDocument();
    });

    it('renders add investment button', () => {
      render(<InvestmentsPage />);

      expect(screen.getByRole('button', { name: /Aggiungi Investimento/i })).toBeInTheDocument();
    });

    it('renders investment summary cards', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Valore Totale')).toBeInTheDocument();
    });
  });

  describe('GoalsPage', () => {
    it('renders the goals page with correct heading', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Obiettivi');
    });

    it('renders goals description in Italian', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Monitora i tuoi obiettivi di risparmio')).toBeInTheDocument();
    });

    it('renders add goal button', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('button', { name: /Nuovo Obiettivo/i })).toBeInTheDocument();
    });

    it('renders goal cards', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Fondo Emergenza')).toBeInTheDocument();
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

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Impostazioni');
    });

    it('renders settings description in Italian', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Gestisci il tuo profilo e le preferenze')).toBeInTheDocument();
    });

    it('renders profile section heading on default tab', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Informazioni Profilo')).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Profilo')).toBeInTheDocument();
      expect(screen.getByText('Aspetto')).toBeInTheDocument();
      expect(screen.getByText('Notifiche')).toBeInTheDocument();
    });

    it('shows loading state when user is not loaded', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: vi.fn(),
      });

      const { container } = render(<SettingsPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('pre-fills form with user data', () => {
      render(<SettingsPage />);

      const firstNameInput = screen.getByLabelText('Nome') as HTMLInputElement;
      const lastNameInput = screen.getByLabelText('Cognome') as HTMLInputElement;
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;

      expect(firstNameInput.value).toBe('Test');
      expect(lastNameInput.value).toBe('User');
      expect(emailInput.value).toBe('test@example.com');
    });

    it('renders save button', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('button', { name: /Salva Modifiche/i })).toBeInTheDocument();
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
      });
    });
  });
});
