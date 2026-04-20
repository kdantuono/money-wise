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
 */
export interface AllocationGoalInput {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  priority: PriorityRank;
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
 */
export interface AllocationInput {
  monthlyIncome: number;
  monthlySavingsTarget: number;
  essentialsPct: number;
  goals: AllocationGoalInput[];
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
 * Full algorithm output.
 * `totalAllocated` = sum of items' monthlyAmount ≤ min(monthlySavingsTarget, incomeAfterEssentials).
 * `unallocated` = savingsPool - totalAllocated (may be > 0 when all goals are fully funded
 * before the pool is exhausted — see `warnings` for the "budget residuo" notice).
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
}

// ─────────────────────────────────────────────────────────────────────────
// Wizard state (Stream A owns, used in Zustand store)
// ─────────────────────────────────────────────────────────────────────────

/**
 * 6-step wizard (Sprint 1.5.2 WP-B):
 * 1=Benvenuto, 2=Reddito, 3=Risparmio, 4=Obiettivi, 5=Piano proposto, 6=Preferenze AI
 */
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface WizardStepIncome {
  monthlyIncome: number;
}

export interface WizardStepSavingsTarget {
  monthlySavingsTarget: number;
  essentialsPct: number;
}

export interface WizardGoalDraft {
  /** Temp UUID for form state before DB insert. */
  tempId: string;
  name: string;
  target: number;
  deadline: string | null;
  priority: PriorityRank;
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
  step2: WizardStepSavingsTarget;
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
