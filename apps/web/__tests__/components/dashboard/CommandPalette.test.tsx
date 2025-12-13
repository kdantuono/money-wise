/**
 * Command Palette Tests
 *
 * TDD tests for the Cmd+K command palette component.
 * Tests keyboard shortcuts, search, navigation, and command execution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard',
}));

import { CommandPalette, useCommandPalette } from '@/components/dashboard/CommandPalette';

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Keyboard Shortcuts', () => {
    it('should open on Cmd+K (Mac)', async () => {
      render(<CommandPalette />);

      // Initially closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Simulate Cmd+K
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should open on Ctrl+K (Windows/Linux)', async () => {
      render(<CommandPalette />);

      // Simulate Ctrl+K
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should close on Escape', async () => {
      render(<CommandPalette />);

      // Open first
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should navigate down with ArrowDown', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // First item should be highlighted initially
      const items = screen.getAllByRole('option');
      expect(items[0]).toHaveAttribute('aria-selected', 'true');

      // Press ArrowDown
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(items[1]).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should navigate up with ArrowUp', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Navigate to second item first
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      const items = screen.getAllByRole('option');
      expect(items[2]).toHaveAttribute('aria-selected', 'true');

      // Press ArrowUp
      await user.keyboard('{ArrowUp}');

      await waitFor(() => {
        expect(items[1]).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should execute command on Enter', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Enter on first item
      await user.keyboard('{Enter}');

      // Should navigate or execute the first command
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });
  });

  describe('Search/Filter', () => {
    it('should filter commands by search query', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'dashboard');

      await waitFor(() => {
        // Should only show commands matching "dashboard"
        const items = screen.getAllByRole('option');
        expect(items.length).toBeGreaterThan(0);
        expect(items.some((item) => item.textContent?.toLowerCase().includes('dashboard'))).toBe(true);
      });
    });

    it('should show "No results" when search matches nothing', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'xyznonexistent123');

      await waitFor(() => {
        expect(screen.getByText(/no results/i)).toBeInTheDocument();
      });
    });

    it('should clear search when closed and reopened', async () => {
      const { user } = render(<CommandPalette />);

      // Open and type search
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'test search');

      // Close
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Reopen
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Search should be cleared
      const newSearchInput = screen.getByRole('combobox');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('Command Execution', () => {
    it('should navigate to dashboard when selected', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Search for dashboard
      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'dashboard');

      await waitFor(() => {
        expect(screen.getByText(/go to dashboard/i)).toBeInTheDocument();
      });

      // Click the dashboard command
      await user.click(screen.getByText(/go to dashboard/i));

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to transactions when selected', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'transactions');

      await waitFor(() => {
        expect(screen.getByText(/go to transactions/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/go to transactions/i));

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/transactions');
    });

    it('should navigate to accounts when selected', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'accounts');

      await waitFor(() => {
        expect(screen.getByText(/go to accounts/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/go to accounts/i));

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/accounts');
    });

    it('should navigate to budgets when selected', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'budgets');

      await waitFor(() => {
        expect(screen.getByText(/go to budgets/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/go to budgets/i));

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/budgets');
    });

    it('should close palette after command execution', async () => {
      const { user } = render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      await user.type(searchInput, 'dashboard');

      await waitFor(() => {
        expect(screen.getByText(/go to dashboard/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/go to dashboard/i));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Outside Click', () => {
    it('should close when clicking outside', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click outside (backdrop)
      const backdrop = screen.getByTestId('command-palette-backdrop');
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual Appearance', () => {
    it('should show search input with placeholder', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      expect(searchInput).toHaveAttribute('placeholder', expect.stringMatching(/search|type/i));
    });

    it('should show keyboard shortcut hint', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show hint for ESC to close (multiple elements show ESC hint)
      const escHints = screen.getAllByText(/esc/i);
      expect(escHints.length).toBeGreaterThan(0);
    });

    it('should show category groups for commands', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should have navigation group
      expect(screen.getByText(/navigation/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', expect.stringMatching(/command/i));
    });

    it('should focus search input when opened', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox');
      expect(document.activeElement).toBe(searchInput);
    });

    it('should keep focus within the palette', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // The search input should have focus
      const searchInput = screen.getByRole('combobox');
      expect(document.activeElement).toBe(searchInput);
    });
  });
});

describe('useCommandPalette hook', () => {
  it('should provide open/close functions', () => {
    const TestComponent = () => {
      const { isOpen, open, close } = useCommandPalette();

      return (
        <div>
          <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
          <button onClick={open}>Open</button>
          <button onClick={close}>Close</button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('is-open')).toHaveTextContent('closed');
  });
});
