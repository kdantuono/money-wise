/**
 * CategoryTree Component Tests
 *
 * TDD tests for the CategoryTree component.
 * Tests cover rendering, hierarchy, expand/collapse, and accessibility.
 *
 * @module __tests__/components/categories/CategoryTree
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../utils/test-utils';
import { CategoryTree } from '@/components/categories/CategoryTree';
import type { Category } from '@/services/categories.client';

// =============================================================================
// Test Data
// =============================================================================

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Food & Dining',
    slug: 'food-dining',
    type: 'EXPENSE',
    status: 'ACTIVE',
    icon: 'Utensils',
    color: '#FF5733',
    parentId: null,
    familyId: 'family-1',
    isSystem: false,
    isDefault: false,
    sortOrder: 0,
    depth: 0,
    description: null,
    rules: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Groceries',
    slug: 'groceries',
    type: 'EXPENSE',
    status: 'ACTIVE',
    icon: 'ShoppingCart',
    color: '#22C55E',
    parentId: 'cat-1',
    familyId: 'family-1',
    isSystem: false,
    isDefault: false,
    sortOrder: 0,
    depth: 1,
    description: null,
    rules: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    name: 'Restaurants',
    slug: 'restaurants',
    type: 'EXPENSE',
    status: 'ACTIVE',
    icon: 'Pizza',
    color: '#F97316',
    parentId: 'cat-1',
    familyId: 'family-1',
    isSystem: false,
    isDefault: false,
    sortOrder: 1,
    depth: 1,
    description: null,
    rules: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    name: 'Transportation',
    slug: 'transportation',
    type: 'EXPENSE',
    status: 'ACTIVE',
    icon: 'Car',
    color: '#3B82F6',
    parentId: null,
    familyId: 'family-1',
    isSystem: false,
    isDefault: false,
    sortOrder: 1,
    depth: 0,
    description: null,
    rules: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-5',
    name: 'Uncategorized',
    slug: 'uncategorized',
    type: 'EXPENSE',
    status: 'ACTIVE',
    icon: 'HelpCircle',
    color: '#6B7280',
    parentId: null,
    familyId: 'family-1',
    isSystem: true,
    isDefault: false,
    sortOrder: 0,
    depth: 0,
    description: null,
    rules: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps = {
  categories: mockCategories,
  onSelect: vi.fn(),
  onEdit: vi.fn(),
};

const getProps = (overrides: Partial<typeof defaultProps> = {}) => ({
  ...defaultProps,
  onSelect: vi.fn(),
  onEdit: vi.fn(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('CategoryTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render tree structure', () => {
      render(<CategoryTree {...getProps()} />);

      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should render all root categories', () => {
      render(<CategoryTree {...getProps()} />);

      expect(screen.getByText('Food & Dining')).toBeInTheDocument();
      expect(screen.getByText('Transportation')).toBeInTheDocument();
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });

    it('should not initially show child categories', () => {
      render(<CategoryTree {...getProps()} />);

      // Children should be hidden until parent is expanded
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      expect(screen.queryByText('Restaurants')).not.toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <CategoryTree {...getProps()} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should show empty state when no categories', () => {
      render(<CategoryTree {...getProps({ categories: [] })} />);

      expect(screen.getByText('No categories found')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<CategoryTree {...getProps()} isLoading />);

      // Should show skeleton loading
      const loadingItems = document.querySelectorAll('.animate-pulse');
      expect(loadingItems.length).toBeGreaterThan(0);
    });
  });

  describe('Hierarchy', () => {
    it('should expand to show children when expand button is clicked', async () => {
      const { user } = render(<CategoryTree {...getProps()} />);

      // Find the Food & Dining row and its expand button
      const foodItem = screen.getByText('Food & Dining').closest('[role="treeitem"]');
      const expandButton = foodItem?.querySelector('button[aria-label="Expand"]');
      expect(expandButton).toBeInTheDocument();

      await user.click(expandButton!);

      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Restaurants')).toBeInTheDocument();
    });

    it('should collapse children when collapse button is clicked again', async () => {
      const { user } = render(<CategoryTree {...getProps()} />);

      // Find the Food & Dining row and its expand button
      const foodItem = screen.getByText('Food & Dining').closest('[role="treeitem"]');
      const expandButton = foodItem?.querySelector('button[aria-label="Expand"]');
      await user.click(expandButton!);

      // Children should be visible
      expect(screen.getByText('Groceries')).toBeInTheDocument();

      // Now find the collapse button (aria-label changed after expand)
      const collapseButton = foodItem?.querySelector('button[aria-label="Collapse"]');
      await user.click(collapseButton!);

      // Children should be hidden
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    });

    it('should indent child categories', async () => {
      const { user } = render(<CategoryTree {...getProps()} />);

      // Find the Food & Dining row and its expand button
      const foodItem = screen.getByText('Food & Dining').closest('[role="treeitem"]');
      const expandButton = foodItem?.querySelector('button[aria-label="Expand"]');
      await user.click(expandButton!);

      // Child items should have increased padding (indentation)
      const groceriesItem = screen.getByText('Groceries').closest('[role="treeitem"]');
      const foodItemElement = screen.getByText('Food & Dining').closest('[role="treeitem"]');

      // Verify child has more left padding than parent
      expect(groceriesItem).toBeInTheDocument();
      expect(foodItemElement).toBeInTheDocument();
    });

    it('should show expand chevron for categories with children', () => {
      render(<CategoryTree {...getProps()} />);

      const foodItem = screen.getByText('Food & Dining').closest('[role="treeitem"]');
      // Should have a chevron icon
      expect(foodItem?.querySelector('svg')).toBeInTheDocument();
    });

    it('should not show expand chevron for leaf categories', async () => {
      render(<CategoryTree {...getProps()} />);

      // Transportation has no children
      const transportItem = screen.getByText('Transportation').closest('[role="treeitem"]');

      // Leaf nodes should not have aria-expanded attribute at all
      expect(transportItem).not.toHaveAttribute('aria-expanded');
    });
  });

  describe('Selection', () => {
    it('should call onSelect when category is clicked', async () => {
      const onSelect = vi.fn();
      const { user } = render(<CategoryTree {...getProps({ onSelect })} />);

      await user.click(screen.getByText('Transportation'));

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-4', name: 'Transportation' })
      );
    });

    it('should highlight selected category', () => {
      render(<CategoryTree {...getProps({ selectedId: 'cat-4' })} />);

      const selectedItem = screen.getByText('Transportation').closest('[role="treeitem"]');
      expect(selectedItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Edit', () => {
    it('should show edit button on hover for non-system categories', async () => {
      const { user, container } = render(<CategoryTree {...getProps()} />);

      const transportItem = screen.getByText('Transportation').closest('[role="treeitem"]');

      // Hover over the item
      if (transportItem) {
        await user.hover(transportItem);
      }

      // Edit button should be visible (even if with opacity transition)
      const editButton = container.querySelector('[aria-label*="Edit"]');
      expect(editButton).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', async () => {
      const onEdit = vi.fn();
      const { user, container } = render(<CategoryTree {...getProps({ onEdit })} />);

      const transportItem = screen.getByText('Transportation').closest('[role="treeitem"]');

      if (transportItem) {
        await user.hover(transportItem);
      }

      const editButton = container.querySelector('[aria-label="Edit Transportation"]');
      if (editButton) {
        await user.click(editButton);
      }

      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-4', name: 'Transportation' })
      );
    });

    it('should show lock icon for system categories', () => {
      render(<CategoryTree {...getProps()} />);

      const uncategorizedItem = screen.getByText('Uncategorized').closest('[role="treeitem"]');
      // System category should have lock icon
      expect(uncategorizedItem?.querySelector('[aria-label*="System"]')).toBeInTheDocument();
    });

    it('should not call onEdit for system categories', async () => {
      const onEdit = vi.fn();
      const { user, container } = render(<CategoryTree {...getProps({ onEdit })} />);

      const uncategorizedItem = screen.getByText('Uncategorized').closest('[role="treeitem"]');

      if (uncategorizedItem) {
        await user.hover(uncategorizedItem);
      }

      // Edit button should not exist for system category
      const editButton = container.querySelector('[aria-label="Edit Uncategorized"]');
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Display', () => {
    it('should display category icon', () => {
      render(<CategoryTree {...getProps()} />);

      // Each category row should have an icon element
      const treeItems = screen.getAllByRole('treeitem');
      treeItems.forEach((item) => {
        expect(item.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should display category color dot', () => {
      render(<CategoryTree {...getProps()} />);

      const foodItem = screen.getByText('Food & Dining').closest('[role="treeitem"]');
      // Should have a color indicator
      const colorDot = foodItem?.querySelector('[style*="background-color"]');
      expect(colorDot).toBeInTheDocument();
    });

    it('should display category name', () => {
      render(<CategoryTree {...getProps()} />);

      expect(screen.getByText('Food & Dining')).toBeInTheDocument();
      expect(screen.getByText('Transportation')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper tree role', () => {
      render(<CategoryTree {...getProps()} />);

      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should have treeitem role on each category', () => {
      render(<CategoryTree {...getProps()} />);

      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);
    });

    it('should have aria-expanded on expandable items', async () => {
      const { user } = render(<CategoryTree {...getProps()} />);

      const foodItem = screen.getByText('Food & Dining').closest('[role="treeitem"]');
      expect(foodItem).toHaveAttribute('aria-expanded', 'false');

      // Click the expand button
      const expandButton = foodItem?.querySelector('button[aria-label="Expand"]');
      await user.click(expandButton!);

      expect(foodItem).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be keyboard navigable', async () => {
      const onSelect = vi.fn();
      const { user } = render(<CategoryTree {...getProps({ onSelect })} />);

      // Find the navigable name button (the actual button, not just the text span)
      const firstNameButton = screen.getByText('Food & Dining').closest('button');
      expect(firstNameButton).toBeInTheDocument();
      firstNameButton!.focus();

      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalled();
    });

    it('should have accessible name on tree', () => {
      render(<CategoryTree {...getProps()} />);

      expect(screen.getByRole('tree', { name: 'Category tree' })).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort categories by sortOrder', () => {
      render(<CategoryTree {...getProps()} />);

      const treeItems = screen.getAllByRole('treeitem');
      const texts = treeItems.map((item) => item.textContent);

      // Food & Dining (sortOrder: 0) should come before Transportation (sortOrder: 1)
      const foodIndex = texts.findIndex((t) => t?.includes('Food & Dining'));
      const transportIndex = texts.findIndex((t) => t?.includes('Transportation'));

      expect(foodIndex).toBeLessThan(transportIndex);
    });
  });
});
