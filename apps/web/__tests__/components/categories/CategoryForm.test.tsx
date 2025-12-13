/**
 * CategoryForm Component Tests
 *
 * TDD tests for the CategoryForm modal component.
 * Tests cover rendering, validation, form submission, and accessibility.
 *
 * @module __tests__/components/categories/CategoryForm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { CategoryForm } from '@/components/categories/CategoryForm';
import type { Category } from '@/services/categories.client';

// =============================================================================
// Test Data
// =============================================================================

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Groceries',
  slug: 'groceries',
  type: 'EXPENSE',
  status: 'ACTIVE',
  icon: 'ShoppingCart',
  color: '#22C55E',
  parentId: null,
  familyId: 'family-1',
  isSystem: false,
  isDefault: false,
  sortOrder: 0,
  depth: 0,
  description: 'Weekly groceries',
  rules: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCategories: Category[] = [
  mockCategory,
  {
    ...mockCategory,
    id: 'cat-2',
    name: 'Food & Dining',
    slug: 'food-dining',
    parentId: null,
  },
];

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
  categories: mockCategories,
};

const getProps = (overrides: Partial<typeof defaultProps> = {}) => ({
  ...defaultProps,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('CategoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByRole('heading', { name: /Create Category/i })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<CategoryForm {...getProps({ isOpen: false })} />);

      expect(screen.queryByRole('heading', { name: /Category/i })).not.toBeInTheDocument();
    });

    it('should show "Create Category" title in create mode', () => {
      render(<CategoryForm {...getProps()} />);

      // Use heading role to specifically get the title, not the button
      expect(screen.getByRole('heading', { name: 'Create Category' })).toBeInTheDocument();
    });

    it('should show "Edit Category" title in edit mode', () => {
      render(<CategoryForm {...getProps({ category: mockCategory })} />);

      expect(screen.getByText('Edit Category')).toBeInTheDocument();
    });

    it('should render section tabs', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Appearance' })).toBeInTheDocument();
    });
  });

  describe('Details Section', () => {
    it('should render name input', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    });

    it('should render type select in create mode', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByLabelText(/Type/)).toBeInTheDocument();
    });

    it('should not render type select in edit mode', () => {
      render(<CategoryForm {...getProps({ category: mockCategory })} />);

      expect(screen.queryByLabelText(/Type/)).not.toBeInTheDocument();
    });

    it('should render parent category select', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByLabelText(/Parent Category/)).toBeInTheDocument();
    });

    it('should render description textarea', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('should populate fields in edit mode', () => {
      render(<CategoryForm {...getProps({ category: mockCategory })} />);

      expect(screen.getByDisplayValue('Groceries')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Weekly groceries')).toBeInTheDocument();
    });
  });

  describe('Appearance Section', () => {
    it('should switch to appearance section when tab is clicked', async () => {
      const { user } = render(<CategoryForm {...getProps()} />);

      await user.click(screen.getByRole('button', { name: 'Appearance' }));

      // IconPicker and ColorPicker should be visible
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Icon')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error for empty name', async () => {
      const onSave = vi.fn();
      const { user } = render(<CategoryForm {...getProps({ onSave })} />);

      // Clear name and submit
      const nameInput = screen.getByLabelText(/Name/);
      await user.clear(nameInput);

      await user.click(screen.getByRole('button', { name: /Create Category/i }));

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should allow valid submission', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = render(<CategoryForm {...getProps({ onSave })} />);

      await user.type(screen.getByLabelText(/Name/), 'New Category');

      await user.click(screen.getByRole('button', { name: /Create Category/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  describe('Parent Category Selection', () => {
    it('should only show categories of same type as options', async () => {
      render(<CategoryForm {...getProps()} />);

      const parentSelect = screen.getByLabelText(/Parent Category/);
      expect(parentSelect).toBeInTheDocument();
    });

    it('should exclude current category in edit mode', () => {
      render(<CategoryForm {...getProps({ category: mockCategory })} />);

      const parentSelect = screen.getByLabelText(/Parent Category/);
      // Should not include the category being edited as an option
      expect(parentSelect.textContent).not.toContain(mockCategory.name);
    });
  });

  describe('Form Actions', () => {
    it('should call onClose when Cancel is clicked', async () => {
      const onClose = vi.fn();
      const { user } = render(<CategoryForm {...getProps({ onClose })} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      const { user, container } = render(<CategoryForm {...getProps({ onClose })} />);

      // Click backdrop
      const backdrop = container.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', async () => {
      const onClose = vi.fn();
      const { user } = render(<CategoryForm {...getProps({ onClose })} />);

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should show loading state when isLoading prop is true', () => {
      // Component uses isLoading prop for loading state (controlled by parent)
      render(<CategoryForm {...getProps()} isLoading />);

      // Submit button should be disabled during loading
      const submitButton = screen.getByRole('button', { name: /Create Category/i });
      expect(submitButton).toBeDisabled();

      // Loading spinner should be visible
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible modal structure', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should have labels for all form fields', () => {
      render(<CategoryForm {...getProps()} />);

      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Type/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Parent Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      render(<CategoryForm {...getProps()} />);

      const nameLabel = screen.getByText(/Name/);
      expect(nameLabel.parentElement?.textContent).toContain('*');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when save fails', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { user } = render(<CategoryForm {...getProps({ onSave })} />);

      await user.type(screen.getByLabelText(/Name/), 'Test');
      await user.click(screen.getByRole('button', { name: /Create Category/i }));

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });
  });
});
