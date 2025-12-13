/**
 * DeleteAccountConfirmation Component
 *
 * Modal dialog for confirming account deletion.
 * Includes transaction handling options.
 *
 * Features:
 * - Transaction handling options (delete vs keep)
 * - Optional name confirmation for safety
 * - Loading state handling
 * - WCAG 2.2 AA accessibility compliance
 *
 * @example
 * <DeleteAccountConfirmation
 *   account={accountToDelete}
 *   hasTransactions={true}
 *   transactionCount={42}
 *   onConfirm={handleDelete}
 *   onCancel={handleCancel}
 * />
 */

'use client';

import { useState, useEffect, useId, useRef } from 'react';
import { AlertTriangle, X, ArrowRight, EyeOff } from 'lucide-react';
import type { Account } from '../../services/accounts.client';
import type { DeletionEligibilityResponse, LinkedTransfer as _LinkedTransfer } from '../../types/account.types';

interface DeleteAccountConfirmationProps {
  /** Account to delete */
  account: Account;
  /** Called when deletion is confirmed */
  onConfirm: (options: { deleteTransactions: boolean }) => Promise<void>;
  /** Called when deletion is cancelled */
  onCancel: () => void;
  /** Whether the account has transactions */
  hasTransactions?: boolean;
  /** Number of transactions in the account */
  transactionCount?: number;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
  /** Error message to display */
  error?: string;
  /** Whether to require typing account name for confirmation */
  requireConfirmation?: boolean;
  /** Deletion eligibility check result */
  eligibility?: DeletionEligibilityResponse;
  /** Whether eligibility check is in progress */
  isCheckingEligibility?: boolean;
  /** Called when user chooses to hide instead of delete */
  onHide?: () => Promise<void>;
  /** Whether hide operation is in progress */
  isHiding?: boolean;
}

export function DeleteAccountConfirmation({
  account,
  onConfirm,
  onCancel,
  hasTransactions = false,
  transactionCount = 0,
  isDeleting = false,
  error,
  requireConfirmation = false,
  eligibility,
  isCheckingEligibility = false,
  onHide,
  isHiding = false,
}: DeleteAccountConfirmationProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const [deleteTransactions, setDeleteTransactions] = useState(true);
  const [confirmName, setConfirmName] = useState('');

  // Determine if deletion is blocked due to linked transfers
  const isDeletionBlocked = eligibility && !eligibility.canDelete;
  const _hasLinkedTransfers = eligibility && eligibility.linkedTransferCount > 0;

  // Focus cancel button for safety
  useEffect(() => {
    if (cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const handleConfirm = async () => {
    await onConfirm({ deleteTransactions });
  };

  const isConfirmDisabled = requireConfirmation && confirmName !== account.name;
  const canDelete = !isDeleting && !isConfirmDisabled && !isDeletionBlocked && !isCheckingEligibility;

  // Format balance for display
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: account.currency || 'USD',
  }).format(account.currentBalance);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog Content */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-200">
          <div className="flex-shrink-0 p-2 bg-red-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              Delete Account
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium">{account.name}</span>
              <span className="text-gray-500"> ({formattedBalance})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <p id={descId} className="text-sm text-gray-600">
            Are you sure you want to delete this account? This action{' '}
            <span className="font-semibold text-red-600">cannot be undone</span>.
          </p>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </div>
          )}

          {/* Eligibility Check Loading */}
          {isCheckingEligibility && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Checking deletion eligibility...
            </div>
          )}

          {/* Linked Transfers Warning */}
          {isDeletionBlocked && eligibility && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    This account cannot be deleted
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {eligibility.linkedTransferCount} transfers linked to other accounts
                  </p>
                </div>
              </div>

              {/* Transfer List */}
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {eligibility.blockers.map((transfer) => (
                  <div
                    key={transfer.transactionId}
                    className="flex items-center justify-between p-2 bg-white rounded border border-amber-100"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-amber-500" />
                      <span className="text-gray-600">
                        {transfer.transferRole === 'SOURCE' ? 'Sent to' : 'Received from'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {transfer.linkedAccountName}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: account.currency || 'USD',
                      }).format(transfer.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-amber-600 mt-2">
                Deleting this account would create orphan transactions in linked accounts.
                Consider hiding the account instead to preserve data integrity.
              </p>
            </div>
          )}

          {/* Transaction Handling Options */}
          {hasTransactions && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                What should happen to the {transactionCount} transactions in this account?
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="transactionHandling"
                    checked={deleteTransactions}
                    onChange={() => setDeleteTransactions(true)}
                    disabled={isDeleting}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Delete all transactions
                    </span>
                    <p className="text-xs text-gray-500">
                      All transaction history will be permanently deleted
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="transactionHandling"
                    checked={!deleteTransactions}
                    onChange={() => setDeleteTransactions(false)}
                    disabled={isDeleting}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Keep transactions as unassigned
                    </span>
                    <p className="text-xs text-gray-500">
                      Transactions will be kept but marked as unassigned
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Confirmation Input */}
          {requireConfirmation && (
            <div>
              <label
                htmlFor={`${dialogId}-confirm`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Type the account name to confirm
              </label>
              <input
                id={`${dialogId}-confirm`}
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                disabled={isDeleting}
                placeholder={`Type "${account.name}" to confirm`}
                className="w-full px-3 py-2 rounded-lg border border-gray-300
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                  disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting || isHiding}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300
              text-gray-700 font-medium
              hover:bg-gray-50 active:bg-gray-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            Cancel
          </button>

          {/* Hide Instead Button - shown when deletion is blocked */}
          {isDeletionBlocked && onHide && (
            <button
              type="button"
              onClick={onHide}
              disabled={isHiding || isDeleting}
              className="flex-1 px-4 py-2 rounded-lg
                bg-amber-600 text-white font-medium
                hover:bg-amber-700 active:bg-amber-800
                focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                inline-flex items-center justify-center"
            >
              {isHiding ? (
                <>
                  <svg
                    className="w-4 h-4 mr-2 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Hiding...
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Instead
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canDelete}
            className="flex-1 px-4 py-2 rounded-lg
              bg-red-600 text-white font-medium
              hover:bg-red-700 active:bg-red-800
              focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              inline-flex items-center justify-center"
          >
            {isDeleting ? (
              <>
                <svg
                  className="w-4 h-4 mr-2 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
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
}

export default DeleteAccountConfirmation;
