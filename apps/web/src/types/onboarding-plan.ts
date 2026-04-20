/**
 * Sprint 1.5 — Onboarding Piano Generato
 * Shared type contract for:
 *  - Stream A (main): wizard UI, state management, persistence
 *  - Stream B (frontend-specialist agent): allocation algorithm module
 *  - Stream C (test-specialist agent): vitest contract + Playwright e2e
 *
 * Contract committed BEFORE streams spawn to prevent type drift during
 * parallel development. Do not mutate this file without coordinating all
 * three streams.
 */

import type { Database } from '@/utils/supabase/database.types';

// ─────────────────────────────────────────────────────────────────────────
// DB row types (source-of-truth from generated Supabase types)
// ─────────────────────────────────────────────────────────────────────────

export type GoalRow = Database['public']['Tables']['goals']['Row'];
export type GoalInsert = Database['public']['Tables']['goals']['Insert'];
export type GoalUpdate = Database['public']['Tables']['goals']['Update'];

export type PlanRow = Database['public']['Tables']['plans']['Row'];
export type PlanInsert = Database['public']['Tables']['plans']['Insert'];

export type GoalAllocationRow = Database['public']['Tables']['goal_allocations']['Row'];
export type GoalAllocationInsert = Database['public']['Tables']['goal_allocations']['Insert'];

export type GoalStatus = Database['public']['Enums']['goal_status'];

// ─────────────────────────────────────────────────────────────────────────
// Goal type (DB TEXT column: 'fixed' | 'openended')
// 'fixed' = has a concrete target amount + optional deadline
// 'openended' = no hard target (e.g. Fondo Emergenza, general savings habit);
//   target is nullable; deadline is optional informational hint.
// ─────────────────────────────────────────────────────────────────────────

export type GoalType = 'fixed' | 'openended';

// ─────────────────────────────────────────────────────────────────────────
// Priority mapping (DB SMALLINT 1-3 <-> UI labels)
// ─────────────────────────────────────────────────────────────────────────

export type PriorityRank = 1 | 2 | 3;
export const PRIORITY_LABEL_IT: Record<PriorityRank, string> = {
  1: 'Alta',
  2: 'Media',
  3: 'Bassa',
};
export const PRIORITY_URGENCY_FACTOR: Record<PriorityRank, number> = {
  1: 3.0,
  2: 2.0,
  3: 1.0,
};

// ─────────────────────────────────────────────────────────────────────────
// Allocation algorithm I/O contract (Stream B owns implementation)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Goal input to the allocation algorithm.
 * Subset of GoalRow relevant for allocation decisions.
 *
 * WP-K: `type` added (default 'fixed'). `target` is now nullable:
 *   - 'fixed' goals: target must be > 0 (validated before reaching algorithm)
 *   - 'openended' goals: target may be null or 0; they receive the residual
 *     pool split after the waterfall (equal share among openended goals).
 */
export interface AllocationGoalInput {
  id: string;
  name: string;
  /** Null allowed for openended goals. */
  target: number | null;
  current: number;
  deadline: string | null;
  priority: PriorityRank;
  /** DB type field; defaults to 'fixed' when absent (backward compat). */
  type?: GoalType;
  /**
   * Sprint 1.5.3 WP-Q3: preset id from StepGoals.PRESET_GOALS. Used by
   * `inferGoalType` for deterministic pool routing when 3-pool model active.
   * Absent for manually-added custom goals (falls back to name-heuristic).
   */
  presetId?: string | null;
}

/**
 * Full algorithm input.
 *
 * `essentialsPct` is a percentage in the range [0, 100] (matches DB schema
 * CHECK constraint `essentials_pct BETWEEN 0 AND 100`). The algorithm
 * derives `incomeAfterEssentials = monthlyIncome * (1 - essentialsPct/100)`.
 *
 * Note: emergency fund target is embedded in the user-specified `target` of
 * the emergency goal (user enters "how much to save for the fund"), not as
 * a separate input parameter. Sprint 1.5 decision 2026-04-19: fixed 6 ×
 * monthly_savings is documentation-level guidance only, user can override
 * by setting target directly. Parametric version deferred to Sprint 3 if
 * beta feedback requests.
 *
 * WP-E (Sprint 1.5.2): optional behavioral context fields added for
 * DeterministicBehavioralAdvisor. Absent → advisor uses heuristic defaults.
 */
export interface AllocationInput {
  monthlyIncome: number;
  monthlySavingsTarget: number;
  essentialsPct: number;
  goals: AllocationGoalInput[];
  /** Monthly lifestyle buffer (€). Required for CC-debt-spiral warning. */
  lifestyleBuffer?: number;
  /** Monthly investments budget (€). Required for zero-invest warning. */
  investmentsTarget?: number;
  /** Per-goal user overrides: goalId -> monthly amount in €. */
  userOverrides?: Record<string, number>;
}

/**
 * Per-goal allocation result.
 */
export interface AllocationResultItem {
  goalId: string;
  monthlyAmount: number;
  deadlineFeasible: boolean;
  /**
   * Human-readable explanation of why this allocation amount.
   * Displayed to user in Step 4 review.
   */
  reasoning: string;
  /**
   * Warnings for user attention: deadline passed, target reached, etc.
   */
  warnings: string[];
}

/**
 * Sprint 1.5.3 WP-Q3: Pool category for goal routing.
 * Lifestyle is a locked-info budget (not a pool goals can be routed to).
 */
export type PoolCategory = 'savings' | 'investments';

/**
 * Sprint 1.5.3 WP-Q3: Per-pool allocation breakdown.
 * Independent waterfall runs on savings/investments with its own budget.
 */
export interface PoolAllocation {
  budget: number;
  allocated: number;
  residual: number;
  items: AllocationResultItem[];
}

/**
 * Sprint 1.5.3 WP-Q3: 3-pool breakdown carved independently from
 * incomeAfterEssentials (lifestyleBuffer + savingsTarget + investmentsTarget
 * ≤ incomeAfterEssentials, enforced by hardBlock boundary check).
 * lifestyle is informational only (locked: true), non allocable to goals.
 */
export interface PoolBreakdown {
  lifestyle: { budget: number; locked: true };
  savings: PoolAllocation;
  investments: PoolAllocation;
}

/**
 * Full algorithm output.
 * `totalAllocated` = sum of items' monthlyAmount ≤ min(monthlySavingsTarget, incomeAfterEssentials).
 * `unallocated` = savingsPool - totalAllocated (may be > 0 when all goals are fully funded
 * before the pool is exhausted — see `warnings` for the "budget residuo" notice).
 *
 * Sprint 1.5.3 WP-Q3: `pools` populated only when ENABLE_3POOL_MODEL flag is on.
 * Legacy path (flag off) returns undefined for pools; `items` + `totalAllocated`
 * + `unallocated` maintain backward compat as if all goals went to a single savings pool.
 */
export interface AllocationResult {
  items: AllocationResultItem[];
  incomeAfterEssentials: number;
  totalAllocated: number;
  unallocated: number;
  /**
   * Global warnings not tied to single goal (e.g. savings target > income_after_essentials).
   */
  warnings: string[];
  /**
   * WP-E: Behavioral warnings generated by DeterministicBehavioralAdvisor.
   * Optional — absent when computeAllocation is called without behavioral context.
   */
  behavioralWarnings?: BehavioralWarning[];
  /**
   * WP-E: Hard block — when set, Avanti is disabled and the error is shown.
   */
  hardBlock?: { reason: string } | null;
  /**
   * WP-E: Suggestion chips for infeasible goals.
   */
  suggestions?: SuggestionChip[];
  /**
   * Sprint 1.5.3 WP-Q3: 3-pool breakdown. Undefined when ENABLE_3POOL_MODEL=false
   * (legacy single-pool behavior). Populated with lifestyle/savings/investments
   * when flag is on.
   */
  pools?: PoolBreakdown;
}

// ─────────────────────────────────────────────────────────────────────────
// Behavioral advisor types (WP-E, Sprint 1.5.2)
// ─────────────────────────────────────────────────────────────────────────

export type BehavioralWarningSeverity = 'soft' | 'hard';

export interface BehavioralWarning {
  /** Machine-readable code for dedup and testing. */
  code: string;
  severity: BehavioralWarningSeverity;
  /** Human-facing message in Italian (amico-esperto tone). */
  message: string;
  /** Why this warning matters (behavioral reasoning). */
  reasoning: string;
}

export type SuggestionKind =
  | 'extend_deadline'
  | 'increase_monthly'
  | 'reduce_target'
  | 'rebalance_portfolio';

export interface SuggestionChip {
  kind: SuggestionKind;
  /** Goal id the suggestion applies to (null = global). */
  goalId: string | null;
  /** Numeric magnitude of the change (e.g. 6 for 6 months). */
  delta: number;
  /** New value as string or number (ISO date for extend_deadline, € for others). */
  newValue: string | number;
  /** Human-readable label in Italian. */
  description: string;
  /** Behavioral rationale for the suggestion. */
  reasoning: string;
}

/**
 * Input type for infeasible goal analysis (advisor.generateSuggestions).
 */
export interface InfeasibleItem {
  goalId: string;
  name: string;
  shortfall: number;
  deadline: string | null;
  currentMonthly: number;
  requiredMonthly: number;
}

/**
 * User overrides shape used by the calibration UI.
 * goalId -> user-specified monthly amount.
 */
export type UserAllocation = Record<string, number>;

// ─────────────────────────────────────────────────────────────────────────
// Wizard state (Stream A owns, used in Zustand store)
// ─────────────────────────────────────────────────────────────────────────

/**
 * 5-step wizard (Sprint 1.5.2 integrated WP-B + WP-C):
 * 1=Benvenuto, 2=Profilo (4-budget), 3=Obiettivi, 4=Piano proposto, 5=Preferenze AI
 */
export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardStepIncome {
  monthlyIncome: number;
}

/**
 * Step 2 — Profilo: merged income + allocation profile (Sprint 1.5.2 WP-C).
 * Replaces WizardStepIncome (step1) + WizardStepSavingsTarget (old step2).
 * monthlyIncome moved here from step1 to keep all profile fields co-located.
 */
export interface WizardStepProfile {
  monthlyIncome: number;
  essentialsPct: number;
  lifestyleBuffer: number;
  monthlySavingsTarget: number;
  investmentsTarget: number;
}

/** @deprecated use WizardStepProfile instead — kept for backward-compat during migration */
export interface WizardStepSavingsTarget {
  monthlySavingsTarget: number;
  essentialsPct: number;
}

export interface WizardGoalDraft {
  /** Temp UUID for form state before DB insert. */
  tempId: string;
  name: string;
  /** Null for openended goals (no concrete target). */
  target: number | null;
  deadline: string | null;
  priority: PriorityRank;
  /** DB type field. Defaults to 'fixed'. */
  type: GoalType;
  /**
   * Sprint 1.5.3 WP-Q3: preset id da StepGoals.PRESET_GOALS (es. 'fondo-emergenza',
   * 'iniziare-a-investire'). Usato da inferGoalType per routing pool deterministico
   * (presetId exact match → pool, altrimenti name-heuristic fallback).
   * Absent per goal creati via "+ Aggiungi manualmente".
   */
  presetId?: string | null;
}

export interface WizardStepGoals {
  goals: WizardGoalDraft[];
}

export interface WizardStepPlanReview {
  /** Allocation result preview (not yet persisted). */
  allocationPreview: AllocationResult | null;
  /** User edits to allocation (override algo suggestion per goal). */
  userOverrides: Record<string, number>;
}

export interface WizardStepAiPrefs {
  /** Skippable step. */
  enableAiCategorization: boolean;
  enableAiInsights: boolean;
}

export interface WizardSkipState {
  /** Step the user was on when they clicked "Salta". */
  atStep: number;
  /** ISO timestamp of when Salta was triggered. */
  savedAt: string;
}

export interface WizardState {
  currentStep: WizardStep;
  step1: WizardStepIncome;
  step2: WizardStepProfile;
  step3: WizardStepGoals;
  step4: WizardStepPlanReview;
  step5: WizardStepAiPrefs;
  /** True when user confirms Step 4 and persistence layer is invoked. */
  isPersisting: boolean;
  /** Populated after successful DB persist. */
  persistedPlanId: string | null;
  /** Controls the "Aggiungi obiettivo" Radix Dialog (issue #463). */
  isAddGoalModalOpen: boolean;
  /** Preset id currently being edited in the modal; null for manual entry. */
  editingPresetId: string | null;
  /**
   * Route to navigate back to when the wizard modal is closed.
   * Set by PlanPageClient on mount (from ?from= param or document.referrer).
   * Fallback: /dashboard.
   */
  invokerRoute: string | null;
  /**
   * Partial state saved when user clicks "Salta" from Step 1.
   * Used to show "resume onboarding" banner on dashboard.
   */
  skipState: WizardSkipState | null;
  /**
   * tempId of the goal currently being edited in the AddGoalModal.
   * null = modal is in "add" mode; non-null = modal is in "edit" mode.
   */
  editingGoalId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Persistence payload (Stream A wiring at Day 4, used by Supabase client)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Shape submitted to Supabase in a single transaction:
 * 1. Insert plans row
 * 2. Insert N goals rows (one per WizardGoalDraft)
 * 3. Insert N goal_allocations rows (one per AllocationResultItem)
 */
export interface PersistencePayload {
  plan: Omit<PlanInsert, 'id' | 'created_at' | 'updated_at'>;
  goals: Array<Omit<GoalInsert, 'id' | 'created_at' | 'updated_at'>>;
  /**
   * goal_allocations created AFTER goals insert (needs goal_id FKs).
   * Mapped via tempId -> resolved goal UUID post-insert.
   */
  allocationsByTempId: Record<string, {
    monthly_amount: number;
    deadline_feasible: boolean;
    reasoning: string | null;
  }>;
}
