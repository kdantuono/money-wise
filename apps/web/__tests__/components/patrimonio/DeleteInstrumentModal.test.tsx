/**
 * Tests for DeleteInstrumentModal (Sprint 1.7 Wave A §5.5)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { DeleteInstrumentModal } from '../../../src/components/patrimonio/DeleteInstrumentModal';
import type { FinancialInstrument } from '../../../src/services/financial-instruments.client';

vi.mock('../../../src/services/accounts.client', () => ({
  accountsClient: {
    deleteAccount: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../../src/services/liabilities.client', () => ({
  liabilitiesClient: {
    deleteLiability: vi.fn().mockResolvedValue(undefined),
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
  currentBalance: 1500,
  currency: 'EUR',
  originalAmount: null,
  creditLimit: null,
  interestRate: null,
  minimumPayment: null,
  goalId: null,
  status: 'ACTIVE',
  institutionName: 'Banca',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const liabilityInstrument: FinancialInstrument = {
  ...assetInstrument,
  id: 'liab-1',
  class: 'LIABILITY',
  type: 'LOAN',
  name: 'Finanziamento',
  institutionName: null,
};

describe('DeleteInstrumentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Elimina conto" title for ASSET', () => {
    render(
      <DeleteInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Elimina conto' }),
    ).toBeInTheDocument();
  });

  it('renders "Elimina debito" title for LIABILITY', () => {
    render(
      <DeleteInstrumentModal
        instrument={liabilityInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Elimina debito' }),
    ).toBeInTheDocument();
  });

  it('shows entity name in description', () => {
    render(
      <DeleteInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Conto Principale/)).toBeInTheDocument();
  });

  it('dispatches deleteAccount for ASSET on confirm', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <DeleteInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByTestId('delete-instrument-confirm'));

    await waitFor(() => {
      expect(accountsClient.deleteAccount).toHaveBeenCalledWith('acc-1');
    });
    expect(liabilitiesClient.deleteLiability).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('dispatches deleteLiability for LIABILITY on confirm', async () => {
    const user = userEvent.setup();
    render(
      <DeleteInstrumentModal
        instrument={liabilityInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('delete-instrument-confirm'));

    await waitFor(() => {
      expect(liabilitiesClient.deleteLiability).toHaveBeenCalledWith('liab-1');
    });
    expect(accountsClient.deleteAccount).not.toHaveBeenCalled();
  });

  it('shows error when delete fails', async () => {
    const user = userEvent.setup();
    vi.mocked(accountsClient.deleteAccount).mockRejectedValueOnce(
      new Error('Linked transfers'),
    );
    render(
      <DeleteInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('delete-instrument-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-instrument-error')).toHaveTextContent(
        'Linked transfers',
      );
    });
  });

  it('closes modal on Annulla without deleting', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <DeleteInstrumentModal
        instrument={assetInstrument}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /annulla/i }));

    expect(accountsClient.deleteAccount).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
