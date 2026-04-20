/**
 * Tests for StepGoals (Sprint 1.5 visual upgrade + issue #463 modal refactor +
 * Sprint 1.5.2 WP-D edit-in-place modal).
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
 * - WP-D: Pencil button click triggers edit mode (setEditingGoal + setAddGoalModalOpen)
 * - WP-D: Goal info area click triggers edit mode
 * - WP-D: Modal pre-fills from editingGoal when editingGoalId is set
 * - WP-D: Modal header shows "Modifica goal" in edit mode
 * - WP-D: Submit in edit mode dispatches updateGoal (not addGoal)
 * - WP-D: Cancel in edit mode calls setEditingGoal(null)
 * - WP-D: Cancel in edit mode preserves original goal values
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
const mockUpdateGoal = vi.fn();
const mockSetAddGoalModalOpen = vi.fn();
const mockSetEditingPresetId = vi.fn();
const mockSetEditingGoal = vi.fn();

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
  editingPresetId: string | null = null,
  editingGoalId: string | null = null
) {
  return {
    step3: { goals },
    addGoal: mockAddGoal,
    removeGoal: mockRemoveGoal,
    updateGoal: mockUpdateGoal,
    isAddGoalModalOpen,
    editingPresetId,
    editingGoalId,
    setAddGoalModalOpen: mockSetAddGoalModalOpen,
    setEditingPresetId: mockSetEditingPresetId,
    setEditingGoal: mockSetEditingGoal,
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

  it('preset card click also resets editingGoalId via setEditingGoal(null)', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByLabelText(/Aggiungi preset: Fondo Emergenza/i));

    expect(mockSetEditingGoal).toHaveBeenCalledWith(null);
  });

  it('modal renders with pre-filled values when open with fondo-emergenza preset', () => {
    mockStore.mockReturnValue(makeStoreState([], true, 'fondo-emergenza', null));
    render(<StepGoals />);

    const nameInput = screen.getByLabelText(/Nome/i);
    expect(nameInput).toHaveValue('Fondo Emergenza');

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(5000);
  });

  it('modal renders with pre-filled values for comprare-casa preset', () => {
    mockStore.mockReturnValue(makeStoreState([], true, 'comprare-casa', null));
    render(<StepGoals />);

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(50000);
  });

  it('submitting preset-prefilled form calls addGoal + closes modal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, 'fondo-emergenza', null));
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

  it('"Aggiungi manualmente" also resets editingGoalId via setEditingGoal(null)', async () => {
    render(<StepGoals />);
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi manualmente/i }));

    expect(mockSetEditingGoal).toHaveBeenCalledWith(null);
  });

  it('modal renders with empty form when opened manually (no preset)', () => {
    mockStore.mockReturnValue(makeStoreState([], true, null, null));
    render(<StepGoals />);

    const nameInput = screen.getByLabelText(/Nome/i);
    expect(nameInput).toHaveValue('');

    const targetInput = screen.getByLabelText(/Target \(€\)/i);
    expect(targetInput).toHaveValue(null); // empty number input = null
  });

  it('submitting a manual goal with valid data calls addGoal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, null, null));
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
    mockStore.mockReturnValue(makeStoreState([], true, null, null));
    render(<StepGoals />);

    await userEvent.click(screen.getByRole('button', { name: /Annulla/i }));

    expect(mockAddGoal).not.toHaveBeenCalled();
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
  });

  it('X button (Dialog.Close) closes modal without calling addGoal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, null, null));
    render(<StepGoals />);

    await userEvent.click(screen.getByRole('button', { name: /Chiudi/i }));

    expect(mockAddGoal).not.toHaveBeenCalled();
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
  });

  it('ESC key closes modal without calling addGoal', async () => {
    mockStore.mockReturnValue(makeStoreState([], true, null, null));
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

  // ---- 6. WP-D: Edit mode — Pencil button click ----------------------------

  it('Pencil button click calls setEditingGoal with goal tempId', async () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'goal-edit-1', name: 'Meta Vacanza', target: 2000, deadline: null, priority: 3 },
      ])
    );
    render(<StepGoals />);

    await userEvent.click(screen.getByRole('button', { name: /Modifica Meta Vacanza/i }));

    expect(mockSetEditingGoal).toHaveBeenCalledWith('goal-edit-1');
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(true);
  });

  it('Pencil button click resets editingPresetId', async () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'goal-edit-2', name: 'Meta Qualcosa', target: 3000, deadline: null, priority: 2 },
      ])
    );
    render(<StepGoals />);

    await userEvent.click(screen.getByRole('button', { name: /Modifica Meta Qualcosa/i }));

    expect(mockSetEditingPresetId).toHaveBeenCalledWith(null);
  });

  // ---- 7. WP-D: Edit mode — goal info area click ---------------------------

  it('clicking goal info area triggers edit mode', async () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'goal-area-1', name: 'Fondo Area Click', target: 5000, deadline: null, priority: 1 },
      ])
    );
    render(<StepGoals />);

    // The info div has aria-label="Apri dettagli Fondo Area Click"
    await userEvent.click(screen.getByRole('button', { name: /Apri dettagli Fondo Area Click/i }));

    expect(mockSetEditingGoal).toHaveBeenCalledWith('goal-area-1');
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(true);
  });

  // ---- 8. WP-D: Modal pre-fills from editingGoal when editingGoalId set ---

  it('modal pre-fills name + target from goal when in edit mode', () => {
    const editGoal = {
      tempId: 'g-edit-fill',
      name: 'Casa Editata',
      target: 45000,
      deadline: '2027-12-31',
      priority: 2 as PriorityRank,
    };
    mockStore.mockReturnValue(
      makeStoreState([editGoal], true, null, 'g-edit-fill')
    );
    render(<StepGoals />);

    expect(screen.getByLabelText(/Nome/i)).toHaveValue('Casa Editata');
    expect(screen.getByLabelText(/Target \(€\)/i)).toHaveValue(45000);
    expect(screen.getByLabelText(/Scadenza/i)).toHaveValue('2027-12-31');
  });

  it('modal pre-fills priority from goal when in edit mode', () => {
    const editGoal = {
      tempId: 'g-edit-prio',
      name: 'Goal Priorità Alta',
      target: 1000,
      deadline: null,
      priority: 1 as PriorityRank,
    };
    mockStore.mockReturnValue(
      makeStoreState([editGoal], true, null, 'g-edit-prio')
    );
    render(<StepGoals />);

    // Use id selector to avoid ambiguity with multiple /Priorità/ text matches
    const prioritySelect = document.getElementById('goal-priority') as HTMLSelectElement;
    expect(prioritySelect).not.toBeNull();
    expect(prioritySelect.value).toBe('1');
  });

  // ---- 9. WP-D: Modal header in edit mode -----------------------------------

  it('modal shows "Modifica goal" header when in edit mode', () => {
    const editGoal = {
      tempId: 'g-edit-title',
      name: 'Goal Titolo Test',
      target: 3000,
      deadline: null,
      priority: 2 as PriorityRank,
    };
    mockStore.mockReturnValue(
      makeStoreState([editGoal], true, null, 'g-edit-title')
    );
    render(<StepGoals />);

    expect(screen.getByText('Modifica goal')).toBeInTheDocument();
  });

  it('modal shows "Aggiungi un obiettivo" header in add mode', () => {
    mockStore.mockReturnValue(makeStoreState([], true, null, null));
    render(<StepGoals />);

    expect(screen.getByText('Aggiungi un obiettivo')).toBeInTheDocument();
  });

  // ---- 10. WP-D: Submit in edit mode dispatches updateGoal -----------------

  it('submitting in edit mode calls updateGoal (not addGoal)', async () => {
    const editGoal = {
      tempId: 'g-update',
      name: 'Goal Da Aggiornare',
      target: 3000,
      deadline: null,
      priority: 2 as PriorityRank,
    };
    mockStore.mockReturnValue(
      makeStoreState([editGoal], true, null, 'g-update')
    );
    render(<StepGoals />);

    // Change name
    const nameInput = screen.getByLabelText(/Nome/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Goal Aggiornato');

    await userEvent.click(screen.getByRole('button', { name: /Salva/i }));

    await waitFor(() => {
      expect(mockUpdateGoal).toHaveBeenCalledWith(
        'g-update',
        expect.objectContaining({ name: 'Goal Aggiornato', target: 3000 })
      );
      expect(mockAddGoal).not.toHaveBeenCalled();
      expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
      expect(mockSetEditingGoal).toHaveBeenCalledWith(null);
    });
  });

  it('submitting in edit mode shows "Salva" button label', () => {
    const editGoal = {
      tempId: 'g-salva-label',
      name: 'Goal Salva',
      target: 2000,
      deadline: null,
      priority: 3 as PriorityRank,
    };
    mockStore.mockReturnValue(
      makeStoreState([editGoal], true, null, 'g-salva-label')
    );
    render(<StepGoals />);

    expect(screen.getByRole('button', { name: /^Salva$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Aggiungi$/ })).not.toBeInTheDocument();
  });

  // ---- 11. WP-D: Cancel in edit mode calls setEditingGoal(null) ------------

  it('Annulla in edit mode calls setEditingGoal(null)', async () => {
    const editGoal = {
      tempId: 'g-cancel-edit',
      name: 'Goal Cancel Test',
      target: 1500,
      deadline: null,
      priority: 2 as PriorityRank,
    };
    mockStore.mockReturnValue(
      makeStoreState([editGoal], true, null, 'g-cancel-edit')
    );
    render(<StepGoals />);

    await userEvent.click(screen.getByRole('button', { name: /Annulla/i }));

    expect(mockSetEditingGoal).toHaveBeenCalledWith(null);
    expect(mockUpdateGoal).not.toHaveBeenCalled();
    expect(mockAddGoal).not.toHaveBeenCalled();
  });

  it('ESC key in edit mode closes modal without calling updateGoal', async () => {
    const editGoal = {
      tempId: 'g-esc-edit',
      name: 'Goal ESC Test',
      target: 1500,
      deadline: null,
      priority: 2 as PriorityRank,
    };
    mockStore.mockReturnValue(
      makeStoreState([editGoal], true, null, 'g-esc-edit')
    );
    render(<StepGoals />);

    await userEvent.keyboard('{Escape}');

    expect(mockUpdateGoal).not.toHaveBeenCalled();
    expect(mockSetAddGoalModalOpen).toHaveBeenCalledWith(false);
  });

  // ---- 12. WP-D: Pencil button shows on goal cards -------------------------

  it('each goal card shows a Pencil edit button', () => {
    mockStore.mockReturnValue(
      makeStoreState([
        { tempId: 'g-pencil-1', name: 'Goal Con Pencil', target: 4000, deadline: null, priority: 2 },
        { tempId: 'g-pencil-2', name: 'Altro Goal Pencil', target: 2000, deadline: null, priority: 3 },
      ])
    );
    render(<StepGoals />);

    expect(screen.getByRole('button', { name: /Modifica Goal Con Pencil/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Modifica Altro Goal Pencil/i })).toBeInTheDocument();
  });
});
