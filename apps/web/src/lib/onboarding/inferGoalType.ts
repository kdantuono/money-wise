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

const INVEST_KEYWORDS =
  /\b(?:invest\w*|azion\w*|obbligazion\w*|etf|btp|pac|borsa|patrimonio|crypto|bitcoin|fondo comune)\b/i;

export interface InferGoalTypeInput {
  name?: string | null;
  presetId?: string | null;
}

export function inferGoalType(goal: InferGoalTypeInput): PoolCategory {
  if (goal.presetId && goal.presetId in PRESET_TO_POOL) {
    return PRESET_TO_POOL[goal.presetId];
  }
  const name = (goal.name ?? '').trim();
  if (!name) return 'savings';
  return INVEST_KEYWORDS.test(name) ? 'investments' : 'savings';
}
