'use client';

import { useState, useMemo } from 'react';
import { TransactionSkeleton } from './LoadingStates';

/**
 * TransactionList Component
 *
 * Displays transactions for a bank account with filtering and pagination.
 * Provides date range filtering, description search, and visual transaction categorization.
 *
 * Features:
 * - Infinite scroll or pagination
 * - Date range filtering with visual indicators
 * - Description search with highlighting
 * - Color-coded transaction types (income/expense)
 * - Responsive table/list layout
 * - Loading skeletons
 * - Empty state messaging
 *
 * @example
 * <TransactionList
 *   accountId="acc-123"
 *   transactions={transactions}
 *   isLoading={false}
 *   onLoadMore={() => handleLoadMore()}
 * />
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

interface TransactionListProps {
  /** Account ID for the transactions */
  accountId: string;
  /** Array of transactions to display */
  transactions?: Transaction[];
  /** Whether transactions are loading */
  isLoading?: boolean;
  /** Whether more transactions are available */
  hasMore?: boolean;
  /** Called to load more transactions */
  onLoadMore?: () => void | Promise<void>;
  /** Optional CSS classes */
  className?: string;
}

type SortField = 'date' | 'amount' | 'description';
type SortDirection = 'asc' | 'desc';
type TransactionType = 'ALL' | 'DEBIT' | 'CREDIT';

interface FilterState {
  dateFrom: Date | null;
  dateTo: Date | null;
  searchQuery: string;
  type: TransactionType;
  amountMin: number | null;
  amountMax: number | null;
}

interface SortState {
  field: SortField;
  direction: SortDirection;
}

const DEFAULT_ITEMS_PER_PAGE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export function TransactionList({
  transactions = [],
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className = '',
}: TransactionListProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    searchQuery: '',
    type: 'ALL',
    amountMin: null,
    amountMax: null,
  });
  const [sort, setSort] = useState<SortState>({
    field: 'date',
    direction: 'desc',
  });
  const [pageSize, setPageSize] = useState<number>(DEFAULT_ITEMS_PER_PAGE);
  const [displayedCount, setDisplayedCount] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * Filter, search, and sort transactions
   */
  const filteredTransactions = useMemo(() => {
    // First, filter
    const filtered = transactions.filter((tx) => {
      // Date range filter
      const txDate = new Date(tx.date);
      if (filters.dateFrom && txDate < filters.dateFrom) return false;
      if (filters.dateTo && txDate > filters.dateTo) return false;

      // Type filter
      if (filters.type !== 'ALL' && tx.type !== filters.type) return false;

      // Amount range filter
      const amount = Math.abs(tx.amount);
      if (filters.amountMin !== null && amount < filters.amountMin) return false;
      if (filters.amountMax !== null && amount > filters.amountMax) return false;

      // Search filter (description or merchant)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const description = tx.description.toLowerCase();
        const merchant = tx.merchant?.toLowerCase() ?? '';
        if (!description.includes(query) && !merchant.includes(query)) return false;
      }

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
          const descA = (a.merchant || a.description).toLowerCase();
          const descB = (b.merchant || b.description).toLowerCase();
          comparison = descA.localeCompare(descB);
          break;
        }
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [transactions, filters, sort]);

  const displayedTransactions = filteredTransactions.slice(0, displayedCount);

  const handleLoadMore = async () => {
    if (displayedCount >= filteredTransactions.length && hasMore) {
      setIsLoadingMore(true);
      try {
        await onLoadMore?.();
      } finally {
        setIsLoadingMore(false);
      }
    } else {
      setDisplayedCount((prev) => prev + pageSize);
    }
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      dateFrom: e.target.value ? new Date(e.target.value) : null,
    }));
    setDisplayedCount(pageSize);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      dateTo: e.target.value ? new Date(e.target.value) : null,
    }));
    setDisplayedCount(pageSize);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: e.target.value,
    }));
    setDisplayedCount(pageSize);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      type: e.target.value as TransactionType,
    }));
    setDisplayedCount(pageSize);
  };

  const handleAmountMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      amountMin: value ? parseFloat(value) : null,
    }));
    setDisplayedCount(pageSize);
  };

  const handleAmountMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      amountMax: value ? parseFloat(value) : null,
    }));
    setDisplayedCount(pageSize);
  };

  const handleSortChange = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setDisplayedCount(newSize);
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      searchQuery: '',
      type: 'ALL',
      amountMin: null,
      amountMax: null,
    });
    setDisplayedCount(pageSize);
  };

  const hasActiveFilters =
    filters.dateFrom || filters.dateTo || filters.searchQuery ||
    filters.type !== 'ALL' || filters.amountMin !== null || filters.amountMax !== null;

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Controls */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Filters & Search
          </h2>
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="page-size"
              className="text-xs font-medium text-gray-600"
            >
              Show:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={handlePageSizeChange}
              aria-label="Number of results per page"
              className="px-2 py-1 border border-gray-300 rounded text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">per page</span>
          </div>
        </div>

        {/* First Row: Search, Type, Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          {/* Search Input */}
          <div>
            <label
              htmlFor="transaction-search"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Search Description
            </label>
            <input
              id="transaction-search"
              type="text"
              placeholder="Enter description or merchant..."
              value={filters.searchQuery}
              onChange={handleSearchChange}
              aria-label="Search transactions by description or merchant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                placeholder-gray-400"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label
              htmlFor="transaction-type"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Type
            </label>
            <select
              id="transaction-type"
              value={filters.type}
              onChange={handleTypeChange}
              aria-label="Filter by transaction type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="CREDIT">Income Only</option>
              <option value="DEBIT">Expenses Only</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label
              htmlFor="date-from"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              From Date
            </label>
            <input
              id="date-from"
              type="date"
              value={
                filters.dateFrom
                  ? filters.dateFrom.toISOString().split('T')[0]
                  : ''
              }
              onChange={handleDateFromChange}
              aria-label="Filter transactions from this date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label
              htmlFor="date-to"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              To Date
            </label>
            <input
              id="date-to"
              type="date"
              value={
                filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''
              }
              onChange={handleDateToChange}
              aria-label="Filter transactions to this date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Second Row: Amount Range & Sort */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          {/* Amount Min */}
          <div>
            <label
              htmlFor="amount-min"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Min Amount
            </label>
            <input
              id="amount-min"
              type="number"
              min="0"
              step="0.01"
              placeholder="$0.00"
              value={filters.amountMin ?? ''}
              onChange={handleAmountMinChange}
              aria-label="Minimum transaction amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                placeholder-gray-400"
            />
          </div>

          {/* Amount Max */}
          <div>
            <label
              htmlFor="amount-max"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Max Amount
            </label>
            <input
              id="amount-max"
              type="number"
              min="0"
              step="0.01"
              placeholder="No limit"
              value={filters.amountMax ?? ''}
              onChange={handleAmountMaxChange}
              aria-label="Maximum transaction amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                placeholder-gray-400"
            />
          </div>

          {/* Sort Options */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSortChange('date')}
                aria-label={`Sort by date ${sort.field === 'date' ? (sort.direction === 'desc' ? 'descending' : 'ascending') : ''}`}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${sort.field === 'date'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Date {sort.field === 'date' && (sort.direction === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSortChange('amount')}
                aria-label={`Sort by amount ${sort.field === 'amount' ? (sort.direction === 'desc' ? 'descending' : 'ascending') : ''}`}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${sort.field === 'amount'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Amount {sort.field === 'amount' && (sort.direction === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSortChange('description')}
                aria-label={`Sort alphabetically ${sort.field === 'description' ? (sort.direction === 'desc' ? 'descending' : 'ascending') : ''}`}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${sort.field === 'description'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                A-Z {sort.field === 'description' && (sort.direction === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            aria-label="Clear all filters"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Info */}
      {filteredTransactions.length > 0 && (
        <p className="text-sm text-gray-600">
          Showing{' '}
          <span className="font-semibold">
            {displayedTransactions.length}
          </span>{' '}
          of{' '}
          <span className="font-semibold">
            {filteredTransactions.length}
          </span>{' '}
          transactions
        </p>
      )}

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div
          className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center"
          role="status"
        >
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600 font-medium">No transactions found</p>
          {hasActiveFilters && (
            <p className="text-gray-500 text-sm mt-1">
              Try adjusting your filters
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-lg border border-gray-200 hover:border-gray-300 bg-white p-4
                transition-all duration-150 hover:shadow focus-within:ring-2 focus-within:ring-blue-500"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Transaction Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {tx.merchant || tx.description}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {tx.reference && `Ref: ${tx.reference}`}
                    {tx.status === 'pending' && (
                      <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </p>
                  <time className="text-xs text-gray-500">
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(tx.date))}
                  </time>
                </div>

                {/* Amount with Arrow Indicator */}
                <div className="flex items-center gap-2">
                  {/* Arrow indicator */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      tx.type === 'CREDIT'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}
                    aria-hidden="true"
                  >
                    {tx.type === 'CREDIT' ? (
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-semibold ${
                        tx.type === 'CREDIT'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                      aria-label={`${tx.type === 'CREDIT' ? 'Income' : 'Expense'}: ${tx.amount}`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '−'}
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: tx.currency || 'USD',
                      }).format(Math.abs(tx.amount))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {(displayedCount < filteredTransactions.length || hasMore) && (
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          aria-busy={isLoadingMore}
          aria-label="Load more transactions"
          className="w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200
            bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingMore ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading more...
            </span>
          ) : (
            'Load More Transactions'
          )}
        </button>
      )}
    </div>
  );
}
