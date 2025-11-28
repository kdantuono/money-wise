/**
 * Dashboard Transactions Page
 *
 * Main page for viewing and managing bank transactions within the dashboard.
 * Displays transactions from all linked accounts with filtering and search.
 *
 * Features:
 * - Display all transactions from linked accounts
 * - Filter by date range, account, and description
 * - Transaction categorization (income/expense)
 * - Sync status indicators
 * - Empty state with account linking prompt
 * - WCAG 2.2 AA accessibility compliance
 *
 * @module app/dashboard/transactions/page
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TransactionList,
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
import { CreditCard, RefreshCw, Wallet, ArrowRight } from 'lucide-react';

/**
 * Transaction type from TransactionList component
 */
interface Transaction {
  id: string;
  date: Date | string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  merchant?: string;
  reference?: string;
  status: 'pending' | 'completed' | 'cancelled';
  currency?: string;
}

/**
 * TransactionsPage Component
 *
 * Main transaction management page with transaction list and filtering.
 * Rendered within the dashboard layout.
 *
 * @returns {JSX.Element} Transactions page with transaction list UI
 */
export default function TransactionsPage() {
  // Zustand store hooks
  const { fetchAccounts, clearError } = useBanking();
  const accounts = useAccounts();
  const error = useBankingError();
  const { isLoading } = useBankingLoading();

  // Local state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
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
        console.error('Failed to fetch accounts:', err);
      }
    };

    loadAccounts();
  }, [fetchAccounts]);

  /**
   * Load transactions (placeholder - will be implemented with transaction API)
   */
  useEffect(() => {
    // TODO: Implement transaction fetching when API endpoint is available
    // For now, transactions will be empty until the API is built
    setTransactions([]);
  }, [accounts, selectedAccountId]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setLocalError(null);
      clearError();

      // Refresh accounts first
      await fetchAccounts();

      // TODO: When transaction API is available, refresh transactions here

    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh transactions. Please try again.';
      setLocalError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle account filter change
   */
  const handleAccountFilterChange = (accountId: string) => {
    setSelectedAccountId(accountId);
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

  // Check if any accounts are linked
  const hasAccounts = accounts.length > 0;

  // Calculate transaction summary
  const totalIncome = transactions
    .filter((tx) => tx.type === 'CREDIT')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalExpenses = transactions
    .filter((tx) => tx.type === 'DEBIT')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <ErrorBoundary>
      <div className="space-y-6" data-testid="transactions-container">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-sm text-gray-500">
                View and manage your transaction history
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {hasAccounts && (
            <div className="flex items-center gap-3">
              {/* Account Filter */}
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountFilterChange(e.target.value)}
                aria-label="Filter by account"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  bg-white"
              >
                <option value="all">All Accounts</option>
                {(accounts as BankingAccount[]).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - {account.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                aria-label="Refresh transactions"
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
            </div>
          )}
        </div>

        {/* Error Alert */}
        {effectiveError && (
          <ErrorAlert
            title="Error"
            message={effectiveError}
            onDismiss={handleDismissError}
          />
        )}

        {/* Transaction Statistics */}
        {hasAccounts && transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {transactions.length}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total Income</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(totalIncome)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total Expenses</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(totalExpenses)}
              </p>
            </div>
          </div>
        )}

        {/* Transaction List */}
        {hasAccounts && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Transactions
              </h2>
            </div>
            <div className="p-4">
              <TransactionList
                accountId={selectedAccountId}
                transactions={transactions}
                isLoading={isLoadingTransactions || isLoading}
              />
            </div>
          </div>
        )}

        {/* Empty State - No Accounts */}
        {!isLoading && !hasAccounts && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              No accounts connected
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Connect your bank accounts to automatically track your transactions.
            </p>
            <Link
              href="/dashboard/accounts"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium
                bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                transition-colors duration-200"
            >
              Connect Accounts
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Coming Soon Notice - Has Accounts but No Transactions */}
        {hasAccounts && transactions.length === 0 && !isLoading && !isLoadingTransactions && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 text-center">
            <CreditCard className="h-10 w-10 text-blue-400 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-md font-medium text-blue-900 mb-2">
              Transaction Sync Coming Soon
            </h3>
            <p className="text-blue-700 text-sm max-w-md mx-auto">
              You have {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected.
              Transaction synchronization is being finalized and will display your transaction
              history once available.
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
