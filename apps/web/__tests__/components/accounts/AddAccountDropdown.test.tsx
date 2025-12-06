/**
 * Tests for AddAccountDropdown component
 *
 * A unified dropdown button with two options:
 * - Manual Account: Opens ManualAccountForm modal
 * - Link Bank Account: Triggers SaltEdge OAuth flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { AddAccountDropdown } from '../../../src/components/accounts/AddAccountDropdown';

describe('AddAccountDropdown Component', () => {
  const mockOnManualAccount = vi.fn();
  const mockOnLinkBank = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the dropdown button with correct text', () => {
      render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
    });

    it('shows dropdown icon indicating expandable menu', () => {
      render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      // Should have a chevron/arrow icon
      const button = screen.getByRole('button', { name: /add account/i });
      expect(button).toBeInTheDocument();
      // Check for visual indicator (SVG or similar)
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('dropdown menu is hidden by default', () => {
      render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      // Menu items should not be visible initially
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.queryByText(/manual account/i)).not.toBeInTheDocument();
    });

    it('applies custom className to container', () => {
      const { container } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown menu when button is clicked', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      const button = screen.getByRole('button', { name: /add account/i });
      await user.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('shows two menu items: Manual Account and Link Bank Account', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));

      expect(screen.getByRole('menuitem', { name: /manual account/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /link bank account/i })).toBeInTheDocument();
    });

    it('shows descriptive text for each option', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));

      // Manual Account description
      expect(screen.getByText(/cash, portfolio, or custom account/i)).toBeInTheDocument();
      // Link Bank Account description
      expect(screen.getByText(/connect via saltedge/i)).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const { user } = render(
        <div>
          <AddAccountDropdown
            onManualAccount={mockOnManualAccount}
            onLinkBank={mockOnLinkBank}
          />
          <div data-testid="outside">Outside area</div>
        </div>
      );

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /add account/i }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click outside
      await user.click(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown when pressing Escape', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /add account/i }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('toggles dropdown when button is clicked multiple times', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      const button = screen.getByRole('button', { name: /add account/i });

      // First click - opens
      await user.click(button);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Second click - closes
      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Menu Actions', () => {
    it('calls onManualAccount when Manual Account option is clicked', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));
      await user.click(screen.getByRole('menuitem', { name: /manual account/i }));

      expect(mockOnManualAccount).toHaveBeenCalledTimes(1);
    });

    it('calls onLinkBank when Link Bank Account option is clicked', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));
      await user.click(screen.getByRole('menuitem', { name: /link bank account/i }));

      expect(mockOnLinkBank).toHaveBeenCalledTimes(1);
    });

    it('closes dropdown after selecting an option', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));
      await user.click(screen.getByRole('menuitem', { name: /manual account/i }));

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('disables dropdown button when disabled prop is true', () => {
      render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
          disabled
        />
      );

      expect(screen.getByRole('button', { name: /add account/i })).toBeDisabled();
    });

    it('does not open dropdown when button is disabled', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
          disabled
        />
      );

      const button = screen.getByRole('button', { name: /add account/i });
      await user.click(button);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLinking is true', () => {
      render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
          isLinking
        />
      );

      const button = screen.getByRole('button', { name: /add account/i });
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables button during linking', () => {
      render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
          isLinking
        />
      );

      expect(screen.getByRole('button', { name: /add account/i })).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has correct aria attributes on the button', () => {
      render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      const button = screen.getByRole('button', { name: /add account/i });
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when dropdown opens', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      const button = screen.getByRole('button', { name: /add account/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('menu items have correct role', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
    });

    it('supports keyboard navigation with arrow keys', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /add account/i }));

      // Navigate with arrow down
      await user.keyboard('{ArrowDown}');

      // First item should be focused
      const firstItem = screen.getByRole('menuitem', { name: /manual account/i });
      expect(document.activeElement).toBe(firstItem);
    });

    it('selects item with Enter key', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockOnManualAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe('Icons', () => {
    it('shows manual account icon (pencil/document)', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));

      const manualItem = screen.getByRole('menuitem', { name: /manual account/i });
      expect(manualItem.querySelector('svg')).toBeInTheDocument();
    });

    it('shows bank link icon (bank building)', async () => {
      const { user } = render(
        <AddAccountDropdown
          onManualAccount={mockOnManualAccount}
          onLinkBank={mockOnLinkBank}
        />
      );

      await user.click(screen.getByRole('button', { name: /add account/i }));

      const bankItem = screen.getByRole('menuitem', { name: /link bank account/i });
      expect(bankItem.querySelector('svg')).toBeInTheDocument();
    });
  });
});
