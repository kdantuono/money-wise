'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Loader2, Search, Calendar, Filter, Download, ArrowUpDown } from 'lucide-react';
import { downloadTransactionsCSV } from '@/utils/csv-export';

// =============================================================================
// Icon Mapping
// =============================================================================

const CATEGORY_ICONS: Record<string, string> = {
  // Food & Dining
  'shopping-cart': '🛒',
  'utensils': '🍴',
  'coffee': '☕',
  'wine': '🍷',
  'pizza': '🍕',
  'apple': '🍎',
  // Transportation
  'car': '🚗',
  'plane': '✈️',
  'airplane': '✈️',
  'train': '🚂',
  'bus': '🚌',
  'bike': '🚲',
  'fuel': '⛽',
  'truck': '🚚',
  'parking': '🅿️',
  // Entertainment
  'film': '🎬',
  'music': '🎵',
  'tv': '📺',
  'gamepad': '🎮',
  'ticket': '🎫',
  'play': '▶️',
  // Shopping
  'shopping-bag': '🛍️',
  'shirt': '👕',
  'gift': '🎁',
  'tag': '🏷️',
  'building-storefront': '🏪',
  'receipt-percent': '🧾',
  // Home & Utilities
  'home': '🏠',
  'bolt': '⚡',
  'droplet': '💧',
  'wifi': '📶',
  'phone': '📱',
  'wrench': '🔧',
  'fire': '🔥',
  'key': '🔑',
  // Health & Personal
  'heart': '❤️',
  'pill': '💊',
  'activity': '💪',
  'dumbbell': '🏋️',
  'scissors': '✂️',
  'sparkles': '✨',
  'shield-check': '🛡️',
  'medical-bag': '🏥',
  'user': '👤',
  'child': '👶',
  'paw': '🐾',
  // Finance
  'wallet': '💰',
  'piggy-bank': '🐷',
  'credit-card': '💳',
  'bank': '🏦',
  'coins': '🪙',
  'trending-up': '📈',
  'trending-down': '📉',
  'banknotes': '💵',
  'currency-dollar': '💲',
  'percent': '💯',
  'chart-bar': '📊',
  // Education & Work
  'book': '📚',
  'graduation-cap': '🎓',
  'academic-cap': '🎓',
  'briefcase': '💼',
  'laptop': '💻',
  'pen': '✏️',
  'document-text': '📄',
  'computer-desktop': '🖥️',
  'building-office': '🏢',
  'building-library': '🏛️',
  // Travel & Leisure
  'map': '🗺️',
  'compass': '🧭',
  'camera': '📷',
  'umbrella': '☂️',
  // Transfers
  'arrow-right-left': '↔️',
  'arrows-right-left': '↔️',
  'arrow-uturn-left': '↩️',
  'repeat': '🔄',
  'send': '📤',
  'download': '📥',
  // Default/Other
  'circle': '⚪',
  'folder': '📁',
  'star': '⭐',
  'flag': '🚩',
  'question-mark-circle': '❓',
  'plus-circle': '➕',
};

function getCategoryIcon(iconName: string | null): string {
  if (!iconName) return '';
  return CATEGORY_ICONS[iconName.toLowerCase()] || '';
}

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
  categoryId: string; // 'all', 'uncategorized', or specific category ID
  amountMin: number | null;
  amountMax: number | null;
}

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
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
    categoryId: 'all',
    amountMin: null,
    amountMax: null,
  });
  const [sort, setSort] = useState<SortState>({
    field: 'date',
    direction: 'desc',
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

  // ========== Load categories when filters are shown ==========
  useEffect(() => {
    if (showFilters && categories.length === 0) {
      categoriesClient.getOptions().then(setCategories).catch(console.error);
    }
  }, [showFilters, categories.length]);

  // ========== Filtered and Sorted Transactions ==========
  const filteredTransactions = useMemo(() => {
    // First, filter
    const filtered = transactions.filter((tx) => {
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

      // Category filter
      if (filters.categoryId !== 'all') {
        if (filters.categoryId === 'uncategorized') {
          if (tx.categoryId) return false; // Has category, but we want uncategorized
        } else {
          if (tx.categoryId !== filters.categoryId) return false; // Specific category
        }
      }

      // Amount range filter
      const amount = Math.abs(tx.amount);
      if (filters.amountMin !== null && amount < filters.amountMin) return false;
      if (filters.amountMax !== null && amount > filters.amountMax) return false;

      return true;
    });

    // Then, sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case 'description': {
          const descA = (a.merchantName || a.description).toLowerCase();
          const descB = (b.merchantName || b.description).toLowerCase();
          comparison = descA.localeCompare(descB);
          break;
        }
        case 'category': {
          const catA = (a.categoryId ? categoryMap.get(a.categoryId) : '') || '';
          const catB = (b.categoryId ? categoryMap.get(b.categoryId) : '') || '';
          comparison = catA.toLowerCase().localeCompare(catB.toLowerCase());
          break;
        }
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [transactions, filters, sort, categoryMap]);

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

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, categoryId: e.target.value }));
  }, []);

  const handleAmountMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      amountMin: value ? parseFloat(value) : null,
    }));
  }, []);

  const handleAmountMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      amountMax: value ? parseFloat(value) : null,
    }));
  }, []);

  const handleSortChange = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', dateFrom: '', dateTo: '', type: 'all', categoryId: 'all', amountMin: null, amountMax: null });
  }, []);

  const hasActiveFilters = filters.search || filters.dateFrom || filters.dateTo || filters.type !== 'all' || filters.categoryId !== 'all' || filters.amountMin !== null || filters.amountMax !== null;

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
              {[filters.dateFrom, filters.dateTo, filters.type !== 'all', filters.categoryId !== 'all', filters.amountMin !== null, filters.amountMax !== null].filter(Boolean).length}
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
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          {/* First Row: Date Range & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label htmlFor="filter-type" className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                id="filter-type"
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
          </div>

          {/* Second Row: Category & Amount Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="filter-category" className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                id="filter-category"
                value={filters.categoryId}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="uncategorized">Uncategorized</option>
                {categories.map((cat) => {
                  const icon = getCategoryIcon(cat.icon);
                  return (
                    <option key={cat.id} value={cat.id}>
                      {icon ? `${icon} ` : ''}{cat.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="filter-min-amount" className="block text-xs font-medium text-gray-600 mb-1">Min Amount</label>
              <input
                id="filter-min-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="$0.00"
                value={filters.amountMin ?? ''}
                onChange={handleAmountMinChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>

            <div>
              <label htmlFor="filter-max-amount" className="block text-xs font-medium text-gray-600 mb-1">Max Amount</label>
              <input
                id="filter-max-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="No limit"
                value={filters.amountMax ?? ''}
                onChange={handleAmountMaxChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Third Row: Sort Options */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              <ArrowUpDown className="inline-block h-3 w-3 mr-1" />
              Sort By
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSortChange('date')}
                className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${sort.field === 'date'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Date {sort.field === 'date' && (sort.direction === 'desc' ? '↓' : '↑')}
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('amount')}
                className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${sort.field === 'amount'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Amount {sort.field === 'amount' && (sort.direction === 'desc' ? '↓' : '↑')}
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('description')}
                className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${sort.field === 'description'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                A-Z {sort.field === 'description' && (sort.direction === 'desc' ? '↓' : '↑')}
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('category')}
                className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${sort.field === 'category'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Category {sort.field === 'category' && (sort.direction === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div>
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
