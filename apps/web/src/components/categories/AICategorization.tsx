'use client';

/**
 * AICategorization — review flow for AI-suggested categories.
 *
 * Fetches uncategorized transactions + all categories, asks the
 * `categorize-transaction` edge function for each one, and lets the user
 * accept / change / skip the suggestion. Accept and change persist via
 * UPDATE on `transactions.category_id`.
 *
 * @module components/categories/AICategorization
 */

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Check,
  X,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  categorizationClient,
  CategorizationApiError,
} from '@/services/categorization.client';
import type {
  CategoryRow,
  PendingTransactionWithSuggestion,
} from '@/types/categorization';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConfidenceColor(confidence: number) {
  if (confidence >= 85) return 'text-green-600 dark:text-green-400';
  if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getConfidenceBg(confidence: number) {
  if (confidence >= 85) return 'bg-green-500/10';
  if (confidence >= 70) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

function formatItDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('it-IT');
}

/**
 * Locale-aware currency formatter — aligned with TransactionRow / other
 * consumers in this codebase. Falls back to EUR on bad currency codes.
 */
function formatCurrency(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }
}

/**
 * Regex that heuristically detects whether a string starts with an emoji
 * (symbol / pictograph / extended pictographic) as opposed to a lucide
 * icon NAME like "ShoppingCart". We don't ship a Name→Component mapper
 * in this module — rendering by name would display literal text
 * "ShoppingCart". When the icon isn't an emoji, fall back to a neutral
 * glyph so the UI stays consistent.
 */
const EMOJI_LEADING_RE = /^\p{Extended_Pictographic}/u;
const FALLBACK_ICON_GLYPH = '❓';

function renderCategoryIcon(icon: string | null | undefined): string {
  if (!icon) return FALLBACK_ICON_GLYPH;
  return EMOJI_LEADING_RE.test(icon) ? icon : FALLBACK_ICON_GLYPH;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AICategorization() {
  const [pending, setPending] = useState<PendingTransactionWithSuggestion[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [totalToReview, setTotalToReview] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyTx, setBusyTx] = useState<string | null>(null);
  const [changingCategory, setChangingCategory] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { items, categories: cats } =
        await categorizationClient.loadPendingWithSuggestions();
      setPending(items);
      setCategories(cats);
      setTotalToReview(items.length);
      setReviewedCount(0);
    } catch (err) {
      setLoadError(
        err instanceof CategorizationApiError
          ? err.message
          : 'Impossibile caricare le transazioni da categorizzare'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markReviewed = (txId: string) => {
    setPending((prev) => prev.filter((t) => t.id !== txId));
    setReviewedCount((c) => c + 1);
    setRowError((prev) => {
      const { [txId]: _drop, ...rest } = prev;
      return rest;
    });
  };

  const applyCategoryAndAccept = async (
    txId: string,
    categoryId: string | null
  ) => {
    if (!categoryId) {
      setRowError((prev) => ({
        ...prev,
        [txId]: 'Nessuna categoria da applicare',
      }));
      return;
    }
    setBusyTx(txId);
    try {
      await categorizationClient.applyCategory(txId, categoryId);
      markReviewed(txId);
      setChangingCategory(null);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [txId]:
          err instanceof CategorizationApiError
            ? err.message
            : 'Impossibile applicare la categoria',
      }));
    } finally {
      setBusyTx(null);
    }
  };

  const handleAccept = (tx: PendingTransactionWithSuggestion) =>
    applyCategoryAndAccept(tx.id, tx.suggestedCategoryId);

  const handleChoose = (tx: PendingTransactionWithSuggestion, cat: CategoryRow) =>
    applyCategoryAndAccept(tx.id, cat.id);

  const handleSkip = (tx: PendingTransactionWithSuggestion) => {
    // User-initiated skip: remove from the review queue without persisting.
    // Category remains NULL on the transaction.
    markReviewed(tx.id);
    setChangingCategory(null);
  };

  const progress =
    totalToReview > 0 ? (reviewedCount / totalToReview) * 100 : 0;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <Card className="p-12 rounded-2xl border-0 shadow-sm text-center">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-3" />
        <p className="text-[13px] text-muted-foreground">
          L&apos;AI sta analizzando le tue transazioni...
        </p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="p-8 rounded-2xl border-0 shadow-sm">
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[14px] font-medium text-red-700 dark:text-red-300">
              {loadError}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 rounded-xl"
              onClick={load}
            >
              Riprova
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-foreground">
            Categorizzazione AI
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {pending.length > 0
              ? `${pending.length} transazioni da revisionare`
              : 'Tutte le transazioni sono state categorizzate!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            <Brain className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Progress */}
      {totalToReview > 0 && (
        <Card className="p-5 rounded-2xl border-0 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Progresso revisione</p>
            <span className="text-sm font-semibold text-foreground">
              {reviewedCount}/{totalToReview}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </Card>
      )}

      {/* Pending list or empty state */}
      {pending.length > 0 ? (
        <div className="space-y-3">
          {pending.map((tx) => (
            <Card
              key={tx.id}
              className="p-5 rounded-2xl border-0 shadow-sm"
              data-testid={`tx-card-${tx.id}`}
            >
              <div className="flex items-start gap-4">
                {/* Transaction info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-medium text-foreground truncate">
                      {tx.description}
                    </p>
                    <span
                      className={`text-[13px] font-semibold tabular-nums ${
                        tx.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatItDate(tx.date)}
                  </p>

                  {/* AI suggestion */}
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${getConfidenceBg(tx.confidence)}`}
                    >
                      <span className="text-[16px]" aria-hidden="true">
                        {renderCategoryIcon(tx.suggestedCategoryIcon)}
                      </span>
                      <span className="text-[13px] font-medium text-foreground">
                        {tx.suggestedCategoryName}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${getConfidenceColor(tx.confidence)}`}
                      >
                        {Math.round(tx.confidence)}%
                      </span>
                    </div>
                    {tx.confidence < 80 && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Bassa confidenza</span>
                      </div>
                    )}
                  </div>

                  {rowError[tx.id] && (
                    <p
                      className="mt-2 text-[11px] text-red-600"
                      role="alert"
                    >
                      {rowError[tx.id]}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {changingCategory === tx.id ? (
                    <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleChoose(tx, cat)}
                          disabled={busyTx === tx.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-[11px] text-foreground transition-colors disabled:opacity-50"
                        >
                          <span aria-hidden="true">
                            {renderCategoryIcon(cat.icon)}
                          </span>{' '}
                          {cat.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setChangingCategory(null)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-[11px] text-muted-foreground transition-colors"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[12px] border-border/50"
                        onClick={() => setChangingCategory(tx.id)}
                        disabled={busyTx === tx.id}
                      >
                        <ChevronRight className="w-3 h-3 mr-1" />
                        Cambia
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl text-[12px] bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-60"
                        onClick={() => handleAccept(tx)}
                        disabled={
                          busyTx === tx.id || !tx.suggestedCategoryId
                        }
                        title={
                          !tx.suggestedCategoryId
                            ? 'Nessun suggerimento AI — usa "Cambia"'
                            : undefined
                        }
                      >
                        {busyTx === tx.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Accetta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[12px] text-rose-500 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        onClick={() => handleSkip(tx)}
                        disabled={busyTx === tx.id}
                        aria-label="Salta — nessuna categoria applicata"
                        title="Salta — nessuna categoria applicata"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 rounded-2xl border-0 shadow-sm text-center">
          <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tutto categorizzato!
          </h3>
          <p className="text-[13px] text-muted-foreground">
            {totalToReview > 0
              ? `Hai revisionato ${reviewedCount} transazioni. L'AI imparerà dalle tue scelte.`
              : 'Nessuna transazione da categorizzare al momento.'}
          </p>
        </Card>
      )}
    </div>
  );
}
