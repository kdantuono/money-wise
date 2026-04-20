/**
 * Tests for StepReady — Sprint 1.5.2 WP-F (Step 5 Pronto).
 *
 * Covers:
 *  - Summary box renders income / essenziali / lifestyle / savings / invest
 *  - Goals list with per-goal allocation amounts
 *  - Behavioral warnings section shown only when warnings are present
 *  - AI preference checkboxes rendered and interactive
 *  - Rocket animation element present; animates when isPersisting=true
 *  - Private: no-goals edge case (goals section absent)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../utils/test-utils';
import { StepReady } from '@/components/onboarding/steps/StepReady';
import type { AllocationResult, BehavioralWarning } from '@/types/onboarding-plan';

// ---------------------------------------------------------------------------
// Framer-motion stub — props-forwarding passthrough
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Store mock
// ---------------------------------------------------------------------------
const mockSetAiPrefs = vi.fn();

const makeAllocationPreview = (overrides?: Partial<AllocationResult>): AllocationResult => ({
  items: [
    {
      goalId: 'goal-1',
      monthlyAmount: 150,
      deadlineFeasible: true,
      reasoning: 'Copertura target in 12 mesi',
      warnings: [],
    },
    {
      goalId: 'goal-2',
      monthlyAmount: 80,
      deadlineFeasible: false,
      reasoning: 'Deadline ottimistica',
      warnings: ['deadline non fattibile'],
    },
  ],
  incomeAfterEssentials: 1500,
  totalAllocated: 230,
  unallocated: 1270,
  warnings: [],
  behavioralWarnings: [],
  ...overrides,
});

type MockStoreState = {
  step2: {
    monthlyIncome: number;
    essentialsPct: number;
    lifestyleBuffer: number;
    monthlySavingsTarget: number;
    investmentsTarget: number;
  };
  step3: { goals: Array<{ tempId: string; name: string; target: number; deadline: string | null; priority: 1 | 2 | 3 }> };
  step4: { allocationPreview: AllocationResult | null };
  step5: { enableAiCategorization: boolean; enableAiInsights: boolean };
  setAiPrefs: typeof mockSetAiPrefs;
  isPersisting: boolean;
};

let mockStoreState: MockStoreState;

vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector: (s: MockStoreState) => unknown) =>
    selector(mockStoreState),
}));

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
const defaultGoals = [
  { tempId: 'goal-1', name: 'Fondo Emergenza', target: 5000, deadline: '2026-12-31', priority: 1 as const },
  { tempId: 'goal-2', name: 'Casa', target: 50000, deadline: '2028-01-01', priority: 2 as const },
];

function buildStore(overrides?: Partial<MockStoreState>): MockStoreState {
  return {
    step2: {
      monthlyIncome: 3000,
      essentialsPct: 50,
      lifestyleBuffer: 200,
      monthlySavingsTarget: 500,
      investmentsTarget: 100,
    },
    step3: { goals: defaultGoals },
    step4: { allocationPreview: makeAllocationPreview() },
    step5: { enableAiCategorization: true, enableAiInsights: true },
    setAiPrefs: mockSetAiPrefs,
    isPersisting: false,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================
describe('StepReady (Sprint 1.5.2 WP-F)', () => {
  beforeEach(() => {
    mockStoreState = buildStore();
    mockSetAiPrefs.mockClear();
  });

  // ---------- Summary box — income breakdown ----------------------------------
  describe('income breakdown summary', () => {
    it('renders plan-summary section', () => {
      render(<StepReady />);
      expect(screen.getByTestId('plan-summary')).toBeInTheDocument();
    });

    it('shows "Il tuo piano è pronto!" heading', () => {
      render(<StepReady />);
      expect(screen.getByText('Il tuo piano è pronto!')).toBeInTheDocument();
    });

    it('displays monthly income formatted', () => {
      render(<StepReady />);
      // €3.000 in Italian locale
      expect(screen.getByText(/€3/)).toBeInTheDocument();
    });

    it('displays essentials percentage label', () => {
      render(<StepReady />);
      expect(screen.getByText(/Essenziali \(50%\)/)).toBeInTheDocument();
    });

    it('displays lifestyle buffer amount', () => {
      render(<StepReady />);
      expect(screen.getByText(/€200/)).toBeInTheDocument();
    });

    it('displays savings target amount', () => {
      render(<StepReady />);
      expect(screen.getByText(/€500/)).toBeInTheDocument();
    });

    it('displays investments target when > 0', () => {
      render(<StepReady />);
      expect(screen.getByText(/€100/)).toBeInTheDocument();
    });

    it('shows "Non allocati" when investmentsTarget is 0', () => {
      mockStoreState = buildStore({ step2: { ...buildStore().step2, investmentsTarget: 0 } });
      render(<StepReady />);
      expect(screen.getByText('Non allocati')).toBeInTheDocument();
    });
  });

  // ---------- Goals list -------------------------------------------------------
  describe('goals list', () => {
    it('renders goals section with correct count label', () => {
      render(<StepReady />);
      expect(screen.getByText(/Obiettivi \(2\)/)).toBeInTheDocument();
    });

    it('renders goal names', () => {
      render(<StepReady />);
      expect(screen.getByText('Fondo Emergenza')).toBeInTheDocument();
      expect(screen.getByText('Casa')).toBeInTheDocument();
    });

    it('renders per-goal monthly allocation from allocationPreview', () => {
      render(<StepReady />);
      expect(screen.getByText('€150/mese')).toBeInTheDocument();
      expect(screen.getByText('€80/mese')).toBeInTheDocument();
    });

    it('shows — when allocationPreview is null', () => {
      mockStoreState = buildStore({ step4: { allocationPreview: null } });
      render(<StepReady />);
      const dashes = screen.getAllByText('—');
      // Two goals with no allocation → two dashes
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it('does not render goals section when no goals', () => {
      mockStoreState = buildStore({ step3: { goals: [] } });
      render(<StepReady />);
      expect(screen.queryByRole('list', { name: /lista obiettivi/i })).not.toBeInTheDocument();
    });

    it('shows priority label next to each goal', () => {
      render(<StepReady />);
      expect(screen.getByText('(Alta)')).toBeInTheDocument();
      expect(screen.getByText('(Media)')).toBeInTheDocument();
    });
  });

  // ---------- Behavioral warnings section -------------------------------------
  describe('behavioral warnings', () => {
    it('does not render advisor section when no warnings', () => {
      render(<StepReady />);
      expect(screen.queryByRole('note', { name: /consigli comportamentali/i })).not.toBeInTheDocument();
    });

    it('renders advisor section when warnings are present', () => {
      const warnings: BehavioralWarning[] = [
        {
          code: 'LIFESTYLE_ZERO',
          severity: 'soft',
          message: 'Ehi, zero budget lifestyle? Ti tengo d\'occhio eh!',
          reasoning: 'Rischio CC debt spiral',
        },
      ];
      mockStoreState = buildStore({
        step4: {
          allocationPreview: makeAllocationPreview({ behavioralWarnings: warnings }),
        },
      });
      render(<StepReady />);
      expect(screen.getByRole('note', { name: /consigli comportamentali/i })).toBeInTheDocument();
      expect(screen.getByText(/Ehi, zero budget lifestyle/)).toBeInTheDocument();
    });

    it('renders multiple warnings', () => {
      const warnings: BehavioralWarning[] = [
        { code: 'W1', severity: 'soft', message: 'Avviso 1', reasoning: '' },
        { code: 'W2', severity: 'hard', message: 'Avviso 2', reasoning: '' },
      ];
      mockStoreState = buildStore({
        step4: {
          allocationPreview: makeAllocationPreview({ behavioralWarnings: warnings }),
        },
      });
      render(<StepReady />);
      expect(screen.getByText('Avviso 1')).toBeInTheDocument();
      expect(screen.getByText('Avviso 2')).toBeInTheDocument();
    });
  });

  // ---------- AI preferences checkboxes ---------------------------------------
  describe('AI preferences', () => {
    it('renders categorizzazione automatica checkbox', () => {
      render(<StepReady />);
      expect(screen.getByLabelText(/categorizzazione automatica/i)).toBeInTheDocument();
    });

    it('renders insight personalizzati checkbox', () => {
      render(<StepReady />);
      expect(screen.getByLabelText(/insight personalizzati/i)).toBeInTheDocument();
    });

    it('categorizzazione checkbox reflects store state (checked)', () => {
      render(<StepReady />);
      expect(screen.getByLabelText(/categorizzazione automatica/i)).toBeChecked();
    });

    it('insight checkbox reflects store state (checked)', () => {
      render(<StepReady />);
      expect(screen.getByLabelText(/insight personalizzati/i)).toBeChecked();
    });

    it('unchecking categorizzazione calls setAiPrefs(false, true)', () => {
      render(<StepReady />);
      fireEvent.click(screen.getByLabelText(/categorizzazione automatica/i));
      expect(mockSetAiPrefs).toHaveBeenCalledWith(false, true);
    });

    it('unchecking insights calls setAiPrefs(true, false)', () => {
      render(<StepReady />);
      fireEvent.click(screen.getByLabelText(/insight personalizzati/i));
      expect(mockSetAiPrefs).toHaveBeenCalledWith(true, false);
    });
  });

  // ---------- Rocket animation ------------------------------------------------
  describe('Rocket animation', () => {
    it('renders Rocket icon element', () => {
      render(<StepReady />);
      // Rocket is wrapped in a motion div with aria-hidden; svg should be present
      const summary = screen.getByTestId('plan-summary');
      const rocketSvg = summary.closest('div')!.querySelector('svg');
      expect(rocketSvg).toBeInTheDocument();
    });

    it('renders plan-summary section during isPersisting=true', () => {
      mockStoreState = buildStore({ isPersisting: true });
      render(<StepReady />);
      // Summary still visible while persisting (animation plays before redirect)
      expect(screen.getByTestId('plan-summary')).toBeInTheDocument();
    });
  });

  // ---------- Privacy note ----------------------------------------------------
  it('renders privacy note', () => {
    render(<StepReady />);
    expect(screen.getByText(/Zecca non condivide info finanziarie con terzi/)).toBeInTheDocument();
  });
});
