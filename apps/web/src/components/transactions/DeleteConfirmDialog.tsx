'use client';

import { useEffect, useCallback, memo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

// =============================================================================
// Type Definitions
// =============================================================================

export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Number of transactions to delete */
  count: number;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * DeleteConfirmDialog Component
 *
 * Confirmation dialog for deleting transactions.
 * Shows count of items to be deleted and warns about irreversibility.
 */
export const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  isOpen,
  count,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (!isDeleting) {
      onCancel();
    }
  }, [isDeleting, onCancel]);

  if (!isOpen) return null;

  const transactionText = count === 1 ? 'transazione' : 'transazioni';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-xl p-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-foreground text-center mb-2"
        >
          Eliminare {count} {transactionText}?
        </h2>

        <p className="text-sm text-muted-foreground text-center mb-6">
          Questa azione non può essere annullata. {count === 1 ? 'La transazione selezionata verrà eliminata' : 'Le transazioni selezionate verranno eliminate'} permanentemente.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 border border-border/50 rounded-xl text-foreground font-medium
              hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl font-medium
              hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
              transition-colors duration-150"
          >
            {isDeleting ? (
              <>
                <Loader2
                  data-testid="delete-spinner"
                  className="h-4 w-4 animate-spin"
                />
                Eliminazione...
              </>
            ) : (
              'Elimina'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default DeleteConfirmDialog;
