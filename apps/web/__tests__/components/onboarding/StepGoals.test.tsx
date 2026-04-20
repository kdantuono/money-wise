/**
 * Tests for StepGoals (Sprint 1.5 visual upgrade).
 *
 * Covers:
 * - Preset card click populates draft form with default values
 * - "Aggiungi manualmente" button opens empty form
 * - Custom goal can be submitted
 * - Added goals appear in the list
 * - Remove goal button fires removeGoal
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import type { PriorityRank, GoalType } from '@/types/onboarding-plan';

// --------------------------------------------------------------------------
// Store mock — selector pattern
// --------------------------------------------------------------------------

type Goal = {
  tempId: string;
  name: string;
  type: GoalType;
  target: number | null;
  deadline: string | null;
  priority: PriorityRank;
};

const mockAddGoal = vi.fn();
const mockRemoveGoal = vi.fn();
const mockGoals: Goal[] = [];

const mockStore = vi.fn();
vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
    const state = mockStore();
    return selector ? selector(state) : state;
  },
}));

function makeStoreState(goals: Goal[] = []) {
  return {
    step3: { goals },
    addGoal: mockAddGoal,
    removeGoal: mockRemoveGoal,
  };
}

import { StepGoals } from '@/components/onboarding/steps/StepGoals';

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('StepGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.mockReturnValue(makeStoreState([]));
  });

  // ---- 1. Initial state -----------------------------------------------------

  it('renders preset cards when no goals added', () => {
    render(<StepGoals />);
    // 7 preset cards
    expect(screen.getByLabelText(/Aggiungi preset: Fondo Emergenza/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Comprare Casa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Iniziare a Investire/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Eliminare Debiti/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Risparmiare di Più/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Viaggi \/ Vacanza/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Far Crescere Patrimonio/i)).toBeInTheDocument();
  });

  it('shows empty state hint when no goals and form not open', () => {
    render(<StepGoals />);
    expect(screen.getByText(/Nessun obiettivo ancora/i)).toBeInTheDocument();
  });

  it('shows "Aggiungi manualmente" button when form is closed', () => {
    render(<StepGoals />);
    expect(screen.getByRole('button', { name: /Aggiungi manualmente/i })).toBeInTheDocument();
  });

  // ---- 2. Preset card click -------------------------------------------------

  it('preset card click (Fondo Emergenza) opens form in openended mode — no target input', async () => {
    // Issue #464: Fondo Emergenza preset defaults to openended type.
    // Target input should NOT be visible when type='openended'.
    render(<StepGoals />);
    await userEvent.click(screen.getByLabelText(/Aggiungi preset: Fondo Emergenza/i));

    // Form should appear with pre-filled name
    const nameInput = screen.getByLabelText(/Nome/i);
    expect(nameInput).toHaveValue('Fondo Emergenza');

    // Target input NOT visible for openended goals
    expect(screen.queryByLabelText(/Target \(€\)/i)).not.toBeInTheDocument();

    // "Goal aperto" button should be pressed
    const openendedBtn = screen.getByRole('button', { name: /Goal aperto/i });
    expect(openendedBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('preset "Comprare Casa" pre-fills with 50000 target (fixed type)', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByLabelText(/Aggiungi preset: Comprare Casa/i));

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(50000);
  });

  it('after preset click (Fondo Emergenza openended), submitting calls addGoal with type=openended', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByLabelText(/Aggiungi preset: Fondo Emergenza/i));

    // Form is open in openended mode — click Aggiungi
    const addButton = screen.getByRole('button', { name: /^Aggiungi$/ });
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fondo Emergenza',
          type: 'openended',
          target: null,
          priority: 1,
        })
      );
    });
  });

  // ---- 3. Manual form -------------------------------------------------------

  it('"Aggiungi manualmente" opens an empty form', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi manualmente/i }));

    const nameInput = screen.getByLabelText(/Nome/i);
    expect(nameInput).toHaveValue('');

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(null); // empty number input = null
  });

  it('submitting a manual goal with valid data calls addGoal with type=fixed', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi manualmente/i }));

    await userEvent.type(screen.getByLabelText(/Nome/i), 'Università');
    await userEvent.clear(screen.getByLabelText(/Target \(€\)/i));
    await userEvent.type(screen.getByLabelText(/Target \(€\)/i), '8000');

    await userEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));

    await waitFor(() => {
      expect(mockAddGoal).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Università', type: 'fixed', target: 8000 })
      );
    });
  });

  it('Annulla button closes form without calling addGoal', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi manualmente/i }));
    await userEvent.click(screen.getByRole('button', { name: /Annulla/i }));

    expect(mockAddGoal).not.toHaveBeenCalled();
    // Form closed — "Aggiungi manualmente" back
    expect(screen.getByRole('button', { name: /Aggiungi manualmente/i })).toBeInTheDocument();
  });

  it('#464 toggle to openended hides target/deadline, shows description', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi manualmente/i }));

    // Initially fixed — target should be visible
    expect(screen.getByLabelText(/Target \(€\)/i)).toBeInTheDocument();

    // Switch to openended
    await userEvent.click(screen.getByRole('button', { name: /Goal aperto/i }));

    // Target input should disappear
    expect(screen.queryByLabelText(/Target \(€\)/i)).not.toBeInTheDocument();
    // Deadline input should disappear
    expect(screen.queryByLabelText(/Scadenza/i)).not.toBeInTheDocument();
    // Description explaining openended should appear
    expect(screen.getByText(/riceve qualsiasi risparmio residuo/i)).toBeInTheDocument();
  });

  it('#464 openended goal in list displays "Goal aperto" label and remove button', () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'g-open', name: 'Mio Fondo Aperto', type: 'openended', target: null, deadline: null, priority: 1 },
      ])
    );
    render(<StepGoals />);
    // Goal name appears in the list (use heading-level query to avoid preset card collision)
    const listItem = screen.getByLabelText(/Rimuovi Mio Fondo Aperto/i).closest('li')!;
    expect(listItem).toBeInTheDocument();
    // "Goal aperto" subtitle text is present in the list item
    expect(listItem).toHaveTextContent(/Goal aperto/i);
    // Remove button present
    expect(screen.getByLabelText(/Rimuovi Mio Fondo Aperto/i)).toBeInTheDocument();
  });

  // ---- 4. Goals list --------------------------------------------------------

  it('renders existing goals from store', () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'g1', name: 'Obiettivo Personalizzato', type: 'fixed', target: 7500, deadline: null, priority: 2 },
      ])
    );
    render(<StepGoals />);
    // Use a name that doesn't collide with the 7 preset card labels
    expect(screen.getByText('Obiettivo Personalizzato')).toBeInTheDocument();
    // Check the goal list item is rendered (the target formatting depends on locale support)
    expect(screen.getByLabelText(/Rimuovi Obiettivo Personalizzato/i)).toBeInTheDocument();
  });

  it('remove button calls removeGoal with correct tempId', async () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'g-remove', name: 'Obiettivo Da Rimuovere', type: 'fixed', target: 1000, deadline: null, priority: 2 },
      ])
    );
    render(<StepGoals />);
    await userEvent.click(screen.getByLabelText(/Rimuovi Obiettivo Da Rimuovere/i));
    expect(mockRemoveGoal).toHaveBeenCalledWith('g-remove');
  });
});
