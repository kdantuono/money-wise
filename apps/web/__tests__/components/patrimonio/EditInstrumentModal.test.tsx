/**
 * Tests for EditInstrumentModal (Sprint 1.7 Wave A §5.5)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { EditInstrumentModal } from '../../../src/components/patrimonio/EditInstrumentModal';
import type { FinancialInstrument } from '../../../src/services/financial-instruments.client';

vi.mock('../../../src/services/accounts.client', () => ({
  accountsClient: {
    updateAccount: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('../../../src/services/liabilities.client', () => ({
  liabilitiesClient: {
    updateLiability: vi.fn().mockResolvedValue({}),
  },
}));

import { accountsClient } from '../../../src/services/accounts.client';
import { liabilitiesClient } from '../../../src/services/liabilities.client';

const assetInstrument: FinancialInstrument = {
  id: 'acc-1',
  class: 'ASSET',
  type: 'CHECKING',
  userId: 'user-1',
  familyId: null,
  name: 'Conto Principale',
  currentBalance: 1500.5,
  currency: 'EUR',
  originalAmount: null,
  creditLimit: null,
  interestRate: null,
  minimumPayment: null,
  goalId: null,
  status: 'ACTIVE',
  institutionName: 'Banca Esempio',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const liabilityInstrument: FinancialInstrument = {
  ...assetInstrument,
  id: 'liab-1',
  class: 'LIABILITY',
  type: 'LOAN',
  name: 'Finanziamento Auto',
  currentBalance: 4000,
  originalAmount: 6000,
  interestRate: 10,
  minimumPayment: 150,
  institutionName: null,
};

describe('EditInstrumentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Modifica conto" title for ASSET', () => {
    render(
      <EditInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Modifica conto')).toBeInTheDocument();
  });

  it('renders "Modifica debito" title for LIABILITY', () => {
    render(
      <EditInstrumentModal
        instrument={liabilityInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Modifica debito')).toBeInTheDocument();
  });

  it('prefills name and currentBalance from instrument', () => {
    render(
      <EditInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('edit-instrument-name')).toHaveValue('Conto Principale');
    expect(screen.getByTestId('edit-instrument-balance')).toHaveValue(1500.5);
  });

  it('dispatches updateAccount for ASSET on submit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <EditInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    const nameInput = screen.getByTestId('edit-instrument-name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Conto Rinominato');

    await user.click(screen.getByTestId('edit-instrument-submit'));

    await waitFor(() => {
      expect(accountsClient.updateAccount).toHaveBeenCalledWith('acc-1', {
        name: 'Conto Rinominato',
        currentBalance: 1500.5,
      });
    });
    expect(liabilitiesClient.updateLiability).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('dispatches updateLiability for LIABILITY on submit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <EditInstrumentModal
        instrument={liabilityInstrument}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    const balanceInput = screen.getByTestId('edit-instrument-balance');
    await user.clear(balanceInput);
    await user.type(balanceInput, '3500');

    await user.click(screen.getByTestId('edit-instrument-submit'));

    await waitFor(() => {
      expect(liabilitiesClient.updateLiability).toHaveBeenCalledWith('liab-1', {
        name: 'Finanziamento Auto',
        currentBalance: 3500,
      });
    });
    expect(accountsClient.updateAccount).not.toHaveBeenCalled();
  });

  it('shows error if name is empty (whitespace only)', async () => {
    const user = userEvent.setup();
    render(
      <EditInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    const nameInput = screen.getByTestId('edit-instrument-name');
    await user.clear(nameInput);
    await user.type(nameInput, '   ');

    await user.click(screen.getByTestId('edit-instrument-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-instrument-error')).toHaveTextContent(
        'Nome obbligatorio',
      );
    });
    expect(accountsClient.updateAccount).not.toHaveBeenCalled();
  });

  it('shows error when update fails', async () => {
    const user = userEvent.setup();
    vi.mocked(accountsClient.updateAccount).mockRejectedValueOnce(
      new Error('Network error'),
    );

    render(
      <EditInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('edit-instrument-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-instrument-error')).toHaveTextContent(
        'Network error',
      );
    });
  });

  it('resets form state when opened with different instrument', async () => {
    const { rerender } = render(
      <EditInstrumentModal
        instrument={assetInstrument}
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    rerender(
      <EditInstrumentModal
        instrument={liabilityInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('edit-instrument-name')).toHaveValue('Finanziamento Auto');
    });
    expect(screen.getByTestId('edit-instrument-balance')).toHaveValue(4000);
  });
});
