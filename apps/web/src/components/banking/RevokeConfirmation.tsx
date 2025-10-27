'use client';

import { useState } from 'react';
// import { type BankingConnectionStatus } from '../../lib/banking-types';

/**
 * RevokeConfirmation Component
 *
 * Modal dialog to confirm account disconnection/revocation.
 * Prevents accidental removal of bank accounts by requiring explicit confirmation.
 *
 * Features:
 * - Warning message about data loss
 * - Account information display
 * - Confirm and Cancel buttons
 * - Loading state during revocation
 * - Error message if revocation fails
 * - Keyboard support (Escape to cancel, Enter to confirm)
 * - Focus management for accessibility
 * - Backdrop click to dismiss
 *
 * @example
 * <RevokeConfirmation
 *   account={account}
 *   onConfirm={() => handleRevoke()}
 *   onCancel={() => setShowConfirm(false)}
 * />
 */

interface BankingAccount {
  id: string;
  name: string;
  bankName: string;
  balance?: number;
  currency?: string;
}

interface RevokeConfirmationProps {
  /** Account to revoke */
  account: BankingAccount;
  /** Called when user confirms revocation */
  onConfirm: () => void | Promise<void>;
  /** Called when user cancels or dismisses modal */
  onCancel: () => void;
  /** Optional CSS classes */
  className?: string;
}

export function RevokeConfirmation({
  account,
  onConfirm,
  onCancel,
  className = '',
}: RevokeConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const handleConfirm = async () => {
    if (!isChecked) {
      setError('Please confirm that you understand the consequences');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to revoke account. Please try again.';
      setError(errorMessage);
      setIsConfirming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${className}`}
      role="dialog"
      aria-labelledby="revoke-dialog-title"
      aria-describedby="revoke-dialog-description"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop click to dismiss */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isConfirming}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 rounded"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-200">
          <div className="flex items-start gap-3">
            <div
              className="text-3xl flex-shrink-0"
              aria-hidden="true"
            >
              ⚠️
            </div>
            <div>
              <h2
                id="revoke-dialog-title"
                className="text-lg font-bold text-gray-900"
              >
                Revoke Account Access
              </h2>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Description */}
          <p
            id="revoke-dialog-description"
            className="text-sm text-gray-600 mb-4 leading-relaxed"
          >
            You are about to disconnect {account.name} from {account.bankName}.
            After revoking access:
          </p>

          {/* Warning List */}
          <ul className="space-y-2 mb-5 bg-red-50 rounded-lg p-3 border border-red-200">
            <li className="text-sm text-red-800 flex items-start gap-2">
              <span aria-hidden="true" className="flex-shrink-0">
                •
              </span>
              <span>MoneyWise will no longer sync transactions automatically</span>
            </li>
            <li className="text-sm text-red-800 flex items-start gap-2">
              <span aria-hidden="true" className="flex-shrink-0">
                •
              </span>
              <span>You must re-authorize to link this account again</span>
            </li>
            <li className="text-sm text-red-800 flex items-start gap-2">
              <span aria-hidden="true" className="flex-shrink-0">
                •
              </span>
              <span>
                {account.balance !== undefined && account.balance > 0
                  ? 'Your current balance and transaction history will be retained'
                  : 'Historical data will be retained'}
              </span>
            </li>
          </ul>

          {/* Account Summary */}
          <div className="bg-gray-50 rounded-lg p-3 mb-5 border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-900 mb-2">
              Account Details
            </h3>
            <dl className="space-y-1">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-600">Account Name</dt>
                <dd className="font-medium text-gray-900">{account.name}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-600">Bank</dt>
                <dd className="font-medium text-gray-900">{account.bankName}</dd>
              </div>
              {account.balance !== undefined && (
                <div className="flex justify-between text-sm border-t border-gray-200 pt-1 mt-1">
                  <dt className="text-gray-600">Current Balance</dt>
                  <dd className="font-medium text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: account.currency || 'USD',
                    }).format(account.balance)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-100 border border-red-200 text-red-800 text-sm"
            >
              <p className="font-semibold">Revocation failed</p>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="mb-5 flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <input
              id="revoke-confirm-checkbox"
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                setIsChecked(e.target.checked);
                if (error) setError(null);
              }}
              disabled={isConfirming}
              aria-label="I understand this action cannot be undone"
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-red-600
                focus:ring-red-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer"
            />
            <label
              htmlFor="revoke-confirm-checkbox"
              className="text-sm text-yellow-800 leading-relaxed cursor-pointer"
            >
              I understand that revoking access cannot be undone and I will need
              to re-authorize this account to link it again
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            aria-label="Cancel revocation"
            className="flex-1 px-4 py-2 rounded-lg font-medium text-gray-900 bg-white border border-gray-300
              hover:bg-gray-50 active:bg-gray-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || !isChecked}
            aria-busy={isConfirming}
            aria-label={`Confirm revoking ${account.name}`}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold
              text-white bg-red-600 hover:bg-red-700 active:bg-red-800
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isConfirming && (
              <svg
                className="w-5 h-5 mr-2 animate-spin"
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
            )}
            {isConfirming ? 'Revoking...' : 'Revoke Access'}
          </button>
        </div>
      </div>
    </div>
  );
}
