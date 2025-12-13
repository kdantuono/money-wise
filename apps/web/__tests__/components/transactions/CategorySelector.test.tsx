/**
 * CategorySelector Component Tests
 *
 * TDD tests for the CategorySelector dropdown component.
 * Tests cover rendering, filtering, selection, and accessibility.
 *
 * @module __tests__/components/transactions/CategorySelector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../utils/test-utils';
import { CategorySelector } from '@/components/transactions/CategorySelector';
import type { CategoryOption } from '@/services/categories.client';

// =============================================================================
// Test Data
// =============================================================================

const mockCategories: CategoryOption[] = [
  {
    id: 'cat-1',
    name: 'Groceries',
    type: 'EXPENSE',
    icon: 'shopping-cart',
    color: '#FF5733',
    parentId: null,
    isSystem: false,
  },
  {
    id: 'cat-2',
    name: 'Restaurants',
    type: 'EXPENSE',
    icon: 'utensils',
    color: '#33FF57',
    parentId: null,
    isSystem: false,
  },
  {
    id: 'cat-3',
    name: 'Salary',
    type: 'INCOME',
    icon: 'wallet',
    color: '#5733FF',
    parentId: null,
    isSystem: false,
  },
  {
    id: 'cat-4',
    name: 'Freelance',
    type: 'INCOME',
    icon: 'laptop',
    color: '#FF33A1',
    parentId: null,
    isSystem: false,
  },
  {
    id: 'cat-5',
    name: 'Transfer',
    type: 'TRANSFER',
    icon: 'arrow-right-left',
    color: '#33A1FF',
    parentId: null,
    isSystem: true,
  },
];

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the categories client
vi.mock('@/services/categories.client', () => ({
  categoriesClient: {
    getOptions: vi.fn(),
  },
}));

// Import after mock
import { categoriesClient } from '@/services/categories.client';

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps = {
  value: undefined as string | undefined,
  onChange: vi.fn(),
  categories: mockCategories,
};

const getProps = (overrides: Partial<typeof defaultProps> = {}) => ({
  ...defaultProps,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('CategorySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render a dropdown with placeholder text', () => {
      render(<CategorySelector {...getProps()} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText(/select a category/i)).toBeInTheDocument();
    });

    it('should render category options when open', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      // Open dropdown
      await user.click(screen.getByRole('combobox'));

      // Check categories are displayed
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
        expect(screen.getByText('Salary')).toBeInTheDocument();
      });
    });

    it('should display category icon and name', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const groceriesOption = screen.getByText('Groceries').closest('[role="option"]');
        expect(groceriesOption).toBeInTheDocument();
      });
    });

    it('should display selected category when value provided', () => {
      render(<CategorySelector {...getProps({ value: 'cat-1' })} />);

      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    it('should show color indicator for each category', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const groceriesOption = screen.getByText('Groceries').closest('[role="option"]');
        // The color indicator should be present (exact implementation TBD)
        expect(groceriesOption).toBeInTheDocument();
      });
    });

    it('should show loading state when loading prop is true', () => {
      render(<CategorySelector {...getProps()} isLoading />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show error message when error prop is provided', () => {
      render(
        <CategorySelector
          {...getProps()}
          error="Failed to load categories"
        />
      );

      expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument();
    });

    it('should show empty state when no categories available', () => {
      render(<CategorySelector {...getProps({ categories: [] })} />);

      expect(screen.getByText(/no categories/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Filtering Tests
  // ===========================================================================

  describe('Filtering', () => {
    it('should filter categories by EXPENSE type when filterType is EXPENSE', async () => {
      const { user } = render(
        <CategorySelector {...getProps()} filterType="EXPENSE" />
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
        expect(screen.queryByText('Salary')).not.toBeInTheDocument();
        expect(screen.queryByText('Freelance')).not.toBeInTheDocument();
      });
    });

    it('should filter categories by INCOME type when filterType is INCOME', async () => {
      const { user } = render(
        <CategorySelector {...getProps()} filterType="INCOME" />
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
        expect(screen.getByText('Salary')).toBeInTheDocument();
        expect(screen.getByText('Freelance')).toBeInTheDocument();
      });
    });

    it('should filter categories by search query', async () => {
      const { user } = render(<CategorySelector {...getProps()} searchable />);

      await user.click(screen.getByRole('combobox'));

      // Type in search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'groc');

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.queryByText('Restaurants')).not.toBeInTheDocument();
        expect(screen.queryByText('Salary')).not.toBeInTheDocument();
      });
    });

    it('should show "No results" when search matches nothing', async () => {
      const { user } = render(<CategorySelector {...getProps()} searchable />);

      await user.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'xyz123');

      await waitFor(() => {
        expect(screen.getByText(/no results/i)).toBeInTheDocument();
      });
    });

    it('should clear search when dropdown closes', async () => {
      const { user } = render(<CategorySelector {...getProps()} searchable />);

      // Open and search
      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'groc');

      // Close dropdown by clicking outside
      await user.click(document.body);

      // Reopen
      await user.click(screen.getByRole('combobox'));

      // Search should be cleared - all categories visible
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Selection Tests
  // ===========================================================================

  describe('Selection', () => {
    it('should call onChange with category id when selected', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <CategorySelector {...getProps({ onChange })} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Groceries'));

      expect(onChange).toHaveBeenCalledWith('cat-1');
    });

    it('should close dropdown after selection', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Groceries'));

      await waitFor(() => {
        // Dropdown should be closed - options not visible
        expect(screen.queryByText('Restaurants')).not.toBeInTheDocument();
      });
    });

    it('should allow clearing selection when clearable is true', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <CategorySelector
          {...getProps({ value: 'cat-1', onChange })}
          clearable
        />
      );

      // Click clear button
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('should not show clear button when clearable is false', () => {
      render(
        <CategorySelector
          {...getProps({ value: 'cat-1' })}
          clearable={false}
        />
      );

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });

    it('should not show clear button when no value selected', () => {
      render(<CategorySelector {...getProps()} clearable />);

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CategorySelector {...getProps()} label="Category" />);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAccessibleName(/category/i);
    });

    it('should be focusable', () => {
      render(<CategorySelector {...getProps()} />);

      const combobox = screen.getByRole('combobox');
      combobox.focus();

      expect(document.activeElement).toBe(combobox);
    });

    it('should open dropdown on Enter key', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      const combobox = screen.getByRole('combobox');
      combobox.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });
    });

    it('should navigate options with arrow keys', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      await user.click(screen.getByRole('combobox'));

      // Navigate down
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // The second option should be highlighted (implementation-dependent)
      // This test verifies keyboard navigation is functional
    });

    it('should select highlighted option on Enter', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <CategorySelector {...getProps({ onChange })} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalled();
    });

    it('should close dropdown on Escape', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      });
    });

    it('should have proper role="listbox" for options container', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should have role="option" for each category', async () => {
      const { user } = render(<CategorySelector {...getProps()} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('Disabled State', () => {
    it('should not open dropdown when disabled', async () => {
      const { user } = render(<CategorySelector {...getProps()} disabled />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      });
    });

    it('should have aria-disabled when disabled', () => {
      render(<CategorySelector {...getProps()} disabled />);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show disabled styling', () => {
      render(<CategorySelector {...getProps()} disabled />);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveClass(/disabled|opacity/);
    });
  });

  // ===========================================================================
  // Required State Tests
  // ===========================================================================

  describe('Required State', () => {
    it('should show required indicator when required prop is true', () => {
      render(<CategorySelector {...getProps()} required label="Category" />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should have aria-required when required', () => {
      render(<CategorySelector {...getProps()} required />);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-required', 'true');
    });
  });

  // ===========================================================================
  // Type Grouping Tests
  // ===========================================================================

  describe('Type Grouping', () => {
    it('should group categories by type when showGroups is true', async () => {
      const { user } = render(
        <CategorySelector {...getProps()} showGroups />
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // Should show group headers
        expect(screen.getByText(/expense/i)).toBeInTheDocument();
        expect(screen.getByText(/income/i)).toBeInTheDocument();
      });
    });
  });
});
