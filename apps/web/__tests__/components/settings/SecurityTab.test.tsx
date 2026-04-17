/**
 * Tests for SecurityTab — password change happy/error paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { User } from '../../../lib/auth';

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  storeState: { user: null as unknown as User | null },
}));

vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: <T,>(selector: (s: { user: User | null }) => T) =>
    selector({ user: mocks.storeState.user }),
}));

vi.mock('../../../src/services/security.client', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/services/security.client')
  >('../../../src/services/security.client');
  return {
    ...actual,
    securityClient: {
      changePassword: mocks.changePassword,
    },
  };
});

import { SecurityTab } from '../../../src/components/settings/SecurityTab';
import { SecurityApiError } from '../../../src/services/security.client';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'mario@example.com',
    firstName: 'Mario',
    lastName: 'Rossi',
    role: 'ADMIN',
    status: 'ACTIVE',
    currency: 'EUR',
    onboarded: true,
    createdAt: '2026-04-17T00:00:00Z',
    updatedAt: '2026-04-17T00:00:00Z',
    fullName: 'Mario Rossi',
    isEmailVerified: true,
    isActive: true,
    ...overrides,
  };
}

describe('SecurityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeState.user = makeUser();
  });

  it('renders all four sections (password form + 3 placeholders)', () => {
    render(<SecurityTab />);
    expect(screen.getByText('Sicurezza Account')).toBeInTheDocument();
    expect(screen.getByText('Cambia Password')).toBeInTheDocument();
    expect(screen.getByText('Autenticazione a Due Fattori')).toBeInTheDocument();
    expect(screen.getByText('Sessioni Attive')).toBeInTheDocument();
    expect(screen.getByText('Log Attività')).toBeInTheDocument();
  });

  it('shows client-side validation errors when newPassword is too short', async () => {
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'old-password');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'short');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    expect(await screen.findByText(/almeno 8 caratteri/i)).toBeInTheDocument();
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it('shows mismatch error when confirmPassword differs', async () => {
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'OldSecure1');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'NewSecure22');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'NewSecure33');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    expect(await screen.findByText(/non coincidono/i)).toBeInTheDocument();
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it('shows "must differ" error when new equals current', async () => {
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'SamePass123');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'SamePass123');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'SamePass123');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    expect(await screen.findByText(/diversa da quella attuale/i)).toBeInTheDocument();
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it('calls the service with email + passwords and shows success on happy path', async () => {
    mocks.changePassword.mockResolvedValueOnce({ changedAt: '2026-04-17T10:00:00Z' });
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'OldSecure1');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'NewSecure22');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'NewSecure22');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    await waitFor(() => {
      expect(mocks.changePassword).toHaveBeenCalledWith({
        email: 'mario@example.com',
        currentPassword: 'OldSecure1',
        newPassword: 'NewSecure22',
      });
    });

    expect(await screen.findByText(/aggiornata con successo/i)).toBeInTheDocument();
  });

  it('routes current_password_mismatch error to the currentPassword field', async () => {
    mocks.changePassword.mockRejectedValueOnce(
      new SecurityApiError(
        'La password attuale non è corretta',
        401,
        'current_password_mismatch'
      )
    );
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'WrongOld1');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'NewSecure22');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'NewSecure22');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    expect(
      await screen.findByText(/La password attuale non è corretta/i)
    ).toBeInTheDocument();
    // No generic alert banner should appear for field-specific errors
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a top-level alert for update_failed server errors', async () => {
    mocks.changePassword.mockRejectedValueOnce(
      new SecurityApiError('server rejected policy', 500, 'update_failed')
    );
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'OldSecure1');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'NewSecure22');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'NewSecure22');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/server rejected policy/i);
  });

  it('shows generic error message for non-SecurityApiError failures', async () => {
    mocks.changePassword.mockRejectedValueOnce(new Error('network down'));
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'OldSecure1');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'NewSecure22');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'NewSecure22');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/errore imprevisto/i);
  });

  it('shows an inline message when user is missing email (session invalid)', async () => {
    mocks.storeState.user = makeUser({ email: '' });
    render(<SecurityTab />);

    await userEvent.type(screen.getByLabelText('Password Attuale'), 'OldSecure1');
    await userEvent.type(screen.getByLabelText('Nuova Password'), 'NewSecure22');
    await userEvent.type(screen.getByLabelText('Conferma Password'), 'NewSecure22');
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna Password/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Sessione non valida/i);
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it('marks 2FA toggles as disabled (placeholder)', () => {
    render(<SecurityTab />);
    const toggles = screen.getAllByRole('checkbox');
    for (const t of toggles) {
      expect(t).toBeDisabled();
    }
  });
});
