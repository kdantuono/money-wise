import type { PoolCategory } from '@/types/onboarding-plan';

/**
 * Sprint 1.5.3 WP-Q3: infer pool category for a goal.
 *
 * Two-stage mapping:
 *   1. presetId exact match → deterministic pool (7 PRESET_GOALS in StepGoals.tsx)
 *   2. fallback name-heuristic regex → 'investments' if matches invest keywords,
 *      else 'savings' (safe default; never block allocation for unclassified goals).
 *
 * Pure function, no side effects. 100% branch/statement coverage target.
 */

const PRESET_TO_POOL: Record<string, PoolCategory> = {
  'fondo-emergenza': 'savings',
  'comprare-casa': 'savings',
  'iniziare-a-investire': 'investments',
  'eliminare-debiti': 'savings',
  'risparmiare-di-piu': 'savings',
  'viaggi-vacanza': 'savings',
  'far-crescere-patrimonio': 'investments',
};

/**
 * Sprint 1.6.4D #032: exact name → presetId reverse lookup. Used by
 * `hydrateFromPlan` in store per inferire presetId da goals legacy (pre-1.5.3
 * schema non persisted presetId) → goal finisce in folder iOS pattern corretto
 * Step 3 instead of "Obiettivi personalizzati". Exact match only: se user
 * creato custom goal con nome identico, si pesca comunque il preset (acceptable
 * trade-off, rari false positive).
 */
const PRESET_NAME_TO_ID: Record<string, string> = {
  'Fondo Emergenza': 'fondo-emergenza',
  'Comprare Casa': 'comprare-casa',
  'Iniziare a Investire': 'iniziare-a-investire',
  'Eliminare Debiti': 'eliminare-debiti',
  'Risparmiare di Più': 'risparmiare-di-piu',
  'Viaggi / Vacanza': 'viaggi-vacanza',
  'Far Crescere Patrimonio': 'far-crescere-patrimonio',
};

export function inferPresetIdFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return Object.prototype.hasOwnProperty.call(PRESET_NAME_TO_ID, name)
    ? PRESET_NAME_TO_ID[name]!
    : null;
}

const INVEST_KEYWORDS =
  /\b(?:invest\w*|azion\w*|obbligazion\w*|etf|btp|pac|borsa|patrimonio|crypto|bitcoin|fondo comune)\b/i;

export interface InferGoalTypeInput {
  name?: string | null;
  presetId?: string | null;
}

export function inferGoalType(goal: InferGoalTypeInput): PoolCategory {
  // Own-property check prevents prototype pollution (e.g. presetId='__proto__').
  if (goal.presetId && Object.prototype.hasOwnProperty.call(PRESET_TO_POOL, goal.presetId)) {
    return PRESET_TO_POOL[goal.presetId];
  }
  const name = (goal.name ?? '').trim();
  if (!name) return 'savings';
  return INVEST_KEYWORDS.test(name) ? 'investments' : 'savings';
}
