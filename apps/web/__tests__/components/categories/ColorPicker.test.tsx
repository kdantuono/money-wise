/**
 * ColorPicker Component Tests
 *
 * TDD tests for the ColorPicker component.
 * Tests cover rendering, selection, custom input, and accessibility.
 *
 * @module __tests__/components/categories/ColorPicker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../utils/test-utils';
import { ColorPicker, CATEGORY_COLORS } from '@/components/categories/ColorPicker';

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

describe('ColorPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the color grid', () => {
      render(<ColorPicker {...getProps()} />);

      const colorButtons = screen.getAllByRole('option');
      expect(colorButtons.length).toBe(CATEGORY_COLORS.length);
    });

    it('should render all preset colors', () => {
      render(<ColorPicker {...getProps()} />);

      const colorButtons = screen.getAllByRole('option');
      expect(colorButtons.length).toBe(CATEGORY_COLORS.length);
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ColorPicker {...getProps()} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should display selected color info when value is set', () => {
      render(<ColorPicker {...getProps({ value: '#EF4444' })} />);

      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      // Color name and hex code are displayed together
      expect(screen.getByText('Red (#EF4444)')).toBeInTheDocument();
    });

    it('should not render custom input by default', () => {
      render(<ColorPicker {...getProps()} />);

      expect(screen.queryByPlaceholderText('#FF5733')).not.toBeInTheDocument();
    });

    it('should render custom input when showCustomInput is true', () => {
      render(<ColorPicker {...getProps()} showCustomInput />);

      expect(screen.getByPlaceholderText('#FF5733')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onChange when color is clicked', async () => {
      const onChange = vi.fn();
      const { user } = render(<ColorPicker {...getProps({ onChange })} />);

      const colorButtons = screen.getAllByRole('option');
      await user.click(colorButtons[0]);

      expect(onChange).toHaveBeenCalledWith(CATEGORY_COLORS[0]);
    });

    it('should highlight selected color', () => {
      render(<ColorPicker {...getProps({ value: '#EF4444' })} />);

      const selectedButton = screen.getByRole('option', { selected: true });
      expect(selectedButton).toHaveAttribute('aria-label', 'Red');
    });

    it('should show checkmark on selected color', () => {
      render(<ColorPicker {...getProps({ value: '#EF4444' })} />);

      const selectedButton = screen.getByRole('option', { selected: true });
      expect(selectedButton.querySelector('span')).toBeInTheDocument();
    });

    it('should not call onChange when disabled', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <ColorPicker {...getProps({ onChange })} disabled />
      );

      const colorButtons = screen.getAllByRole('option');
      await user.click(colorButtons[0]);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom Input', () => {
    it('should update on valid hex input', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <ColorPicker {...getProps({ onChange })} showCustomInput />
      );

      const input = screen.getByPlaceholderText('#FF5733');
      await user.clear(input);
      await user.type(input, '#123456');

      expect(onChange).toHaveBeenCalledWith('#123456');
    });

    it('should show error for invalid hex format', async () => {
      const { user } = render(<ColorPicker {...getProps()} showCustomInput />);

      const input = screen.getByPlaceholderText('#FF5733');
      await user.clear(input);
      await user.type(input, '#GGGGGG');

      expect(screen.getByText('Invalid hex color')).toBeInTheDocument();
    });

    it('should auto-add # prefix if missing', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <ColorPicker {...getProps({ onChange })} showCustomInput />
      );

      const input = screen.getByPlaceholderText('#FF5733');
      await user.clear(input);
      await user.type(input, 'FF5733');

      // Should still work (adds # internally)
      expect(onChange).toHaveBeenCalled();
    });

    it('should have max length of 7 characters', () => {
      render(<ColorPicker {...getProps()} showCustomInput />);

      const input = screen.getByPlaceholderText('#FF5733');
      expect(input).toHaveAttribute('maxLength', '7');
    });
  });

  describe('Accessibility', () => {
    it('should have proper listbox role on color grid', () => {
      render(<ColorPicker {...getProps()} />);

      const listbox = screen.getByRole('listbox', { name: 'Available colors' });
      expect(listbox).toBeInTheDocument();
    });

    it('should have proper aria-label on color buttons', () => {
      render(<ColorPicker {...getProps()} />);

      const colorButtons = screen.getAllByRole('option');
      colorButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have color name in title attribute', () => {
      render(<ColorPicker {...getProps()} />);

      const colorButtons = screen.getAllByRole('option');
      expect(colorButtons[0]).toHaveAttribute('title', 'Red');
    });

    it('should be keyboard navigable', async () => {
      const onChange = vi.fn();
      const { user } = render(<ColorPicker {...getProps({ onChange })} />);

      const colorButtons = screen.getAllByRole('option');
      colorButtons[0].focus();

      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled styling to color buttons', () => {
      render(<ColorPicker {...getProps()} disabled />);

      const colorButtons = screen.getAllByRole('option');
      expect(colorButtons[0]).toBeDisabled();
    });

    it('should disable custom input when disabled', () => {
      render(<ColorPicker {...getProps()} disabled showCustomInput />);

      const input = screen.getByPlaceholderText('#FF5733');
      expect(input).toBeDisabled();
    });
  });

  describe('Color Constants', () => {
    it('should export CATEGORY_COLORS array', () => {
      expect(CATEGORY_COLORS).toBeDefined();
      expect(Array.isArray(CATEGORY_COLORS)).toBe(true);
    });

    it('should have 18 colors', () => {
      expect(CATEGORY_COLORS.length).toBe(18);
    });

    it('should have valid hex format for all colors', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      CATEGORY_COLORS.forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });

    it('should include primary colors', () => {
      expect(CATEGORY_COLORS).toContain('#EF4444'); // Red
      expect(CATEGORY_COLORS).toContain('#22C55E'); // Green
      expect(CATEGORY_COLORS).toContain('#3B82F6'); // Blue
    });
  });

  describe('Color Name Display', () => {
    it('should display color name for known colors', () => {
      render(<ColorPicker {...getProps({ value: '#EF4444' })} />);

      // Color name and hex code are displayed together in one span
      expect(screen.getByText('Red (#EF4444)')).toBeInTheDocument();
    });

    it('should display hex code for selected color', () => {
      render(<ColorPicker {...getProps({ value: '#EF4444' })} />);

      // Verify the selected color info is displayed
      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      expect(screen.getByText(/Red.*#EF4444/)).toBeInTheDocument();
    });
  });
});
