/**
 * Account Details Page
 *
 * Displays detailed information for a single account including
 * balance, sync status, and filtered transaction list.
 *
 * @module app/dashboard/accounts/[id]/page
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Pencil,
  EyeOff,
  Trash2,
  Loader2,
  AlertCircle,
  Building2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { accountsClient, NotFoundError, type Account } from '@/services/accounts.client';
import { transactionsClient, type Transaction } from '@/services/transactions.client';
import { categoriesClient, type CategoryOption } from '@/services/categories.client';
import { useBanking } from '@/store';
import { TransactionRow } from '@/components/transactions';

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function getAccountTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    CHECKING: 'Checking',
    SAVINGS: 'Savings',
    CREDIT_CARD: 'Credit Card',
    INVESTMENT: 'Investment',
    LOAN: 'Loan',
    MORTGAGE: 'Mortgage',
    CASH: 'Cash',
    OTHER: 'Other',
  };
  return typeMap[type] || type;
}

// =============================================================================
// Component
// =============================================================================

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params?.id as string;

  // State
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Banking store for sync
  const { syncAccount } = useBanking();

  // Category map for transaction display
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  // Fetch account and transactions
  const fetchData = useCallback(async () => {
    if (!accountId) return;

    try {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);

      const [accountData, transactionsData, categoriesData] = await Promise.all([
        accountsClient.getAccount(accountId),
        transactionsClient.getTransactions({ accountId }),
        categoriesClient.getOptions(),
      ]);

      setAccount(accountData);
      // Take first 50 transactions for display
      setTransactions(transactionsData.slice(0, 50));
      setCategories(categoriesData);
    } catch (err) {
      if (err instanceof NotFoundError) {
        setIsNotFound(true);
        setError('Account not found');
      } else {
        setError('Failed to load account. Please try again.');
      }
      console.error('Failed to fetch account data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle sync
  const handleSync = useCallback(async () => {
    if (!account?.isSyncable) return;

    try {
      setIsSyncing(true);
      await syncAccount(accountId);
      await fetchData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [account, accountId, syncAccount, fetchData]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Calculate income/expense totals
  const { totalIncome, totalExpenses } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'CREDIT') {
        income += tx.amount;
      } else {
        expenses += tx.amount;
      }
    });
    return { totalIncome: income, totalExpenses: expenses };
  }, [transactions]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        data-testid="account-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {isNotFound ? 'Account Not Found' : 'Error Loading Account'}
        </h2>
        <p className="text-gray-600 mb-4">
          {isNotFound
            ? 'The account you are looking for does not exist or has been deleted.'
            : 'Failed to load account details. Please try again.'}
        </p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (!account) return null;

  const canDelete = account.isManualAccount || !account.isSyncable;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/accounts"
          className="hover:text-gray-700 transition-colors"
        >
          Accounts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{account.name}</span>
      </nav>

      {/* Account Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          {/* Account Info */}
          <div className="flex items-start gap-4">
            <button
              onClick={handleBack}
              aria-label="Back to accounts"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{getAccountTypeName(account.type)}</span>
                  <span>•</span>
                  <span>{account.institutionName || 'Unknown Institution'}</span>
                  {account.maskedAccountNumber && (
                    <>
                      <span>•</span>
                      <span>{account.maskedAccountNumber}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      account.isManualAccount
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {account.isManualAccount ? 'Manual' : 'Linked'}
                  </span>
                  {account.syncError && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Sync Error
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(account.currentBalance, account.currency)}
            </p>
            {account.availableBalance !== undefined &&
              account.availableBalance !== account.currentBalance && (
                <p className="text-sm text-gray-500 mt-1">
                  Available: {formatCurrency(account.availableBalance, account.currency)}
                </p>
              )}
          </div>
        </div>

        {/* Sync Status & Actions */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
          {/* Sync Status */}
          <div className="text-sm text-gray-500">
            {account.isSyncable && account.lastSyncAt && (
              <span>Last synced: {formatRelativeTime(account.lastSyncAt)}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {account.isSyncable && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                aria-label="Sync account"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  text-blue-600 bg-blue-50 hover:bg-blue-100
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
            )}

            <button
              aria-label="Edit account"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button
              aria-label="Hide account"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <EyeOff className="h-4 w-4" />
              Hide
            </button>

            {canDelete && (
              <button
                aria-label="Delete account"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Income</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(totalIncome, account.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expenses</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(totalExpenses, account.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-500 mt-1">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No transactions found for this account.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  isSelectable={false}
                  categoryName={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
                  onSelect={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
