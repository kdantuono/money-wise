/**
 * Tests for GoalsPage CRUD (Sprint 1.5.2 WP-G)
 *
 * Uses data-testid attributes for robust element matching.
 * Mocks goalsClient with vi.fn() per method.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';

// Mock Radix dialog portals
vi.mock('@radix-ui/react-dialog', async () => {
  const actual = await vi.importActual<typeof import('@radix-ui/react-dialog')>(
    '@radix-ui/react-dialog',
  );
  return actual;
});

// Mock auth store
const mockAuthStore = vi.fn();
vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = mockAuthStore();
    return selector ? selector(state) : state;
  },
}));

// Mock goalsClient
const mockLoadGoals = vi.fn();
const mockAddGoal = vi.fn();
const mockUpdateGoal = vi.fn();
const mockDeleteGoal = vi.fn();

vi.mock('@/services/goals.client', async () => {
  const actual = await vi.importActual<typeof import('@/services/goals.client')>(
    '@/services/goals.client',
  );
  return {
    ...actual,
    goalsClient: {
      loadGoals: (...args: unknown[]) => mockLoadGoals(...args),
      addGoal: (...args: unknown[]) => mockAddGoal(...args),
      updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
      deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
    },
  };
});

import GoalsPage from '../../../app/dashboard/goals/page';

const MOCK_GOAL = {
  id: 'goal-1',
  name: 'Fondo Emergenza',
  target: 5000,
  current: 1000,
  deadline: '2027-12-31',
  priority: 1 as const,
  monthlyAllocation: 200,
  status: 'ACTIVE',
};

describe('GoalsPage (Sprint 1.5.2 WP-G)', () => {
  beforeEach(() => {
    mockAuthStore.mockReset();
    mockLoadGoals.mockReset();
    mockAddGoal.mockReset();
    mockUpdateGoal.mockReset();
    mockDeleteGoal.mockReset();

    // Default: logged in user
    mockAuthStore.mockReturnValue({ user: { id: 'user-uuid' } });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('shows loading spinner initially', () => {
    // loadGoals never resolves during this test
    mockLoadGoals.mockReturnValue(new Promise(() => {}));
    render(<GoalsPage />);
    expect(screen.getByTestId('goals-loading')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it('shows empty state when no goals', async () => {
    mockLoadGoals.mockResolvedValue([]);
    render(<GoalsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('goals-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByTestId('goals-empty-cta')).toBeInTheDocument();
  });

  it('renders page heading "Obiettivi"', async () => {
    mockLoadGoals.mockResolvedValue([]);
    render(<GoalsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Obiettivi');
    });
  });

  // ---------------------------------------------------------------------------
  // Happy path — goals loaded
  // ---------------------------------------------------------------------------

  it('renders goal cards when goals exist', async () => {
    mockLoadGoals.mockResolvedValue([MOCK_GOAL]);
    render(<GoalsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('goals-grid')).toBeInTheDocument();
    });
    expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument();
  });

  it('shows filter chips when goals exist', async () => {
    mockLoadGoals.mockResolvedValue([MOCK_GOAL]);
    render(<GoalsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('goal-type-filter')).toBeInTheDocument();
    });
  });

  it('filters goals by type when chip clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const investGoal = {
      ...MOCK_GOAL,
      id: 'goal-2',
      name: 'Portafoglio Investimenti',
    };
    mockLoadGoals.mockResolvedValue([MOCK_GOAL, investGoal]);
    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('goals-grid')).toBeInTheDocument();
    });

    // Both visible initially
    expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument();
    expect(screen.getByTestId('goal-card-goal-2')).toBeInTheDocument();

    // Filter to investment
    await user.click(screen.getByTestId('filter-chip-investment'));

    // Only invest goal visible
    expect(screen.queryByTestId('goal-card-goal-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('goal-card-goal-2')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Add goal flow
  // ---------------------------------------------------------------------------

  it('opens add modal when floating add button clicked', async () => {
    const user = userEvent.setup({ delay: null });
    mockLoadGoals.mockResolvedValue([]);

    render(<GoalsPage />);
    await waitFor(() => expect(screen.getByTestId('goals-empty-state')).toBeInTheDocument());

    await user.click(screen.getByTestId('goals-add-btn'));
    expect(screen.getByTestId('goal-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('goal-modal-title')).toHaveTextContent('Nuovo obiettivo');
  });

  it('adds goal and shows it in grid after save', async () => {
    const user = userEvent.setup({ delay: null });
    mockLoadGoals.mockResolvedValue([]);
    const newGoal = { ...MOCK_GOAL, id: 'new-1', name: 'Nuovo Test Goal' };
    mockAddGoal.mockResolvedValue(newGoal);

    render(<GoalsPage />);
    await waitFor(() => expect(screen.getByTestId('goals-add-btn')).toBeInTheDocument());

    await user.click(screen.getByTestId('goals-add-btn'));
    await user.type(screen.getByTestId('goal-modal-name'), 'Nuovo Test Goal');
    await user.clear(screen.getByTestId('goal-modal-target'));
    await user.type(screen.getByTestId('goal-modal-target'), '3000');
    await user.click(screen.getByTestId('goal-modal-save'));

    await waitFor(() => {
      expect(screen.getByTestId('goal-card-new-1')).toBeInTheDocument();
    });
    expect(mockAddGoal).toHaveBeenCalledWith('user-uuid', expect.objectContaining({ name: 'Nuovo Test Goal', target: 3000 }));
  });

  // ---------------------------------------------------------------------------
  // Edit goal flow
  // ---------------------------------------------------------------------------

  it('opens edit modal pre-filled when card clicked', async () => {
    const user = userEvent.setup({ delay: null });
    mockLoadGoals.mockResolvedValue([MOCK_GOAL]);

    render(<GoalsPage />);
    await waitFor(() => expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument());

    await user.click(screen.getByTestId('goal-card-goal-1'));
    expect(screen.getByTestId('goal-modal-title')).toHaveTextContent('Modifica obiettivo');
    expect(screen.getByTestId('goal-modal-name')).toHaveValue('Fondo Emergenza');
  });

  it('calls updateGoal and reflects change after edit save', async () => {
    const user = userEvent.setup({ delay: null });
    mockLoadGoals.mockResolvedValue([MOCK_GOAL]);
    const updated = { ...MOCK_GOAL, target: 8000 };
    mockUpdateGoal.mockResolvedValue(updated);

    render(<GoalsPage />);
    await waitFor(() => expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument());

    await user.click(screen.getByTestId('goal-card-goal-1'));
    await user.clear(screen.getByTestId('goal-modal-target'));
    await user.type(screen.getByTestId('goal-modal-target'), '8000');
    await user.click(screen.getByTestId('goal-modal-save'));

    expect(mockUpdateGoal).toHaveBeenCalledWith('goal-1', expect.objectContaining({ target: 8000 }));
    await waitFor(() => {
      expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Delete goal flow
  // ---------------------------------------------------------------------------

  it('shows delete confirm dialog when delete button clicked', async () => {
    const user = userEvent.setup({ delay: null });
    mockLoadGoals.mockResolvedValue([MOCK_GOAL]);

    render(<GoalsPage />);
    await waitFor(() => expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument());

    await user.click(screen.getByTestId('goal-delete-goal-1'));
    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
  });

  it('removes goal from list after delete confirmed', async () => {
    const user = userEvent.setup({ delay: null });
    mockLoadGoals.mockResolvedValue([MOCK_GOAL]);
    mockDeleteGoal.mockResolvedValue(undefined);

    render(<GoalsPage />);
    await waitFor(() => expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument());

    await user.click(screen.getByTestId('goal-delete-goal-1'));
    await user.click(screen.getByTestId('delete-confirm-ok'));

    await waitFor(() => {
      expect(screen.queryByTestId('goal-card-goal-1')).not.toBeInTheDocument();
    });
    expect(mockDeleteGoal).toHaveBeenCalledWith('goal-1');
  });

  it('cancels delete and keeps goal in list', async () => {
    const user = userEvent.setup({ delay: null });
    mockLoadGoals.mockResolvedValue([MOCK_GOAL]);

    render(<GoalsPage />);
    await waitFor(() => expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument());

    await user.click(screen.getByTestId('goal-delete-goal-1'));
    await user.click(screen.getByTestId('delete-confirm-cancel'));

    expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument();
    expect(mockDeleteGoal).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  it('shows error message when loadGoals throws', async () => {
    mockLoadGoals.mockRejectedValue(new Error('Network error'));
    render(<GoalsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('goals-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('goals-error-message')).toHaveTextContent('Network error');
  });
});
