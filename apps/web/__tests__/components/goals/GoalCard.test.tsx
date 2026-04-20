/**
 * Tests for GoalCard component (Sprint 1.5.2 WP-G)
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { GoalCard, inferGoalType, inferGoalCategory } from '../../../src/components/goals/GoalCard';
import type { Goal } from '../../../src/services/goals.client';

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'goal-1',
  name: 'Test Goal',
  target: 5000,
  current: 1000,
  deadline: '2027-12-31',
  priority: 2,
  monthlyAllocation: 200,
  status: 'ACTIVE',
  type: 'fixed',
  ...overrides,
});

describe('GoalCard', () => {
  it('renders goal name', () => {
    render(
      <GoalCard
        goal={makeGoal({ name: 'Fondo Emergenza' })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-card-name')).toHaveTextContent('Fondo Emergenza');
  });

  it('renders goal target amount', () => {
    render(
      <GoalCard
        goal={makeGoal({ target: 10000 })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-card-target')).toHaveTextContent('10.000');
  });

  it('renders card with data-testid including goal id', () => {
    render(
      <GoalCard
        goal={makeGoal({ id: 'abc-123' })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-card-abc-123')).toBeInTheDocument();
  });

  it('calls onEditClick when card is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onEditClick = vi.fn();
    const goal = makeGoal();
    render(
      <GoalCard goal={goal} onEditClick={onEditClick} onDeleteClick={vi.fn()} />,
    );

    await user.click(screen.getByTestId('goal-card-goal-1'));
    expect(onEditClick).toHaveBeenCalledWith(goal);
  });

  it('calls onDeleteClick when delete button clicked (does not trigger edit)', async () => {
    const user = userEvent.setup({ delay: null });
    const onEditClick = vi.fn();
    const onDeleteClick = vi.fn();
    const goal = makeGoal();
    render(
      <GoalCard goal={goal} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />,
    );

    await user.click(screen.getByTestId('goal-delete-goal-1'));
    expect(onDeleteClick).toHaveBeenCalledWith('goal-1');
    expect(onEditClick).not.toHaveBeenCalled();
  });

  it('shows "Nessuna" when no deadline', () => {
    render(
      <GoalCard
        goal={makeGoal({ deadline: null })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-card-deadline')).toHaveTextContent('Nessuna');
  });
});

describe('inferGoalType (deprecated alias)', () => {
  it('infers emergency from "Fondo Emergenza"', () => {
    expect(inferGoalType('Fondo Emergenza')).toBe('emergency');
  });

  it('infers debt from "Eliminare Debiti"', () => {
    expect(inferGoalType('Eliminare Debiti')).toBe('debt');
  });

  it('infers investment from "Iniziare a Investire"', () => {
    expect(inferGoalType('Iniziare a Investire')).toBe('investment');
  });

  it('infers savings by default for unknown names', () => {
    expect(inferGoalType('Comprare Casa')).toBe('savings');
  });
});

describe('inferGoalCategory (WP-K renamed)', () => {
  it('returns emergency for "Fondo Emergenza"', () => {
    expect(inferGoalCategory('Fondo Emergenza')).toBe('emergency');
  });

  it('returns investment for "Portafoglio Crypto"', () => {
    expect(inferGoalCategory('Portafoglio Crypto')).toBe('investment');
  });

  it('returns lifestyle for "Viaggio a Parigi"', () => {
    expect(inferGoalCategory('Viaggio a Parigi')).toBe('lifestyle');
  });
});

describe('GoalCard — WP-K openended display', () => {
  it('shows "Aperto" badge for openended goals', () => {
    render(
      <GoalCard
        goal={makeGoal({ type: 'openended', target: null, name: 'Fondo Emergenza' })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-card-type-badge')).toBeInTheDocument();
    expect(screen.getByTestId('goal-card-type-badge')).toHaveTextContent('Aperto');
  });

  it('does not show "Aperto" badge for fixed goals', () => {
    render(
      <GoalCard
        goal={makeGoal({ type: 'fixed', target: 10000 })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('goal-card-type-badge')).not.toBeInTheDocument();
  });

  it('hides progress bar for openended goals', () => {
    render(
      <GoalCard
        goal={makeGoal({ type: 'openended', target: null, name: 'Fondo Emergenza' })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    // Target element not rendered for openended
    expect(screen.queryByTestId('goal-card-target')).not.toBeInTheDocument();
    // Shows accumulated amount instead
    expect(screen.getByText(/accumulati/i)).toBeInTheDocument();
  });

  it('shows target for fixed goals', () => {
    render(
      <GoalCard
        goal={makeGoal({ type: 'fixed', target: 10000 })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-card-target')).toBeInTheDocument();
  });

  it('goal.type drives openended display, not name heuristic', () => {
    // A goal named "Risparmio" with type=openended should show as openended
    render(
      <GoalCard
        goal={makeGoal({ type: 'openended', target: null, name: 'Risparmio Libero' })}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-card-type-badge')).toHaveTextContent('Aperto');
    expect(screen.queryByTestId('goal-card-target')).not.toBeInTheDocument();
  });
});
