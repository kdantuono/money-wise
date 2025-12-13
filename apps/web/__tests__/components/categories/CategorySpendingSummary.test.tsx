/**
 * CategorySpendingSummary Component Tests
 *
 * TDD tests for the CategorySpendingSummary component.
 * Tests cover rendering, date range selection, data fetching, and interactions.
 *
 * @module __tests__/components/categories/CategorySpendingSummary
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { CategorySpendingSummary } from '@/components/categories/CategorySpendingSummary';
import { categoriesClient } from '@/services/categories.client';
import type { CategorySpendingSummary as SpendingSummary } from '@/services/categories.client';

// =============================================================================
// Mock Data
// =============================================================================

const mockSpendingData: SpendingSummary = {
  categories: [
    {
      categoryId: 'cat-1',
      categoryName: 'Food & Dining',
      icon: 'Utensils',
      color: '#FF5733',
      totalAmount: 500,
      transactionCount: 25,
    },
    {
      categoryId: 'cat-2',
      categoryName: 'Transportation',
      icon: 'Car',
      color: '#3B82F6',
      totalAmount: 300,
      transactionCount: 15,
    },
    {
      categoryId: 'cat-3',
      categoryName: 'Entertainment',
      icon: 'Film',
      color: '#8B5CF6',
      totalAmount: 200,
      transactionCount: 10,
    },
  ],
  totalSpending: 1000,
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31',
  },
};

const emptySpendingData: SpendingSummary = {
  categories: [],
  totalSpending: 0,
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31',
  },
};

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('@/services/categories.client', () => ({
  categoriesClient: {
    getSpending: vi.fn(),
  },
}));

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps = {
  onCategoryClick: vi.fn(),
};

const getProps = (overrides: Partial<typeof defaultProps> = {}) => ({
  ...defaultProps,
  onCategoryClick: vi.fn(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('CategorySpendingSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(categoriesClient.getSpending).mockResolvedValue(mockSpendingData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Spending by Category')).toBeInTheDocument();
      });
    });

    it('should render with custom className', async () => {
      const { container } = render(
        <CategorySpendingSummary {...getProps()} className="custom-class" />
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should render date range selector buttons', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'This Month' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Last Month' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Last 3 Months' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
      });
    });

    it('should have This Month selected by default', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        const thisMonthButton = screen.getByRole('button', { name: 'This Month' });
        expect(thisMonthButton).toHaveClass('bg-blue-100');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      vi.mocked(categoriesClient.getSpending).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSpendingData), 1000))
      );

      render(<CategorySpendingSummary {...getProps()} />);

      // Loading spinner should be visible
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should hide loading spinner after data is loaded', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display category names in legend', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Food & Dining')).toBeInTheDocument();
        expect(screen.getByText('Transportation')).toBeInTheDocument();
        expect(screen.getByText('Entertainment')).toBeInTheDocument();
      });
    });

    it('should display transaction counts', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('25 transactions')).toBeInTheDocument();
        expect(screen.getByText('15 transactions')).toBeInTheDocument();
        expect(screen.getByText('10 transactions')).toBeInTheDocument();
      });
    });

    it('should display spending amounts', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('$500.00')).toBeInTheDocument();
        expect(screen.getByText('$300.00')).toBeInTheDocument();
        expect(screen.getByText('$200.00')).toBeInTheDocument();
      });
    });

    it('should display percentage for each category', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('50.0%')).toBeInTheDocument();
        expect(screen.getByText('30.0%')).toBeInTheDocument();
        expect(screen.getByText('20.0%')).toBeInTheDocument();
      });
    });

    it('should display total amount in donut center', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('$1,000.00')).toBeInTheDocument();
        expect(screen.getByText('Total')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no data', async () => {
      vi.mocked(categoriesClient.getSpending).mockResolvedValue(emptySpendingData);

      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('No spending data')).toBeInTheDocument();
        expect(
          screen.getByText('No transactions found for this period')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      vi.mocked(categoriesClient.getSpending).mockRejectedValue(
        new Error('Failed to fetch')
      );

      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
      });
    });

    it('should show default error for non-Error exceptions', async () => {
      vi.mocked(categoriesClient.getSpending).mockRejectedValue('Unknown error');

      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load spending data')).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Selection', () => {
    it('should switch to Last Month when clicked', async () => {
      const { user } = render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Spending by Category')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Last Month' }));

      // Button should be highlighted
      const lastMonthButton = screen.getByRole('button', { name: 'Last Month' });
      expect(lastMonthButton).toHaveClass('bg-blue-100');
    });

    it('should switch to Last 3 Months when clicked', async () => {
      const { user } = render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Spending by Category')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Last 3 Months' }));

      const last3MonthsButton = screen.getByRole('button', { name: 'Last 3 Months' });
      expect(last3MonthsButton).toHaveClass('bg-blue-100');
    });

    it('should show custom date inputs when Custom is selected', async () => {
      const { user } = render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Spending by Category')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Custom' }));

      // Date inputs are shown with labels as text
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('should hide custom date inputs when switching away from Custom', async () => {
      const { user } = render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(screen.getByText('Spending by Category')).toBeInTheDocument();
      });

      // Select Custom
      await user.click(screen.getByRole('button', { name: 'Custom' }));
      expect(screen.getByText('From')).toBeInTheDocument();

      // Switch back to This Month
      await user.click(screen.getByRole('button', { name: 'This Month' }));
      expect(screen.queryByText('From')).not.toBeInTheDocument();
    });

    it('should refetch data when date range changes', async () => {
      const { user } = render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(categoriesClient.getSpending).toHaveBeenCalledTimes(1);
      });

      await user.click(screen.getByRole('button', { name: 'Last Month' }));

      await waitFor(() => {
        expect(categoriesClient.getSpending).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Category Click', () => {
    it('should call onCategoryClick when legend item is clicked', async () => {
      const onCategoryClick = vi.fn();
      const { user } = render(
        <CategorySpendingSummary {...getProps({ onCategoryClick })} />
      );

      await waitFor(() => {
        expect(screen.getByText('Food & Dining')).toBeInTheDocument();
      });

      // Click on the category in legend
      const foodItem = screen.getByText('Food & Dining').closest('button');
      if (foodItem) {
        await user.click(foodItem);
      }

      expect(onCategoryClick).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('Donut Chart', () => {
    it('should render SVG for donut chart', async () => {
      const { container } = render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should render path elements for each category', async () => {
      const { container } = render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        // The donut chart SVG contains path elements for each category
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        // The chart renders segments with stroke="white" attribute
        const segments = container.querySelectorAll('svg path[stroke="white"]');
        expect(segments.length).toBe(mockSpendingData.categories.length);
      });
    });

    it('should show No spending data in chart when total is 0', async () => {
      vi.mocked(categoriesClient.getSpending).mockResolvedValue({
        ...mockSpendingData,
        categories: mockSpendingData.categories.map((c) => ({
          ...c,
          totalAmount: 0,
        })),
        totalSpending: 0,
      });

      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        // Should show the empty donut state
        expect(screen.getAllByText('No spending data').length).toBeGreaterThan(0);
      });
    });
  });

  describe('API Integration', () => {
    it('should call getSpending with correct parameters', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(categoriesClient.getSpending).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          true
        );
      });
    });

    it('should pass date strings in YYYY-MM-DD format', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        const calls = vi.mocked(categoriesClient.getSpending).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [startDate, endDate] = calls[0];
        expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Initial Date Props', () => {
    it('should use startDate prop when provided', async () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      render(
        <CategorySpendingSummary
          {...getProps()}
          startDate={startDate}
          endDate={endDate}
        />
      );

      await waitFor(() => {
        expect(categoriesClient.getSpending).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Spending by Category' })
        ).toBeInTheDocument();
      });
    });

    it('should have accessible buttons for date selection', async () => {
      render(<CategorySpendingSummary {...getProps()} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // Date range buttons + category legend buttons
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });
});
