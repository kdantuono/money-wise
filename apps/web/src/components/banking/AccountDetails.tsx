'use client';

import { useState } from 'react';
import { BankingConnectionStatus, BankingSyncStatus } from '../../lib/banking-types';
import { RevokeConfirmation } from './RevokeConfirmation';
import { AccountDetailsSkeleton } from './LoadingStates';

/**
 * AccountDetails Component
 *
 * Detailed view of a single linked bank account.
 * Shows comprehensive account information and provides sync/revoke actions.
 *
 * Features:
 * - Full account information display
 * - Balance history visualization (if available)
 * - Sync status with timestamp
 * - Revoke confirmation dialog
 * - Responsive layout
 * - Keyboard accessible controls
 *
 * @example
 * <AccountDetails
 *   account={account}
 *   isLoading={false}
 *   onSync={() => handleSync()}
 *   onRevoke={() => handleRevoke()}
 * />
 */

interface BankingAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  bankName: string;
  iban: string;
  syncStatus: BankingSyncStatus;
  connectionStatus: BankingConnectionStatus;
  lastSyncedAt?: Date | string;
  linkedAt: Date | string;
  accountNumber?: string;
  accountType?: string;
  country?: string;
  accountHolderName?: string;
  creditLimit?: number;
  availableBalance?: number;
}

interface BalanceHistory {
  date: Date | string;
  balance: number;
}

interface AccountDetailsProps {
  /** Account to display */
  account: BankingAccount;
  /** Whether account data is loading */
  isLoading?: boolean;
  /** Called when user clicks Sync button */
  onSync: () => void | Promise<void>;
  /** Called when user confirms revocation */
  onRevoke: () => void | Promise<void>;
  /** Optional balance history for chart display */
  balanceHistory?: BalanceHistory[];
  /** Optional CSS classes */
  className?: string;
}

const connectionStatusConfig = {
  [BankingConnectionStatus.PENDING]: {
    label: 'Pending',
    color: 'text-yellow-600 bg-yellow-50',
  },
  [BankingConnectionStatus.IN_PROGRESS]: {
    label: 'Connecting...',
    color: 'text-blue-600 bg-blue-50',
  },
  [BankingConnectionStatus.AUTHORIZED]: {
    label: 'Connected',
    color: 'text-green-600 bg-green-50',
  },
  [BankingConnectionStatus.REVOKED]: {
    label: 'Revoked',
    color: 'text-gray-600 bg-gray-50',
  },
  [BankingConnectionStatus.EXPIRED]: {
    label: 'Expired',
    color: 'text-orange-600 bg-orange-50',
  },
  [BankingConnectionStatus.FAILED]: {
    label: 'Connection Failed',
    color: 'text-red-600 bg-red-50',
  },
};

export function AccountDetails({
  account,
  isLoading = false,
  onSync,
  onRevoke,
  className = '',
}: AccountDetailsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await onSync();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sync account';
      setSyncError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRevokeConfirm = async () => {
    try {
      await onRevoke();
      setShowRevokeConfirm(false);
    } catch (err) {
      console.error('Failed to revoke account:', err);
    }
  };

  if (isLoading) {
    return <AccountDetailsSkeleton />;
  }

  const connectionStatus =
    connectionStatusConfig[account.connectionStatus] ||
    connectionStatusConfig[BankingConnectionStatus.PENDING];

  const canSync =
    account.syncStatus !== BankingSyncStatus.SYNCING &&
    account.connectionStatus === BankingConnectionStatus.AUTHORIZED;

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow ${className}`}
    >
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-8 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {account.name}
            </h1>
            <p className="text-lg text-gray-600">{account.bankName}</p>
          </div>
          <div
            className={`px-4 py-2 rounded-full font-semibold text-sm ${connectionStatus.color}`}
            role="status"
            aria-label={`Connection status: ${connectionStatus.label}`}
          >
            {connectionStatus.label}
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: account.currency,
              minimumFractionDigits: 2,
            }).format(account.balance)}
          </span>
          {account.availableBalance !== undefined &&
            account.availableBalance !== account.balance && (
              <span className="text-lg text-gray-600">
                (Available:{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: account.currency,
                }).format(account.availableBalance)})
              </span>
            )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Sync Error Alert */}
        {syncError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-200"
          >
            <p className="font-semibold">Sync failed</p>
            <p className="text-sm mt-1">{syncError}</p>
          </div>
        )}

        {/* Account Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
          {/* Basic Info */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Account Information
            </h2>
            <div className="space-y-3">
              {account.accountHolderName && (
                <div>
                  <p className="text-xs text-gray-500">Account Holder</p>
                  <p className="text-sm font-medium text-gray-900">
                    {account.accountHolderName}
                  </p>
                </div>
              )}
              {account.accountNumber && (
                <div>
                  <p className="text-xs text-gray-500">Account Number</p>
                  <p className="text-sm font-mono text-gray-900">
                    {account.accountNumber}
                  </p>
                </div>
              )}
              {account.iban && (
                <div>
                  <p className="text-xs text-gray-500">IBAN</p>
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {account.iban}
                  </p>
                </div>
              )}
              {account.accountType && (
                <div>
                  <p className="text-xs text-gray-500">Account Type</p>
                  <p className="text-sm text-gray-900 capitalize">
                    {account.accountType}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Additional Info */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Connection Details
            </h2>
            <div className="space-y-3">
              {account.country && (
                <div>
                  <p className="text-xs text-gray-500">Country</p>
                  <p className="text-sm text-gray-900">{account.country}</p>
                </div>
              )}
              {account.linkedAt && (
                <div>
                  <p className="text-xs text-gray-500">Linked Date</p>
                  <p className="text-sm text-gray-900">
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(account.linkedAt))}
                  </p>
                </div>
              )}
              {account.lastSyncedAt && (
                <div>
                  <p className="text-xs text-gray-500">Last Synced</p>
                  <p className="text-sm text-gray-900">
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(account.lastSyncedAt))}
                  </p>
                </div>
              )}
              {account.creditLimit !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Credit Limit</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: account.currency,
                    }).format(account.creditLimit)}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={!canSync || isSyncing}
            aria-busy={isSyncing}
            aria-label={`Sync ${account.name} bank account`}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-lg font-medium
              transition-colors duration-200
              ${
                !canSync || isSyncing
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500'
              }"
          >
            {isSyncing && (
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
            {isSyncing ? 'Syncing...' : 'Sync Account'}
          </button>

          <button
            onClick={() => setShowRevokeConfirm(true)}
            disabled={isSyncing}
            aria-label={`Revoke access for ${account.name}`}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-lg font-medium
              transition-colors duration-200
              bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke Access
          </button>
        </div>

        {/* Sync Status Info */}
        {account.syncStatus !== BankingSyncStatus.SYNCED && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
            <p className="font-semibold">Sync Status: {account.syncStatus}</p>
          </div>
        )}
      </div>

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && (
        <RevokeConfirmation
          account={account}
          onConfirm={handleRevokeConfirm}
          onCancel={() => setShowRevokeConfirm(false)}
        />
      )}
    </div>
  );
}
