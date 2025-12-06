'use client';

import { useState, useMemo, useCallback } from 'react';
import { TransactionRow } from './TransactionRow';
import { BulkActionsBar } from './BulkActionsBar';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { TransactionFormModal } from './TransactionFormModal';
import { RecategorizeDialog } from './RecategorizeDialog';
import { useTransactionsStore } from '@/store/transactions.store';
import { accountsClient, Account as ApiAccount } from '@/services/accounts.client';
import { categoriesClient, CategoryOption } from '@/services/categories.client';
import type { Transaction, CreateTransactionData, UpdateTransactionData } from '@/services/transactions.client';
import type { Account } from './TransactionForm';
import { Loader2, Search, Calendar, Filter, Download } from 'lucide-react';
import { downloadTransactionsCSV } from '@/utils/csv-export';

// =============================================================================
// Type Definitions
// =============================================================================

export interface EnhancedTransactionListProps {
  /** Transactions to display */
  transactions: Transaction[];
  /** Whether transactions are loading */
  isLoading?: boolean;
  /** Map of category IDs to names */
  categoryMap?: Map<string, string>;
  /** Map of account IDs to names */
  accountMap?: Map<string, string>;
  /** Callback when transactions change */
  onRefresh?: () => void;
}

interface FilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  type: 'all' | 'DEBIT' | 'CREDIT';
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * EnhancedTransactionList Component
 *
 * Full-featured transaction list with:
 * - Selection and bulk actions
 * - Edit/delete functionality
 * - Filtering and search
 * - Loading states
 */
export function EnhancedTransactionList({
  transactions,
  isLoading = false,
  categoryMap = new Map(),
  accountMap = new Map(),
  onRefresh,
}: EnhancedTransactionListProps) {
  // ========== State ==========
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    dateFrom: '',
    dateTo: '',
    type: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  // Recategorize state
  const [showRecategorizeDialog, setShowRecategorizeDialog] = useState(false);
  const [isBulkCategorizing, setIsBulkCategorizing] = useState(false);

  // Store
  const {
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    bulkUpdateCategory,
    isUpdating,
    isDeleting,
  } = useTransactionsStore();

  // ========== Filtered Transactions ==========
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesDescription = tx.description.toLowerCase().includes(searchLower);
        const matchesMerchant = tx.merchantName?.toLowerCase().includes(searchLower);
        if (!matchesDescription && !matchesMerchant) return false;
      }

      // Date filters
      if (filters.dateFrom) {
        const txDate = new Date(tx.date);
        const fromDate = new Date(filters.dateFrom);
        if (txDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const txDate = new Date(tx.date);
        const toDate = new Date(filters.dateTo);
        if (txDate > toDate) return false;
      }

      // Type filter
      if (filters.type !== 'all' && tx.type !== filters.type) return false;

      return true;
    });
  }, [transactions, filters]);

  // ========== Selection Handlers ==========
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredTransactions.map((tx) => tx.id)));
  }, [filteredTransactions]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0;

  // ========== Edit Handlers ==========
  const fetchFormData = useCallback(async () => {
    setIsLoadingFormData(true);
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountsClient.getAccounts(false),
        categoriesClient.getOptions(),
      ]);

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
      console.error('Failed to load form data:', err);
    } finally {
      setIsLoadingFormData(false);
    }
  }, []);

  const handleEdit = useCallback(
    async (transaction: Transaction) => {
      await fetchFormData();
      setEditingTransaction(transaction);
    },
    [fetchFormData]
  );

  const handleEditSuccess = useCallback(
    async (data: CreateTransactionData) => {
      if (!editingTransaction) return;

      try {
        // Strip accountId - it cannot be changed per backend validation
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { accountId, ...updateData } = data;
        await updateTransaction(editingTransaction.id, updateData as UpdateTransactionData);
        setEditingTransaction(null);
        onRefresh?.();
      } catch (err) {
        console.error('Failed to update transaction:', err);
      }
    },
    [editingTransaction, updateTransaction, onRefresh]
  );

  const handleEditClose = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  // ========== Delete Handlers ==========
  const handleDelete = useCallback((id: string) => {
    setDeletingIds([id]);
    setShowDeleteConfirm(true);
  }, []);

  const handleBulkDelete = useCallback(() => {
    setDeletingIds(Array.from(selectedIds));
    setShowDeleteConfirm(true);
  }, [selectedIds]);

  const handleConfirmDelete = useCallback(async () => {
    try {
      if (deletingIds.length === 1) {
        await deleteTransaction(deletingIds[0]);
      } else {
        await deleteTransactions(deletingIds);
      }
      setShowDeleteConfirm(false);
      setDeletingIds([]);
      setSelectedIds(new Set());
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete transactions:', err);
    }
  }, [deletingIds, deleteTransaction, deleteTransactions, onRefresh]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeletingIds([]);
  }, []);

  // ========== Bulk Categorize Handlers ==========
  const handleBulkCategorize = useCallback(async () => {
    // Load categories if not loaded
    if (categories.length === 0) {
      try {
        const categoriesData = await categoriesClient.getOptions();
        setCategories(categoriesData);
      } catch (err) {
        console.error('Failed to load categories:', err);
        return;
      }
    }
    setShowRecategorizeDialog(true);
  }, [categories.length]);

  const handleConfirmCategorize = useCallback(
    async (categoryId: string) => {
      setIsBulkCategorizing(true);
      try {
        await bulkUpdateCategory(Array.from(selectedIds), categoryId);
        setShowRecategorizeDialog(false);
        setSelectedIds(new Set());
        onRefresh?.();
      } catch (err) {
        console.error('Failed to bulk categorize:', err);
      } finally {
        setIsBulkCategorizing(false);
      }
    },
    [selectedIds, bulkUpdateCategory, onRefresh]
  );

  const handleCancelCategorize = useCallback(() => {
    setShowRecategorizeDialog(false);
  }, []);

  // ========== Export Handlers ==========
  const handleExportSelected = useCallback(() => {
    const selectedTransactions = transactions.filter((tx) => selectedIds.has(tx.id));
    downloadTransactionsCSV(selectedTransactions, {
      filename: 'transactions-selected',
      categoryMap,
      accountMap,
    });
  }, [transactions, selectedIds, categoryMap, accountMap]);

  const handleExportAll = useCallback(() => {
    downloadTransactionsCSV(filteredTransactions, {
      filename: 'transactions',
      categoryMap,
      accountMap,
    });
  }, [filteredTransactions, categoryMap, accountMap]);

  // ========== Filter Handlers ==========
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  }, []);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, dateFrom: e.target.value }));
  }, []);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, dateTo: e.target.value }));
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, type: e.target.value as FilterState['type'] }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', dateFrom: '', dateTo: '', type: 'all' });
  }, []);

  const hasActiveFilters = filters.search || filters.dateFrom || filters.dateTo || filters.type !== 'all';

  // ========== Check for active operations ==========
  const isAnyDeleting = deletingIds.some((id) => isDeleting[id]);

  // ========== Render ==========
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium
            transition-colors duration-150
            ${hasActiveFilters
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {[filters.dateFrom, filters.dateTo, filters.type !== 'all'].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Export All Button */}
        <button
          type="button"
          onClick={handleExportAll}
          disabled={filteredTransactions.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium
            text-gray-700 hover:bg-gray-50 transition-colors duration-150
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={handleDateFromChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={filters.dateTo}
                onChange={handleDateToChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={handleTypeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="DEBIT">Expenses</option>
              <option value="CREDIT">Income</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-gray-600">
        Showing <span className="font-semibold">{filteredTransactions.length}</span> of{' '}
        <span className="font-semibold">{transactions.length}</span> transactions
      </p>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600 font-medium">No transactions found</p>
          {hasActiveFilters && (
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              isSelected={selectedIds.has(tx.id)}
              isSelectable={true}
              isUpdating={isUpdating[tx.id] || false}
              isDeleting={isDeleting[tx.id] || false}
              categoryName={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
              accountName={accountMap.get(tx.accountId)}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={filteredTransactions.length}
        isAllSelected={isAllSelected}
        isProcessing={isAnyDeleting}
        onCategorize={handleBulkCategorize}
        onDelete={handleBulkDelete}
        onExport={handleExportSelected}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
      />

      {/* Edit Modal */}
      <TransactionFormModal
        isOpen={editingTransaction !== null}
        onClose={handleEditClose}
        transaction={editingTransaction || undefined}
        accounts={accounts}
        categories={categories}
        onSuccess={handleEditSuccess}
        isLoading={isLoadingFormData || (editingTransaction ? isUpdating[editingTransaction.id] : false)}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        count={deletingIds.length}
        isDeleting={isAnyDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Recategorize Dialog */}
      <RecategorizeDialog
        isOpen={showRecategorizeDialog}
        transactionIds={Array.from(selectedIds)}
        categories={categories}
        onConfirm={handleConfirmCategorize}
        onCancel={handleCancelCategorize}
        isProcessing={isBulkCategorizing}
      />
    </div>
  );
}

export default EnhancedTransactionList;
