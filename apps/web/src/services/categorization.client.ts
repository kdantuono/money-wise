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

import { createClient } from '@/utils/supabase/client';
import type {
  CategorizeResult,
  CategoryRow,
  PendingTransactionRow,
  PendingTransactionWithSuggestion,
} from '@/types/categorization';

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
      order: (col: string, opts: { ascending: boolean }) => Promise<{
        data: CategoryRow[] | null;
        error: { message: string } | null;
      }>;
    };
    update: (payload: Record<string, unknown>) => {
      eq: (
        col: string,
        val: string
      ) => Promise<{ error: { message: string } | null }>;
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
   * Fetch all active categories in the user's family (RLS-scoped).
   */
  async fetchCategories(): Promise<CategoryRow[]> {
    const supabase = createClient() as unknown as SupabaseLike;
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon, type')
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
      throw new CategorizationApiError(
        'Impossibile ottenere suggerimento AI',
        500,
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
    const { error } = await supabase
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
  },
};

export default categorizationClient;
