'use client';

import { memo, useState, useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import type {
  ScheduledTransaction,
  ScheduledTransactionStatus,
  TransactionType,
} from '@/services/scheduled.client';
import { ScheduledTransactionCard } from './ScheduledTransactionCard';

// =============================================================================
// Type Definitions
// =============================================================================

export interface ScheduledTransactionListProps {
  transactions: ScheduledTransaction[];
  loading?: boolean;
  onTransactionClick?: (scheduled: ScheduledTransaction) => void;
  onSkip?: (scheduled: ScheduledTransaction) => void;
  onComplete?: (scheduled: ScheduledTransaction) => void;
  compact?: boolean;
}

// =============================================================================
// Component Implementation
// =============================================================================

export const ScheduledTransactionList = memo(function ScheduledTransactionList({
  transactions,
  loading = false,
  onTransactionClick,
  onSkip,
  onComplete,
  compact = false,
}: ScheduledTransactionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScheduledTransactionStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          t.description.toLowerCase().includes(query) ||
          (t.merchantName?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && t.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [transactions, searchQuery, statusFilter, typeFilter]);

  const hasFilters = statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search scheduled transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors
            ${showFilters || hasFilters
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="flex items-center justify-center w-5 h-5 text-xs bg-blue-500 text-white rounded-full">
              {(statusFilter !== 'ALL' ? 1 : 0) +
                (typeFilter !== 'ALL' ? 1 : 0) +
                (searchQuery ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ScheduledTransactionStatus | 'ALL')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as TransactionType | 'ALL')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="DEBIT">Expenses</option>
                <option value="CREDIT">Income</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Count */}
      {hasFilters && (
        <p className="text-sm text-gray-500">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>
      )}

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {hasFilters
              ? 'No scheduled transactions match your filters'
              : 'No scheduled transactions yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((scheduled) => (
            <ScheduledTransactionCard
              key={scheduled.id}
              scheduled={scheduled}
              onClick={onTransactionClick}
              onSkip={onSkip}
              onComplete={onComplete}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default ScheduledTransactionList;
