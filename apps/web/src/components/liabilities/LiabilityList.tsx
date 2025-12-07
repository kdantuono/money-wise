'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Filter, Search, SortAsc, SortDesc } from 'lucide-react';
import { LiabilityCard } from './LiabilityCard';
import type { Liability, LiabilityType, LiabilityStatus } from '@/services/liabilities.client';

// =============================================================================
// Type Definitions
// =============================================================================

type SortField = 'name' | 'currentBalance' | 'type' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export interface LiabilityListProps {
  /** List of liabilities to display */
  liabilities: Liability[];
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when a liability is clicked */
  onLiabilityClick?: (liability: Liability) => void;
  /** Callback when add new is clicked */
  onAddNew?: () => void;
}

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

// =============================================================================
// Component Implementation
// =============================================================================

export function LiabilityList({
  liabilities,
  isLoading = false,
  error = null,
  onLiabilityClick,
  onAddNew,
}: LiabilityListProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LiabilityType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<LiabilityStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('currentBalance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter and sort liabilities
  const filteredLiabilities = useMemo(() => {
    let result = [...liabilities];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.provider?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (typeFilter !== 'ALL') {
      result = result.filter((l) => l.type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'currentBalance':
          comparison = a.currentBalance - b.currentBalance;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [liabilities, searchQuery, typeFilter, statusFilter, sortField, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    const activeLiabilities = liabilities.filter((l) => l.status === 'ACTIVE');
    return {
      totalOwed: activeLiabilities.reduce((sum, l) => sum + l.currentBalance, 0),
      totalCreditLimit: activeLiabilities
        .filter((l) => l.creditLimit)
        .reduce((sum, l) => sum + (l.creditLimit || 0), 0),
      count: activeLiabilities.length,
    };
  }, [liabilities]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((current) => {
      if (current === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortDirection('desc');
      }
      return field;
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Owed</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totals.totalOwed)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Credit Limit</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totals.totalCreditLimit)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Liabilities</p>
          <p className="text-2xl font-bold text-gray-900">{totals.count}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search liabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors
            ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>

        {/* Add New Button */}
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Liability
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LiabilityType | 'ALL')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="BNPL">Buy Now Pay Later</option>
              <option value="LOAN">Loan</option>
              <option value="MORTGAGE">Mortgage</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LiabilityStatus | 'ALL')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAID_OFF">Paid Off</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="currentBalance">Balance</option>
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="createdAt">Date Added</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="h-5 w-5" />
                ) : (
                  <SortDesc className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-gray-500">
        Showing {filteredLiabilities.length} of {liabilities.length} liabilities
      </p>

      {/* Liability Cards */}
      {filteredLiabilities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500 mb-4">
            {liabilities.length === 0
              ? 'No liabilities yet. Add your first one to get started!'
              : 'No liabilities match your filters.'}
          </p>
          {onAddNew && liabilities.length === 0 && (
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Liability
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredLiabilities.map((liability) => (
            <LiabilityCard
              key={liability.id}
              liability={liability}
              onClick={onLiabilityClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default LiabilityList;
