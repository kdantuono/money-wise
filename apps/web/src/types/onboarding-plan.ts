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
 */
export interface AllocationInput {
  monthlyIncome: number;
  monthlySavingsTarget: number;
  essentialsPct: number;
  goals: AllocationGoalInput[];
  /**
   * Emergency fund target in months of savings (default 6 per Sprint 1.5
   * decision 2026-04-19). Immutable for Sprint 1.5; ALTER to parametric
   * Sprint 3 if beta feedback requests.
   */
  emergencyFundMonths?: number;
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
 * Sum of items' monthlyAmount should equal min(monthlySavingsTarget, incomeAfterEssentials).
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

export type WizardStep = 1 | 2 | 3 | 4 | 5;

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
