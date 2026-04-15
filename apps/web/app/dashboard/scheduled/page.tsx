/**
 * Dashboard Scheduled Transactions Page
 *
 * Main page for managing scheduled and recurring transactions
 * including bills, subscriptions, and planned payments.
 *
 * @module app/dashboard/scheduled/page
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import {
  ScheduledTransactionList,
  ScheduledTransactionForm,
} from '@/components/scheduled';
import {
  scheduledClient,
  type ScheduledTransaction,
  type CreateScheduledTransactionRequest,
} from '@/services/scheduled.client';
import { accountsClient } from '@/services/accounts.client';
import { categoriesClient } from '@/services/categories.client';

// =============================================================================
// Component
// =============================================================================

export default function ScheduledPage() {
  // State
  const [transactions, setTransactions] = useState<ScheduledTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Accounts and categories state
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ScheduledTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Fetch all scheduled transactions
   */
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await scheduledClient.getScheduledTransactions();
      // Handle both array and paginated response
      const data = Array.isArray(response) ? response : response.data;
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch scheduled transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scheduled transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh transactions
   */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const response = await scheduledClient.getScheduledTransactions();
      const data = Array.isArray(response) ? response : response.data;
      setTransactions(data);
    } catch (err) {
      console.error('Failed to refresh scheduled transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh scheduled transactions');
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle transaction click - open edit form
   */
  const handleTransactionClick = useCallback((scheduled: ScheduledTransaction) => {
    setEditingTransaction(scheduled);
    setShowForm(true);
  }, []);

  /**
   * Handle skip next occurrence
   */
  const handleSkip = useCallback(async (scheduled: ScheduledTransaction) => {
    try {
      await scheduledClient.skipNextOccurrence(scheduled.id);
      await fetchTransactions();
    } catch (err) {
      console.error('Failed to skip occurrence:', err);
      setError(err instanceof Error ? err.message : 'Failed to skip occurrence');
    }
  }, [fetchTransactions]);

  /**
   * Handle mark as completed
   */
  const handleComplete = useCallback(async (scheduled: ScheduledTransaction) => {
    try {
      await scheduledClient.markCompleted(scheduled.id);
      await fetchTransactions();
    } catch (err) {
      console.error('Failed to mark as completed:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as completed');
    }
  }, [fetchTransactions]);

  /**
   * Handle add new transaction
   */
  const handleAddNew = () => {
    setEditingTransaction(null);
    setShowForm(true);
  };

  /**
   * Handle form close
   */
  const handleFormClose = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  /**
   * Handle create/update transaction
   */
  const handleSubmit = async (data: CreateScheduledTransactionRequest) => {
    try {
      setIsSubmitting(true);
      if (editingTransaction) {
        await scheduledClient.updateScheduledTransaction(editingTransaction.id, data);
      } else {
        await scheduledClient.createScheduledTransaction(data);
      }
      setShowForm(false);
      setEditingTransaction(null);
      await fetchTransactions();
    } catch (err) {
      console.error('Failed to save scheduled transaction:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Dismiss error
   */
  const handleDismissError = () => {
    setError(null);
  };

  // Fetch on mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Fetch accounts and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsDataLoading(true);
        const [accountsData, categoriesData] = await Promise.all([
          accountsClient.getAccounts(false),
          categoriesClient.getOptions(),
        ]);
        setAccounts(
          accountsData
            .filter(a => a.isActive)
            .map(a => ({ id: a.id, name: a.displayName ?? a.name }))
        );
        setCategories(categoriesData.map(c => ({ id: c.id, name: c.name })));
      } catch (err) {
        console.error('Failed to load accounts/categories:', err);
        setError('Failed to load form data. Please refresh the page.');
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6" data-testid="scheduled-container">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scheduled Transactions</h1>
            <p className="text-sm text-gray-500">
              Manage your recurring bills, subscriptions, and planned payments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh scheduled transactions"
            aria-busy={isRefreshing}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
              transition-colors duration-200 border border-gray-300
              text-foreground bg-card hover:bg-muted active:bg-muted/80
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {/* Add New Button */}
          <button
            onClick={handleAddNew}
            disabled={isDataLoading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
              transition-colors duration-200 bg-blue-600 text-white
              hover:bg-blue-700 active:bg-blue-800
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add New
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={handleDismissError}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Transaction List */}
      <ScheduledTransactionList
        transactions={transactions}
        loading={isLoading}
        onTransactionClick={handleTransactionClick}
        onSkip={handleSkip}
        onComplete={handleComplete}
      />

      {/* Create/Edit Form Modal */}
      {showForm && (
        <ScheduledTransactionForm
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={handleFormClose}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}
