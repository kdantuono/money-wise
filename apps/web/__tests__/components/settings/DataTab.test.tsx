/**
 * Tests for DataTab — delete-account happy/error paths + confirm phrase gate.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  logout: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.routerReplace, push: vi.fn() }),
}));

vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: <T,>(selector: (s: { logout: typeof mocks.logout }) => T) =>
    selector({ logout: mocks.logout }),
}));

vi.mock('../../../src/services/gdpr.client', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/services/gdpr.client')
  >('../../../src/services/gdpr.client');
  return {
    ...actual,
    gdprClient: { deleteAccount: mocks.deleteAccount },
  };
});

import { DataTab } from '../../../src/components/settings/DataTab';
import { GdprApiError } from '../../../src/services/gdpr.client';

describe('DataTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logout.mockResolvedValue(undefined);
  });

  it('renders export placeholder + danger zone initially', () => {
    render(<DataTab />);
    expect(screen.getByText('Esportazione Dati')).toBeInTheDocument();
    expect(screen.getByText('Zona Pericolosa')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Elimina$/i })
    ).toBeInTheDocument();
  });

  it('shows the delete form after clicking "Elimina"', async () => {
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));
    expect(screen.getByLabelText(/Conferma con la tua password/i)).toBeInTheDocument();
    expect(screen.getByText(/Digita/i)).toBeInTheDocument();
  });

  it('blocks submit when confirm phrase is wrong', async () => {
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));

    await userEvent.type(
      screen.getByLabelText(/Conferma con la tua password/i),
      'p'
    );
    await userEvent.type(screen.getByLabelText(/Digita/i), 'WRONG');
    await userEvent.click(
      screen.getByRole('button', { name: /Conferma Eliminazione Definitiva/i })
    );

    expect(await screen.findByText(/Digita ELIMINA/i)).toBeInTheDocument();
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });

  it('blocks submit when password is empty', async () => {
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));

    await userEvent.type(screen.getByLabelText(/Digita/i), 'ELIMINA');
    await userEvent.click(
      screen.getByRole('button', { name: /Conferma Eliminazione Definitiva/i })
    );

    expect(await screen.findByText(/password è obbligatoria/i)).toBeInTheDocument();
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });

  it('calls the service with password + exportDataFirst=false on happy path', async () => {
    mocks.deleteAccount.mockResolvedValueOnce({
      success: true,
      deletedAt: '2026-04-17T20:00:00.000Z',
      familyDeleted: false,
    });
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));

    await userEvent.type(
      screen.getByLabelText(/Conferma con la tua password/i),
      'hunter2'
    );
    await userEvent.type(screen.getByLabelText(/Digita/i), 'ELIMINA');
    await userEvent.click(
      screen.getByRole('button', { name: /Conferma Eliminazione Definitiva/i })
    );

    await waitFor(() => {
      expect(mocks.deleteAccount).toHaveBeenCalledWith({
        password: 'hunter2',
        exportDataFirst: false,
      });
    });

    await waitFor(() => {
      expect(mocks.logout).toHaveBeenCalled();
      expect(mocks.routerReplace).toHaveBeenCalledWith('/auth/login?deleted=1');
    });
  });

  it('forwards exportDataFirst=true when checkbox is checked', async () => {
    mocks.deleteAccount.mockResolvedValueOnce({
      success: true,
      deletedAt: '2026-04-17T20:00:00.000Z',
      familyDeleted: false,
      exportData: { profile: { id: 'u' } },
    });
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));

    await userEvent.type(
      screen.getByLabelText(/Conferma con la tua password/i),
      'hunter2'
    );
    // Check the export checkbox (first within the danger zone form)
    const checkbox = screen
      .getAllByRole('checkbox')
      .find((c) => !(c as HTMLInputElement).disabled);
    if (checkbox) await userEvent.click(checkbox);

    await userEvent.type(screen.getByLabelText(/Digita/i), 'ELIMINA');
    await userEvent.click(
      screen.getByRole('button', { name: /Conferma Eliminazione Definitiva/i })
    );

    await waitFor(() => {
      expect(mocks.deleteAccount).toHaveBeenCalledWith({
        password: 'hunter2',
        exportDataFirst: true,
      });
    });
  });

  it('routes password_mismatch to the password field, not the top-level alert', async () => {
    mocks.deleteAccount.mockRejectedValueOnce(
      new GdprApiError('La password non è corretta', 401, 'password_mismatch')
    );
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));

    await userEvent.type(
      screen.getByLabelText(/Conferma con la tua password/i),
      'wrong'
    );
    await userEvent.type(screen.getByLabelText(/Digita/i), 'ELIMINA');
    await userEvent.click(
      screen.getByRole('button', { name: /Conferma Eliminazione Definitiva/i })
    );

    expect(
      await screen.findByText(/password non è corretta/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it('shows top-level alert for non-password errors', async () => {
    mocks.deleteAccount.mockRejectedValueOnce(
      new GdprApiError('Eliminazione fallita. Riprova.', 500, 'delete_failed')
    );
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));

    await userEvent.type(
      screen.getByLabelText(/Conferma con la tua password/i),
      'hunter2'
    );
    await userEvent.type(screen.getByLabelText(/Digita/i), 'ELIMINA');
    await userEvent.click(
      screen.getByRole('button', { name: /Conferma Eliminazione Definitiva/i })
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Eliminazione fallita/i);
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it('cancel button returns to the initial state', async () => {
    render(<DataTab />);
    await userEvent.click(screen.getByRole('button', { name: /^Elimina$/i }));
    expect(screen.getByLabelText(/Conferma con la tua password/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Annulla/i }));
    expect(
      screen.queryByLabelText(/Conferma con la tua password/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Elimina$/i })).toBeInTheDocument();
  });
});
