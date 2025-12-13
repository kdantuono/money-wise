/**
 * Dashboard Liabilities Page
 *
 * Main page for managing liabilities including credit cards, BNPL,
 * loans, mortgages, and other debts.
 *
 * @module app/dashboard/liabilities/page
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import {
  LiabilityList,
  LiabilityForm,
} from '@/components/liabilities';
import {
  liabilitiesClient,
  type Liability,
  type CreateLiabilityRequest,
} from '@/services/liabilities.client';

// =============================================================================
// Component
// =============================================================================

export default function LiabilitiesPage() {
  const router = useRouter();

  // State
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Fetch all liabilities
   */
  const fetchLiabilities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await liabilitiesClient.getLiabilities();
      setLiabilities(data);
    } catch (err) {
      console.error('Failed to fetch liabilities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load liabilities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh liabilities
   */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await liabilitiesClient.getLiabilities();
      setLiabilities(data);
    } catch (err) {
      console.error('Failed to refresh liabilities:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh liabilities');
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle liability click - navigate to detail page
   */
  const handleLiabilityClick = useCallback(
    (liability: Liability) => {
      router.push(`/dashboard/liabilities/${liability.id}`);
    },
    [router]
  );

  /**
   * Handle add new liability
   */
  const handleAddNew = () => {
    setShowForm(true);
  };

  /**
   * Handle form close
   */
  const handleFormClose = () => {
    setShowForm(false);
  };

  /**
   * Handle create liability
   */
  const handleCreateLiability = async (data: CreateLiabilityRequest) => {
    try {
      setIsCreating(true);
      await liabilitiesClient.createLiability(data);
      setShowForm(false);
      await fetchLiabilities();
    } catch (err) {
      console.error('Failed to create liability:', err);
      throw err;
    } finally {
      setIsCreating(false);
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
    fetchLiabilities();
  }, [fetchLiabilities]);

  return (
    <div className="space-y-6" data-testid="liabilities-container">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <CreditCard className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Liabilities</h1>
            <p className="text-sm text-gray-500">
              Manage your credit cards, loans, and payment plans
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh liabilities"
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

      {/* Liability List */}
      <LiabilityList
        liabilities={liabilities}
        isLoading={isLoading}
        error={error}
        onLiabilityClick={handleLiabilityClick}
        onAddNew={handleAddNew}
      />

      {/* Create Form Modal */}
      <LiabilityForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSubmit={handleCreateLiability}
        isLoading={isCreating}
      />
    </div>
  );
}
