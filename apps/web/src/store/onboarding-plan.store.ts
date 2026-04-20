/**
 * Onboarding Plan Store — Sprint 1.5
 *
 * Zustand store for 5-step "Piano Generato" wizard state.
 * Consumes WizardState contract from types/onboarding-plan.ts.
 *
 * @module store/onboarding-plan.store
 */

import { create } from 'zustand';
import type {
  WizardState,
  WizardStep,
  WizardGoalDraft,
  AllocationResult,
} from '@/types/onboarding-plan';

// -------------------------------------------------------------------------
// Validation bounds (exported for selectCanAdvanceFromStep1 + tests)
// -------------------------------------------------------------------------

/** Minimum monthly income accepted in Step 1 (EUR/month). */
export const INCOME_MIN = 100;
/** Maximum monthly income accepted in Step 1 (EUR/month). */
export const INCOME_MAX = 100_000;

/**
 * Returns true when Step 1 income value is within accepted bounds.
 * 0 = not yet entered (initial state) or skipped -> false.
 */
export const selectCanAdvanceFromStep1 = (s: WizardState): boolean => {
  const income = s.step1.monthlyIncome;
  return income >= INCOME_MIN && income <= INCOME_MAX;
};

interface Actions {
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateIncome: (monthlyIncome: number) => void;
  updateSavingsTarget: (monthlySavingsTarget: number, essentialsPct?: number) => void;
  addGoal: (goal: Omit<WizardGoalDraft, 'tempId'>) => void;
  updateGoal: (tempId: string, patch: Partial<Omit<WizardGoalDraft, 'tempId'>>) => void;
  removeGoal: (tempId: string) => void;
  setAllocationPreview: (allocation: AllocationResult | null) => void;
  setUserOverride: (goalId: string, monthlyAmount: number) => void;
  setAiPrefs: (enableCategorization: boolean, enableInsights: boolean) => void;
  setIsPersisting: (persisting: boolean) => void;
  setPersistedPlanId: (id: string | null) => void;
  reset: () => void;
  // Modal state for "Aggiungi obiettivo" Dialog (issue #463)
  setAddGoalModalOpen: (open: boolean) => void;
  setEditingPresetId: (id: string | null) => void;
}

type WizardStore = WizardState & Actions;

const initialState: WizardState = {
  currentStep: 1,
  step1: { monthlyIncome: 0 },
  step2: { monthlySavingsTarget: 0, essentialsPct: 50 },
  step3: { goals: [] },
  step4: { allocationPreview: null, userOverrides: {} },
  step5: { enableAiCategorization: true, enableAiInsights: true },
  isPersisting: false,
  persistedPlanId: null,
  isAddGoalModalOpen: false,
  editingPresetId: null,
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
  updateIncome: (monthlyIncome) =>
    set((s) => ({
      step1: { ...s.step1, monthlyIncome },
    })),
  updateSavingsTarget: (monthlySavingsTarget, essentialsPct) =>
    set((s) => ({
      step2: {
        monthlySavingsTarget,
        essentialsPct: essentialsPct ?? s.step2.essentialsPct,
      },
    })),
  addGoal: (goal) =>
    set((s) => ({
      step3: {
        goals: [...s.step3.goals, { ...goal, tempId: globalThis.crypto.randomUUID() }],
      },
    })),
  updateGoal: (tempId, patch) =>
    set((s) => ({
      step3: {
        goals: s.step3.goals.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)),
      },
    })),
  removeGoal: (tempId) =>
    set((s) => ({
      step3: { goals: s.step3.goals.filter((g) => g.tempId !== tempId) },
    })),
  setAllocationPreview: (allocation) =>
    set((s) => ({
      step4: { ...s.step4, allocationPreview: allocation },
    })),
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
  reset: () => set(initialState),
  setAddGoalModalOpen: (open) => set({ isAddGoalModalOpen: open }),
  setEditingPresetId: (id) => set({ editingPresetId: id }),
}));
