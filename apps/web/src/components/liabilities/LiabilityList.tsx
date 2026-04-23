'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Filter, Search, SortAsc, SortDesc } from 'lucide-react';
import { LiabilityCard } from './LiabilityCard';
import type { Liability, LiabilityType, LiabilityStatus } from '@/services/liabilities.client';
import { useActiveGoals } from '@/hooks/useActiveGoals';

// =============================================================================
// Types
// =============================================================================

type SortField = 'name' | 'currentBalance' | 'type' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export interface LiabilityListProps {
  liabilities: Liability[];
  isLoading?: boolean;
  error?: string | null;
  onLiabilityClick?: (liability: Liability) => void;
  onAddNew?: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

// #047: EUR default + it-IT locale
function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// =============================================================================
// Component
// =============================================================================

export function LiabilityList({
  liabilities,
  isLoading = false,
  error = null,
  onLiabilityClick,
  onAddNew,
}: LiabilityListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LiabilityType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<LiabilityStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const [sortField, setSortField] = useState<SortField>('currentBalance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sprint 1.6 Fase 2B: goalId -> name map for badge rendering
  const { data: activeGoals = [] } = useActiveGoals();
  const goalNameById = useMemo(
    () => new Map(activeGoals.map((g) => [g.id, g.name])),
    [activeGoals]
  );

  const filteredLiabilities = useMemo(() => {
    let result = [...liabilities];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.provider?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((l) => l.type === typeFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((l) => l.status === statusFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'it-IT');
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-muted rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:underline"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards — Figma-style rounded-2xl shadow-sm border-0 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border-0 shadow-sm p-5">
          <p className="text-sm text-muted-foreground">Totale Dovuto</p>
          <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
            {formatCurrency(totals.totalOwed)}
          </p>
        </div>
        <div className="bg-card rounded-2xl border-0 shadow-sm p-5">
          <p className="text-sm text-muted-foreground">Limite Credito Totale</p>
          <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
            {formatCurrency(totals.totalCreditLimit)}
          </p>
        </div>
        <div className="bg-card rounded-2xl border-0 shadow-sm p-5">
          <p className="text-sm text-muted-foreground">Debiti Attivi</p>
          <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{totals.count}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca debiti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-card focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Cerca debiti"
          />
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 border rounded-xl transition-colors
            ${showFilters
              ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'border-border text-foreground hover:bg-muted'}`}
        >
          <Filter className="h-4 w-4" />
          Filtri
        </button>

        {/* Add new */}
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Aggiungi debito
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-2xl border border-border">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tipo
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LiabilityType | 'ALL')}
              className="border border-border rounded-xl px-3 py-2 bg-card focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tutti i tipi</option>
              <option value="CREDIT_CARD">Carta di credito</option>
              <option value="BNPL">Buy Now Pay Later</option>
              <option value="LOAN">Finanziamento</option>
              <option value="MORTGAGE">Mutuo</option>
              <option value="OTHER">Altro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Stato
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LiabilityStatus | 'ALL')}
              className="border border-border rounded-xl px-3 py-2 bg-card focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tutti gli stati</option>
              <option value="ACTIVE">Attivo</option>
              <option value="PAID_OFF">Estinto</option>
              <option value="CLOSED">Chiuso</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Ordina per
            </label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="border border-border rounded-xl px-3 py-2 bg-card focus:ring-2 focus:ring-blue-500"
              >
                <option value="currentBalance">Saldo</option>
                <option value="name">Nome</option>
                <option value="type">Tipo</option>
                <option value="createdAt">Data aggiunta</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="p-2 border border-border rounded-xl bg-card hover:bg-muted"
                aria-label={`Ordine ${sortDirection === 'asc' ? 'decrescente' : 'crescente'}`}
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

      {/* Results counter */}
      <p className="text-sm text-muted-foreground">
        {filteredLiabilities.length === liabilities.length
          ? `${liabilities.length} ${liabilities.length === 1 ? 'debito' : 'debiti'}`
          : `${filteredLiabilities.length} di ${liabilities.length} ${liabilities.length === 1 ? 'debito' : 'debiti'}`}
      </p>

      {/* Grid */}
      {filteredLiabilities.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border-0 shadow-sm">
          <p className="text-muted-foreground mb-4">
            {liabilities.length === 0
              ? 'Nessun debito ancora. Aggiungi il primo per iniziare.'
              : 'Nessun debito corrisponde ai filtri.'}
          </p>
          {onAddNew && liabilities.length === 0 && (
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Aggiungi il tuo primo debito
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
              goalName={liability.goalId ? goalNameById.get(liability.goalId) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default LiabilityList;
