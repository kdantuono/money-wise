'use client';

import { memo, useMemo } from 'react';
import { X, ArrowLeftRight, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import type { Transaction } from '@/services/transactions.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface TransferLinkModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The two transactions to link */
  selectedTransactions: Transaction[];
  /** Callback when link is confirmed */
  onLink: (transactionIds: string[]) => Promise<void>;
  /** Whether the link operation is in progress */
  isLinking?: boolean;
}

interface MatchQuality {
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function calculateMatchQuality(tx1: Transaction, tx2: Transaction): MatchQuality {
  let score = 0;
  const reasons: string[] = [];

  // Amount comparison (40 points max)
  const amountDiff = Math.abs(tx1.amount - tx2.amount);
  const amountRatio = amountDiff / Math.max(tx1.amount, tx2.amount);

  if (amountDiff === 0) {
    score += 40;
    reasons.push('Exact amount match');
  } else if (amountRatio <= 0.01) {
    score += 35;
    reasons.push('Amount within 1%');
  } else if (amountRatio <= 0.05) {
    score += 25;
    reasons.push('Amount within 5%');
  }

  // Date proximity (30 points max)
  const daysDiff = Math.abs(
    (new Date(tx1.date).getTime() - new Date(tx2.date).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (daysDiff === 0) {
    score += 30;
    reasons.push('Same day');
  } else if (daysDiff <= 1) {
    score += 25;
    reasons.push('Within 1 day');
  } else if (daysDiff <= 2) {
    score += 15;
    reasons.push('Within 2 days');
  } else if (daysDiff <= 3) {
    score += 5;
    reasons.push('Within 3 days');
  }

  // Opposite transaction types (15 points)
  const isOpposite =
    (tx1.type === 'DEBIT' && tx2.type === 'CREDIT') ||
    (tx1.type === 'CREDIT' && tx2.type === 'DEBIT');
  if (isOpposite) {
    score += 15;
    reasons.push('Opposite transaction types');
  }

  // Different accounts (15 points)
  if (tx1.accountId !== tx2.accountId) {
    score += 15;
    reasons.push('Different accounts');
  }

  // Determine level
  let level: 'HIGH' | 'MEDIUM' | 'LOW';
  if (score >= 80) {
    level = 'HIGH';
  } else if (score >= 50) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return { score, level, reasons };
}

// =============================================================================
// Component Implementation
// =============================================================================

export const TransferLinkModal = memo(function TransferLinkModal({
  isOpen,
  onClose,
  selectedTransactions,
  onLink,
  isLinking = false,
}: TransferLinkModalProps) {
  // Get transactions (may be undefined if not exactly 2)
  const tx1 = selectedTransactions[0];
  const tx2 = selectedTransactions[1];

  // Calculate match quality (call hook unconditionally)
  const matchQuality = useMemo(
    () => (tx1 && tx2 ? calculateMatchQuality(tx1, tx2) : { score: 0, level: 'LOW' as const, reasons: [] }),
    [tx1, tx2],
  );

  // Don't render if not open or don't have exactly 2 transactions
  if (!isOpen || selectedTransactions.length !== 2 || !tx1 || !tx2) {
    return null;
  }

  const handleConfirm = async () => {
    await onLink([tx1.id, tx2.id]);
  };

  const qualityColors = {
    HIGH: 'bg-green-100 text-green-800 border-green-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-red-100 text-red-800 border-red-200',
  };

  const qualityIcon = {
    HIGH: <Check className="h-4 w-4" />,
    MEDIUM: <AlertTriangle className="h-4 w-4" />,
    LOW: <AlertTriangle className="h-4 w-4" />,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-link-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            </div>
            <h2 id="transfer-link-title" className="text-lg font-semibold text-gray-900">
              Link as Transfer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLinking}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg
              hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Match Quality Indicator */}
          <div className="mb-6">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
                ${qualityColors[matchQuality.level]}`}
            >
              {qualityIcon[matchQuality.level]}
              <span className="text-sm font-medium">
                {matchQuality.level} confidence match ({matchQuality.score}%)
              </span>
            </div>
            {matchQuality.reasons.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {matchQuality.reasons.join(' • ')}
              </p>
            )}
          </div>

          {/* Transactions Comparison */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
            {/* Transaction 1 */}
            <TransactionCard transaction={tx1} role="source" />

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="p-2 bg-gray-100 rounded-full">
                <ArrowRight className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            {/* Transaction 2 */}
            <TransactionCard transaction={tx2} role="destination" />
          </div>

          {/* Warning for low match quality */}
          {matchQuality.level === 'LOW' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  These transactions have a low match confidence. Please verify
                  they represent the same transfer before linking.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLinking}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white
              border border-gray-300 rounded-lg hover:bg-gray-50
              focus:outline-none focus:ring-2 focus:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLinking}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600
              rounded-lg hover:bg-blue-700
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLinking ? 'Linking...' : 'Link Transactions'}
          </button>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Sub-Components
// =============================================================================

interface TransactionCardProps {
  transaction: Transaction;
  role: 'source' | 'destination';
}

const TransactionCard = memo(function TransactionCard({
  transaction,
  role,
}: TransactionCardProps) {
  const isCredit = transaction.type === 'CREDIT';
  const amountPrefix = isCredit ? '+' : '−';
  const formattedAmount = formatCurrency(transaction.amount, transaction.currency);

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${
            role === 'source'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {role === 'source' ? 'From' : 'To'}
        </span>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${
            isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {transaction.type}
        </span>
      </div>

      <h4 className="font-medium text-gray-900 truncate">
        {transaction.description}
      </h4>

      {transaction.merchantName && (
        <p className="text-sm text-gray-500 truncate mt-1">
          {transaction.merchantName}
        </p>
      )}

      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Amount</span>
          <span
            className={`font-medium ${isCredit ? 'text-green-600' : 'text-gray-900'}`}
          >
            {amountPrefix}{formattedAmount}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Date</span>
          <span className="text-gray-900">{formatDate(transaction.date)}</span>
        </div>
      </div>
    </div>
  );
});

export default TransferLinkModal;
