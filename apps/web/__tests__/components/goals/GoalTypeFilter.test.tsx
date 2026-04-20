/**
 * Tests for GoalTypeFilter component (Sprint 1.5.2 WP-G)
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { GoalTypeFilter } from '../../../src/components/goals/GoalTypeFilter';
import type { GoalType } from '../../../src/components/goals/GoalTypeFilter';

describe('GoalTypeFilter', () => {
  it('renders all 6 chips', () => {
    const onTypeSelect = vi.fn();
    render(<GoalTypeFilter selected="all" onTypeSelect={onTypeSelect} />);

    expect(screen.getByTestId('filter-chip-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chip-emergency')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chip-savings')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chip-investment')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chip-debt')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chip-lifestyle')).toBeInTheDocument();
  });

  it('marks selected chip with aria-pressed=true', () => {
    render(<GoalTypeFilter selected="savings" onTypeSelect={vi.fn()} />);

    expect(screen.getByTestId('filter-chip-savings')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-chip-all')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onTypeSelect with the correct type when a chip is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onTypeSelect = vi.fn();
    render(<GoalTypeFilter selected="all" onTypeSelect={onTypeSelect} />);

    await user.click(screen.getByTestId('filter-chip-emergency'));
    expect(onTypeSelect).toHaveBeenCalledWith('emergency');
  });

  it('calls onTypeSelect with "all" when Tutti chip clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onTypeSelect = vi.fn();
    render(<GoalTypeFilter selected="debt" onTypeSelect={onTypeSelect} />);

    await user.click(screen.getByTestId('filter-chip-all'));
    expect(onTypeSelect).toHaveBeenCalledWith('all');
  });
});
