/**
 * Tests for StepProfile — Sprint 1.5.2 WP-C.
 * Covers: income validation, AI-default lifestyle, sum-overflow error,
 * lifestyle/invest warnings, canAdvance selector, split-bar render.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../utils/test-utils';
import type { WizardState } from '@/types/onboarding-plan';
import {
  selectCanAdvanceFromStep2,
  calcLifestyleDefault,
  INCOME_MIN,
  INCOME_MAX,
  LIFESTYLE_SOFT_MIN,
  SAVINGS_MIN,
} from '@/store/onboarding-plan.store';

// ─────────────────────────────────────────────────────────────────────────────
// Stubs
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: unknown, prop: string | symbol) => {
        if (prop === '__esModule') return false;
        return ({
          children,
          initial: _i,
          animate: _a,
          exit: _e,
          transition: _t,
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

const mockPlanStore = vi.fn();
vi.mock('@/store/onboarding-plan.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/onboarding-plan.store')>();
  return {
    ...actual,
    useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
      const state = mockPlanStore();
      return selector ? selector(state) : state;
    },
  };
});

import { StepProfile } from '@/components/onboarding/steps/StepProfile';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type MockState = {
  step2: WizardState['step2'];
  updateProfile: ReturnType<typeof vi.fn>;
};

function makeState(overrides: Partial<MockState> = {}): MockState {
  return {
    step2: {
      monthlyIncome: 3000,
      essentialsPct: 50,
      lifestyleBuffer: 225,
      monthlySavingsTarget: 500,
      investmentsTarget: 100,
    },
    updateProfile: vi.fn(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// calcLifestyleDefault unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('calcLifestyleDefault', () => {
  it('returns LIFESTYLE_SOFT_MIN when income = 0', () => {
    expect(calcLifestyleDefault(0, 50)).toBe(LIFESTYLE_SOFT_MIN);
  });

  it('returns max(50, min(500, disposable*0.15)) for typical income', () => {
    // income=3000, ess=50% → disposable=1500 → 1500*0.15=225 → clamped to [50,500]
    expect(calcLifestyleDefault(3000, 50)).toBe(225);
  });

  it('clamps to LIFESTYLE_SOFT_MIN (50) when disposable*0.15 < 50', () => {
    // income=200, ess=90% → disposable=20 → 20*0.15=3 → clamped to 50
    expect(calcLifestyleDefault(200, 90)).toBe(LIFESTYLE_SOFT_MIN);
  });

  it('clamps to 500 when disposable*0.15 > 500', () => {
    // income=50000, ess=10% → disposable=45000 → 45000*0.15=6750 → clamped to 500
    expect(calcLifestyleDefault(50_000, 10)).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// selectCanAdvanceFromStep2 selector tests
// ─────────────────────────────────────────────────────────────────────────────

describe('selectCanAdvanceFromStep2', () => {
  function makeWizardState(step2Overrides: Partial<WizardState['step2']> = {}): WizardState {
    return {
      currentStep: 1,
      step1: { monthlyIncome: 0 },
      step2: {
        monthlyIncome: 3000,
        essentialsPct: 50,
        lifestyleBuffer: 200,
        monthlySavingsTarget: 500,
        investmentsTarget: 100,
        ...step2Overrides,
      },
      step3: { goals: [] },
      step4: { allocationPreview: null, userOverrides: {} },
      step5: { enableAiCategorization: true, enableAiInsights: true },
      isPersisting: false,
      persistedPlanId: null,
      isAddGoalModalOpen: false,
      editingPresetId: null,
      invokerRoute: null,
      skipState: null,
    };
  }

  it('returns true when all fields valid and sum ≤ income', () => {
    // 3000*50%=1500 + 200 + 500 + 100 = 2300 ≤ 3000 ✓
    expect(selectCanAdvanceFromStep2(makeWizardState())).toBe(true);
  });

  it('returns false when income = 0', () => {
    expect(selectCanAdvanceFromStep2(makeWizardState({ monthlyIncome: 0 }))).toBe(false);
  });

  it('returns false when income below INCOME_MIN', () => {
    expect(selectCanAdvanceFromStep2(makeWizardState({ monthlyIncome: INCOME_MIN - 1 }))).toBe(false);
  });

  it('returns false when income above INCOME_MAX', () => {
    expect(selectCanAdvanceFromStep2(makeWizardState({ monthlyIncome: INCOME_MAX + 1 }))).toBe(false);
  });

  it('returns false when savings < SAVINGS_MIN', () => {
    expect(
      selectCanAdvanceFromStep2(makeWizardState({ monthlySavingsTarget: SAVINGS_MIN - 1 }))
    ).toBe(false);
  });

  it('returns false when sum exceeds income (overflow)', () => {
    // 3000*50%=1500 + 200 + 500 + 1000 = 3200 > 3000
    expect(
      selectCanAdvanceFromStep2(
        makeWizardState({ investmentsTarget: 1000 })
      )
    ).toBe(false);
  });

  it('returns true at exact boundary (sum === income)', () => {
    // 3000*50%=1500, lifestyle+savings+invest = 1500 exactly
    expect(
      selectCanAdvanceFromStep2(
        makeWizardState({ lifestyleBuffer: 500, monthlySavingsTarget: 700, investmentsTarget: 300 })
      )
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// StepProfile component tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StepProfile', () => {
  beforeEach(() => {
    mockPlanStore.mockReset();
  });

  it('renders income input with type=text and inputMode=decimal', () => {
    mockPlanStore.mockReturnValue(makeState({ step2: { ...makeState().step2, monthlyIncome: 0 } }));
    render(<StepProfile />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });

  it('shows income validation error after blur for non-numeric value', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepProfile />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/numero valido/i);
  });

  it('shows income error for value below INCOME_MIN', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepProfile />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls updateProfile with parsed income on valid input', () => {
    const updateProfile = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateProfile }));
    render(<StepProfile />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500' } });
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ monthlyIncome: 2500 }));
  });

  it('calls updateProfile with parsed comma-decimal income (2500,50)', () => {
    const updateProfile = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateProfile }));
    render(<StepProfile />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500,50' } });
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ monthlyIncome: 2500.5 }));
  });

  it('renders essentials slider with step=1', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepProfile />);
    const slider = screen.getByRole('slider', { name: /percentuale spese essenziali/i });
    expect(slider).toHaveAttribute('step', '1');
  });

  it('"Aumenta essenziali di 5%" button calls updateProfile with +5', () => {
    const updateProfile = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateProfile }));
    render(<StepProfile />);
    fireEvent.click(screen.getByRole('button', { name: /aumenta essenziali di 5%/i }));
    expect(updateProfile).toHaveBeenCalledWith({ essentialsPct: 55 });
  });

  it('"Diminuisci essenziali di 5%" button calls updateProfile with -5', () => {
    const updateProfile = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateProfile }));
    render(<StepProfile />);
    fireEvent.click(screen.getByRole('button', { name: /diminuisci essenziali di 5%/i }));
    expect(updateProfile).toHaveBeenCalledWith({ essentialsPct: 45 });
  });

  it('shows lifestyle CC-debt warning when lifestyleBuffer < LIFESTYLE_SOFT_MIN', () => {
    mockPlanStore.mockReturnValue(
      makeState({ step2: { ...makeState().step2, lifestyleBuffer: 0 } })
    );
    render(<StepProfile />);
    expect(screen.getByText(/rischio spirale debito/i)).toBeInTheDocument();
  });

  it('does NOT show lifestyle warning when lifestyleBuffer >= LIFESTYLE_SOFT_MIN', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepProfile />);
    expect(screen.queryByText(/rischio spirale debito/i)).not.toBeInTheDocument();
  });

  it('shows invest warning when investmentsTarget = 0', () => {
    mockPlanStore.mockReturnValue(
      makeState({ step2: { ...makeState().step2, investmentsTarget: 0 } })
    );
    render(<StepProfile />);
    expect(screen.getByText(/zero investimenti/i)).toBeInTheDocument();
  });

  it('does NOT show invest warning when investmentsTarget > 0', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepProfile />);
    expect(screen.queryByText(/zero investimenti/i)).not.toBeInTheDocument();
  });

  it('shows sum-overflow error when allocatedSum > income', () => {
    // income=3000, essentials=50%(1500), lifestyle=200, savings=500, invest=1000 → sum=3200 > 3000
    mockPlanStore.mockReturnValue(
      makeState({
        step2: {
          monthlyIncome: 3000,
          essentialsPct: 50,
          lifestyleBuffer: 200,
          monthlySavingsTarget: 500,
          investmentsTarget: 1000,
        },
      })
    );
    render(<StepProfile />);
    expect(screen.getByRole('alert', { hidden: false })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/somma eccede/i);
  });

  it('does NOT show sum-overflow error when sum ≤ income', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepProfile />);
    // Only income validation alerts should fire, none about sum
    const alerts = screen.queryAllByRole('alert');
    expect(alerts.every((a) => !a.textContent?.match(/somma eccede/i))).toBe(true);
  });

  it('renders 4-segment split bar when income > 0', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepProfile />);
    expect(screen.getByTestId('split-bar')).toBeInTheDocument();
  });

  it('does NOT render split bar when income = 0', () => {
    mockPlanStore.mockReturnValue(
      makeState({ step2: { ...makeState().step2, monthlyIncome: 0 } })
    );
    render(<StepProfile />);
    expect(screen.queryByTestId('split-bar')).not.toBeInTheDocument();
  });
});
