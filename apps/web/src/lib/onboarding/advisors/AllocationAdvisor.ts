/**
 * Sprint 1.5.2 — WP-E: AllocationAdvisor interface (strategy pattern)
 *
 * Current implementation: DeterministicBehavioralAdvisor (deterministic β+γ waterfall
 * with behavioral intelligence layer).
 * Future implementation: LLMAdvisor (GPT-4o-mini / local model) when ready.
 *
 * @module lib/onboarding/advisors/AllocationAdvisor
 */

import type {
  AllocationInput,
  AllocationResult,
  BehavioralWarning,
  SuggestionChip,
  InfeasibleItem,
  UserAllocation,
} from '@/types/onboarding-plan';

/**
 * Strategy interface for allocation advisors.
 *
 * All implementations must be pure (no side effects, no I/O).
 * The advisor operates synchronously to support debounced live re-analysis.
 */
export interface AllocationAdvisor {
  /**
   * Compute a full allocation plan from the given input.
   * Returns `AllocationResult` with optional `behavioralWarnings`, `hardBlock`,
   * and `suggestions` populated.
   */
  proposeAllocation(input: AllocationInput): AllocationResult;

  /**
   * Analyse user-defined per-goal overrides against the base input.
   * Returns behavioral warnings triggered by the override configuration.
   * Called on every slider change (debounced 200ms).
   */
  analyzeUserOverride(
    userOverride: UserAllocation,
    baseInput: AllocationInput,
  ): BehavioralWarning[];

  /**
   * Generate suggestion chips for a list of infeasible goal items.
   * Chips are click-to-apply alternatives shown in the calibration UI.
   */
  generateSuggestions(infeasible: InfeasibleItem[]): SuggestionChip[];
}
