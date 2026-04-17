/**
 * Categorization Client — AI suggestions via the `categorize-transaction`
 * edge function + direct Supabase queries for transactions/categories.
 *
 * Flow consumed by AICategorization component:
 *   1. fetchPendingTransactions() — uncategorized tx (category_id IS NULL)
 *   2. fetchCategories() — all user categories (for suggestion display + picker)
 *   3. suggestCategory(tx) — invoke edge fn for one tx
 *   4. applyCategory(txId, categoryId) — UPDATE transactions.category_id
 *
 * @module services/categorization.client
 */

import { FunctionsHttpError } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import type {
  CategorizeResult,
  CategoryRow,
  PendingTransactionRow,
  PendingTransactionWithSuggestion,
} from '@/types/categorization';

/**
 * Parse a supabase.functions.invoke() error into (message, status).
 * FunctionsHttpError carries the real body in `context`; read it to recover
 * the server-side `{error: "..."}` message. Aligned with gdpr.client /
 * banking.client pattern in this repo.
 */
async function parseInvokeError(error: unknown): Promise<{
  serverMsg: string;
  httpStatus: number | undefined;
}> {
  if (error instanceof FunctionsHttpError) {
    const status = error.context?.status;
    try {
      const body = (await error.context.json()) as
        | { error?: string; message?: string }
        | null;
      const serverMsg = body?.error || body?.message || error.message || '';
      return { serverMsg, httpStatus: status };
    } catch {
      return { serverMsg: error.message || '', httpStatus: status };
    }
  }
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; context?: { status?: number } };
    const m = typeof e.message === 'string' ? e.message : '';
    const status =
      typeof e.context?.status === 'number' ? e.context.status : undefined;
    return { serverMsg: m, httpStatus: status };
  }
  return { serverMsg: '', httpStatus: undefined };
}

// =============================================================================
// Error class
// =============================================================================

export type CategorizationErrorCode =
  | 'fetch_failed'
  | 'suggest_failed'
  | 'apply_failed'
  | 'unknown';

export class CategorizationApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: CategorizationErrorCode = 'unknown',
    public details?: unknown
  ) {
    super(message);
    this.name = 'CategorizationApiError';
    Object.setPrototypeOf(this, CategorizationApiError.prototype);
  }
}

// =============================================================================
// Client
// =============================================================================

const DEFAULT_PENDING_LIMIT = 20;
const FALLBACK_ICON = '❓';
const FALLBACK_NAME = 'Da categorizzare';

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      is: (col: string, val: null) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{
            data: PendingTransactionRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{
          data: CategoryRow[] | null;
          error: { message: string } | null;
        }>;
      };
      order: (col: string, opts: { ascending: boolean }) => Promise<{
        data: CategoryRow[] | null;
        error: { message: string } | null;
      }>;
    };
    update: (payload: Record<string, unknown>) => {
      eq: (
        col: string,
        val: string
      ) => Promise<{
        error: { message: string } | null;
        count?: number | null;
      }>;
    };
  };
  functions: {
    invoke: <T = unknown>(
      name: string,
      opts: { body: unknown }
    ) => Promise<{ data: T | null; error: unknown }>;
  };
};

function lookupCategory(
  id: string | null,
  categories: CategoryRow[]
): { name: string; icon: string } {
  if (!id) return { name: FALLBACK_NAME, icon: FALLBACK_ICON };
  const c = categories.find((x) => x.id === id);
  return c
    ? { name: c.name, icon: c.icon || FALLBACK_ICON }
    : { name: FALLBACK_NAME, icon: FALLBACK_ICON };
}

export const categorizationClient = {
  /**
   * Fetch uncategorized transactions (category_id IS NULL) for the current
   * user's family. RLS handles scoping. Defaults to 20 most recent.
   */
  async fetchPendingTransactions(
    limit = DEFAULT_PENDING_LIMIT
  ): Promise<PendingTransactionRow[]> {
    const supabase = createClient() as unknown as SupabaseLike;
    const { data, error } = await supabase
      .from('transactions')
      .select('id, description, merchant_name, amount, type, date, category_id')
      .is('category_id', null)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) {
      throw new CategorizationApiError(
        error.message || 'Impossibile caricare le transazioni',
        500,
        'fetch_failed',
        error
      );
    }
    return data ?? [];
  },

  /**
   * Fetch all ACTIVE categories in the user's family (RLS-scoped).
   * Inactive/archived categories are filtered out — they'd confuse the
   * suggestion display and picker.
   */
  async fetchCategories(): Promise<CategoryRow[]> {
    const supabase = createClient() as unknown as SupabaseLike;
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon, type')
      .eq('status', 'ACTIVE')
      .order('sort_order', { ascending: true });
    if (error) {
      throw new CategorizationApiError(
        error.message || 'Impossibile caricare le categorie',
        500,
        'fetch_failed',
        error
      );
    }
    return data ?? [];
  },

  /**
   * Ask the `categorize-transaction` edge function for one transaction.
   */
  async suggestCategory(tx: PendingTransactionRow): Promise<CategorizeResult> {
    const supabase = createClient() as unknown as SupabaseLike;
    const { data, error } = await supabase.functions.invoke<CategorizeResult>(
      'categorize-transaction',
      {
        body: {
          description: tx.description,
          merchantName: tx.merchant_name,
          amount: Number(tx.amount),
          type: tx.type,
        },
      }
    );
    if (error) {
      const { serverMsg, httpStatus } = await parseInvokeError(error);
      throw new CategorizationApiError(
        serverMsg || 'Impossibile ottenere suggerimento AI',
        httpStatus || 500,
        'suggest_failed',
        error
      );
    }
    if (!data) {
      throw new CategorizationApiError(
        'Risposta AI vuota',
        500,
        'suggest_failed'
      );
    }
    return data;
  },

  /**
   * Convenience: fetch pending + categories + all AI suggestions in parallel,
   * returning enriched view models ready for the component.
   */
  async loadPendingWithSuggestions(
    limit = DEFAULT_PENDING_LIMIT
  ): Promise<{
    items: PendingTransactionWithSuggestion[];
    categories: CategoryRow[];
  }> {
    const [pending, categories] = await Promise.all([
      this.fetchPendingTransactions(limit),
      this.fetchCategories(),
    ]);

    const suggestions = await Promise.all(
      pending.map((tx) =>
        this.suggestCategory(tx).catch(
          (): CategorizeResult => ({
            categoryId: null,
            confidence: 0,
            matchedBy: 'fallback',
          })
        )
      )
    );

    const items: PendingTransactionWithSuggestion[] = pending.map(
      (tx, i) => {
        const sug = suggestions[i];
        const { name, icon } = lookupCategory(sug.categoryId, categories);
        return {
          id: tx.id,
          description: tx.description,
          amount: Number(tx.amount),
          type: tx.type,
          date: tx.date,
          suggestedCategoryId: sug.categoryId,
          suggestedCategoryName: name,
          suggestedCategoryIcon: icon,
          confidence: sug.confidence,
          matchedBy: sug.matchedBy,
        };
      }
    );

    return { items, categories };
  },

  /**
   * Persist a category choice on a transaction.
   *
   * Returns the count of affected rows if the driver exposes it: 0 means
   * the tx either no longer exists, was already categorized, or is hidden
   * by RLS. Without this check a no-op UPDATE returns `error: null` and
   * the UI would drop the transaction as "reviewed" even though nothing
   * was persisted.
   */
  async applyCategory(txId: string, categoryId: string): Promise<void> {
    if (!txId || !categoryId) {
      throw new CategorizationApiError(
        'txId e categoryId sono obbligatori',
        400,
        'apply_failed'
      );
    }
    const supabase = createClient() as unknown as SupabaseLike;
    const { error, count } = await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .eq('id', txId);
    if (error) {
      throw new CategorizationApiError(
        error.message || 'Impossibile applicare la categoria',
        500,
        'apply_failed',
        error
      );
    }
    // When the driver provides a row count, a 0 means the filter matched
    // nothing — surface as a not-found so the UI can retry / refresh.
    if (typeof count === 'number' && count === 0) {
      throw new CategorizationApiError(
        'Transazione non trovata (potrebbe essere già categorizzata o rimossa)',
        404,
        'apply_failed'
      );
    }
  },
};

export default categorizationClient;
