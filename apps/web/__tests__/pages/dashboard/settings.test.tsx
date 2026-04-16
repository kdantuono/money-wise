/**
 * Tests for SettingsPage component
 *
 * After the Figma Design Sprint, the settings page has a 9-tab layout:
 * Profilo, Aspetto, Categorie, API Keys, Piano, Notifiche, Integrazioni, Sicurezza, Dati.
 * Default tab is "profile" showing Informazioni Profilo.
 * All text is in Italian.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';

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

// Mock auth store
vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock useTheme hook
vi.mock('../../../src/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'dracula',
    setTheme: vi.fn(),
  })),
}));

// Mock CategoryManager (complex sub-dependency)
vi.mock('../../../src/components/categories/CategoryManager', () => ({
  CategoryManager: () => <div data-testid="category-manager">CategoryManager</div>,
}));

// Mock Supabase client (used by handleSaveProfile dynamic import)
vi.mock('../../../src/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  })),
}));

import SettingsPage from '../../../app/dashboard/settings/page';
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
    it('renders the page heading in Italian', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Impostazioni');
    });

    it('renders the description text in Italian', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Gestisci il tuo profilo e le preferenze')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all 9 tab labels', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Profilo')).toBeInTheDocument();
      expect(screen.getByText('Aspetto')).toBeInTheDocument();
      expect(screen.getByText('Categorie')).toBeInTheDocument();
      expect(screen.getByText('API Keys')).toBeInTheDocument();
      expect(screen.getByText('Piano')).toBeInTheDocument();
      expect(screen.getByText('Notifiche')).toBeInTheDocument();
      expect(screen.getByText('Integrazioni')).toBeInTheDocument();
      expect(screen.getByText('Sicurezza')).toBeInTheDocument();
      expect(screen.getByText('Dati')).toBeInTheDocument();
    });
  });

  describe('Profile Tab (default)', () => {
    it('renders Informazioni Profilo section heading', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Informazioni Profilo')).toBeInTheDocument();
    });

    it('renders Nome label and input with user value', () => {
      render(<SettingsPage />);

      const nameInput = screen.getByLabelText('Nome');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveValue('John');
    });

    it('renders Cognome label and input with user value', () => {
      render(<SettingsPage />);

      const lastNameInput = screen.getByLabelText('Cognome');
      expect(lastNameInput).toBeInTheDocument();
      expect(lastNameInput).toHaveValue('Doe');
    });

    it('renders Email input with user value', () => {
      render(<SettingsPage />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveValue('john@example.com');
    });

    it('renders Salva Modifiche button', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('button', { name: /Salva Modifiche/i })).toBeInTheDocument();
    });

    it('renders Cambia Immagine button', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('button', { name: /Cambia Immagine/i })).toBeInTheDocument();
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

      expect(screen.queryByText('Informazioni Profilo')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Salva Modifiche/i })).not.toBeInTheDocument();
    });
  });
});
