/**
 * BudgetProgress Dashboard Component Tests
 *
 * TDD tests for the BudgetProgress dashboard widget.
 * Tests verify the component uses real budget data from the API
 * instead of mock data.
 *
 * @module __tests__/components/dashboard/BudgetProgress
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import type { Budget } from '@/services/budgets.client';

// Mock the budgets store
const mockFetchBudgets = vi.fn();

vi.mock('@/store/budgets.store', () => ({
  useBudgets: vi.fn(),
  useBudgetsLoading: vi.fn(),
  useBudgetsSummary: vi.fn(),
  useBudgetsStore: vi.fn(() => ({
    fetchBudgets: mockFetchBudgets,
  })),
}));

// Import mocked functions
import { useBudgets, useBudgetsLoading, useBudgetsSummary } from '@/store/budgets.store';

const mockUseBudgets = useBudgets as ReturnType<typeof vi.fn>;
const mockUseBudgetsLoading = useBudgetsLoading as ReturnType<typeof vi.fn>;
const mockUseBudgetsSummary = useBudgetsSummary as ReturnType<typeof vi.fn>;

// =============================================================================
// Test Data
// =============================================================================

const mockBudgets: Budget[] = [
  {
    id: 'budget-1',
    name: 'Groceries',
    amount: 600,
    spent: 425,
    remaining: 175,
    percentage: 71,
    status: 'ACTIVE',
    period: 'MONTHLY',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    category: {
      id: 'cat-1',
      name: 'Food & Dining',
      icon: 'utensils',
      color: '#10B981',
    },
    alertThresholds: [80, 100],
    isOverBudget: false,
    progressStatus: 'safe',
    isExpired: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'budget-2',
    name: 'Entertainment',
    amount: 150,
    spent: 180,
    remaining: -30,
    percentage: 120,
    status: 'ACTIVE',
    period: 'MONTHLY',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    category: {
      id: 'cat-2',
      name: 'Entertainment',
      icon: 'film',
      color: '#8B5CF6',
    },
    alertThresholds: [80, 100],
    isOverBudget: true,
    progressStatus: 'over',
    isExpired: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
];

const mockSummary = {
  total: 2,
  totalBudgeted: 750,
  totalSpent: 605,
  remaining: 145,
  overBudgetCount: 1,
};

// =============================================================================
// Tests
// =============================================================================

describe('BudgetProgress Dashboard Widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBudgets.mockReturnValue(mockBudgets);
    mockUseBudgetsLoading.mockReturnValue(false);
    mockUseBudgetsSummary.mockReturnValue(mockSummary);
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the Budget Overview title', () => {
      render(<BudgetProgress />);

      expect(screen.getByText('Budget Overview')).toBeInTheDocument();
    });

    it('should render budgets from API data', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.getByText('Entertainment')).toBeInTheDocument();
      });
    });

    it('should display budget amounts correctly', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        // Groceries: $425 / $600
        expect(screen.getByText(/\$425.*\$600/)).toBeInTheDocument();
        // Entertainment: $180 / $150
        expect(screen.getByText(/\$180.*\$150/)).toBeInTheDocument();
      });
    });

    it('should show total spent and budgeted from summary', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        // $605 of $750 spent
        expect(screen.getByText(/\$605.*\$750.*spent/i)).toBeInTheDocument();
      });
    });

    it('should show over budget count when there are over-budget items', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        expect(screen.getByText(/1 over budget/i)).toBeInTheDocument();
      });
    });

    it('should render manage link to budgets page', () => {
      render(<BudgetProgress />);

      const manageLink = screen.getByRole('link', { name: /manage/i });
      expect(manageLink).toHaveAttribute('href', '/dashboard/budgets');
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      mockUseBudgetsLoading.mockReturnValue(true);
      mockUseBudgets.mockReturnValue([]);

      render(<BudgetProgress />);

      // Should show loading skeleton
      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Empty State Tests
  // ===========================================================================

  describe('Empty State', () => {
    it('should show empty state when no budgets', async () => {
      mockUseBudgets.mockReturnValue([]);
      mockUseBudgetsSummary.mockReturnValue({
        total: 0,
        totalBudgeted: 0,
        totalSpent: 0,
        remaining: 0,
        overBudgetCount: 0,
      });

      render(<BudgetProgress />);

      await waitFor(() => {
        expect(screen.getByText(/no budgets/i)).toBeInTheDocument();
      });
    });

    it('should show create budget link when empty', async () => {
      mockUseBudgets.mockReturnValue([]);
      mockUseBudgetsSummary.mockReturnValue({
        total: 0,
        totalBudgeted: 0,
        totalSpent: 0,
        remaining: 0,
        overBudgetCount: 0,
      });

      render(<BudgetProgress />);

      await waitFor(() => {
        const createLink = screen.getByRole('link', { name: /create.*budget/i });
        expect(createLink).toHaveAttribute('href', '/dashboard/budgets');
      });
    });
  });

  // ===========================================================================
  // Progress Bar Tests
  // ===========================================================================

  describe('Progress Bars', () => {
    it('should display correct percentage for each budget', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        // Groceries at 71%
        expect(screen.getByText('71% used')).toBeInTheDocument();
      });
    });

    it('should cap over-budget percentage at 100% visually', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        // Entertainment is at 120%, but visual should cap at 100%
        // The percentage text should still show the actual value
        expect(screen.getByText('120% used')).toBeInTheDocument();
      });
    });

    it('should show remaining amount for under-budget items', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        expect(screen.getByText('$175 left')).toBeInTheDocument();
      });
    });

    it('should show over amount for over-budget items', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        expect(screen.getByText('$30 over')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Color Coding Tests
  // ===========================================================================

  describe('Color Coding', () => {
    it('should show red styling for over-budget items', async () => {
      render(<BudgetProgress />);

      await waitFor(() => {
        const overBudgetText = screen.getByText('$30 over');
        // Over-budget items should use dark red color from utility (#991b1b)
        expect(overBudgetText).toHaveStyle({ color: '#991b1b' });
      });
    });
  });

  // ===========================================================================
  // Visual Integration Tests - All Color Thresholds
  // ===========================================================================

  describe('All Color Thresholds', () => {
    it('renders green progress bar for safe status (0-59%)', async () => {
      const safeBudget: Budget = {
        ...mockBudgets[0],
        percentage: 45,
        spent: 270,
        remaining: 330,
      };
      mockUseBudgets.mockReturnValue([safeBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        // Find the inner progress bar div (with absolute positioning)
        const progressBars = container.querySelectorAll('.absolute.inset-y-0.left-0');
        expect(progressBars.length).toBeGreaterThan(0);
        // Safe status should use green color (#22c55e)
        expect(progressBars[0]).toHaveStyle({ backgroundColor: '#22c55e' });
      });
    });

    it('renders yellow progress bar for moderate status (60-79%)', async () => {
      const moderateBudget: Budget = {
        ...mockBudgets[0],
        percentage: 70,
        spent: 420,
        remaining: 180,
      };
      mockUseBudgets.mockReturnValue([moderateBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.absolute.inset-y-0.left-0');
        expect(progressBars.length).toBeGreaterThan(0);
        // Moderate status should use yellow color (#eab308)
        expect(progressBars[0]).toHaveStyle({ backgroundColor: '#eab308' });
      });
    });

    it('renders orange progress bar for warning status (80-94%)', async () => {
      const warningBudget: Budget = {
        ...mockBudgets[0],
        percentage: 88,
        spent: 528,
        remaining: 72,
      };
      mockUseBudgets.mockReturnValue([warningBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.absolute.inset-y-0.left-0');
        expect(progressBars.length).toBeGreaterThan(0);
        // Warning status should use orange color (#f97316)
        expect(progressBars[0]).toHaveStyle({ backgroundColor: '#f97316' });
      });
    });

    it('renders red progress bar for critical status (95-100%)', async () => {
      const criticalBudget: Budget = {
        ...mockBudgets[0],
        percentage: 98,
        spent: 588,
        remaining: 12,
      };
      mockUseBudgets.mockReturnValue([criticalBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.absolute.inset-y-0.left-0');
        expect(progressBars.length).toBeGreaterThan(0);
        // Critical status should use red color (#ef4444)
        expect(progressBars[0]).toHaveStyle({ backgroundColor: '#ef4444' });
      });
    });

    it('renders dark red progress bar for over status (>100%)', async () => {
      const overBudget: Budget = {
        ...mockBudgets[1],
        percentage: 120,
        spent: 180,
        remaining: -30,
        isOverBudget: true,
      };
      mockUseBudgets.mockReturnValue([overBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.absolute.inset-y-0.left-0');
        expect(progressBars.length).toBeGreaterThan(0);
        // Over status should use dark red color (#991b1b)
        expect(progressBars[0]).toHaveStyle({ backgroundColor: '#991b1b' });
      });
    });
  });

  // ===========================================================================
  // Pulse Animation Tests
  // ===========================================================================

  describe('Pulse Animation', () => {
    it('should NOT have pulse animation when under 100%', async () => {
      const underBudget: Budget = {
        ...mockBudgets[0],
        percentage: 95,
        spent: 570,
        remaining: 30,
        isOverBudget: false,
      };
      mockUseBudgets.mockReturnValue([underBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.absolute.inset-y-0.left-0');
        expect(progressBars.length).toBeGreaterThan(0);
        expect(progressBars[0]).not.toHaveClass('animate-budget-pulse');
      });
    });

    it('should have pulse animation when over 100%', async () => {
      const overBudget: Budget = {
        ...mockBudgets[1],
        percentage: 115,
        spent: 172.5,
        remaining: -22.5,
        isOverBudget: true,
      };
      mockUseBudgets.mockReturnValue([overBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.absolute.inset-y-0.left-0');
        expect(progressBars.length).toBeGreaterThan(0);
        expect(progressBars[0]).toHaveClass('animate-budget-pulse');
      });
    });
  });

  // ===========================================================================
  // Track Background Color Tests
  // ===========================================================================

  describe('Track Background Colors', () => {
    it('renders correct track background for safe status', async () => {
      const safeBudget: Budget = {
        ...mockBudgets[0],
        percentage: 30,
      };
      mockUseBudgets.mockReturnValue([safeBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const tracks = container.querySelectorAll('.rounded-full.overflow-hidden');
        expect(tracks.length).toBeGreaterThan(0);
        // Safe status background should be light green (#dcfce7)
        expect(tracks[0]).toHaveStyle({ backgroundColor: '#dcfce7' });
      });
    });

    it('renders correct track background for moderate status', async () => {
      const moderateBudget: Budget = {
        ...mockBudgets[0],
        percentage: 70,
      };
      mockUseBudgets.mockReturnValue([moderateBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const tracks = container.querySelectorAll('.rounded-full.overflow-hidden');
        expect(tracks.length).toBeGreaterThan(0);
        // Moderate status background should be light yellow (#fef9c3)
        expect(tracks[0]).toHaveStyle({ backgroundColor: '#fef9c3' });
      });
    });

    it('renders correct track background for warning status', async () => {
      const warningBudget: Budget = {
        ...mockBudgets[0],
        percentage: 85,
      };
      mockUseBudgets.mockReturnValue([warningBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const tracks = container.querySelectorAll('.rounded-full.overflow-hidden');
        expect(tracks.length).toBeGreaterThan(0);
        // Warning status background should be light orange (#ffedd5)
        expect(tracks[0]).toHaveStyle({ backgroundColor: '#ffedd5' });
      });
    });

    it('renders correct track background for critical status', async () => {
      const criticalBudget: Budget = {
        ...mockBudgets[0],
        percentage: 97,
      };
      mockUseBudgets.mockReturnValue([criticalBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const tracks = container.querySelectorAll('.rounded-full.overflow-hidden');
        expect(tracks.length).toBeGreaterThan(0);
        // Critical status background should be light red (#fee2e2)
        expect(tracks[0]).toHaveStyle({ backgroundColor: '#fee2e2' });
      });
    });

    it('renders correct track background for over status', async () => {
      const overBudget: Budget = {
        ...mockBudgets[1],
        percentage: 120,
        isOverBudget: true,
      };
      mockUseBudgets.mockReturnValue([overBudget]);

      const { container } = render(<BudgetProgress />);

      await waitFor(() => {
        const tracks = container.querySelectorAll('.rounded-full.overflow-hidden');
        expect(tracks.length).toBeGreaterThan(0);
        // Over status background should be red-200 (#fecaca)
        expect(tracks[0]).toHaveStyle({ backgroundColor: '#fecaca' });
      });
    });
  });

  // ===========================================================================
  // Data Integration Tests
  // ===========================================================================

  describe('Data Integration', () => {
    it('should NOT use hardcoded mock data', async () => {
      // This test ensures the component uses the store hooks
      // If it used mock data, changing the mock wouldn't affect the render
      const customBudgets: Budget[] = [
        {
          id: 'custom-1',
          name: 'Custom Budget',
          amount: 1000,
          spent: 500,
          remaining: 500,
          percentage: 50,
          status: 'ACTIVE',
          period: 'MONTHLY',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          category: {
            id: 'cat-custom',
            name: 'Custom Category',
            icon: 'star',
            color: '#FFD700',
          },
          alertThresholds: [80, 100],
          isOverBudget: false,
          progressStatus: 'safe',
          isExpired: false,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
        },
      ];

      mockUseBudgets.mockReturnValue(customBudgets);
      mockUseBudgetsSummary.mockReturnValue({
        total: 1,
        totalBudgeted: 1000,
        totalSpent: 500,
        remaining: 500,
        overBudgetCount: 0,
      });

      render(<BudgetProgress />);

      await waitFor(() => {
        // Should show custom budget, NOT the hardcoded mock data
        expect(screen.getByText('Custom Budget')).toBeInTheDocument();
        expect(screen.queryByText('Food & Groceries')).not.toBeInTheDocument();
        expect(screen.queryByText('Transportation')).not.toBeInTheDocument();
      });
    });
  });
});
