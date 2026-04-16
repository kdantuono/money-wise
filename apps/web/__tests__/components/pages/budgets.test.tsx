/**
 * Tests for BudgetsPage component
 *
 * Smoke tests for the Figma-redesigned budget page with Italian UI text,
 * summary cards, empty state, error handling, and form modal.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';

// ---------------------------------------------------------------------------
// Mocks — must come before the component import
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/dashboard/budgets',
}));

vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: vi.fn().mockReturnValue({
    user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
    logout: vi.fn(),
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(
      props: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
      ref: React.Ref<HTMLDivElement>,
    ) {
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

// Mock recharts — SVG rendering breaks in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}));

// Mock budget sub-components
vi.mock('../../../src/components/budgets', () => ({
  BudgetForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="budget-form">
      <button onClick={onCancel}>Annulla</button>
    </div>
  ),
  OverBudgetAlert: ({ budgets }: { budgets: unknown[] }) => (
    <div data-testid="over-budget-alert">Over budget: {budgets.length}</div>
  ),
}));

// Mock categoriesClient
const mockGetOptions = vi.fn().mockResolvedValue([]);
vi.mock('../../../src/services/categories.client', () => ({
  categoriesClient: {
    getOptions: (...args: unknown[]) => mockGetOptions(...args),
  },
}));

// Mock useBudgets
const mockUseBudgets = vi.fn();
vi.mock('../../../src/hooks/useBudgets', () => ({
  useBudgets: (...args: unknown[]) => mockUseBudgets(...args),
}));

// Import after all mocks
import BudgetsPage from '../../../app/dashboard/budgets/page';

// ---------------------------------------------------------------------------
// Default budget hook state
// ---------------------------------------------------------------------------

const defaultBudgetHookState = {
  budgets: [],
  isLoading: false,
  isCreating: false,
  error: null,
  createError: null,
  overBudgetItems: [],
  summary: { total: 0, totalBudgeted: 0, totalSpent: 0, overBudgetCount: 0 },
  refresh: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  isBudgetUpdating: vi.fn().mockReturnValue(false),
  isBudgetDeleting: vi.fn().mockReturnValue(false),
  clearErrors: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BudgetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOptions.mockResolvedValue([]);
    mockUseBudgets.mockReturnValue({ ...defaultBudgetHookState });
  });

  // ---- Page header ----

  describe('Page Header', () => {
    it('renders the page heading in Italian', () => {
      render(<BudgetsPage />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Budget');
    });

    it('renders the Italian description text', () => {
      render(<BudgetsPage />);
      expect(
        screen.getByText('Pianifica e monitora il tuo budget mensile'),
      ).toBeInTheDocument();
    });

    it('renders "Nuova Categoria" create button', () => {
      render(<BudgetsPage />);
      expect(screen.getByText('Nuova Categoria')).toBeInTheDocument();
    });

    it('renders "Aggiorna" refresh button', () => {
      render(<BudgetsPage />);
      expect(screen.getByText('Aggiorna')).toBeInTheDocument();
    });
  });

  // ---- Categories fetch ----

  describe('Categories Fetching', () => {
    it('fetches categories with EXPENSE type on mount', async () => {
      render(<BudgetsPage />);
      await waitFor(() => {
        expect(mockGetOptions).toHaveBeenCalledWith('EXPENSE');
      });
    });

    it('handles categories API error gracefully', async () => {
      mockGetOptions.mockRejectedValueOnce(new Error('API Error'));
      render(<BudgetsPage />);
      // Page should still render without crashing
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Budget');
    });
  });

  // ---- Loading state ----

  describe('Loading State', () => {
    it('shows skeleton loading state', () => {
      mockUseBudgets.mockReturnValue({ ...defaultBudgetHookState, isLoading: true });
      const { container } = render(<BudgetsPage />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  // ---- Empty state ----

  describe('Empty State', () => {
    it('shows empty state when no budgets', () => {
      render(<BudgetsPage />);
      expect(screen.getByText('Nessun budget ancora')).toBeInTheDocument();
      expect(
        screen.getByText(/Crea il tuo primo budget/),
      ).toBeInTheDocument();
    });

    it('shows "Crea Budget" button in empty state', () => {
      render(<BudgetsPage />);
      expect(screen.getByText('Crea Budget')).toBeInTheDocument();
    });
  });

  // ---- Error handling ----

  describe('Error Handling', () => {
    it('displays error message with alert role', () => {
      mockUseBudgets.mockReturnValue({
        ...defaultBudgetHookState,
        error: 'Errore nel caricamento',
      });
      render(<BudgetsPage />);
      expect(screen.getByRole('alert')).toHaveTextContent('Errore nel caricamento');
    });

    it('shows retry button on error', async () => {
      const mockRefresh = vi.fn();
      mockUseBudgets.mockReturnValue({
        ...defaultBudgetHookState,
        error: 'Errore nel caricamento',
        refresh: mockRefresh,
      });
      const { user } = render(<BudgetsPage />);

      const retryButton = screen.getByText('Riprova');
      expect(retryButton).toBeInTheDocument();
      await user.click(retryButton);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  // ---- Budget list with data ----

  describe('Budget List', () => {
    const budgetWithData = {
      ...defaultBudgetHookState,
      budgets: [
        {
          id: 'budget-1',
          name: 'Spesa',
          amount: 500,
          spent: 250,
          remaining: 250,
          percentage: 50,
          progressStatus: 'safe',
          category: { id: 'cat-1', name: 'Alimentari', icon: 'shopping-cart', color: '#4CAF50' },
          period: 'MONTHLY',
          status: 'ACTIVE',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          isOverBudget: false,
          isExpired: false,
        },
      ],
      summary: { total: 1, totalBudgeted: 500, totalSpent: 250, overBudgetCount: 0 },
    };

    it('renders summary cards when budgets exist', () => {
      mockUseBudgets.mockReturnValue(budgetWithData);
      render(<BudgetsPage />);
      expect(screen.getByText('Budget Totale')).toBeInTheDocument();
      expect(screen.getByText('Speso')).toBeInTheDocument();
      expect(screen.getByText('Disponibile')).toBeInTheDocument();
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('renders "Progresso Generale" section', () => {
      mockUseBudgets.mockReturnValue(budgetWithData);
      render(<BudgetsPage />);
      expect(screen.getByText('Progresso Generale')).toBeInTheDocument();
    });

    it('renders "Tutte le Categorie" section', () => {
      mockUseBudgets.mockReturnValue(budgetWithData);
      render(<BudgetsPage />);
      expect(screen.getByText('Tutte le Categorie')).toBeInTheDocument();
    });

    it('renders budget category name', () => {
      mockUseBudgets.mockReturnValue(budgetWithData);
      render(<BudgetsPage />);
      expect(screen.getByText('Alimentari')).toBeInTheDocument();
    });
  });

  // ---- Form modal ----

  describe('Form Modal', () => {
    it('opens form when "Nuova Categoria" is clicked', async () => {
      mockUseBudgets.mockReturnValue({ ...defaultBudgetHookState });
      const { user } = render(<BudgetsPage />);

      // Click the header create button
      const buttons = screen.getAllByText('Nuova Categoria');
      await user.click(buttons[0]);

      expect(screen.getByTestId('budget-form')).toBeInTheDocument();
    });
  });

  // ---- Over budget ----

  describe('Over Budget Alert', () => {
    it('renders OverBudgetAlert when items are over budget', () => {
      mockUseBudgets.mockReturnValue({
        ...defaultBudgetHookState,
        budgets: [
          {
            id: 'budget-1',
            name: 'Test',
            amount: 500,
            spent: 600,
            remaining: -100,
            percentage: 120,
            progressStatus: 'critical',
            isOverBudget: true,
            category: { id: 'cat-1', name: 'Ristoranti', icon: 'utensils', color: '#FF9800' },
            period: 'MONTHLY',
            status: 'ACTIVE',
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            isExpired: false,
          },
        ],
        overBudgetItems: [{ id: 'budget-1', name: 'Test', amount: 500, spent: 600, percentage: 120 }],
        summary: { total: 1, totalBudgeted: 500, totalSpent: 600, overBudgetCount: 1 },
      });

      render(<BudgetsPage />);
      expect(screen.getByTestId('over-budget-alert')).toBeInTheDocument();
    });
  });
});
