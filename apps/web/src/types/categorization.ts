/**
 * Categorization — shared types for the AI Categorization review flow.
 *
 * Mirrors the `categorize-transaction` edge function contract
 * (`supabase/functions/categorize-transaction/index.ts`) plus UI-level
 * view models for the AICategorization component.
 *
 * @module types/categorization
 */

// =============================================================================
// Edge function contract
// =============================================================================

export interface CategorizeInput {
  description: string;
  merchantName?: string | null;
  amount?: number;
  type?: 'DEBIT' | 'CREDIT';
  metadata?: Record<string, unknown> | null;
}

export interface CategorizeResult {
  categoryId: string | null;
  confidence: number;
  matchedBy:
    | 'enrichment'
    | 'merchant_exact'
    | 'merchant_partial'
    | 'keyword'
    | 'fallback';
}

// =============================================================================
// DB row shapes (subset)
// =============================================================================

export interface PendingTransactionRow {
  id: string;
  description: string;
  merchant_name: string | null;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  date: string;
  category_id: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  type: 'INCOME' | 'EXPENSE';
}

// =============================================================================
// UI view model — what the component consumes
// =============================================================================

export interface PendingTransactionWithSuggestion {
  id: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  date: string;
  /** The AI's suggested category (null if the cascade returned fallback/none). */
  suggestedCategoryId: string | null;
  suggestedCategoryName: string;
  suggestedCategoryIcon: string;
  confidence: number;
  matchedBy: CategorizeResult['matchedBy'];
}
