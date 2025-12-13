'use client';

import { useState, useCallback, useEffect } from 'react';
import { TransactionFormModal } from './TransactionFormModal';
import { useTransactionsStore } from '@/store/transactions.store';
import { accountsClient, Account as ApiAccount } from '@/services/accounts.client';
import { categoriesClient, CategoryOption } from '@/services/categories.client';
import type { CreateTransactionData } from '@/services/transactions.client';
import type { Account } from './TransactionForm';

// =============================================================================
// Type Definitions
// =============================================================================

export interface QuickAddTransactionProps {
  /** Trigger element render function */
  trigger: (props: { onClick: () => void }) => React.ReactNode;
  /** Callback after successful creation */
  onSuccess?: () => void;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * QuickAddTransaction Component
 *
 * Provides a reusable way to add transactions from anywhere in the app.
 * Manages modal state, data fetching, and store integration.
 *
 * @example
 * ```tsx
 * <QuickAddTransaction
 *   trigger={({ onClick }) => (
 *     <button onClick={onClick}>Add Transaction</button>
 *   )}
 *   onSuccess={() => console.log('Transaction added!')}
 * />
 * ```
 */
export function QuickAddTransaction({
  trigger,
  onSuccess,
}: QuickAddTransactionProps) {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Form data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Store
  const { createTransaction, isCreating, createError, clearErrors } =
    useTransactionsStore();

  // Fetch data when modal opens
  const fetchFormData = useCallback(async () => {
    setIsLoadingData(true);
    setDataError(null);

    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountsClient.getAccounts(false), // Don't include hidden accounts
        categoriesClient.getOptions(),
      ]);

      // Map accounts to form format
      const mappedAccounts: Account[] = accountsData
        .filter((acc: ApiAccount) => acc.isActive)
        .map((acc: ApiAccount) => ({
          id: acc.id,
          name: acc.displayName || acc.name,
          type: acc.type,
          balance: acc.currentBalance,
          currency: acc.currency,
        }));

      setAccounts(mappedAccounts);
      setCategories(categoriesData);
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Failed to load accounts and categories'
      );
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFormData();
    }
  }, [isOpen, fetchFormData]);

  // Open modal
  const handleOpen = useCallback(() => {
    clearErrors();
    setIsOpen(true);
  }, [clearErrors]);

  // Close modal
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setDataError(null);
  }, []);

  // Handle form submission
  const handleSuccess = useCallback(
    async (data: CreateTransactionData) => {
      try {
        await createTransaction(data);
        setIsOpen(false);
        onSuccess?.();
      } catch {
        // Error is handled by the store
      }
    },
    [createTransaction, onSuccess]
  );

  return (
    <>
      {trigger({ onClick: handleOpen })}

      <TransactionFormModal
        isOpen={isOpen}
        onClose={handleClose}
        accounts={accounts}
        categories={categories}
        onSuccess={handleSuccess}
        isLoading={isCreating}
        error={createError}
      />

      {/* Loading overlay for data fetch */}
      {isOpen && isLoadingData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-700">Loading...</span>
            </div>
          </div>
        </div>
      )}

      {/* Data loading error display */}
      {isOpen && dataError && (
        <div className="fixed bottom-4 right-4 z-[60] bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm">
          <p className="text-red-600 text-sm font-medium">{dataError}</p>
          <button
            type="button"
            onClick={() => setDataError(null)}
            className="mt-2 text-red-600 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

export default QuickAddTransaction;
