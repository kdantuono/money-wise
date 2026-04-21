/**
 * Onboarding Plan Store — Sprint 1.5 / 1.5.2 integrated (WP-B + WP-C)
 *
 * Zustand store for 5-step "Piano Generato" wizard state.
 * Step layout: 1=Benvenuto, 2=Profilo (4-budget), 3=Obiettivi, 4=Piano, 5=Preferenze AI
 *
 * Consumes WizardState contract from types/onboarding-plan.ts.
 *
 * Sprint 1.5.2 WP-C: step2 extended with lifestyleBuffer + investmentsTarget.
 * monthlyIncome moved from step1 → step2 (merged Profilo step).
 * step1 kept as-is for backward-compat (hydrateFromPlan + existing tests).
 *
 * @module store/onboarding-plan.store
 */

import { create } from 'zustand';
import { inferPresetIdFromName } from '@/lib/onboarding/inferGoalType';
import type {
  WizardState,
  WizardStep,
  WizardGoalDraft,
  WizardSkipState,
  WizardStepProfile,
  AllocationResult,
  GoalType,
} from '@/types/onboarding-plan';

// -------------------------------------------------------------------------
// Validation bounds (exported for selectCanAdvanceFromStep1/2 + tests)
// -------------------------------------------------------------------------

/** Minimum monthly income accepted (EUR/month). */
export const INCOME_MIN = 100;
/** Maximum monthly income accepted (EUR/month). */
export const INCOME_MAX = 100_000;

/** Minimum lifestyle buffer allowed without a hard block (soft warning below this). */
export const LIFESTYLE_SOFT_MIN = 50;

/** Minimum monthly savings target required. */
export const SAVINGS_MIN = 10;

/**
 * Essentials % range [10, 90] per spec.
 */
export const ESSENTIALS_MIN_PCT = 10;
export const ESSENTIALS_MAX_PCT = 90;

/**
 * AI default lifestyle buffer (Sprint 1.5.5 Phase 3: upgrade 15% → 30% Warren
 * canonical 50/30/20 rule). Max(50, min(500, disposable * 0.30)).
 * Exported for tests.
 */
export function calcLifestyleDefault(monthlyIncome: number, essentialsPct: number): number {
  if (monthlyIncome <= 0) return LIFESTYLE_SOFT_MIN;
  const disposable = monthlyIncome * (1 - essentialsPct / 100);
  return Math.max(LIFESTYLE_SOFT_MIN, Math.min(500, Math.round(disposable * 0.3)));
}

/**
 * Sprint 1.5.5 Phase 3: AI default savings (Warren 50% del disposable post-essenziali).
 * max(SAVINGS_MIN, disposable * 0.50).
 */
export function calcSavingsDefault(monthlyIncome: number, essentialsPct: number): number {
  if (monthlyIncome <= 0) return SAVINGS_MIN;
  const disposable = monthlyIncome * (1 - essentialsPct / 100);
  return Math.max(SAVINGS_MIN, Math.round(disposable * 0.5));
}

/**
 * Sprint 1.5.5 Phase 3: AI default investments (Warren 20% del disposable post-essenziali).
 * max(0, disposable * 0.20). Zero floor consentito (user può non investire).
 */
export function calcInvestDefault(monthlyIncome: number, essentialsPct: number): number {
  if (monthlyIncome <= 0) return 0;
  const disposable = monthlyIncome * (1 - essentialsPct / 100);
  return Math.max(0, Math.round(disposable * 0.2));
}

/**
 * Returns true when Step 1 income value is within accepted bounds.
 * @deprecated use selectCanAdvanceFromStep2 — kept for backward-compat with
 *   existing tests that still mock this selector.
 */
export const selectCanAdvanceFromStep1 = (s: WizardState): boolean => {
  // After WP-C, income lives in step2. Fall through to step2 first; if
  // step1.monthlyIncome is non-zero (legacy / hydrateFromPlan) use that.
  const income = s.step2.monthlyIncome > 0 ? s.step2.monthlyIncome : s.step1.monthlyIncome;
  return income >= INCOME_MIN && income <= INCOME_MAX;
};

/**
 * Returns true when Step 2 (Profilo) is fully valid and sum constraint is met.
 * Exported for wizard Avanti gate + tests.
 */
export const selectCanAdvanceFromStep2 = (s: WizardState): boolean => {
  const { monthlyIncome, essentialsPct, lifestyleBuffer, monthlySavingsTarget, investmentsTarget } =
    s.step2;
  if (monthlyIncome < INCOME_MIN || monthlyIncome > INCOME_MAX) return false;
  if (monthlySavingsTarget < SAVINGS_MIN) return false;
  const essentialsEuros = monthlyIncome * (essentialsPct / 100);
  const sum = essentialsEuros + lifestyleBuffer + monthlySavingsTarget + investmentsTarget;
  return sum <= monthlyIncome;
};

/**
 * Shape of the data returned by onboardingPlanClient.loadPlan — duplicated here
 * to avoid a circular import between the store and the service layer.
 */
export interface LoadedPlanBundle {
  plan: {
    id: string;
    monthlyIncome: number;
    monthlySavingsTarget: number;
    essentialsPct: number;
    incomeAfterEssentials: number;
    lifestyleBuffer?: number;
    investmentsTarget?: number;
  };
  goals: Array<{
    id: string;
    name: string;
    /** Null for openended goals. WP-K. */
    target: number | null;
    current: number;
    deadline: string | null;
    priority: WizardGoalDraft['priority'];
    monthlyAllocation: number;
    status: string;
    /** DB type field. WP-K. */
    type: GoalType;
  }>;
  allocations: Array<{
    goalId: string;
    monthlyAmount: number;
    deadlineFeasible: boolean;
    reasoning: string | null;
  }>;
  aiPreferences?: {
    enableAiCategorization: boolean;
    enableAiInsights: boolean;
  };
}

interface Actions {
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  /** @deprecated Use updateProfile instead. Kept for backward-compat. */
  updateIncome: (monthlyIncome: number) => void;
  /** @deprecated Use updateProfile instead. Kept for backward-compat. */
  updateSavingsTarget: (monthlySavingsTarget: number, essentialsPct?: number) => void;
  /** Update any subset of the Profilo step (step2) fields. */
  updateProfile: (patch: Partial<WizardStepProfile>) => void;
  addGoal: (goal: Omit<WizardGoalDraft, 'tempId' | 'type'> & { type?: GoalType }) => void;
  updateGoal: (tempId: string, patch: Partial<Omit<WizardGoalDraft, 'tempId'>>) => void;
  removeGoal: (tempId: string) => void;
  setAllocationPreview: (allocation: AllocationResult | null) => void;
  setUserOverride: (goalId: string, monthlyAmount: number) => void;
  /** Sprint 1.5.4 Q4: applica allocations ricalcolati dal rebalance optimizer (replace all userOverrides). */
  applyRebalance: (newAllocations: Record<string, number>) => void;
  /** Sprint 1.5.4 Q7: dismiss a behavioral warning by code (hidden + unblocks hard gating). */
  dismissWarning: (code: string) => void;
  setAiPrefs: (enableCategorization: boolean, enableInsights: boolean) => void;
  setIsPersisting: (persisting: boolean) => void;
  setPersistedPlanId: (id: string | null) => void;
  /**
   * Hydrate the wizard store from an existing loaded plan (edit mode).
   *
   * Key invariant: goal `tempId` is set to the DB goal UUID so that
   * `allocationPreview.items[].goalId` aligns with `step3.goals[].tempId`
   * (the persistPlan caller uses `allocationPreview.items.find(it => it.goalId === g.tempId)`).
   */
  hydrateFromPlan: (bundle: LoadedPlanBundle) => void;
  reset: () => void;
  // Modal state for "Aggiungi obiettivo" Dialog (issue #463)
  setAddGoalModalOpen: (open: boolean) => void;
  setEditingPresetId: (id: string | null) => void;
  /** Set the route to navigate to when the wizard modal is dismissed. */
  setInvokerRoute: (route: string | null) => void;
  /** Save partial skip state when the user clicks "Salta" on Step 1. */
  setSkipState: (state: WizardSkipState | null) => void;
  /**
   * Set the tempId of the goal being edited in the AddGoalModal.
   * Pass null to return to "add" mode.
   */
  setEditingGoal: (tempId: string | null) => void;
}

type WizardStore = WizardState & Actions;

const initialState: WizardState = {
  currentStep: 1,
  // step1 is kept for backward-compat with existing tests / hydrateFromPlan.
  // After WP-C the Profilo UI writes to step2 exclusively.
  step1: { monthlyIncome: 0 },
  step2: {
    monthlyIncome: 0,
    essentialsPct: 50,
    lifestyleBuffer: 0,
    monthlySavingsTarget: 0,
    investmentsTarget: 0,
  },
  step3: { goals: [] },
  step4: { allocationPreview: null, userOverrides: {}, dismissedWarningCodes: [] },
  step5: { enableAiCategorization: true, enableAiInsights: true },
  isPersisting: false,
  persistedPlanId: null,
  isAddGoalModalOpen: false,
  editingPresetId: null,
  invokerRoute: null,
  skipState: null,
  editingGoalId: null,
};

export const useOnboardingPlanStore = create<WizardStore>((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () =>
    set((s) => ({
      currentStep: (s.currentStep < 5 ? s.currentStep + 1 : s.currentStep) as WizardStep,
    })),
  prevStep: () =>
    set((s) => ({
      currentStep: (s.currentStep > 1 ? s.currentStep - 1 : s.currentStep) as WizardStep,
    })),
  /** @deprecated */
  updateIncome: (monthlyIncome) =>
    set((s) => ({
      step1: { ...s.step1, monthlyIncome },
      step2: { ...s.step2, monthlyIncome },
    })),
  /** @deprecated */
  updateSavingsTarget: (monthlySavingsTarget, essentialsPct) =>
    set((s) => ({
      step2: {
        ...s.step2,
        monthlySavingsTarget,
        essentialsPct: essentialsPct ?? s.step2.essentialsPct,
      },
    })),
  updateProfile: (patch) =>
    set((s) => ({
      step2: { ...s.step2, ...patch },
      // Mirror income back to step1 for backward-compat consumers (StepPlanReview, persistPlan)
      ...(patch.monthlyIncome !== undefined
        ? { step1: { monthlyIncome: patch.monthlyIncome } }
        : {}),
    })),
  addGoal: (goal) =>
    set((s) => ({
      step3: {
        goals: [...s.step3.goals, { ...goal, type: goal.type ?? 'fixed', tempId: globalThis.crypto.randomUUID() }],
      },
    })),
  updateGoal: (tempId, patch) =>
    set((s) => ({
      step3: {
        goals: s.step3.goals.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)),
      },
    })),
  removeGoal: (tempId) =>
    set((s) => {
      // Sprint 1.6 Wave 2 Copilot round 1: cleanup orphan userOverrides quando
      // rimuoviamo un goal. Prima lasciavamo override che falsavano
      // analyzeUserOverride (Object.values sum) + warning/preview.
      const { [tempId]: _orphan, ...remainingOverrides } = s.step4.userOverrides;
      return {
        step3: { goals: s.step3.goals.filter((g) => g.tempId !== tempId) },
        step4: { ...s.step4, userOverrides: remainingOverrides },
      };
    }),
  setAllocationPreview: (allocation) =>
    set((s) => ({
      step4: { ...s.step4, allocationPreview: allocation },
    })),
  applyRebalance: (newAllocations) =>
    set((s) => ({
      step4: {
        ...s.step4,
        userOverrides: { ...newAllocations },
      },
    })),
  dismissWarning: (code) =>
    set((s) => {
      const current = s.step4.dismissedWarningCodes ?? [];
      if (current.includes(code)) return {};
      return {
        step4: {
          ...s.step4,
          dismissedWarningCodes: [...current, code],
        },
      };
    }),
  setUserOverride: (goalId, amount) =>
    set((s) => ({
      step4: {
        ...s.step4,
        userOverrides: { ...s.step4.userOverrides, [goalId]: amount },
      },
    })),
  setAiPrefs: (enableCategorization, enableInsights) =>
    set({
      step5: {
        enableAiCategorization: enableCategorization,
        enableAiInsights: enableInsights,
      },
    }),
  setIsPersisting: (persisting) => set({ isPersisting: persisting }),
  setPersistedPlanId: (id) => set({ persistedPlanId: id }),
  hydrateFromPlan: (bundle) => {
    const { plan, goals, allocations, aiPreferences } = bundle;

    // Reconstruct AllocationResult from loaded DB data.
    const allocationByGoalId = new Map(allocations.map((a) => [a.goalId, a]));
    const totalAllocated = allocations.reduce((sum, a) => sum + a.monthlyAmount, 0);

    const allocationPreview: AllocationResult = {
      items: goals.map((g) => {
        const alloc = allocationByGoalId.get(g.id);
        return {
          goalId: g.id,
          monthlyAmount: alloc?.monthlyAmount ?? g.monthlyAllocation,
          deadlineFeasible: alloc?.deadlineFeasible ?? true,
          reasoning: alloc?.reasoning ?? '',
          warnings: [],
        };
      }),
      incomeAfterEssentials: plan.incomeAfterEssentials,
      totalAllocated,
      unallocated: Math.max(0, plan.incomeAfterEssentials - totalAllocated),
      warnings: [],
    };

    set({
      currentStep: 1,
      step1: { monthlyIncome: plan.monthlyIncome },
      step2: {
        monthlyIncome: plan.monthlyIncome,
        monthlySavingsTarget: plan.monthlySavingsTarget,
        essentialsPct: plan.essentialsPct,
        lifestyleBuffer: plan.lifestyleBuffer ?? 0,
        investmentsTarget: plan.investmentsTarget ?? 0,
      },
      step3: {
        goals: goals.map((g) => ({
          tempId: g.id,
          name: g.name,
          target: g.target,
          deadline: g.deadline,
          priority: g.priority,
          type: g.type,
          // Sprint 1.6.4D #032: infer presetId from name per permettere iOS folder
          // pattern grouping dei goals hydrated (legacy schema non persiste presetId).
          presetId: inferPresetIdFromName(g.name),
        })),
      },
      step4: { allocationPreview, userOverrides: {}, dismissedWarningCodes: [] },
      step5: {
        enableAiCategorization: aiPreferences?.enableAiCategorization ?? true,
        enableAiInsights: aiPreferences?.enableAiInsights ?? true,
      },
      isPersisting: false,
      persistedPlanId: null,
      editingGoalId: null,
    });
  },
  reset: () => set(initialState),
  setAddGoalModalOpen: (open) => set({ isAddGoalModalOpen: open }),
  setEditingPresetId: (id) => set({ editingPresetId: id }),
  setInvokerRoute: (route) => set({ invokerRoute: route }),
  setSkipState: (state) => set({ skipState: state }),
  setEditingGoal: (tempId) => set({ editingGoalId: tempId }),
}));
