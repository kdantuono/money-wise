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

  // ========== Load categories on mount (needed for icons + filters) ==========
  useEffect(() => {
    if (categories.length === 0) {
      categoriesClient.getOptions().then(setCategories).catch(console.error);
    }
  }, [categories.length]);

  // Category icon map: ID → emoji
  const categoryIconMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(cat => {
      if (cat.icon) {
        const emoji = getCategoryIcon(cat.icon);
        if (emoji) map.set(cat.id, emoji);
      }
    });
    return map;
  }, [categories]);

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

      // Date filters — string comparison (YYYY-MM-DD) avoids timezone bugs
      const txDateStr = tx.date.slice(0, 10);
      if (filters.dateFrom && txDateStr < filters.dateFrom) return false;
      if (filters.dateTo && txDateStr > filters.dateTo) return false;

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar — Figma style */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Cerca transazioni..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-3 py-2.5 border border-border/50 rounded-xl text-[13px] bg-background
              focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
              placeholder:text-muted-foreground/40 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all
            ${hasActiveFilters
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
        >
          <Filter className="h-4 w-4" />
          Filtri
          {hasActiveFilters && (
            <span className="ml-0.5 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded-full font-bold">
              {[filters.dateFrom, filters.dateTo, filters.type !== 'all', filters.categoryId !== 'all', filters.amountMin !== null, filters.amountMax !== null].filter(Boolean).length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleExportAll}
          disabled={filteredTransactions.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-border/50 rounded-xl text-[13px] font-medium
            text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Esporta CSV
        </button>
      </div>

      {/* Expanded Filters — Figma design language */}
      {showFilters && (
        <div className="p-5 bg-background rounded-2xl border border-border/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Da</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={handleDateFromChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-border/50 rounded-xl text-[13px] bg-background
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">A</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={handleDateToChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-border/50 rounded-xl text-[13px] bg-background
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label htmlFor="filter-type" className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Tipo</label>
              <select
                id="filter-type"
                value={filters.type}
                onChange={handleTypeChange}
                className="w-full px-3 py-2.5 border border-border/50 rounded-xl text-[13px] bg-background
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
              >
                <option value="all">Tutti i tipi</option>
                <option value="DEBIT">Uscite</option>
                <option value="CREDIT">Entrate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="filter-category" className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Categoria</label>
              <select
                id="filter-category"
                value={filters.categoryId}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2.5 border border-border/50 rounded-xl text-[13px] bg-background
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
              >
                <option value="all">Tutte le categorie</option>
                <option value="uncategorized">Non categorizzate</option>
                {categories.map((cat) => {
                  const icon = categoryIconMap.get(cat.id);
                  return (
                    <option key={cat.id} value={cat.id}>
                      {icon ? `${icon} ` : ''}{cat.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label htmlFor="filter-min-amount" className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Importo min</label>
              <input
                id="filter-min-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="€0,00"
                value={filters.amountMin ?? ''}
                onChange={handleAmountMinChange}
                className="w-full px-3 py-2.5 border border-border/50 rounded-xl text-[13px] bg-background
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
                  placeholder:text-muted-foreground/30 transition-all"
              />
            </div>
            <div>
              <label htmlFor="filter-max-amount" className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Importo max</label>
              <input
                id="filter-max-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Nessun limite"
                value={filters.amountMax ?? ''}
                onChange={handleAmountMaxChange}
                className="w-full px-3 py-2.5 border border-border/50 rounded-xl text-[13px] bg-background
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
                  placeholder:text-muted-foreground/30 transition-all"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
              <ArrowUpDown className="inline-block h-3 w-3 mr-1" />
              Ordina per
            </label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { field: 'date' as const, label: 'Data' },
                { field: 'amount' as const, label: 'Importo' },
                { field: 'description' as const, label: 'A-Z' },
                { field: 'category' as const, label: 'Categoria' },
              ]).map(({ field, label }) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => handleSortChange(field)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all
                    ${sort.field === field
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-muted/30 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  {label} {sort.field === field && (sort.direction === 'desc' ? '↓' : '↑')}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium"
            >
              Cancella tutti i filtri
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      <p className="text-[12px] text-muted-foreground/60">
        {filteredTransactions.length} di{' '}
        <span className="font-medium">{transactions.length}</span> transazioni
      </p>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center">
          <p className="text-[13px] text-muted-foreground font-medium">Nessuna transazione trovata</p>
          {hasActiveFilters && (
            <p className="text-[12px] text-muted-foreground/60 mt-1">Prova a modificare i filtri</p>
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
              categoryIcon={tx.categoryId ? categoryIconMap.get(tx.categoryId) : undefined}
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
