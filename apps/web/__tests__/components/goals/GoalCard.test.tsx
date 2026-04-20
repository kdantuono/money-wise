/**
 * Tests for GoalCard component (Sprint 1.5.2 WP-G)
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { GoalCard, inferGoalType } from '../../../src/components/goals/GoalCard';
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

describe('inferGoalType', () => {
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
