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
  RefreshCw,
  Pencil,
  Trash2,
  Unlink,
  ExternalLink,
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
const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
};

/**
 * AccountList Component
 *
 * Displays all accounts (manual and linked) in a unified card layout.
 * Shows sync status, account details, and action buttons.
 *
 * Features:
 * - Responsive grid (1 col mobile, 2-3 cols desktop)
 * - Unified card design for all account types
 * - Compact sync button with icon only
 * - Keyboard navigation and screen reader support
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
  isManualAccount?: boolean;
  isSyncable?: boolean;
  source?: 'MANUAL' | 'PLAID' | 'SALTEDGE';
  icon?: string;
  color?: string;
}

interface AccountListProps {
  accounts: BankingAccount[];
  isLoading?: boolean;
  onSync: (accountId: string) => void | Promise<void>;
  onRevoke: (accountId: string) => void | Promise<void>;
  onEdit?: (accountId: string) => void;
  onDelete?: (accountId: string) => void;
  onView?: (accountId: string) => void;
  className?: string;
  onSyncStart?: (accountId: string) => void;
  onSyncComplete?: (accountId: string, success: boolean) => void;
}

// Status configuration for visual feedback
const statusConfig = {
  [BankingSyncStatus.SYNCED]: {
    label: 'Synced',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  [BankingSyncStatus.SYNCING]: {
    label: 'Syncing',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  [BankingSyncStatus.PENDING]: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  [BankingSyncStatus.ERROR]: {
    label: 'Error',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  [BankingSyncStatus.DISCONNECTED]: {
    label: 'Disconnected',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
};

export function AccountList({
  accounts,
  isLoading = false,
  onSync,
  onRevoke,
  onEdit,
  onDelete,
  onView,
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
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
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
        <Wallet className="w-12 h-12 text-gray-400 mb-3" aria-hidden="true" />
        <p className="text-gray-600 font-medium mb-2">No accounts yet</p>
        <p className="text-gray-500 text-sm text-center">
          Add a manual account or link your bank to get started
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      role="list"
      aria-label="Accounts"
    >
      {accounts.map((account) => {
        const syncStatus = statusConfig[account.syncStatus];
        const isSyncing = syncingIds.has(account.id) || account.syncStatus === BankingSyncStatus.SYNCING;
        const isSelected = selectedId === account.id;

        // Get custom icon and color, with defaults
        const AccountIcon = account.icon ? ICON_MAP[account.icon] : Wallet;
        const colorConfig = account.color ? COLOR_MAP[account.color] : null;

        // Determine colors based on custom color or account type
        const iconBg = colorConfig?.bg || (account.isManualAccount ? 'bg-purple-100' : 'bg-blue-100');
        const iconText = colorConfig?.text || (account.isManualAccount ? 'text-purple-600' : 'text-blue-600');
        const accentBorder = colorConfig?.border || (account.isManualAccount ? 'border-purple-200' : 'border-blue-200');

        return (
          <div
            key={account.id}
            role="listitem"
            className={`rounded-xl border bg-white overflow-hidden transition-all duration-200
              ${isSelected ? 'border-blue-500 shadow-lg ring-2 ring-blue-100' : `${accentBorder} hover:shadow-md`}
              focus-within:ring-2 focus-within:ring-blue-500`}
            onFocus={() => setSelectedId(account.id)}
            onBlur={() => setSelectedId(null)}
          >
            {/* Card Header - Unified for all account types */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Account Icon */}
                <div className={`p-2.5 rounded-xl ${iconBg} flex-shrink-0`}>
                  {AccountIcon && (
                    <AccountIcon className={`h-5 w-5 ${iconText}`} aria-hidden="true" />
                  )}
                </div>

                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {account.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{account.bankName}</p>

                  {/* Status Row - Sync button + Status for linked, just badge for manual */}
                  <div className="flex items-center gap-2 mt-2">
                    {account.isSyncable ? (
                      <>
                        {/* Compact Sync Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSync(account.id);
                          }}
                          disabled={isSyncing}
                          aria-label={isSyncing ? 'Syncing...' : `Sync ${account.name}`}
                          className={`p-1.5 rounded-lg transition-colors duration-150
                            ${isSyncing
                              ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'
                            }`}
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                          />
                        </button>

                        {/* Sync Status Badge */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${syncStatus.bgColor} ${syncStatus.color}`}
                          role="status"
                        >
                          {syncStatus.label}
                        </span>
                      </>
                    ) : (
                      /* Manual Account Badge */
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                        Manual
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance - Top Right */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: account.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(account.balance)}
                  </p>
                  <p className="text-xs text-gray-400">{account.currency}</p>
                </div>
              </div>
            </div>

            {/* Account Details - Compact */}
            {(account.accountNumber || account.accountType || account.lastSyncedAt) && (
              <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {account.accountType && (
                  <span className="capitalize">{account.accountType}</span>
                )}
                {account.accountNumber && (
                  <span className="font-mono">{account.accountNumber}</span>
                )}
                {account.lastSyncedAt && (
                  <span>
                    Synced {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(account.lastSyncedAt))}
                  </span>
                )}
              </div>
            )}

            {/* Unified Action Bar */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
              {/* View Details - Primary action */}
              {onView && (
                <button
                  onClick={() => onView(account.id)}
                  aria-label={`View details for ${account.name}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                    bg-white border border-gray-200 text-gray-700
                    hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    transition-colors duration-150"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  View
                </button>
              )}

              {/* Edit Button - Icon only */}
              <button
                onClick={() => onEdit?.(account.id)}
                aria-label={`Edit ${account.name}`}
                data-testid="edit-button"
                className="p-2 rounded-lg text-gray-500
                  hover:bg-white hover:text-gray-700 hover:shadow-sm
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  transition-colors duration-150"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Delete/Disconnect Button - Icon only */}
              {account.isSyncable ? (
                <button
                  onClick={() => handleRevoke(account.id)}
                  disabled={isSyncing}
                  aria-label={`Disconnect ${account.name}`}
                  data-testid="disconnect-button"
                  className="p-2 rounded-lg text-gray-500
                    hover:bg-red-50 hover:text-red-600
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-150"
                >
                  <Unlink className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  onClick={() => onDelete?.(account.id)}
                  aria-label={`Delete ${account.name}`}
                  data-testid="delete-button"
                  className="p-2 rounded-lg text-gray-500
                    hover:bg-red-50 hover:text-red-600
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                    transition-colors duration-150"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
