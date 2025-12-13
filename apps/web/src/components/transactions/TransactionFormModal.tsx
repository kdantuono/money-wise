'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { TransactionForm, Account } from './TransactionForm';
import type { Transaction, CreateTransactionData } from '@/services/transactions.client';
import type { CategoryOption } from '@/services/categories.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface TransactionFormModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Transaction to edit (if in edit mode) */
  transaction?: Transaction;
  /** Available accounts */
  accounts: Account[];
  /** Available categories */
  categories: CategoryOption[];
  /** Callback on successful submission */
  onSuccess?: (data: CreateTransactionData) => void;
  /** Loading state (e.g., during API call) */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * TransactionFormModal Component
 *
 * Modal wrapper for the TransactionForm component.
 * Provides overlay, close button, and keyboard handling.
 */
export function TransactionFormModal({
  isOpen,
  onClose,
  transaction,
  accounts,
  categories,
  onSuccess,
  isLoading,
  error,
}: TransactionFormModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
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

  // Handle form success
  const handleSuccess = useCallback(
    (data: CreateTransactionData) => {
      onSuccess?.(data);
      onClose();
    },
    [onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Form */}
        <div className="p-6">
          <TransactionForm
            transaction={transaction}
            accounts={accounts}
            categories={categories}
            onSuccess={handleSuccess}
            onCancel={onClose}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}

export default TransactionFormModal;
