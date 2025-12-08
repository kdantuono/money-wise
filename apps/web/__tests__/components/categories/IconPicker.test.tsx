/**
 * IconPicker Component Tests
 *
 * TDD tests for the IconPicker component.
 * Tests cover rendering, selection, search, and accessibility.
 *
 * @module __tests__/components/categories/IconPicker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../utils/test-utils';
import { IconPicker, CATEGORY_ICONS } from '@/components/categories/IconPicker';

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps = {
  value: undefined as string | undefined,
  onChange: vi.fn(),
};

const getProps = (overrides: Partial<typeof defaultProps> = {}) => ({
  ...defaultProps,
  onChange: vi.fn(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('IconPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the icon grid', () => {
      render(<IconPicker {...getProps()} />);

      // Should render icon buttons
      const iconButtons = screen.getAllByRole('option');
      expect(iconButtons.length).toBeGreaterThan(0);
    });

    it('should render all curated icons', () => {
      render(<IconPicker {...getProps()} />);

      const iconButtons = screen.getAllByRole('option');
      expect(iconButtons.length).toBe(CATEGORY_ICONS.length);
    });

    it('should render search input', () => {
      render(<IconPicker {...getProps()} />);

      const searchInput = screen.getByPlaceholderText('Search icons...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <IconPicker {...getProps()} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should display selected icon preview when value is set', () => {
      render(<IconPicker {...getProps({ value: 'Wallet' })} />);

      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      expect(screen.getByText('Wallet')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onChange when icon is clicked', async () => {
      const onChange = vi.fn();
      const { user } = render(<IconPicker {...getProps({ onChange })} />);

      const iconButtons = screen.getAllByRole('option');
      await user.click(iconButtons[0]);

      expect(onChange).toHaveBeenCalledWith(CATEGORY_ICONS[0]);
    });

    it('should highlight selected icon', () => {
      render(<IconPicker {...getProps({ value: 'Wallet' })} />);

      const selectedButton = screen.getByRole('option', { selected: true });
      expect(selectedButton).toHaveAttribute('title', 'Wallet');
    });

    it('should show checkmark on selected icon', () => {
      render(<IconPicker {...getProps({ value: 'Wallet' })} />);

      const selectedButton = screen.getByRole('option', { selected: true });
      expect(selectedButton.querySelector('span')).toBeInTheDocument();
    });

    it('should not call onChange when disabled', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <IconPicker {...getProps({ onChange })} disabled />
      );

      const iconButtons = screen.getAllByRole('option');
      await user.click(iconButtons[0]);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Search/Filter', () => {
    it('should filter icons based on search query', async () => {
      const { user } = render(<IconPicker {...getProps()} />);

      const searchInput = screen.getByPlaceholderText('Search icons...');
      await user.type(searchInput, 'wallet');

      const visibleIcons = screen.getAllByRole('option');
      expect(visibleIcons.length).toBeLessThan(CATEGORY_ICONS.length);
    });

    it('should show "No icons found" when search has no results', async () => {
      const { user } = render(<IconPicker {...getProps()} />);

      const searchInput = screen.getByPlaceholderText('Search icons...');
      await user.type(searchInput, 'xyznonexistent');

      expect(screen.getByText('No icons found')).toBeInTheDocument();
    });

    it('should clear filter when search is emptied', async () => {
      const { user } = render(<IconPicker {...getProps()} />);

      const searchInput = screen.getByPlaceholderText('Search icons...');
      await user.type(searchInput, 'wallet');
      await user.clear(searchInput);

      const iconButtons = screen.getAllByRole('option');
      expect(iconButtons.length).toBe(CATEGORY_ICONS.length);
    });

    it('should be case-insensitive', async () => {
      const { user } = render(<IconPicker {...getProps()} />);

      const searchInput = screen.getByPlaceholderText('Search icons...');
      await user.type(searchInput, 'WALLET');

      const visibleIcons = screen.getAllByRole('option');
      expect(visibleIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on search input', () => {
      render(<IconPicker {...getProps()} />);

      const searchInput = screen.getByLabelText('Search icons');
      expect(searchInput).toBeInTheDocument();
    });

    it('should have proper listbox role on icon grid', () => {
      render(<IconPicker {...getProps()} />);

      const listbox = screen.getByRole('listbox', { name: 'Available icons' });
      expect(listbox).toBeInTheDocument();
    });

    it('should show icon name on hover (title attribute)', () => {
      render(<IconPicker {...getProps()} />);

      const iconButtons = screen.getAllByRole('option');
      expect(iconButtons[0]).toHaveAttribute('title');
    });

    it('should be keyboard navigable', async () => {
      const onChange = vi.fn();
      const { user } = render(<IconPicker {...getProps({ onChange })} />);

      const iconButtons = screen.getAllByRole('option');
      iconButtons[0].focus();

      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled styling', () => {
      render(<IconPicker {...getProps()} disabled />);

      const iconButtons = screen.getAllByRole('option');
      expect(iconButtons[0]).toBeDisabled();
    });

    it('should disable search input when disabled', () => {
      render(<IconPicker {...getProps()} disabled />);

      const searchInput = screen.getByPlaceholderText('Search icons...');
      expect(searchInput).toBeDisabled();
    });
  });

  describe('Icon Constants', () => {
    it('should export CATEGORY_ICONS array', () => {
      expect(CATEGORY_ICONS).toBeDefined();
      expect(Array.isArray(CATEGORY_ICONS)).toBe(true);
    });

    it('should have at least 40 icons', () => {
      expect(CATEGORY_ICONS.length).toBeGreaterThanOrEqual(40);
    });

    it('should include common finance icons', () => {
      expect(CATEGORY_ICONS).toContain('Wallet');
      expect(CATEGORY_ICONS).toContain('CreditCard');
      expect(CATEGORY_ICONS).toContain('ShoppingCart');
    });
  });
});
