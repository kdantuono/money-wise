'use client';

import { useState } from 'react';
import {
  Wallet,
  PiggyBank,
  CreditCard,
  Building2,
  TrendingUp,
  Home,
  Banknote,
  Briefcase,
} from 'lucide-react';
import { BankingConnectionStatus, BankingSyncStatus } from '../../lib/banking-types';
import { AccountSkeleton } from './LoadingStates';

// Icon mapping for account display
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  piggybank: PiggyBank,
  creditcard: CreditCard,
  bank: Building2,
  investment: TrendingUp,
  home: Home,
  cash: Banknote,
  business: Briefcase,
};

// Color mapping for account display
const COLOR_MAP: Record<string, { bg: string; text: string; gradient: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-50 to-indigo-50' },
  green: { bg: 'bg-green-100', text: 'text-green-600', gradient: 'from-green-50 to-emerald-50' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-50 to-pink-50' },
  red: { bg: 'bg-red-100', text: 'text-red-600', gradient: 'from-red-50 to-rose-50' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', gradient: 'from-yellow-50 to-amber-50' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', gradient: 'from-pink-50 to-rose-50' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', gradient: 'from-indigo-50 to-violet-50' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', gradient: 'from-teal-50 to-cyan-50' },
};

/**
 * AccountList Component
 *
 * Displays all linked bank accounts in a responsive grid/list layout.
 * Shows sync status, account details, and action buttons.
 *
 * Features:
 * - Responsive grid (1 col mobile, 2-3 cols desktop)
 * - Skeleton loading states
 * - Sync status indicators with color coding
 * - Keyboard navigation (arrow keys, Enter)
 * - Screen reader support with live regions
 *
 * @example
 * <AccountList
 *   accounts={accounts}
 *   isLoading={false}
 *   onSync={(id) => handleSync(id)}
 *   onRevoke={(id) => handleRevoke(id)}
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
  // Extended properties for unified account list
  isManualAccount?: boolean;
  /** Whether account can be synced (has valid banking provider connection) */
  isSyncable?: boolean;
  source?: 'MANUAL' | 'PLAID' | 'SALTEDGE';
  // Display customization
  icon?: string;
  color?: string;
}

interface AccountListProps {
  /** Array of linked bank accounts */
  accounts: BankingAccount[];
  /** Whether accounts are loading */
  isLoading?: boolean;
  /** Called when user clicks Sync button */
  onSync: (accountId: string) => void | Promise<void>;
  /** Called when user confirms account revocation */
  onRevoke: (accountId: string) => void | Promise<void>;
  /** Called when user clicks Edit button (for manual accounts) */
  onEdit?: (accountId: string) => void;
  /** Called when user clicks Delete button (for manual accounts) */
  onDelete?: (accountId: string) => void;
  /** Optional CSS classes */
  className?: string;
  /** Callback when sync starts (for loading state) */
  onSyncStart?: (accountId: string) => void;
  /** Callback when sync completes */
  onSyncComplete?: (accountId: string, success: boolean) => void;
}

// Status configuration for visual feedback
const statusConfig = {
  [BankingSyncStatus.SYNCED]: {
    label: 'Synced',
    color: 'bg-green-100 text-green-800',
    icon: '✓',
  },
  [BankingSyncStatus.SYNCING]: {
    label: 'Syncing...',
    color: 'bg-blue-100 text-blue-800',
    icon: '⟳',
  },
  [BankingSyncStatus.PENDING]: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '◯',
  },
  [BankingSyncStatus.ERROR]: {
    label: 'Sync Error',
    color: 'bg-red-100 text-red-800',
    icon: '✕',
  },
  [BankingSyncStatus.DISCONNECTED]: {
    label: 'Disconnected',
    color: 'bg-gray-100 text-gray-800',
    icon: '−',
  },
};

export function AccountList({
  accounts,
  isLoading = false,
  onSync,
  onRevoke,
  onEdit,
  onDelete,
  className = '',
  onSyncStart,
  onSyncComplete,
}: AccountListProps) {
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSync = async (accountId: string) => {
    setSyncingIds((prev) => new Set(prev).add(accountId));
    onSyncStart?.(accountId);
    try {
      await onSync(accountId);
      onSyncComplete?.(accountId, true);
    } catch (_err) {
      onSyncComplete?.(accountId, false);
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const handleRevoke = async (accountId: string) => {
    try {
      await onRevoke(accountId);
    } catch (err) {
      console.error('Failed to revoke account:', err);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      >
        {[1, 2, 3].map((i) => (
          <AccountSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-gray-300 ${className}`}
        role="status"
        aria-label="No accounts linked"
      >
        <svg
          className="w-12 h-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10a7 7 0 0114 0v2a7 7 0 01-14 0v-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10H3v10a7 7 0 0014 0v-2"
          />
        </svg>
        <p className="text-gray-600 font-medium mb-2">No accounts linked</p>
        <p className="text-gray-500 text-sm text-center">
          Link a bank account to start tracking your finances
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      role="list"
      aria-label="Linked bank accounts"
    >
      {accounts.map((account) => {
        const syncStatus = statusConfig[account.syncStatus];
        const isSyncing = syncingIds.has(account.id);
        const isSelected = selectedId === account.id;

        // Get custom icon and color, with defaults
        const AccountIcon = account.icon ? ICON_MAP[account.icon] : Wallet;
        const colorConfig = account.color ? COLOR_MAP[account.color] : null;

        // Determine gradient based on custom color or default
        const headerGradient = colorConfig
          ? `bg-gradient-to-r ${colorConfig.gradient}`
          : account.isManualAccount
            ? 'bg-gradient-to-r from-purple-50 to-pink-50'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50';

        // Icon background and text colors
        const iconBg = colorConfig ? colorConfig.bg : (account.isManualAccount ? 'bg-purple-100' : 'bg-blue-100');
        const iconText = colorConfig ? colorConfig.text : (account.isManualAccount ? 'text-purple-600' : 'text-blue-600');

        return (
          <div
            key={account.id}
            role="listitem"
            className={`rounded-lg border transition-all duration-200 overflow-hidden
              ${isSelected
                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300 shadow'
              }
              focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500`}
            onFocus={() => setSelectedId(account.id)}
            onBlur={() => setSelectedId(null)}
          >
            {/* Account Header */}
            <div className={`p-4 border-b border-gray-200 ${headerGradient}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {/* Account Icon */}
                  {AccountIcon && (
                    <div className={`p-2 rounded-lg ${iconBg}`}>
                      <AccountIcon className={`h-5 w-5 ${iconText}`} aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {account.name}
                      </h3>
                      {/* Source Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          account.isManualAccount
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {account.isManualAccount ? 'Manual' : 'Linked'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{account.bankName}</p>
                  </div>
                </div>
                {/* Only show sync status for linked accounts */}
                {!account.isManualAccount && (
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${syncStatus.color}`}
                    role="status"
                    aria-label={`Sync status: ${syncStatus.label}`}
                  >
                    <span aria-hidden="true">{syncStatus.icon}</span>
                    <span>{syncStatus.label}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="p-4 space-y-3">
              {/* Balance */}
              <div className="flex items-baseline justify-between">
                <span className="text-gray-600 text-sm">Balance</span>
                <span className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: account.currency,
                  }).format(account.balance)}
                </span>
              </div>

              {/* Account Info Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                {account.accountNumber && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Account #
                    </p>
                    <p className="text-sm font-mono text-gray-900">
                      {account.accountNumber}
                    </p>
                  </div>
                )}
                {account.accountType && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Type
                    </p>
                    <p className="text-sm text-gray-900 capitalize">
                      {account.accountType}
                    </p>
                  </div>
                )}
                {account.iban && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      IBAN
                    </p>
                    <p className="text-xs font-mono text-gray-700 break-all">
                      {account.iban}
                    </p>
                  </div>
                )}
                {account.lastSyncedAt && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Last Synced
                    </p>
                    <p className="text-xs text-gray-700">
                      {new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(
                        new Date(account.lastSyncedAt)
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions - Different based on account type and sync capability */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                {/* Edit button - available for ALL accounts (icon/color customization) */}
                <button
                  onClick={() => onEdit?.(account.id)}
                  aria-label={`Edit ${account.name}`}
                  data-testid="edit-button"
                  className={`inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium
                    transition-colors duration-150
                    ${account.isManualAccount
                      ? 'flex-1 bg-purple-100 text-purple-700 hover:bg-purple-200 active:bg-purple-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500'
                    }`}
                >
                  Edit
                </button>

                {account.isSyncable ? (
                  /* Syncable Account Actions - Sync and Revoke buttons */
                  <>
                    <button
                      onClick={() => handleSync(account.id)}
                      disabled={isSyncing || account.syncStatus === BankingSyncStatus.SYNCING}
                      aria-label={`Sync ${account.name}`}
                      aria-busy={isSyncing}
                      data-testid="sync-button"
                      className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium
                        transition-colors duration-150
                        ${
                          isSyncing || account.syncStatus === BankingSyncStatus.SYNCING
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                        }`}
                    >
                      {isSyncing || account.syncStatus === BankingSyncStatus.SYNCING ? (
                        <>
                          <svg
                            className="w-4 h-4 mr-1 animate-spin"
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
                          Syncing
                        </>
                      ) : (
                        'Sync Now'
                      )}
                    </button>

                    <button
                      onClick={() => handleRevoke(account.id)}
                      disabled={isSyncing}
                      aria-label={`Revoke access for ${account.name}`}
                      data-testid="disconnect-button"
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium
                        transition-colors duration-150
                        bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Revoke
                    </button>
                  </>
                ) : (
                  /* Manual or orphaned linked account - Delete button */
                  <button
                    onClick={() => onDelete?.(account.id)}
                    aria-label={`Delete ${account.name}`}
                    data-testid="delete-button"
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium
                      transition-colors duration-150
                      bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
