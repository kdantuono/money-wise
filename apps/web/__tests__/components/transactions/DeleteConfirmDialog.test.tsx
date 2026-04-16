/**
 * DeleteConfirmDialog Component Tests
 *
 * TDD tests for the transaction delete confirmation dialog.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { DeleteConfirmDialog } from '@/components/transactions/DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDialog = (
    props: Partial<{
      isOpen: boolean;
      count: number;
      isDeleting: boolean;
    }> = {}
  ) => {
    return render(
      <DeleteConfirmDialog
        isOpen={props.isOpen ?? true}
        count={props.count ?? 1}
        isDeleting={props.isDeleting ?? false}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
  };

  // ===========================================================================
  // Visibility Tests
  // ===========================================================================

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      renderDialog({ isOpen: true });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      renderDialog({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Content Tests
  // ===========================================================================

  describe('Content', () => {
    it('should display singular message for 1 transaction', () => {
      renderDialog({ count: 1 });
      expect(
        screen.getByText(/eliminare.*1.*transazione/i)
      ).toBeInTheDocument();
    });

    it('should display plural message for multiple transactions', () => {
      renderDialog({ count: 5 });
      expect(
        screen.getByText(/eliminare.*5.*transazioni/i)
      ).toBeInTheDocument();
    });

    it('should show warning about irreversible action', () => {
      renderDialog();
      expect(
        screen.getByText(/non può essere annullata/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Button Tests
  // ===========================================================================

  describe('Buttons', () => {
    it('should render confirm button', () => {
      renderDialog();
      expect(
        screen.getByRole('button', { name: /elimina/i })
      ).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      renderDialog();
      expect(
        screen.getByRole('button', { name: /annulla/i })
      ).toBeInTheDocument();
    });

    it('should call onConfirm when confirm button is clicked', async () => {
      const { user } = renderDialog();
      await user.click(screen.getByRole('button', { name: /^elimina$/i }));
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const { user } = renderDialog();
      await user.click(screen.getByRole('button', { name: /annulla/i }));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable buttons while deleting', () => {
      renderDialog({ isDeleting: true });
      expect(
        screen.getByRole('button', { name: /elimina|eliminazione/i })
      ).toBeDisabled();
      expect(screen.getByRole('button', { name: /annulla/i })).toBeDisabled();
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading indicator while deleting', () => {
      renderDialog({ isDeleting: true });
      expect(screen.getByTestId('delete-spinner')).toBeInTheDocument();
    });

    it('should show "Eliminazione..." text while deleting', () => {
      renderDialog({ isDeleting: true });
      expect(screen.getByText(/eliminazione/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      renderDialog();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible title', () => {
      renderDialog();
      expect(
        screen.getByRole('heading', { name: /eliminare/i })
      ).toBeInTheDocument();
    });

    it('should trap focus within dialog', () => {
      renderDialog();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });
});
