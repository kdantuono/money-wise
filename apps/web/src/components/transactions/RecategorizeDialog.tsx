'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { CategorySelector } from './CategorySelector';
import type { CategoryOption } from '@/services/categories.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface RecategorizeDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** IDs of transactions to recategorize */
  transactionIds: string[];
  /** Available categories for selection */
  categories: CategoryOption[];
  /** Callback when user confirms with selected category */
  onConfirm: (categoryId: string) => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether the operation is in progress */
  isProcessing?: boolean;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * RecategorizeDialog Component
 *
 * Modal dialog for bulk categorization of transactions.
 * Allows users to select a category and apply it to multiple transactions.
 *
 * Features:
 * - Category selector with search
 * - Transaction count display
 * - Loading state during processing
 * - Keyboard navigation (Escape to close)
 * - Focus trapping for accessibility
 */
export function RecategorizeDialog({
  isOpen,
  transactionIds,
  categories,
  onConfirm,
  onCancel,
  isProcessing = false,
}: RecategorizeDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const transactionCount = transactionIds.length;
  const isApplyDisabled = !selectedCategoryId || isProcessing;

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategoryId(undefined);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleTabKey);
    return () => dialog.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Handle apply
  const handleApply = useCallback(() => {
    if (selectedCategoryId) {
      onConfirm(selectedCategoryId);
    }
  }, [selectedCategoryId, onConfirm]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={!isProcessing ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recategorize-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
          w-full max-w-md bg-white rounded-xl shadow-xl p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="recategorize-title" className="text-lg font-semibold text-gray-900">
            Categorize {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
          </h2>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Selector */}
        <div className="mb-6">
          <CategorySelector
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            categories={categories}
            label="Category"
            placeholder="Select a category"
            searchable
            disabled={isProcessing}
          />
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 mb-4 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" data-testid="processing-spinner" />
            <span>Updating transactions...</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplyDisabled}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

export default RecategorizeDialog;
