'use client';

import { memo, useCallback } from 'react';
import { Pencil, Trash2, Loader2, ArrowLeftRight, CreditCard } from 'lucide-react';
import type { Transaction } from '@/services/transactions.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface TransactionRowProps {
  /** Transaction data */
  transaction: Transaction;
  /** Callback when edit is clicked */
  onEdit: (transaction: Transaction) => void;
  /** Callback when delete is clicked */
  onDelete: (transactionId: string) => void;
  /** Callback when selection changes */
  onSelect: (transactionId: string) => void;
  /** Whether the row is selected */
  isSelected?: boolean;
  /** Whether selection checkbox is visible */
  isSelectable?: boolean;
  /** Whether the transaction is being updated */
  isUpdating?: boolean;
  /** Whether the transaction is being deleted */
  isDeleting?: boolean;
  /** Category name for display */
  categoryName?: string;
  /** Account name for display */
  accountName?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * TransactionRow Component
 *
 * Displays a single transaction with edit/delete actions and selection checkbox.
 * Memoized for performance in lists.
 */
export const TransactionRow = memo(function TransactionRow({
  transaction,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false,
  isSelectable = true,
  isUpdating = false,
  isDeleting = false,
  categoryName,
  accountName,
}: TransactionRowProps) {
  const isCredit = transaction.type === 'CREDIT';
  const isPending = transaction.status === 'PENDING' || transaction.isPending;

  // Handlers
  const handleEdit = useCallback(() => {
    onEdit(transaction);
  }, [onEdit, transaction]);

  const handleDelete = useCallback(() => {
    onDelete(transaction.id);
  }, [onDelete, transaction.id]);

  const handleSelect = useCallback(() => {
    onSelect(transaction.id);
  }, [onSelect, transaction.id]);

  // Format amount display
  const amountPrefix = isCredit ? '+' : '−';
  const formattedAmount = formatCurrency(transaction.amount, transaction.currency);
  const amountDisplay = `${amountPrefix}${formattedAmount}`;

  return (
    <article
      className={`rounded-lg border bg-white p-4 transition-all duration-150
        ${isSelected ? 'bg-blue-50 border-blue-200' : 'border-gray-200 hover:border-gray-300'}
        ${isUpdating || isDeleting ? 'opacity-75' : ''}
        hover:shadow focus-within:ring-2 focus-within:ring-blue-500`}
    >
      <div className="flex items-center gap-4">
        {/* Selection Checkbox */}
        {isSelectable && (
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelect}
              aria-label={`Select ${transaction.description}`}
              className="h-4 w-4 rounded border-gray-300 text-blue-600
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
        )}

        {/* Type Indicator */}
        <div
          data-testid="type-indicator"
          className={`w-1 h-12 rounded-full flex-shrink-0
            ${isCredit ? 'bg-green-500' : 'bg-red-500'}`}
          aria-hidden="true"
        />

        {/* Transaction Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">
              {transaction.description}
            </h3>
            {isPending && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Pending
              </span>
            )}
            {/* FlowType Badge for Transfers */}
            {transaction.flowType === 'TRANSFER' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                <ArrowLeftRight className="h-3 w-3" />
                Transfer
              </span>
            )}
            {/* FlowType Badge for Liability Payments */}
            {transaction.flowType === 'LIABILITY_PAYMENT' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                <CreditCard className="h-3 w-3" />
                Liability
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            {transaction.merchantName && (
              <span className="truncate">{transaction.merchantName}</span>
            )}
            {transaction.merchantName && (categoryName || accountName) && (
              <span className="text-gray-400">•</span>
            )}
            {categoryName ? (
              <span className="truncate">{categoryName}</span>
            ) : !transaction.categoryId ? (
              <span className="text-gray-400 italic">Uncategorized</span>
            ) : null}
            {(categoryName || !transaction.categoryId) && accountName && (
              <span className="text-gray-400">•</span>
            )}
            {accountName && (
              <span className="truncate">{accountName}</span>
            )}
          </div>

          <time className="text-xs text-gray-500 mt-1 block">
            {formatDate(transaction.date)}
          </time>
        </div>

        {/* Amount */}
        <div className="flex-shrink-0 text-right">
          <div
            className={`text-lg font-semibold ${isCredit ? 'text-green-600' : 'text-gray-900'}`}
            aria-label={`${isCredit ? 'Income' : 'Expense'}: ${formattedAmount}`}
          >
            {amountDisplay}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* Edit Button */}
          <button
            type="button"
            onClick={handleEdit}
            disabled={isUpdating || isDeleting}
            aria-label="Edit transaction"
            aria-busy={isUpdating}
            className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            {isUpdating ? (
              <Loader2
                data-testid="updating-spinner"
                className="h-4 w-4 animate-spin"
              />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isUpdating || isDeleting}
            aria-label="Delete transaction"
            aria-busy={isDeleting}
            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50
              focus:outline-none focus:ring-2 focus:ring-red-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            {isDeleting ? (
              <Loader2
                data-testid="deleting-spinner"
                className="h-4 w-4 animate-spin"
              />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
});

export default TransactionRow;
