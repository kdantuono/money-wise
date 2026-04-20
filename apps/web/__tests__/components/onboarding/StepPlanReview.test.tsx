/**
 * Tests for StepPlanReview — issue #460 "Aggiusta goal" chip.
 *
 * Covers:
 * - Chip renders for goals with deadlineFeasible === false
 * - Chip does NOT render for goals with deadlineFeasible === true
 * - Chip click calls prevStep + setEditingGoal(tempId) + setAddGoalModalOpen(true)
 * - Multiple goals: only infeasible ones show chip
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import type { PriorityRank, AllocationResult, WizardGoalDraft } from '@/types/onboarding-plan';

// --------------------------------------------------------------------------
// Store mock
// --------------------------------------------------------------------------

const mockSetAllocationPreview = vi.fn();
const mockPrevStep = vi.fn();
const mockSetEditingGoal = vi.fn();
const mockSetAddGoalModalOpen = vi.fn();

const mockStore = vi.fn();
vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
    const state = mockStore();
    return selector ? selector(state) : state;
  },
}));

// Allocation module mock — returns null so component shows "Aggiungi obiettivo" state
// unless we provide allocationPreview directly in store state
vi.mock('@/lib/onboarding/allocation', () => ({
  computeAllocation: vi.fn(() => null),
}));

function makeGoal(tempId: string, name: string, priority: PriorityRank = 2): WizardGoalDraft {
  return { tempId, name, target: 5000, deadline: '2025-12-31', priority };
}

function makeAllocation(
  goalId: string,
  monthlyAmount: number,
  deadlineFeasible: boolean
) {
  return {
    goalId,
    monthlyAmount,
    deadlineFeasible,
    reasoning: deadlineFeasible ? 'On track' : 'Target troppo ambizioso per la scadenza',
    warnings: [],
  };
}

function makeStoreState(
  goals: WizardGoalDraft[] = [],
  allocationItems: ReturnType<typeof makeAllocation>[] = []
) {
  const allocationPreview: AllocationResult | null =
    allocationItems.length > 0
      ? {
          items: allocationItems,
          incomeAfterEssentials: 2000,
          totalAllocated: allocationItems.reduce((s, i) => s + i.monthlyAmount, 0),
          unallocated: 0,
          warnings: [],
        }
      : null;

  return {
    step1: { monthlyIncome: 3000 },
    step2: { monthlySavingsTarget: 500, essentialsPct: 50 },
    step3: { goals },
    step4: { allocationPreview, userOverrides: {} },
    setAllocationPreview: mockSetAllocationPreview,
    prevStep: mockPrevStep,
    setEditingGoal: mockSetEditingGoal,
    setAddGoalModalOpen: mockSetAddGoalModalOpen,
  };
}

import { StepPlanReview } from '@/components/onboarding/steps/StepPlanReview';

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('StepPlanReview — "Aggiusta goal" chip (issue #460)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Aggiusta goal" chip for goal with deadlineFeasible === false', () => {
    const goals = [makeGoal('g1', 'Comprare Casa')];
    const allocations = [makeAllocation('g1', 200, false)];
    mockStore.mockReturnValue(makeStoreState(goals, allocations));

    render(<StepPlanReview />);

    expect(screen.getByRole('button', { name: /Aggiusta goal Comprare Casa/i })).toBeInTheDocument();
    expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    expect(screen.getByText(/Aggiusta goal/i)).toBeInTheDocument();
  });

  it('does NOT render chip when deadlineFeasible === true', () => {
    const goals = [makeGoal('g2', 'Fondo Emergenza')];
    const allocations = [makeAllocation('g2', 300, true)];
    mockStore.mockReturnValue(makeStoreState(goals, allocations));

    render(<StepPlanReview />);

    expect(screen.queryByRole('button', { name: /Aggiusta goal/i })).not.toBeInTheDocument();
  });

  it('chip click calls prevStep + setEditingGoal(tempId) + setAddGoalModalOpen(true)', async () => {
    const goals = [makeGoal('g-infeasible', 'Goal Difficile')];
    const allocations = [makeAllocation('g-infeasible', 50, false)];
    mockStore.mockReturnValue(makeStoreState(goals, allocations));

    render(<StepPlanReview />);

    await userEvent.click(screen.getByRole('button', { name: /Aggiusta goal Goal Difficile/i }));

    await waitFor(() => {
      expect(mockSetEditingGoal).toHaveBeenCalledWith('g-infeasible');
      expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(true);
      expect(mockPrevStep).toHaveBeenCalled();
    });
  });

  it('only infeasible goals show chip — feasible goal in same list does not', () => {
    const goals = [
      makeGoal('g-ok', 'Fondo Emergenza'),
      makeGoal('g-bad', 'Comprare Villa'),
    ];
    const allocations = [
      makeAllocation('g-ok', 300, true),
      makeAllocation('g-bad', 100, false),
    ];
    mockStore.mockReturnValue(makeStoreState(goals, allocations));

    render(<StepPlanReview />);

    // Only the infeasible one gets a chip
    const chips = screen.getAllByRole('button', { name: /Aggiusta goal/i });
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveAccessibleName(/Aggiusta goal Comprare Villa/i);
  });

  it('shows "Aggiungi almeno un obiettivo" placeholder when no goals', () => {
    mockStore.mockReturnValue(makeStoreState([], []));
    render(<StepPlanReview />);
    expect(screen.getByText(/Aggiungi almeno un obiettivo/i)).toBeInTheDocument();
  });
});
