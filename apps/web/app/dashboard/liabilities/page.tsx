/**
 * Dashboard Liabilities Page — Debiti
 *
 * Gestione debiti (carte di credito, BNPL, finanziamenti, mutui, altro).
 * Sprint 1.6.6 #047: italianizzazione completa + currency EUR + Figma conformance.
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

  const fetchLiabilities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await liabilitiesClient.getLiabilities();
      setLiabilities(data);
    } catch (err) {
      console.error('Failed to fetch liabilities:', err);
      setError(err instanceof Error ? err.message : 'Impossibile caricare i debiti');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await liabilitiesClient.getLiabilities();
      setLiabilities(data);
    } catch (err) {
      console.error('Failed to refresh liabilities:', err);
      setError(err instanceof Error ? err.message : 'Impossibile aggiornare i debiti');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLiabilityClick = useCallback(
    (liability: Liability) => {
      router.push(`/dashboard/liabilities/${liability.id}`);
    },
    [router]
  );

  const handleAddNew = () => {
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
  };

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

  const handleDismissError = () => {
    setError(null);
  };

  // Fetch on mount
  useEffect(() => {
    fetchLiabilities();
  }, [fetchLiabilities]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6" data-testid="liabilities-container">
      {/* Page Header — Figma pattern 1:1 con Accounts/Goals */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <CreditCard className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[32px] tracking-[-0.03em] text-foreground">Debiti</h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              Gestisci carte di credito, finanziamenti, mutui e piani di rateizzazione
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Aggiorna elenco debiti"
          aria-busy={isRefreshing}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-[13px] font-medium
            transition-colors duration-200 border border-border/50
            text-foreground bg-card hover:bg-muted active:bg-muted/80
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isRefreshing ? 'Aggiornamento...' : 'Aggiorna'}
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-700 dark:text-rose-300 flex-1">{error}</p>
          <button
            onClick={handleDismissError}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-800 text-sm font-medium"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Liability list */}
      <LiabilityList
        liabilities={liabilities}
        isLoading={isLoading}
        error={error}
        onLiabilityClick={handleLiabilityClick}
        onAddNew={handleAddNew}
      />

      {/* Create form modal */}
      <LiabilityForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSubmit={handleCreateLiability}
        isLoading={isCreating}
      />
    </div>
  );
}
