/**
 * Tests for GoalEditModal component (Sprint 1.5.2 WP-G)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { GoalEditModal } from '../../../src/components/goals/GoalEditModal';
import type { Goal } from '../../../src/services/goals.client';

const mockGoal: Goal = {
  id: 'goal-42',
  name: 'Fondo Emergenza',
  target: 5000,
  current: 0,
  deadline: '2027-06-01',
  priority: 1,
  monthlyAllocation: 300,
  status: 'ACTIVE',
  type: 'fixed',
};

const mockOpenendedGoal: Goal = {
  id: 'goal-43',
  name: 'Iniziare a Investire',
  target: null,
  current: 0,
  deadline: null,
  priority: 2,
  monthlyAllocation: 90,
  status: 'ACTIVE',
  type: 'openended',
};

describe('GoalEditModal', () => {
  it('renders "Nuovo obiettivo" title in add mode', () => {
    render(
      <GoalEditModal
        open={true}
        mode="add"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-modal-title')).toHaveTextContent('Nuovo obiettivo');
  });

  it('renders "Modifica obiettivo" title in edit mode', () => {
    render(
      <GoalEditModal
        open={true}
        mode="edit"
        goal={mockGoal}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-modal-title')).toHaveTextContent('Modifica obiettivo');
  });

  it('pre-fills form fields in edit mode', () => {
    render(
      <GoalEditModal
        open={true}
        mode="edit"
        goal={mockGoal}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-modal-name')).toHaveValue('Fondo Emergenza');
    expect(screen.getByTestId('goal-modal-target')).toHaveValue(5000);
  });

  it('shows empty name field in add mode', () => {
    render(
      <GoalEditModal
        open={true}
        mode="add"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-modal-name')).toHaveValue('');
  });

  it('calls onSave with form data when save button clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    render(
      <GoalEditModal
        open={true}
        mode="add"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    await user.clear(screen.getByTestId('goal-modal-name'));
    await user.type(screen.getByTestId('goal-modal-name'), 'Nuovo Goal');

    const targetInput = screen.getByTestId('goal-modal-target');
    await user.clear(targetInput);
    await user.type(targetInput, '3000');

    await user.click(screen.getByTestId('goal-modal-save'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nuovo Goal',
        target: 3000,
      }),
    );
  });

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    render(
      <GoalEditModal
        open={true}
        mode="add"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    // target > 0 but name empty
    await user.clear(screen.getByTestId('goal-modal-target'));
    await user.type(screen.getByTestId('goal-modal-target'), '1000');

    await user.click(screen.getByTestId('goal-modal-save'));

    expect(screen.getByTestId('goal-modal-name-error')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows validation error when target is 0', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    render(
      <GoalEditModal
        open={true}
        mode="add"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByTestId('goal-modal-name'), 'My Goal');
    // target stays 0

    await user.click(screen.getByTestId('goal-modal-save'));

    expect(screen.getByTestId('goal-modal-target-error')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // #059 fix: openended goal editing hides target/deadline fields
  it('hides target + deadline fields when goal.type is openended', () => {
    render(
      <GoalEditModal
        open={true}
        mode="edit"
        goal={mockOpenendedGoal}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('goal-modal-target')).not.toBeInTheDocument();
    expect(screen.queryByTestId('goal-modal-deadline')).not.toBeInTheDocument();
    expect(screen.getByTestId('goal-modal-openended-info')).toBeInTheDocument();
    expect(screen.getByTestId('goal-modal-openended-info')).toHaveTextContent(/Obiettivo aperto/);
  });

  it('saves openended goal without target validation error', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    render(
      <GoalEditModal
        open={true}
        mode="edit"
        goal={mockOpenendedGoal}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('goal-modal-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'openended',
          target: null,
          name: 'Iniziare a Investire',
        }),
      );
    });
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onCancel = vi.fn();
    render(
      <GoalEditModal
        open={true}
        mode="add"
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByTestId('goal-modal-cancel'));
    // onCancel is triggered via onOpenChange(false)
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not render modal content when closed', () => {
    render(
      <GoalEditModal
        open={false}
        mode="add"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('goal-edit-modal')).not.toBeInTheDocument();
  });
});
