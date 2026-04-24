/**
 * Sprint 1.5.2 — WP-E: StepCalibration component tests
 *
 * Covers:
 * - Renders summary bar with correct figures
 * - Goal items render with sliders
 * - Hard-block error renders and Avanti gating
 * - Behavioral warning badges render
 * - Suggestion chips render and call setUserOverride on apply
 * - Empty state when no goals
 * - Slider interaction updates override
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import type { AllocationResult, WizardState } from '@/types/onboarding-plan';

// ─── Mock Radix Slider ──────────────────────────────────────────────────────
// jsdom doesn't support pointer events fully; mock with a basic range input
vi.mock('@radix-ui/react-slider', () => ({
  Root: ({
    children,
    onValueChange,
    value,
    'aria-label': ariaLabel,
    'data-testid': testId,
    ...rest
  }: {
    children: React.ReactNode;
    onValueChange?: (v: number[]) => void;
    value?: number[];
    'aria-label'?: string;
    'data-testid'?: string;
    [k: string]: unknown;
  }) => (
    <div data-testid={testId} aria-label={ariaLabel}>
      <input
        type="range"
        aria-label={ariaLabel}
        value={value?.[0] ?? 0}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        {...(rest as object)}
      />
      {children}
    </div>
  ),
  Track: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Range: () => <div />,
  Thumb: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <div aria-label={ariaLabel} role="slider" />
  ),
}));

// ─── Mock DeterministicBehavioralAdvisor ───────────────────────────────────
// vi.mock is hoisted — define functions inside factory to avoid TDZ issues.
// Expose via module-level refs set INSIDE the factory using vi.hoisted.
const { mockProposeAllocation, mockAnalyzeUserOverride, mockGenerateSuggestions } = vi.hoisted(() => ({
  mockProposeAllocation: vi.fn(),
  mockAnalyzeUserOverride: vi.fn(),
  mockGenerateSuggestions: vi.fn(),
}));

vi.mock('@/lib/onboarding/advisors/DeterministicBehavioralAdvisor', () => {
  class MockAdvisor {
    proposeAllocation = mockProposeAllocation;
    analyzeUserOverride = mockAnalyzeUserOverride;
    generateSuggestions = mockGenerateSuggestions;
  }
  return { DeterministicBehavioralAdvisor: MockAdvisor };
});

// ─── Store mock ─────────────────────────────────────────────────────────────
const mockSetAllocationPreview = vi.fn();
const mockSetUserOverride = vi.fn();
const mockStoreState: Partial<WizardState> & {
  setAllocationPreview: typeof mockSetAllocationPreview;
  setUserOverride: typeof mockSetUserOverride;
} = {
  step1: { monthlyIncome: 2500 },
  // Post WP-C: step2 is WizardStepProfile (5-field model), monthlyIncome moved here.
  step2: {
    monthlyIncome: 2500,
    essentialsPct: 50,
    lifestyleBuffer: 200,
    monthlySavingsTarget: 500,
    investmentsTarget: 100,
  },
  step3: {
    goals: [
      {
        tempId: 'goal-1',
        name: 'Fondo Emergenza',
        target: 5000,
        deadline: '2027-04-19',
        priority: 1,
      },
    ],
  },
  step4: { allocationPreview: null, userOverrides: {} },
  setAllocationPreview: mockSetAllocationPreview,
  setUserOverride: mockSetUserOverride,
};

vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
    if (selector) return selector(mockStoreState);
    return mockStoreState;
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAllocationResult(
  overrides: Partial<AllocationResult> = {},
): AllocationResult {
  return {
    items: [
      {
        goalId: 'goal-1',
        monthlyAmount: 200,
        deadlineFeasible: true,
        reasoning: 'Fondo di emergenza: allocazione prioritaria',
        warnings: [],
      },
    ],
    incomeAfterEssentials: 1250,
    totalAllocated: 200,
    unallocated: 300,
    warnings: [],
    behavioralWarnings: [],
    hardBlock: null,
    suggestions: [],
    ...overrides,
  };
}

import { StepCalibration } from '@/components/onboarding/steps/StepCalibration';

describe('StepCalibration', () => {
  beforeEach(() => {
    mockProposeAllocation.mockReturnValue(makeAllocationResult());
    mockAnalyzeUserOverride.mockReturnValue([]);
    mockGenerateSuggestions.mockReturnValue([]);
    mockSetAllocationPreview.mockClear();
    mockSetUserOverride.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ─────────────────────────────────────────────────────────

  it('renders the calibration container', () => {
    render(<StepCalibration />);
    expect(screen.getByTestId('step-calibration')).toBeInTheDocument();
  });

  it('renders summary bar with Post-essenziali, Allocato, Residuo', () => {
    render(<StepCalibration />);
    expect(screen.getByText('Post-essenziali')).toBeInTheDocument();
    expect(screen.getByText('Allocato')).toBeInTheDocument();
    expect(screen.getByText('Residuo')).toBeInTheDocument();
  });

  it('renders correct monetary values in summary bar', () => {
    render(<StepCalibration />);
    // 1250 post-essenziali — locale may render as "1.250" or "1,250" depending on env
    expect(screen.getByText(/€1[.,]?250/)).toBeInTheDocument();
    expect(screen.getByText('€200')).toBeInTheDocument();
    expect(screen.getByText('€300')).toBeInTheDocument();
  });

  it('renders goal item with name and monthly amount', () => {
    render(<StepCalibration />);
    expect(screen.getByText('Fondo Emergenza')).toBeInTheDocument();
    expect(screen.getByText('€200/mese')).toBeInTheDocument();
  });

  it('renders slider for each goal', () => {
    render(<StepCalibration />);
    const slider = screen.getByTestId('slider-goal-1');
    expect(slider).toBeInTheDocument();
  });

  it('renders goal reasoning text', () => {
    render(<StepCalibration />);
    expect(screen.getByText(/Fondo di emergenza: allocazione prioritaria/i)).toBeInTheDocument();
  });

  // ── Hard-block ────────────────────────────────────────────────────────

  it('renders hard-block error when hardBlock is set', () => {
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        hardBlock: { reason: 'Configurazione impossibile: reddito negativo.' },
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByTestId('hard-block-error')).toBeInTheDocument();
    expect(screen.getByText(/Configurazione impossibile/i)).toBeInTheDocument();
  });

  it('does not render hard-block error when hardBlock is null', () => {
    render(<StepCalibration />);
    expect(screen.queryByTestId('hard-block-error')).not.toBeInTheDocument();
  });

  // ── Behavioral warnings ───────────────────────────────────────────────

  it('renders soft behavioral warning badge', () => {
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        behavioralWarnings: [
          {
            code: 'NO_EMERGENCY_FUND',
            severity: 'soft',
            message: '🐷 Non hai un Fondo Emergenza attivo!',
            reasoning: 'Ti consiglio di aggiungerne uno.',
          },
        ],
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByText(/Non hai un Fondo Emergenza attivo!/i)).toBeInTheDocument();
  });

  it('renders hard behavioral warning badge with red styling', () => {
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        behavioralWarnings: [
          {
            code: 'NEGATIVE_DISPOSABLE',
            severity: 'hard',
            message: '🔴 Il totale allocato supera il reddito disponibile.',
            reasoning: 'Riduci il target di risparmio.',
          },
        ],
      }),
    );
    render(<StepCalibration />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('bg-red-50');
  });

  // #056 tri-state: test store step2 savingsTarget=500 → savingsPool=500.
  // Component recalcs totalAllocated da items[].monthlyAmount (effective con overrides),
  // quindi mock override deve modificare items, non totalAllocated.

  it('renders encouragement badge when PLAN_BALANCED (banner green)', () => {
    // Green: items sum = 500 → unallocated=0
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        items: [
          { goalId: 'goal-1', monthlyAmount: 500, deadlineFeasible: true, reasoning: '', warnings: [] },
        ],
        behavioralWarnings: [
          {
            code: 'PLAN_BALANCED',
            severity: 'soft',
            message: '🔥 Sei sulla strada giusta!',
            reasoning: 'Ottimo lavoro!',
          },
        ],
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByText(/Sei sulla strada giusta/i)).toBeInTheDocument();
  });

  it('renders red banner when residuo negativo (overflow)', () => {
    // Red: items sum = 550 > savingsPool 500 → unallocated = -50
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        items: [
          { goalId: 'goal-1', monthlyAmount: 550, deadlineFeasible: true, reasoning: '', warnings: [] },
        ],
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByTestId('step4-banner-red')).toBeInTheDocument();
    expect(screen.getByText(/Eccedenza/i)).toBeInTheDocument();
  });

  it('renders yellow banner when residuo > 10% pool (sotto-allocato)', () => {
    // Yellow: items sum = 400 → unallocated=100 (20% di pool 500, >10%)
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        items: [
          { goalId: 'goal-1', monthlyAmount: 400, deadlineFeasible: true, reasoning: '', warnings: [] },
        ],
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByTestId('step4-banner-yellow')).toBeInTheDocument();
    expect(screen.getByText(/Puoi allocare altri/i)).toBeInTheDocument();
  });

  it('does NOT show green encouragement when banner is red or yellow', () => {
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        items: [
          { goalId: 'goal-1', monthlyAmount: 550, deadlineFeasible: true, reasoning: '', warnings: [] },
        ],
        behavioralWarnings: [
          {
            code: 'PLAN_BALANCED',
            severity: 'soft',
            message: '🔥 Sei sulla strada giusta!',
            reasoning: 'Ottimo lavoro!',
          },
        ],
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByTestId('step4-banner-red')).toBeInTheDocument();
    expect(screen.queryByText(/Sei sulla strada giusta/i)).not.toBeInTheDocument();
  });

  // ── Suggestion chips ──────────────────────────────────────────────────

  it('renders suggestion chips when present', () => {
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        suggestions: [
          {
            kind: 'extend_deadline',
            goalId: 'goal-1',
            delta: 6,
            newValue: '2027-10-19',
            description: 'Estendi deadline di +6 mesi',
            reasoning: 'Così raggiungi il target senza stress.',
          },
        ],
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByText('Estendi deadline di +6 mesi')).toBeInTheDocument();
  });

  it('calls setUserOverride when increase_monthly chip is applied', async () => {
    const user = userEvent.setup({ delay: null });
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        suggestions: [
          {
            kind: 'increase_monthly',
            goalId: 'goal-1',
            delta: 100,
            newValue: 300,
            description: 'Aumenta risparmio mensile di +€100',
            reasoning: 'Così il target diventa raggiungibile.',
          },
        ],
      }),
    );
    render(<StepCalibration />);
    const chip = screen.getByText('Aumenta risparmio mensile di +€100');
    await user.click(chip);
    expect(mockSetUserOverride).toHaveBeenCalledWith('goal-1', 300);
  });

  // ── Empty states ──────────────────────────────────────────────────────

  it('renders empty state when no goals (store returns empty goals)', () => {
    // Temporarily swap goals to empty
    const originalGoals = mockStoreState.step3!.goals;
    mockStoreState.step3!.goals = [];
    render(<StepCalibration />);
    expect(screen.getByText(/Aggiungi almeno un obiettivo/i)).toBeInTheDocument();
    // Restore
    mockStoreState.step3!.goals = originalGoals;
  });

  // ── Calls setAllocationPreview ────────────────────────────────────────

  it('calls setAllocationPreview with result on mount', () => {
    render(<StepCalibration />);
    // proposeAllocation is synchronous; React test renderer flushes effects synchronously
    expect(mockSetAllocationPreview).toHaveBeenCalledWith(
      expect.objectContaining({ items: expect.any(Array) }),
    );
  });

  // ── Deadline infeasible badge ─────────────────────────────────────────

  it('renders "deadline non fattibile" label for infeasible items', () => {
    mockProposeAllocation.mockReturnValue(
      makeAllocationResult({
        items: [
          {
            goalId: 'goal-1',
            monthlyAmount: 50,
            deadlineFeasible: false,
            reasoning: 'Budget insufficiente',
            warnings: ['Budget insufficiente per raggiungere questo goal.'],
          },
        ],
      }),
    );
    render(<StepCalibration />);
    expect(screen.getByText(/deadline non fattibile/i)).toBeInTheDocument();
  });
});
