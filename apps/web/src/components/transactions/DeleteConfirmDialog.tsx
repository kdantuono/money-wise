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

  const transactionText = count === 1 ? 'transaction' : 'transactions';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Dialog Content */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-xl p-6">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-gray-900 text-center mb-2"
        >
          Delete {count} {transactionText}?
        </h2>

        {/* Warning Message */}
        <p className="text-sm text-gray-600 text-center mb-6">
          This action cannot be undone. The selected {transactionText} will be
          permanently removed from your account.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium
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
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default DeleteConfirmDialog;
