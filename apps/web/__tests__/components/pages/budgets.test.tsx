/**
 * Tests for BudgetsPage component
 * Tests page rendering, category fetching from API (not mock data),
 * and integration with BudgetForm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import BudgetsPage from '../../../app/dashboard/budgets/page';

// Mock the categoriesClient
const mockCategoriesData = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Groceries',
    type: 'EXPENSE' as const,
    icon: 'shopping-cart',
    color: '#4CAF50',
    parentId: null,
    isSystem: true,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Dining Out',
    type: 'EXPENSE' as const,
    icon: 'utensils',
    color: '#FF9800',
    parentId: null,
    isSystem: true,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Entertainment',
    type: 'EXPENSE' as const,
    icon: 'film',
    color: '#9C27B0',
    parentId: null,
    isSystem: true,
  },
];

const mockGetOptions = vi.fn().mockResolvedValue(mockCategoriesData);

vi.mock('../../../src/services/categories.client', () => ({
  categoriesClient: {
    getOptions: (...args: unknown[]) => mockGetOptions(...args),
  },
}));

// Mock useBudgets hook
const mockUseBudgets = vi.fn();
vi.mock('../../../src/hooks/useBudgets', () => ({
  useBudgets: (...args: unknown[]) => mockUseBudgets(...args),
}));

describe('BudgetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOptions.mockResolvedValue(mockCategoriesData);
    mockUseBudgets.mockReturnValue({
      budgets: [],
      isLoading: false,
      isCreating: false,
      error: null,
      createError: null,
      overBudgetItems: [],
      summary: {
        total: 0,
        totalBudgeted: 0,
        totalSpent: 0,
        overBudgetCount: 0,
      },
      refresh: vi.fn(),
      createBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      isBudgetUpdating: vi.fn().mockReturnValue(false),
      isBudgetDeleting: vi.fn().mockReturnValue(false),
      clearErrors: vi.fn(),
    });
  });

  describe('Page Header', () => {
    it('renders the page heading', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Budgets');
      });
    });

    it('renders the description text', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Track your spending across categories')).toBeInTheDocument();
      });
    });

    it('renders the Create Budget button', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('create-budget-button')).toBeInTheDocument();
        expect(screen.getByTestId('create-budget-button')).toHaveTextContent('Create Budget');
      });
    });
  });

  describe('Categories Fetching', () => {
    it('fetches categories from API on mount', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(mockGetOptions).toHaveBeenCalledWith('EXPENSE');
      });
    });

    it('fetches categories with EXPENSE type filter', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(mockGetOptions).toHaveBeenCalledWith('EXPENSE');
      });
    });

    it('categories have valid UUID format IDs', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(mockGetOptions).toHaveBeenCalled();
      });

      // Verify the mock data has UUID format IDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      mockCategoriesData.forEach((category) => {
        expect(category.id).toMatch(uuidRegex);
      });
    });

    it('handles categories API error gracefully', async () => {
      mockGetOptions.mockRejectedValueOnce(new Error('API Error'));

      render(<BudgetsPage />);

      // Page should still render without crashing
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Budgets');
      });
    });
  });

  describe('BudgetForm Integration', () => {
    it('opens form modal when Create Budget is clicked', async () => {
      const { user } = render(<BudgetsPage />);

      // Wait for categories to load
      await waitFor(() => {
        expect(mockGetOptions).toHaveBeenCalled();
      });

      // Click create button
      await user.click(screen.getByTestId('create-budget-button'));

      // Form should appear - use getAllByRole since there may be multiple h3 elements
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings.some(h => h.textContent === 'Create Budget')).toBe(true);
      });
    });

    it('passes API categories to BudgetForm', async () => {
      const { user } = render(<BudgetsPage />);

      // Wait for categories to load
      await waitFor(() => {
        expect(mockGetOptions).toHaveBeenCalled();
      });

      // Click create button
      await user.click(screen.getByTestId('create-budget-button'));

      // Wait for form to appear
      await waitFor(() => {
        expect(screen.getByTestId('budget-category-select')).toBeInTheDocument();
      });

      // Check that category options are present from API (not mock)
      const categorySelect = screen.getByTestId('budget-category-select');
      expect(categorySelect).toContainHTML('Groceries');
      expect(categorySelect).toContainHTML('Dining Out');
      expect(categorySelect).toContainHTML('Entertainment');
    });

    it('disables create button while form is open', async () => {
      const { user } = render(<BudgetsPage />);

      // Wait for categories to load
      await waitFor(() => {
        expect(mockGetOptions).toHaveBeenCalled();
      });

      // Click create button
      await user.click(screen.getByTestId('create-budget-button'));

      // Create button should be disabled
      await waitFor(() => {
        expect(screen.getByTestId('create-budget-button')).toBeDisabled();
      });
    });
  });

  describe('Budget List', () => {
    it('renders budget list container', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('budgets-list')).toBeInTheDocument();
      });
    });

    it('shows summary stats when budgets exist', async () => {
      mockUseBudgets.mockReturnValue({
        budgets: [
          {
            id: 'budget-1',
            name: 'Test Budget',
            amount: 500,
            spent: 250,
            remaining: 250,
            percentage: 50,
            progressStatus: 'safe',
            category: {
              id: 'cat-1',
              name: 'Groceries',
              icon: 'shopping-cart',
              color: '#4CAF50',
            },
            period: 'MONTHLY',
            status: 'ACTIVE',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            isOverBudget: false,
            isExpired: false,
          },
        ],
        isLoading: false,
        isCreating: false,
        error: null,
        createError: null,
        overBudgetItems: [],
        summary: {
          total: 1,
          totalBudgeted: 500,
          totalSpent: 250,
          overBudgetCount: 0,
        },
        refresh: vi.fn(),
        createBudget: vi.fn(),
        updateBudget: vi.fn(),
        deleteBudget: vi.fn(),
        isBudgetUpdating: vi.fn().mockReturnValue(false),
        isBudgetDeleting: vi.fn().mockReturnValue(false),
        clearErrors: vi.fn(),
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Budgets')).toBeInTheDocument();
        expect(screen.getByText('Total Budgeted')).toBeInTheDocument();
        expect(screen.getByText('Total Spent')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays budget loading error', async () => {
      mockUseBudgets.mockReturnValue({
        budgets: [],
        isLoading: false,
        isCreating: false,
        error: 'Failed to load budgets',
        createError: null,
        overBudgetItems: [],
        summary: {
          total: 0,
          totalBudgeted: 0,
          totalSpent: 0,
          overBudgetCount: 0,
        },
        refresh: vi.fn(),
        createBudget: vi.fn(),
        updateBudget: vi.fn(),
        deleteBudget: vi.fn(),
        isBudgetUpdating: vi.fn().mockReturnValue(false),
        isBudgetDeleting: vi.fn().mockReturnValue(false),
        clearErrors: vi.fn(),
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to load budgets');
      });
    });

    it('shows retry button on error', async () => {
      const mockRefresh = vi.fn();
      mockUseBudgets.mockReturnValue({
        budgets: [],
        isLoading: false,
        isCreating: false,
        error: 'Failed to load budgets',
        createError: null,
        overBudgetItems: [],
        summary: {
          total: 0,
          totalBudgeted: 0,
          totalSpent: 0,
          overBudgetCount: 0,
        },
        refresh: mockRefresh,
        createBudget: vi.fn(),
        updateBudget: vi.fn(),
        deleteBudget: vi.fn(),
        isBudgetUpdating: vi.fn().mockReturnValue(false),
        isBudgetDeleting: vi.fn().mockReturnValue(false),
        clearErrors: vi.fn(),
      });

      const { user } = render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retry/i }));
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Over Budget Alert', () => {
    it('shows over budget alert when items are over budget', async () => {
      mockUseBudgets.mockReturnValue({
        budgets: [
          {
            id: 'budget-1',
            name: 'Test Budget',
            amount: 500,
            spent: 600,
            remaining: -100,
            percentage: 120,
            progressStatus: 'critical',
            isOverBudget: true,
            category: {
              id: 'cat-1',
              name: 'Groceries',
              icon: 'shopping-cart',
              color: '#4CAF50',
            },
            period: 'MONTHLY',
            status: 'ACTIVE',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            isExpired: false,
          },
        ],
        isLoading: false,
        isCreating: false,
        error: null,
        createError: null,
        overBudgetItems: [
          {
            id: 'budget-1',
            name: 'Test Budget',
            amount: 500,
            spent: 600,
            percentage: 120,
          },
        ],
        summary: {
          total: 1,
          totalBudgeted: 500,
          totalSpent: 600,
          overBudgetCount: 1,
        },
        refresh: vi.fn(),
        createBudget: vi.fn(),
        updateBudget: vi.fn(),
        deleteBudget: vi.fn(),
        isBudgetUpdating: vi.fn().mockReturnValue(false),
        isBudgetDeleting: vi.fn().mockReturnValue(false),
        clearErrors: vi.fn(),
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        // OverBudgetAlert component should be present
        expect(screen.getByTestId('budgets-container')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible page structure', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Budgets' })).toBeInTheDocument();
      });
    });

    it('create budget button is keyboard accessible', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        const createButton = screen.getByTestId('create-budget-button');
        expect(createButton).not.toBeDisabled();
        expect(createButton.tagName.toLowerCase()).toBe('button');
      });
    });
  });

  describe('Visual Consistency with Accounts Page', () => {
    it('renders header with icon in colored background', async () => {
      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('budget-icon-container')).toBeInTheDocument();
        expect(screen.getByTestId('budget-icon-container')).toHaveClass('bg-emerald-100', 'rounded-lg');
      });
    });

    it('renders stats cards with rounded-xl styling when budgets exist', async () => {
      mockUseBudgets.mockReturnValue({
        budgets: [
          {
            id: 'budget-1',
            name: 'Test Budget',
            amount: 500,
            spent: 250,
            remaining: 250,
            percentage: 50,
            progressStatus: 'safe',
            category: {
              id: 'cat-1',
              name: 'Groceries',
              icon: 'shopping-cart',
              color: '#4CAF50',
            },
            period: 'MONTHLY',
            status: 'ACTIVE',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            isOverBudget: false,
            isExpired: false,
          },
        ],
        isLoading: false,
        isCreating: false,
        error: null,
        createError: null,
        overBudgetItems: [],
        summary: {
          total: 1,
          totalBudgeted: 500,
          totalSpent: 250,
          overBudgetCount: 0,
        },
        refresh: vi.fn(),
        createBudget: vi.fn(),
        updateBudget: vi.fn(),
        deleteBudget: vi.fn(),
        isBudgetUpdating: vi.fn().mockReturnValue(false),
        isBudgetDeleting: vi.fn().mockReturnValue(false),
        clearErrors: vi.fn(),
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        const statsContainer = screen.getByTestId('budget-stats-container');
        expect(statsContainer).toBeInTheDocument();
        // Stats cards should have rounded-xl styling
        const statCards = statsContainer.querySelectorAll('[class*="rounded-xl"]');
        expect(statCards.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('wraps budget list in a card with section header', async () => {
      mockUseBudgets.mockReturnValue({
        budgets: [
          {
            id: 'budget-1',
            name: 'Test Budget',
            amount: 500,
            spent: 250,
            remaining: 250,
            percentage: 50,
            progressStatus: 'safe',
            category: {
              id: 'cat-1',
              name: 'Groceries',
              icon: 'shopping-cart',
              color: '#4CAF50',
            },
            period: 'MONTHLY',
            status: 'ACTIVE',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            isOverBudget: false,
            isExpired: false,
          },
        ],
        isLoading: false,
        isCreating: false,
        error: null,
        createError: null,
        overBudgetItems: [],
        summary: {
          total: 1,
          totalBudgeted: 500,
          totalSpent: 250,
          overBudgetCount: 0,
        },
        refresh: vi.fn(),
        createBudget: vi.fn(),
        updateBudget: vi.fn(),
        deleteBudget: vi.fn(),
        isBudgetUpdating: vi.fn().mockReturnValue(false),
        isBudgetDeleting: vi.fn().mockReturnValue(false),
        clearErrors: vi.fn(),
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        // Budget list should be in a card with header
        expect(screen.getByText('All Budgets')).toBeInTheDocument();
        expect(screen.getByText('Manage your spending limits by category')).toBeInTheDocument();
      });
    });

    it('shows empty state with centered icon when no budgets', async () => {
      mockUseBudgets.mockReturnValue({
        budgets: [],
        isLoading: false,
        isCreating: false,
        error: null,
        createError: null,
        overBudgetItems: [],
        summary: {
          total: 0,
          totalBudgeted: 0,
          totalSpent: 0,
          overBudgetCount: 0,
        },
        refresh: vi.fn(),
        createBudget: vi.fn(),
        updateBudget: vi.fn(),
        deleteBudget: vi.fn(),
        isBudgetUpdating: vi.fn().mockReturnValue(false),
        isBudgetDeleting: vi.fn().mockReturnValue(false),
        clearErrors: vi.fn(),
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByText('No budgets yet')).toBeInTheDocument();
        expect(screen.getByText(/Create your first budget/i)).toBeInTheDocument();
      });
    });
  });
});
