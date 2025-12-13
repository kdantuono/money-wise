/**
 * BulkActionsBar Component Tests
 *
 * TDD tests for the BulkActionsBar component.
 * Tests rendering, actions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { BulkActionsBar } from '@/components/transactions/BulkActionsBar';

// =============================================================================
// Test Suite
// =============================================================================

describe('BulkActionsBar', () => {
  const mockOnCategorize = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClearSelection = vi.fn();
  const mockOnSelectAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderBar = (
    props: Partial<{
      selectedCount: number;
      totalCount: number;
      isAllSelected: boolean;
      isProcessing: boolean;
    }> = {}
  ) => {
    return render(
      <BulkActionsBar
        selectedCount={props.selectedCount ?? 3}
        totalCount={props.totalCount ?? 10}
        isAllSelected={props.isAllSelected ?? false}
        isProcessing={props.isProcessing ?? false}
        onCategorize={mockOnCategorize}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
        onSelectAll={mockOnSelectAll}
      />
    );
  };

  // ===========================================================================
  // Visibility Tests
  // ===========================================================================

  describe('Visibility', () => {
    it('should render when items are selected', () => {
      renderBar({ selectedCount: 3 });
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('should not render when no items are selected', () => {
      renderBar({ selectedCount: 0 });
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Selection Display Tests
  // ===========================================================================

  describe('Selection Display', () => {
    it('should display the number of selected items', () => {
      renderBar({ selectedCount: 5 });
      expect(screen.getByText(/5.*selected/i)).toBeInTheDocument();
    });

    it('should display singular "item" for 1 selected', () => {
      renderBar({ selectedCount: 1 });
      expect(screen.getByText(/1.*item.*selected/i)).toBeInTheDocument();
    });

    it('should display plural "items" for multiple selected', () => {
      renderBar({ selectedCount: 3 });
      expect(screen.getByText(/3.*items.*selected/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Select All / Deselect All Tests
  // ===========================================================================

  describe('Select All / Deselect All', () => {
    it('should show "Select All" button when not all selected', () => {
      renderBar({ selectedCount: 3, totalCount: 10, isAllSelected: false });
      expect(
        screen.getByRole('button', { name: /select all/i })
      ).toBeInTheDocument();
    });

    it('should show "Deselect All" button when all selected', () => {
      renderBar({ selectedCount: 10, totalCount: 10, isAllSelected: true });
      expect(
        screen.getByRole('button', { name: /deselect all/i })
      ).toBeInTheDocument();
    });

    it('should call onSelectAll when "Select All" is clicked', async () => {
      const { user } = renderBar({ isAllSelected: false });
      await user.click(screen.getByRole('button', { name: /select all/i }));
      expect(mockOnSelectAll).toHaveBeenCalled();
    });

    it('should call onClearSelection when "Deselect All" is clicked', async () => {
      const { user } = renderBar({ isAllSelected: true, selectedCount: 10, totalCount: 10 });
      await user.click(screen.getByRole('button', { name: /deselect all/i }));
      expect(mockOnClearSelection).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Action Button Tests
  // ===========================================================================

  describe('Action Buttons', () => {
    it('should render categorize button', () => {
      renderBar();
      expect(
        screen.getByRole('button', { name: /categorize/i })
      ).toBeInTheDocument();
    });

    it('should render delete button', () => {
      renderBar();
      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('should call onCategorize when categorize button is clicked', async () => {
      const { user } = renderBar();
      await user.click(screen.getByRole('button', { name: /categorize/i }));
      expect(mockOnCategorize).toHaveBeenCalled();
    });

    it('should call onDelete when delete button is clicked', async () => {
      const { user } = renderBar();
      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(mockOnDelete).toHaveBeenCalled();
    });

    it('should show clear selection button', () => {
      renderBar();
      expect(
        screen.getByRole('button', { name: /clear.*selection|cancel/i })
      ).toBeInTheDocument();
    });

    it('should call onClearSelection when clear button is clicked', async () => {
      const { user } = renderBar();
      await user.click(
        screen.getByRole('button', { name: /clear.*selection|cancel/i })
      );
      expect(mockOnClearSelection).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Processing State Tests
  // ===========================================================================

  describe('Processing State', () => {
    it('should disable all action buttons while processing', () => {
      renderBar({ isProcessing: true });
      expect(
        screen.getByRole('button', { name: /categorize/i })
      ).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('should show loading indicator while processing', () => {
      renderBar({ isProcessing: true });
      expect(screen.getByTestId('processing-spinner')).toBeInTheDocument();
    });

    it('should show processing text', () => {
      renderBar({ isProcessing: true });
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have toolbar role', () => {
      renderBar();
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('should have accessible label for toolbar', () => {
      renderBar();
      expect(
        screen.getByRole('toolbar', { name: /bulk actions/i })
      ).toBeInTheDocument();
    });

    it('should announce selected count to screen readers', () => {
      renderBar({ selectedCount: 5 });
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/5.*selected/i);
    });
  });

  // ===========================================================================
  // Styling Tests
  // ===========================================================================

  describe('Styling', () => {
    it('should have fixed positioning at bottom', () => {
      renderBar();
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveClass('fixed');
      expect(toolbar).toHaveClass('bottom-0');
    });

    it('should have shadow for elevation', () => {
      renderBar();
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar.className).toMatch(/shadow/);
    });
  });
});
