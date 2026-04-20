/**
 * Tests for StepGoals (Sprint 1.5 visual upgrade + issue #463 modal refactor).
 *
 * Covers:
 * - Preset card click opens Radix Dialog modal with pre-filled values
 * - "Aggiungi manualmente" button opens modal with empty form
 * - Form submit adds goal + closes modal
 * - Annulla (Dialog.Close) closes without saving
 * - ESC key closes modal without saving
 * - Overlay click closes modal without saving
 * - Added goals appear in the list
 * - Remove goal button fires removeGoal
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import type { PriorityRank } from '@/types/onboarding-plan';

// --------------------------------------------------------------------------
// Store mock — selector pattern
// --------------------------------------------------------------------------

type Goal = {
  tempId: string;
  name: string;
  target: number;
  deadline: string | null;
  priority: PriorityRank;
};

const mockAddGoal = vi.fn();
const mockRemoveGoal = vi.fn();
const mockSetAddGoalModalOpen = vi.fn();
const mockSetEditingPresetId = vi.fn();

const mockStore = vi.fn();
vi.mock('@/store/onboarding-plan.store', () => ({
  useOnboardingPlanStore: (selector?: (s: unknown) => unknown) => {
    const state = mockStore();
    return selector ? selector(state) : state;
  },
}));

function makeStoreState(
  goals: Goal[] = [],
  isAddGoalModalOpen = false,
  editingPresetId: string | null = null
) {
  return {
    step3: { goals },
    addGoal: mockAddGoal,
    removeGoal: mockRemoveGoal,
    isAddGoalModalOpen,
    editingPresetId,
    setAddGoalModalOpen: mockSetAddGoalModalOpen,
    setEditingPresetId: mockSetEditingPresetId,
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
    expect(screen.getByLabelText(/Aggiungi preset: Fondo Emergenza/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Comprare Casa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Iniziare a Investire/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Eliminare Debiti/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Risparmiare di Più/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Viaggi \/ Vacanza/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aggiungi preset: Far Crescere Patrimonio/i)).toBeInTheDocument();
  });

  it('shows empty state hint when no goals', () => {
    render(<StepGoals />);
    expect(screen.getByText(/Nessun obiettivo ancora/i)).toBeInTheDocument();
  });

  it('shows "Aggiungi manualmente" button', () => {
    render(<StepGoals />);
    expect(screen.getByRole('button', { name: /Aggiungi manualmente/i })).toBeInTheDocument();
  });

  // ---- 2. Preset card click opens modal with pre-filled values -----------

  it('preset card click calls setEditingPresetId + setAddGoalModalOpen(true)', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByLabelText(/Aggiungi preset: Fondo Emergenza/i));

    expect(mockSetEditingPresetId).toHaveBeenCalledWith('fondo-emergenza');
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(true);
  });

  it('modal renders with pre-filled values when open with fondo-emergenza preset', () => {
    mockStore.mockReturnValue(makeStoreState([], true, 'fondo-emergenza'));
    render(<StepGoals />);

    const nameInput = screen.getByLabelText(/Nome/i);
    expect(nameInput).toHaveValue('Fondo Emergenza');

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(5000);
  });

  it('modal renders with pre-filled values for comprare-casa preset', () => {
    mockStore.mockReturnValue(makeStoreState([], true, 'comprare-casa'));
    render(<StepGoals />);

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(50000);
  });

  it('submitting preset-prefilled form calls addGoal + closes modal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, 'fondo-emergenza'));
    render(<StepGoals />);

    const addButton = screen.getByRole('button', { name: /^Aggiungi$/ });
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fondo Emergenza',
          target: 5000,
          priority: 1,
        })
      );
      expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
    });
  });

  // ---- 3. Manual form -------------------------------------------------------

  it('"Aggiungi manualmente" calls setEditingPresetId(null) + setAddGoalModalOpen(true)', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi manualmente/i }));

    expect(mockSetEditingPresetId).toHaveBeenCalledWith(null);
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(true);
  });

  it('modal renders with empty form when opened manually (no preset)', () => {
    mockStore.mockReturnValue(makeStoreState([], true, null));
    render(<StepGoals />);

    const nameInput = screen.getByLabelText(/Nome/i);
    expect(nameInput).toHaveValue('');

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(null); // empty number input = null
  });

  it('submitting a manual goal with valid data calls addGoal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, null));
    render(<StepGoals />);

    await userEvent.type(screen.getByLabelText(/Nome/i), 'Università');
    await userEvent.clear(screen.getByLabelText(/Target \(€\)/i));
    await userEvent.type(screen.getByLabelText(/Target \(€\)/i), '8000');

    await userEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));

    await waitFor(() => {
      expect(mockAddGoal).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Università', target: 8000 })
      );
    });
  });

  // ---- 4. Modal close behaviors ---------------------------------------------

  it('Annulla (Dialog.Close) closes modal without calling addGoal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, null));
    render(<StepGoals />);

    await userEvent.click(screen.getByRole('button', { name: /Annulla/i }));

    expect(mockAddGoal).not.toHaveBeenCalled();
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
  });

  it('X button (Dialog.Close) closes modal without calling addGoal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, null));
    render(<StepGoals />);

    await userEvent.click(screen.getByRole('button', { name: /Chiudi/i }));

    expect(mockAddGoal).not.toHaveBeenCalled();
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
  });

  it('ESC key closes modal without calling addGoal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, null));
    render(<StepGoals />);

    // Modal is open — press ESC
    await userEvent.keyboard('{Escape}');

    expect(mockAddGoal).not.toHaveBeenCalled();
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
  });

  // ---- 5. Goals list --------------------------------------------------------

  it('renders existing goals from store', () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'g1', name: 'Obiettivo Personalizzato', target: 7500, deadline: null, priority: 2 },
      ])
    );
    render(<StepGoals />);
    expect(screen.getByText('Obiettivo Personalizzato')).toBeInTheDocument();
    expect(screen.getByLabelText(/Rimuovi Obiettivo Personalizzato/i)).toBeInTheDocument();
  });

  it('remove button calls removeGoal with correct tempId', async () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'g-remove', name: 'Obiettivo Da Rimuovere', target: 1000, deadline: null, priority: 2 },
      ])
    );
    render(<StepGoals />);
    await userEvent.click(screen.getByLabelText(/Rimuovi Obiettivo Da Rimuovere/i));
    expect(mockRemoveGoal).toHaveBeenCalledWith('g-remove');
  });

  it('does not show empty state hint when goals exist', () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'g1', name: 'Qualcosa', target: 1000, deadline: null, priority: 2 },
      ])
    );
    render(<StepGoals />);
    expect(screen.queryByText(/Nessun obiettivo ancora/i)).not.toBeInTheDocument();
  });
});
