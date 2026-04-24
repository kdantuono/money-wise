/**
 * Financial Instruments Client — ADR-005 Fase 2.1 Patrimonio foundation
 *
 * Read-only unified view over accounts (ASSET) + liabilities (LIABILITY) via
 * VIEW `public.financial_instruments`. Write path = dispatcher verso clients
 * sottostanti (accounts.client / liabilities.client) in base a `class`.
 *
 * Design: ~/vault/moneywise/research/adr-005-fase-2-1-design.md
 * ADR: ~/vault/moneywise/decisions/adr-005-unified-financial-instruments.md
 *
 * @module services/financial-instruments.client
 */

import { createClient } from '@/utils/supabase/client';

// =============================================================================
// Types — Discriminated union (class field)
// =============================================================================

export type InstrumentClass = 'ASSET' | 'LIABILITY';

/**
 * Unified row shape dalla VIEW `financial_instruments`.
 * Campi ASSET-only o LIABILITY-only sono nullable (VIEW NULL cast).
 */
export interface FinancialInstrument {
  id: string;
  class: InstrumentClass;
  type: string; // account_type | liability_type (enum castati a text)
  userId: string | null; // solo ASSET (liabilities è family-scoped)
  familyId: string | null;
  name: string;
  currentBalance: number; // positivo sempre (convenzione italiana)
  currency: string;
  /** Solo LIABILITY (originale prestito/BNPL). Null per ASSET. */
  originalAmount: number | null;
  /** CC su accounts o liabilities — dual-source fino Fase 2.2. */
  creditLimit: number | null;
  /** Solo LIABILITY. */
  interestRate: number | null;
  /** Solo LIABILITY. */
  minimumPayment: number | null;
  /** Sprint 1.6 Fase 2A link. */
  goalId: string | null;
  status: string;
  /** Solo ASSET (liabilities non traccia — gap Fase 2.2). */
  institutionName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthResult {
  assets: number; // somma current_balance WHERE class=ASSET
  liabilities: number; // somma current_balance WHERE class=LIABILITY (positivo)
  netWorth: number; // assets - liabilities
  currency: string; // EUR (multi-currency Fase 3)
  count: { asset: number; liability: number };
}

export interface InstrumentFilter {
  class?: InstrumentClass;
  /** `null` = unlinked, stringa = goal specifico, undefined = no filter. */
  goalId?: string | null;
  status?: string;
}

export class FinancialInstrumentsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public source: 'VIEW' | 'ACCOUNTS' | 'LIABILITIES' = 'VIEW',
  ) {
    super(message);
    this.name = 'FinancialInstrumentsApiError';
  }
}

// =============================================================================
// Row mapper — snake_case VIEW → camelCase FinancialInstrument
// =============================================================================

type ViewRow = {
  id: string | null;
  class: string | null;
  type: string | null;
  user_id: string | null;
  family_id: string | null;
  name: string | null;
  current_balance: number | null;
  currency: string | null;
  original_amount: number | null;
  credit_limit: number | null;
  interest_rate: number | null;
  minimum_payment: number | null;
  goal_id: string | null;
  status: string | null;
  institution_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapRowToInstrument(row: ViewRow): FinancialInstrument | null {
  // Copilot-style fail-visible filter: required fields null = corruption/RLS bug
  if (row.id === null || row.class === null || row.name === null || row.status === null) {
    console.error(
      '[financialInstrumentsClient] Skipping invalid row with null required field:',
      { id: row.id, class: row.class, name: row.name, status: row.status },
    );
    return null;
  }
  const cls = row.class as InstrumentClass;
  if (cls !== 'ASSET' && cls !== 'LIABILITY') {
    console.error('[financialInstrumentsClient] Unknown class value:', row.class);
    return null;
  }
  return {
    id: row.id,
    class: cls,
    type: row.type ?? 'OTHER',
    userId: row.user_id,
    familyId: row.family_id,
    name: row.name,
    currentBalance: Number(row.current_balance ?? 0),
    currency: row.currency ?? 'EUR',
    originalAmount: row.original_amount !== null ? Number(row.original_amount) : null,
    creditLimit: row.credit_limit !== null ? Number(row.credit_limit) : null,
    interestRate: row.interest_rate !== null ? Number(row.interest_rate) : null,
    minimumPayment: row.minimum_payment !== null ? Number(row.minimum_payment) : null,
    goalId: row.goal_id,
    status: row.status,
    institutionName: row.institution_name,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

// =============================================================================
// Client (read-only Fase 2.1)
// =============================================================================

export const financialInstrumentsClient = {
  /**
   * List financial instruments with optional filter.
   * RLS trasparente via security_invoker VIEW.
   */
  async list(filter?: InstrumentFilter): Promise<FinancialInstrument[]> {
    const supabase = createClient();
    let query = supabase.from('financial_instruments').select('*');

    if (filter?.class) query = query.eq('class', filter.class);
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.goalId !== undefined) {
      query = filter.goalId === null ? query.is('goal_id', null) : query.eq('goal_id', filter.goalId);
    }

    const { data, error } = await query;
    if (error) {
      throw new FinancialInstrumentsApiError(error.message, 500, 'VIEW');
    }

    return (data ?? [])
      .map(mapRowToInstrument)
      .filter((i): i is FinancialInstrument => i !== null);
  },

  /**
   * Compute net worth from client-side aggregation.
   * Fase 2.1 scelta: no RPC dedicato (dataset tiny, TanStack Query cacha).
   * Upgrade path Fase 2.2: RPC + multi-currency.
   */
  async netWorth(): Promise<NetWorthResult> {
    const items = await this.list();
    return computeNetWorth(items);
  },
};

/**
 * Pure function: calcola net worth da una lista di instruments.
 * Exposed per testing + UI optimistic updates.
 */
export function computeNetWorth(items: FinancialInstrument[]): NetWorthResult {
  const result: NetWorthResult = {
    assets: 0,
    liabilities: 0,
    netWorth: 0,
    currency: 'EUR',
    count: { asset: 0, liability: 0 },
  };

  for (const item of items) {
    const val = Number(item.currentBalance);
    if (item.class === 'ASSET') {
      result.assets += val;
      result.count.asset += 1;
    } else {
      result.liabilities += val;
      result.count.liability += 1;
    }
  }

  result.netWorth = result.assets - result.liabilities;
  return result;
}
