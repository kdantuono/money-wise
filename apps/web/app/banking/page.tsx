/**
 * Banking & Accounts Page
 *
 * Main page for managing linked bank accounts and initiating new connections.
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
 * @module app/banking/page
 *
 * @example
 * // Automatically used by Next.js routing at /banking
 * // No manual import needed
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
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
import { Building2, RefreshCw, Plus } from 'lucide-react';

interface BankingAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  bankName: string;
  iban: string;
  syncStatus: string;
  connectionStatus: string;
  lastSyncedAt?: Date | string;
  linkedAt: Date | string;
}

/**
 * BankingPage Component
 *
 * Main banking management page with account list, linking, and sync functionality.
 * Wrapped in ProtectedRoute to ensure user authentication.
 *
 * @returns {JSX.Element} Banking page with account management UI
 */
export default function BankingPage() {
  const _router = useRouter();

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
   *
   * Refreshes account list after new account is linked.
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
   *
   * @param {string} errorMessage - Error message from linking process
   */
  const handleLinkError = (errorMessage: string) => {
    setLocalError(errorMessage);
  };

  /**
   * Handle manual account refresh
   *
   * Fetches latest account data from API.
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
   *
   * @param {string} accountId - ID of account to sync
   */
  const handleSync = async (accountId: string) => {
    try {
      setLocalError(null);
      await syncAccount(accountId);
    } catch (err) {
      // Error is handled by store
      console.error('Sync failed:', err);
    }
  };

  /**
   * Handle account revocation
   *
   * @param {string} accountId - ID of account to revoke
   */
  const handleRevoke = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      setAccountToRevoke(account as any);
    }
  };

  /**
   * Confirm account revocation
   *
   * Calls API to revoke connection and removes account from list.
   */
  const handleConfirmRevoke = async () => {
    if (!accountToRevoke) return;

    try {
      setLocalError(null);
      // Use account ID as connection ID (they're the same in our implementation)
      await revokeConnection(accountToRevoke.id);
      setAccountToRevoke(null);
      // Refresh accounts to reflect the change
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
    <ProtectedRoute>
      <DashboardLayout>
        <ErrorBoundary>
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Building2 className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Banking & Accounts
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Link and manage your bank accounts
                    </p>
                  </div>
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
                  ariaLabel="Link a new bank account"
                  className="inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Link Bank Account
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
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 font-medium">
                    Total Accounts
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {accounts.length}
                  </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 font-medium">
                    Total Balance
                  </p>
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

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 font-medium">
                    Active Connections
                  </p>
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
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Linked Accounts
              </h2>

              <AccountList
                accounts={accounts as any}
                isLoading={isLoading}
                onSync={handleSync}
                onRevoke={handleRevoke}
              />
            </div>

            {/* Empty State */}
            {!isLoading && accounts.length === 0 && (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
                <div className="text-center">
                  <Building2
                    className="mx-auto h-12 w-12 text-gray-400"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    No bank accounts linked
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                    Connect your bank account to automatically track transactions,
                    monitor balances, and get insights into your spending habits.
                  </p>
                  <div className="mt-6">
                    <BankingLinkButton
                      onSuccess={handleLinkSuccess}
                      onError={handleLinkError}
                      ariaLabel="Link your first bank account"
                    >
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Link Your First Account
                    </BankingLinkButton>
                  </div>
                </div>
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
