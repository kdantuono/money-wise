/**
 * Tests for WizardPianoGenerato (Sprint 1.5).
 *
 * Covers the four disabled-button states on Step 5 (Bug #1 root-cause coverage),
 * navigation bounds, progress bar rendering, and the happy/error submit flow.
 *
 * Strategy:
 *  - Mock useOnboardingPlanStore with the selector pattern from goals.test.tsx:
 *    one mockReturnValue(state) drives every s => s.foo selector.
 *  - Mock each child step component as a stub — the wizard's only job for child
 *    steps is to pick the right one by currentStep, not render their contents.
 *  - Mock useAuthStore likewise.
 *  - Mock onboardingPlanClient.persistPlan (success + error paths).
 *  - Override useRouter to capture push() calls.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import type { AllocationResult, PriorityRank, WizardState } from '@/types/onboarding-plan';

// --------------------------------------------------------------------------
// Child step stubs (keep the wizard test focused on wizard logic)
// --------------------------------------------------------------------------
vi.mock('@/components/onboarding/steps/StepIncome', () => ({
  StepIncome: () => <div data-testid="step-1-stub">StepIncome</div>,
}));
vi.mock('@/components/onboarding/steps/StepSavingsTarget', () => ({
  StepSavingsTarget: () => <div data-testid="step-2-stub">StepSavingsTarget</div>,
}));
vi.mock('@/components/onboarding/steps/StepGoals', () => ({
  StepGoals: () => <div data-testid="step-3-stub">StepGoals</div>,
}));
vi.mock('@/components/onboarding/steps/StepPlanReview', () => ({
  StepPlanReview: () => <div data-testid="step-4-stub">StepPlanReview</div>,
}));
vi.mock('@/components/onboarding/steps/StepAiPrefs', () => ({
  StepAiPrefs: () => <div data-testid="step-5-stub">StepAiPrefs</div>,
}));

// Framer-motion: return props-forwarding components (same trick as goals.test.tsx)
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: unknown, prop: string | symbol) => {
        if (prop === '__esModule') return false;
        return ({
          children,
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          whileHover: _whileHover,
          whileTap: _whileTap,
          whileInView: _whileInView,
          variants: _variants,
          ...rest
        }: Record<string, unknown>) => {
          const Tag = typeof prop === 'string' ? prop : 'div';
          return React.createElement(Tag as string, rest, children as React.ReactNode);
        };
      },
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// --------------------------------------------------------------------------
// Auth store mock
// --------------------------------------------------------------------------
const mockSetUser = vi.fn();
const mockAuthStore = vi.fn();
vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = mockAuthStore();
    return selector ? selector(state) : state;
  },
}));

// --------------------------------------------------------------------------
// Onboarding-plan store mock — selector pattern
// --------------------------------------------------------------------------
const mockPlanStore = vi.fn();
vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
    const state = mockPlanStore();
    return selector ? selector(state) : state;
  },
}));

// --------------------------------------------------------------------------
// onboardingPlanClient mock
// --------------------------------------------------------------------------
const mockPersistPlan = vi.fn();
vi.mock('@/services/onboarding-plan.client', async () => {
  const actual = await vi.importActual<typeof import('@/services/onboarding-plan.client')>(
    '@/services/onboarding-plan.client'
  );
  return {
    ...actual,
    onboardingPlanClient: {
      persistPlan: (...args: unknown[]) => mockPersistPlan(...args),
      loadPlan: vi.fn(),
    },
  };
});

// --------------------------------------------------------------------------
// next/navigation: override the global setup-level mock so push is inspectable
// --------------------------------------------------------------------------
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// --------------------------------------------------------------------------
// Import the component under test AFTER mocks
// --------------------------------------------------------------------------
import { WizardPianoGenerato } from '@/components/onboarding/WizardPianoGenerato';

// --------------------------------------------------------------------------
// State factories
// --------------------------------------------------------------------------
type StoreActionSpies = {
  nextStep: ReturnType<typeof vi.fn>;
  prevStep: ReturnType<typeof vi.fn>;
  setIsPersisting: ReturnType<typeof vi.fn>;
  setPersistedPlanId: ReturnType<typeof vi.fn>;
};

function makeAllocation(goalTempIds: string[]): AllocationResult {
  return {
    items: goalTempIds.map((id, i) => ({
      goalId: id,
      monthlyAmount: 100 + i,
      deadlineFeasible: true,
      reasoning: `auto-${i}`,
      warnings: [],
    })),
    incomeAfterEssentials: 1500,
    totalAllocated: goalTempIds.length * 100,
    unallocated: 0,
    warnings: [],
  };
}

function makeState(
  overrides: Partial<WizardState> & { _actions?: StoreActionSpies } = {}
): WizardState & StoreActionSpies {
  const actions: StoreActionSpies = overrides._actions ?? {
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    setIsPersisting: vi.fn(),
    setPersistedPlanId: vi.fn(),
  };
  const base: WizardState = {
    currentStep: 1,
    step1: { monthlyIncome: 3000 },
    step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
    step3: { goals: [] },
    step4: { allocationPreview: null, userOverrides: {} },
    step5: { enableAiCategorization: true, enableAiInsights: true },
    isPersisting: false,
    persistedPlanId: null,
  };
  return { ...base, ...overrides, ...actions };
}

const GOAL_TEMP_ID = 'goal-temp-1';
const GOALS_ONE = [
  {
    tempId: GOAL_TEMP_ID,
    name: 'Fondo Emergenza',
    target: 5000,
    deadline: '2027-01-01',
    priority: 1 as PriorityRank,
  },
];

// =============================================================================
// Tests
// =============================================================================
describe('WizardPianoGenerato (Sprint 1.5)', () => {
  beforeEach(() => {
    mockAuthStore.mockReset();
    mockPlanStore.mockReset();
    mockPersistPlan.mockReset();
    mockRouterPush.mockReset();
    mockSetUser.mockReset();
  });

  // ---- 1. Renders correct child stub per currentStep ------------------------
  describe('Step rendering', () => {
    it.each([
      [1, 'step-1-stub'],
      [2, 'step-2-stub'],
      [3, 'step-3-stub'],
      [4, 'step-4-stub'],
      [5, 'step-5-stub'],
    ])('renders step-%i component when currentStep=%i', (step, testId) => {
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(makeState({ currentStep: step as 1 | 2 | 3 | 4 | 5 }));

      render(<WizardPianoGenerato />);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it('renders progress bar with 5 segments and the right count highlighted', () => {
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(makeState({ currentStep: 3 }));

      render(<WizardPianoGenerato />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
      expect(progressbar).toHaveAttribute('aria-valuemin', '1');
      expect(progressbar).toHaveAttribute('aria-valuemax', '5');
      // 5 flex child wrappers (each contains icon + bar segment)
      expect(progressbar.children.length).toBe(5);
    });

    it('step indicator renders with icons (Wallet, Target, TrendingUp, Rocket, Brain)', () => {
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(makeState({ currentStep: 1 }));

      render(<WizardPianoGenerato />);
      const progressbar = screen.getByRole('progressbar');
      // 5 step icon containers rendered inside progressbar
      expect(progressbar.children.length).toBe(5);
      // Step label shown in subtitle (Reddito for step 1)
      expect(screen.getByText(/Passo 1 di 5 — Reddito/)).toBeInTheDocument();
    });
  });

  // ---- 2. Navigation -------------------------------------------------------
  describe('Navigation (Avanti / Indietro)', () => {
    it('disables Indietro on step 1 and calls prevStep on click at step 2', async () => {
      const actions: StoreActionSpies = {
        nextStep: vi.fn(),
        prevStep: vi.fn(),
        setIsPersisting: vi.fn(),
        setPersistedPlanId: vi.fn(),
      };
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(makeState({ currentStep: 1, _actions: actions }));

      const { unmount } = render(<WizardPianoGenerato />);
      expect(screen.getByRole('button', { name: /Indietro/i })).toBeDisabled();
      unmount();

      // Re-render on step 2 — Indietro enabled, click fires prevStep
      mockPlanStore.mockReturnValue(makeState({ currentStep: 2, _actions: actions }));
      render(<WizardPianoGenerato />);
      const indietro = screen.getByRole('button', { name: /Indietro/i });
      expect(indietro).not.toBeDisabled();
      await userEvent.click(indietro);
      expect(actions.prevStep).toHaveBeenCalledTimes(1);
    });

    it('shows Avanti button on steps 1-4 and calls nextStep on click', async () => {
      const actions: StoreActionSpies = {
        nextStep: vi.fn(),
        prevStep: vi.fn(),
        setIsPersisting: vi.fn(),
        setPersistedPlanId: vi.fn(),
      };
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(makeState({ currentStep: 2, _actions: actions }));

      render(<WizardPianoGenerato />);
      const avanti = screen.getByRole('button', { name: /Avanti/i });
      expect(avanti).toBeInTheDocument();
      await userEvent.click(avanti);
      expect(actions.nextStep).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 3. Step 5 button enabled state --------------------------------------
  describe('Step 5 "Conferma e crea piano" — canSubmit=true', () => {
    it('renders enabled button with correct label when all four conditions hold', () => {
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(
        makeState({
          currentStep: 5,
          step3: { goals: GOALS_ONE },
          step4: {
            allocationPreview: makeAllocation([GOAL_TEMP_ID]),
            userOverrides: {},
          },
          isPersisting: false,
        })
      );

      render(<WizardPianoGenerato />);
      const confirm = screen.getByRole('button', { name: /Conferma e crea piano/i });
      expect(confirm).not.toBeDisabled();
      // No amber banner when canSubmit=true
      expect(screen.queryByText(/Conferma disabilitata/i)).not.toBeInTheDocument();
    });
  });

  // ---- 4. Step 5 disabled reasons (the four branches of Bug #1) ------------
  describe('Step 5 "Conferma e crea piano" — disabled reasons', () => {
    it('disables button + shows amber banner when userId is null', () => {
      mockAuthStore.mockReturnValue({ user: null, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(
        makeState({
          currentStep: 5,
          step3: { goals: GOALS_ONE },
          step4: {
            allocationPreview: makeAllocation([GOAL_TEMP_ID]),
            userOverrides: {},
          },
        })
      );

      render(<WizardPianoGenerato />);
      expect(screen.getByRole('button', { name: /Conferma e crea piano/i })).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent(/Sessione utente non rilevata/i);
    });

    it('disables button + shows amber banner when goals array is empty', () => {
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(
        makeState({
          currentStep: 5,
          step3: { goals: [] },
          step4: {
            allocationPreview: makeAllocation([]),
            userOverrides: {},
          },
        })
      );

      render(<WizardPianoGenerato />);
      expect(screen.getByRole('button', { name: /Conferma e crea piano/i })).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent(/Aggiungi almeno un obiettivo/i);
    });

    it('disables button + shows amber banner when allocationPreview is null', () => {
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(
        makeState({
          currentStep: 5,
          step3: { goals: GOALS_ONE },
          step4: { allocationPreview: null, userOverrides: {} },
        })
      );

      render(<WizardPianoGenerato />);
      expect(screen.getByRole('button', { name: /Conferma e crea piano/i })).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent(/Piano non ancora calcolato/i);
    });

    it('disables button and shows loading state when isPersisting=true', () => {
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(
        makeState({
          currentStep: 5,
          step3: { goals: GOALS_ONE },
          step4: {
            allocationPreview: makeAllocation([GOAL_TEMP_ID]),
            userOverrides: {},
          },
          isPersisting: true,
        })
      );

      render(<WizardPianoGenerato />);
      const confirm = screen.getByRole('button', { name: /Creazione piano/i });
      expect(confirm).toBeDisabled();
      expect(screen.getByText(/Creazione piano/i)).toBeInTheDocument();
    });
  });

  // ---- 5. handleSubmit — success path --------------------------------------
  describe('handleSubmit — success', () => {
    it('calls persistPlan with aiPreferences, toggles isPersisting, and navigates to /dashboard/goals', async () => {
      const actions: StoreActionSpies = {
        nextStep: vi.fn(),
        prevStep: vi.fn(),
        setIsPersisting: vi.fn(),
        setPersistedPlanId: vi.fn(),
      };
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(
        makeState({
          currentStep: 5,
          step3: { goals: GOALS_ONE },
          step4: {
            allocationPreview: makeAllocation([GOAL_TEMP_ID]),
            userOverrides: {},
          },
          step5: { enableAiCategorization: true, enableAiInsights: false },
          _actions: actions,
        })
      );
      mockPersistPlan.mockResolvedValue({ planId: 'plan-uuid', goalIds: ['goal-uuid-1'] });

      render(<WizardPianoGenerato />);
      await userEvent.click(screen.getByRole('button', { name: /Conferma e crea piano/i }));

      await waitFor(() => {
        expect(mockPersistPlan).toHaveBeenCalledTimes(1);
      });
      // userId first arg
      expect(mockPersistPlan.mock.calls[0]![0]).toBe('u1');
      // aiPreferences forwarded from step5
      const persistInput = mockPersistPlan.mock.calls[0]![1] as {
        aiPreferences: { enableAiCategorization: boolean; enableAiInsights: boolean };
      };
      expect(persistInput.aiPreferences).toEqual({ enableAiCategorization: true, enableAiInsights: false });
      // setIsPersisting toggled true → false
      expect(actions.setIsPersisting).toHaveBeenNthCalledWith(1, true);
      expect(actions.setIsPersisting).toHaveBeenNthCalledWith(2, false);
      expect(actions.setPersistedPlanId).toHaveBeenCalledWith('plan-uuid');
      // setUser called with onboarded: true to prevent redirect loop
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', onboarded: true })
      );
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/goals');
    });
  });

  // ---- 6. handleSubmit — error path ----------------------------------------
  describe('handleSubmit — error', () => {
    it('shows red banner and still toggles isPersisting back to false', async () => {
      const actions: StoreActionSpies = {
        nextStep: vi.fn(),
        prevStep: vi.fn(),
        setIsPersisting: vi.fn(),
        setPersistedPlanId: vi.fn(),
      };
      mockAuthStore.mockReturnValue({ user: { id: 'u1', onboarded: false }, setUser: mockSetUser });
      mockPlanStore.mockReturnValue(
        makeState({
          currentStep: 5,
          step3: { goals: GOALS_ONE },
          step4: {
            allocationPreview: makeAllocation([GOAL_TEMP_ID]),
            userOverrides: {},
          },
          _actions: actions,
        })
      );
      mockPersistPlan.mockRejectedValue(new Error('DB unavailable'));

      render(<WizardPianoGenerato />);
      await userEvent.click(screen.getByRole('button', { name: /Conferma e crea piano/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/DB unavailable/i);
      });
      // persisting toggled on then off (finally block)
      expect(actions.setIsPersisting).toHaveBeenNthCalledWith(1, true);
      expect(actions.setIsPersisting).toHaveBeenNthCalledWith(2, false);
      // No navigation on error
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });
});
