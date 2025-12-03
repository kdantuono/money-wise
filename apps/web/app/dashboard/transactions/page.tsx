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

import { useEffect, useState, useCallback } from 'react';
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
import { transactionsClient, type Transaction as ApiTransaction } from '@/services/transactions.client';

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
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Map API transaction to component transaction format
   */
  const mapApiTransactionToComponent = useCallback((tx: ApiTransaction): Transaction => {
    return {
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: Math.abs(tx.amount),
      type: tx.type,
      merchant: tx.merchantName || undefined,
      reference: tx.reference || undefined,
      status: tx.isPending ? 'pending' : tx.status === 'CANCELLED' ? 'cancelled' : 'completed',
      currency: tx.currency,
    };
  }, []);

  /**
   * Fetch transactions from API
   */
  const fetchTransactions = useCallback(async (accountId?: string) => {
    setIsLoadingTransactions(true);
    try {
      const apiTransactions = await transactionsClient.getTransactions({
        accountId: accountId === 'all' ? undefined : accountId,
      });
      const mappedTransactions = apiTransactions.map(mapApiTransactionToComponent);
      setTransactions(mappedTransactions);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [mapApiTransactionToComponent]);

  /**
   * Fetch accounts and transactions on component mount
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch accounts (for the filter dropdown)
        await fetchAccounts();
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      }

      // Always fetch transactions on mount
      await fetchTransactions(selectedAccountId);
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Refetch transactions when account filter changes
   */
  useEffect(() => {
    // Skip the initial render (handled by mount effect above)
    if (selectedAccountId !== 'all' || transactions.length > 0) {
      fetchTransactions(selectedAccountId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]); // Only refetch when filter changes

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

      // Refresh transactions
      await fetchTransactions(selectedAccountId);

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
        {transactions.length > 0 && (
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

        {/* Prompt to connect accounts (shown below transactions if no accounts linked) */}
        {!isLoading && !hasAccounts && transactions.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Wallet className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-md font-medium text-gray-900 mb-2">
              Connect Your Bank
            </h2>
            <p className="text-gray-500 mb-4 max-w-sm mx-auto text-sm">
              Link your bank accounts to automatically sync transactions.
            </p>
            <Link
              href="/dashboard/accounts"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm
                bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                transition-colors duration-200"
            >
              Connect Accounts
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
