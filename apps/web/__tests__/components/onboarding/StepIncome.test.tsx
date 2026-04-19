/**
 * Tests for StepIncome — Sprint 1.5.1 CRIT-02 (issue #457).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../utils/test-utils';
import type { WizardState } from '@/types/onboarding-plan';
import {
  selectCanAdvanceFromStep1,
  INCOME_MIN,
  INCOME_MAX,
} from '@/store/onboarding-plan.store';

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

const mockPlanStore = vi.fn();
vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
    const state = mockPlanStore();
    return selector ? selector(state) : state;
  },
  INCOME_MIN: 100,
  INCOME_MAX: 100_000,
  selectCanAdvanceFromStep1: (s: WizardState): boolean => {
    const income = s.step1.monthlyIncome;
    return income >= 100 && income <= 100_000;
  },
}));

import { StepIncome } from '@/components/onboarding/steps/StepIncome';

type StepState = Pick<WizardState, 'step1'> & {
  updateIncome: ReturnType<typeof vi.fn>;
};

function makeState(overrides: Partial<StepState> = {}): StepState {
  return {
    step1: { monthlyIncome: 0 },
    updateIncome: vi.fn(),
    ...overrides,
  };
}

describe('StepIncome — validation (issue #457)', () => {
  beforeEach(() => {
    mockPlanStore.mockReset();
  });

  it('renders a text input (not number) with inputMode="decimal"', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });

  it('calls updateIncome(0) when input is cleared', () => {
    const updateIncome = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ step1: { monthlyIncome: 2500 }, updateIncome }));
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '' } });
    expect(updateIncome).toHaveBeenLastCalledWith(0);
  });

  it('does NOT show error for empty input (no blur yet)', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows error after blur when input is non-numeric ("abc")', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/numero valido/i);
  });

  it('calls updateIncome(0) for non-numeric input', () => {
    const updateIncome = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateIncome }));
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(updateIncome).toHaveBeenLastCalledWith(0);
  });

  it('shows error after blur when income is below EUR100 ("50")', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/100/);
  });

  it('shows error after blur when income exceeds EUR100.000 ("200000")', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '200000' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/100/);
  });

  it('accepts valid integer "2500" and calls updateIncome(2500)', () => {
    const updateIncome = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateIncome }));
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500' } });
    expect(updateIncome).toHaveBeenLastCalledWith(2500);
  });

  it('shows no error after blur for valid integer "2500"', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500' } });
    fireEvent.blur(input);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('accepts "2500,50" (comma decimal) and calls updateIncome(2500.5)', () => {
    const updateIncome = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateIncome }));
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500,50' } });
    expect(updateIncome).toHaveBeenLastCalledWith(2500.5);
  });

  it('shows no error after blur for "2500,50"', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500,50' } });
    fireEvent.blur(input);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('accepts "2500.50" (dot decimal) and calls updateIncome(2500.5)', () => {
    const updateIncome = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ updateIncome }));
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500.50' } });
    expect(updateIncome).toHaveBeenLastCalledWith(2500.5);
  });

  it('shows no error after blur for "2500.50"', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    const input = screen.getByRole('textbox', { name: /reddito netto mensile/i });
    fireEvent.change(input, { target: { value: '2500.50' } });
    fireEvent.blur(input);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a "Preferisco saltare" button', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    expect(screen.getByRole('button', { name: /preferisco saltare/i })).toBeInTheDocument();
  });

  it('calls updateIncome(0) when skip button is clicked', () => {
    const updateIncome = vi.fn();
    mockPlanStore.mockReturnValue(makeState({ step1: { monthlyIncome: 2500 }, updateIncome }));
    render(<StepIncome />);
    fireEvent.click(screen.getByRole('button', { name: /preferisco saltare/i }));
    expect(updateIncome).toHaveBeenLastCalledWith(0);
  });

  it('shows skip warning after skip button click', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepIncome />);
    fireEvent.click(screen.getByRole('button', { name: /preferisco saltare/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/allocazione/i);
  });
});

describe('selectCanAdvanceFromStep1 selector', () => {
  function makeWizardState(monthlyIncome: number): WizardState {
    return {
      currentStep: 1,
      step1: { monthlyIncome },
      step2: { monthlySavingsTarget: 0, essentialsPct: 50 },
      step3: { goals: [] },
      step4: { allocationPreview: null, userOverrides: {} },
      step5: { enableAiCategorization: true, enableAiInsights: true },
      isPersisting: false,
      persistedPlanId: null,
    };
  }

  it('returns false for income = 0 (initial / skipped)', () => {
    expect(selectCanAdvanceFromStep1(makeWizardState(0))).toBe(false);
  });

  it('returns false for income below INCOME_MIN', () => {
    expect(selectCanAdvanceFromStep1(makeWizardState(INCOME_MIN - 1))).toBe(false);
  });

  it('returns true for income = INCOME_MIN (boundary)', () => {
    expect(selectCanAdvanceFromStep1(makeWizardState(INCOME_MIN))).toBe(true);
  });

  it('returns true for income = INCOME_MAX (boundary)', () => {
    expect(selectCanAdvanceFromStep1(makeWizardState(INCOME_MAX))).toBe(true);
  });

  it('returns false for income above INCOME_MAX', () => {
    expect(selectCanAdvanceFromStep1(makeWizardState(INCOME_MAX + 1))).toBe(false);
  });

  it('returns true for typical income value (2500)', () => {
    expect(selectCanAdvanceFromStep1(makeWizardState(2500))).toBe(true);
  });
});
