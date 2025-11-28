/**
 * Dashboard Accounts Page
 *
 * Main page for managing linked bank accounts within the dashboard.
 * Displays all linked accounts with sync status, actions, and error handling.
 *
 * Features:
 * - Display all linked banking accounts
 * - Initiate new bank account linking via OAuth
 * - Sync individual accounts
 * - Revoke account access
 * - Handle loading and error states
 * - WCAG 2.2 AA accessibility compliance
 *
 * @module app/dashboard/accounts/page
 */

'use client';

import { useEffect, useState } from 'react';
import {
  BankingLinkButton,
  AccountList,
  RevokeConfirmation,
  ErrorAlert,
  ErrorBoundary,
} from '@/components/banking';
import {
  useBanking,
  useAccounts,
  useBankingError,
  useBankingLoading,
} from '@/store';
import { BankingAccount } from '@/lib/banking-types';
import { Wallet, RefreshCw, Plus } from 'lucide-react';

/**
 * AccountsPage Component
 *
 * Main banking management page with account list, linking, and sync functionality.
 * Rendered within the dashboard layout.
 *
 * @returns {JSX.Element} Accounts page with account management UI
 */
export default function AccountsPage() {
  // Zustand store hooks
  const { fetchAccounts, syncAccount, revokeConnection, clearError } = useBanking();
  const accounts = useAccounts();
  const error = useBankingError();
  const { isLoading, isLinking } = useBankingLoading();

  // Local state
  const [accountToRevoke, setAccountToRevoke] = useState<BankingAccount | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Fetch accounts on component mount
   */
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        await fetchAccounts();
      } catch (err) {
        // Error is handled by store and useBankingError hook
        console.error('Failed to fetch accounts:', err);
      }
    };

    loadAccounts();
  }, [fetchAccounts]);

  /**
   * Handle successful bank linking
   */
  const handleLinkSuccess = async () => {
    try {
      setLocalError(null);
      await fetchAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh accounts after linking. Please refresh the page.';
      setLocalError(errorMessage);
    }
  };

  /**
   * Handle bank linking error
   */
  const handleLinkError = (errorMessage: string) => {
    setLocalError(errorMessage);
  };

  /**
   * Handle manual account refresh
   */
  const handleRefreshAccounts = async () => {
    try {
      setIsRefreshing(true);
      setLocalError(null);
      clearError();
      await fetchAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh accounts. Please try again.';
      setLocalError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle account sync
   */
  const handleSync = async (accountId: string) => {
    try {
      setLocalError(null);
      await syncAccount(accountId);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  /**
   * Handle account revocation
   */
  const handleRevoke = (accountId: string) => {
    const account = (accounts as BankingAccount[]).find((acc) => acc.id === accountId);
    if (account) {
      setAccountToRevoke(account);
    }
  };

  /**
   * Confirm account revocation
   */
  const handleConfirmRevoke = async () => {
    if (!accountToRevoke) return;

    try {
      setLocalError(null);
      await revokeConnection(accountToRevoke.id);
      setAccountToRevoke(null);
      await fetchAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to revoke account access. Please try again.';
      setLocalError(errorMessage);
      setAccountToRevoke(null);
    }
  };

  /**
   * Cancel account revocation
   */
  const handleCancelRevoke = () => {
    setAccountToRevoke(null);
  };

  /**
   * Dismiss error message
   */
  const handleDismissError = () => {
    setLocalError(null);
    clearError();
  };

  // Compute effective error (local or store error)
  const effectiveError = localError || error;

  return (
    <ErrorBoundary>
      <div className="space-y-6" data-testid="accounts-container">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
              <p className="text-sm text-gray-500">
                Manage your bank accounts and financial connections
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAccounts}
              disabled={isLoading || isRefreshing || isLinking}
              aria-label="Refresh accounts"
              aria-busy={isRefreshing}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
                transition-colors duration-200 border border-gray-300
                text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <BankingLinkButton
              onSuccess={handleLinkSuccess}
              onError={handleLinkError}
              ariaLabel="Connect a new bank account"
              className="inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Connect Account
            </BankingLinkButton>
          </div>
        </div>

        {/* Error Alert */}
        {effectiveError && (
          <ErrorAlert
            title="Error"
            message={effectiveError}
            onDismiss={handleDismissError}
          />
        )}

        {/* Account Statistics */}
        {!isLoading && accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total Accounts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {accounts.length}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: accounts[0]?.currency || 'USD',
                  minimumFractionDigits: 2,
                }).format(
                  accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
                )}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Active Connections</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {
                  accounts.filter(
                    (acc) => acc.syncStatus !== 'DISCONNECTED'
                  ).length
                }
              </p>
            </div>
          </div>
        )}

        {/* Account List */}
        {(isLoading || accounts.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Linked Accounts
              </h2>
            </div>
            <div className="p-4">
              <AccountList
                accounts={accounts as BankingAccount[]}
                isLoading={isLoading}
                onSync={handleSync}
                onRevoke={handleRevoke}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && accounts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              No accounts connected
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Connect your bank accounts to automatically track your transactions and balances.
            </p>
            <BankingLinkButton
              onSuccess={handleLinkSuccess}
              onError={handleLinkError}
              ariaLabel="Connect your first bank account"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Connect Your First Account
            </BankingLinkButton>
          </div>
        )}

        {/* Revoke Confirmation Modal */}
        {accountToRevoke && (
          <RevokeConfirmation
            account={accountToRevoke}
            onConfirm={handleConfirmRevoke}
            onCancel={handleCancelRevoke}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
