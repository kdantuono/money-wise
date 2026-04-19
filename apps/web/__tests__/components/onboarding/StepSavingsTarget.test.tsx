/**
 * Tests for StepSavingsTarget (Sprint 1.5 — Bug #2).
 *
 * Covers the live €-split visualisation that replaced the silent slider:
 *  - numeric input + range slider presence
 *  - live €-amount label reacts to essentialsPct
 *  - split bar renders only when income > 0
 *  - warning banner fires when savings target exceeds available disposable income
 *  - updateSavingsTarget is called with correct (target, pct) on both inputs
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { fireEvent } from '@testing-library/react';
import type { WizardState } from '@/types/onboarding-plan';

// --------------------------------------------------------------------------
// framer-motion stub (forwards props & children)
// --------------------------------------------------------------------------
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
// Onboarding-plan store mock — selector pattern
// --------------------------------------------------------------------------
const mockPlanStore = vi.fn();
vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
    const state = mockPlanStore();
    return selector ? selector(state) : state;
  },
}));

import { StepSavingsTarget } from '@/components/onboarding/steps/StepSavingsTarget';

type StepState = Pick<WizardState, 'step1' | 'step2'> & {
  updateSavingsTarget: ReturnType<typeof vi.fn>;
};

function makeState(overrides: Partial<StepState> = {}): StepState {
  return {
    step1: { monthlyIncome: 3000 },
    step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
    updateSavingsTarget: vi.fn(),
    ...overrides,
  };
}

describe('StepSavingsTarget (Sprint 1.5)', () => {
  beforeEach(() => {
    mockPlanStore.mockReset();
  });

  it('renders the savings target input and essentials slider', () => {
    mockPlanStore.mockReturnValue(makeState());
    render(<StepSavingsTarget />);

    const savingsInput = screen.getByLabelText(/Risparmio mensile target/i);
    expect(savingsInput).toHaveValue(500);

    const essentialsSlider = screen.getByLabelText(/Quota spese essenziali/i);
    expect(essentialsSlider).toHaveAttribute('type', 'range');
    expect(essentialsSlider).toHaveValue('50');
  });

  it('shows the live essentials € amount when income > 0 (3000 × 50% = 1500)', () => {
    mockPlanStore.mockReturnValue(
      makeState({
        step1: { monthlyIncome: 3000 },
        step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
      })
    );
    render(<StepSavingsTarget />);

    // Note: jsdom ships the "en-US" ICU locale only, so Intl.toLocaleString('it-IT', …)
    // falls back to en-US; "1500" appears without the Italian "1.500" separator.
    // We assert the numeric value + "%" regardless of separator.
    const labelText = screen.getByText(/Quota spese essenziali/i).textContent ?? '';
    expect(labelText).toMatch(/1[.,]?500/);
    expect(labelText).toContain('50%');
  });

  it('renders the split visualization (Essenziali / Disponibile) when income > 0', () => {
    mockPlanStore.mockReturnValue(
      makeState({
        step1: { monthlyIncome: 3000 },
        step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
      })
    );
    render(<StepSavingsTarget />);

    // Split-bar labels are <p> with exact text. Use a function matcher that
    // matches ONLY the tight <p>Essenziali</p> / <p>Disponibile</p> nodes.
    // Case matters here: the label "Quota spese essenziali" (lowercase)
    // would match /Essenziali/i but is a <span>, not a <p>.
    const exactP = (text: string) => (content: string, el: Element | null) =>
      el?.tagName === 'P' && content === text;

    expect(screen.getByText(exactP('Essenziali'))).toBeInTheDocument();
    expect(screen.getByText(exactP('Disponibile'))).toBeInTheDocument();
  });

  it('does NOT render the split visualization when income = 0', () => {
    mockPlanStore.mockReturnValue(
      makeState({
        step1: { monthlyIncome: 0 },
        step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
      })
    );
    render(<StepSavingsTarget />);

    const exactP = (text: string) => (content: string, el: Element | null) =>
      el?.tagName === 'P' && content === text;

    expect(screen.queryByText(exactP('Essenziali'))).not.toBeInTheDocument();
    expect(screen.queryByText(exactP('Disponibile'))).not.toBeInTheDocument();
  });

  it('shows amber warning when savings target exceeds disposable (target 2000, income 3000, essentials 60% → available 1200)', () => {
    mockPlanStore.mockReturnValue(
      makeState({
        step1: { monthlyIncome: 3000 },
        step2: { monthlySavingsTarget: 2000, essentialsPct: 60 },
      })
    );
    render(<StepSavingsTarget />);

    expect(screen.getByText(/supera il disponibile/i)).toBeInTheDocument();
  });

  it('does NOT show warning when target is within disposable (target 300, income 3000, essentials 50% → available 1500)', () => {
    mockPlanStore.mockReturnValue(
      makeState({
        step1: { monthlyIncome: 3000 },
        step2: { monthlySavingsTarget: 300, essentialsPct: 50 },
      })
    );
    render(<StepSavingsTarget />);

    expect(screen.queryByText(/supera il disponibile/i)).not.toBeInTheDocument();
  });

  it('calls updateSavingsTarget(newTarget, pct) when the target input changes', () => {
    const updateSavingsTarget = vi.fn();
    mockPlanStore.mockReturnValue(
      makeState({
        step1: { monthlyIncome: 3000 },
        step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
        updateSavingsTarget,
      })
    );
    render(<StepSavingsTarget />);

    const savingsInput = screen.getByLabelText(/Risparmio mensile target/i);
    fireEvent.change(savingsInput, { target: { value: '750' } });

    expect(updateSavingsTarget).toHaveBeenCalledWith(750, 50);
  });

  it('calls updateSavingsTarget(target, newPct) when the slider changes', () => {
    const updateSavingsTarget = vi.fn();
    mockPlanStore.mockReturnValue(
      makeState({
        step1: { monthlyIncome: 3000 },
        step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
        updateSavingsTarget,
      })
    );
    render(<StepSavingsTarget />);

    const slider = screen.getByLabelText(/Quota spese essenziali/i);
    fireEvent.change(slider, { target: { value: '65' } });

    expect(updateSavingsTarget).toHaveBeenCalledWith(500, 65);
  });
});
