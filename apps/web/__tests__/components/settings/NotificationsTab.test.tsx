/**
 * Tests for NotificationsTab component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render, screen, waitFor } from '../../utils/test-utils';

// Hoisted so the vi.mock factory can reference it safely (vi.mock is hoisted
// to the top of the file before any const declarations evaluate).
const { updateNotificationsMock, setUserMock } = vi.hoisted(() => ({
  updateNotificationsMock: vi.fn(),
  setUserMock: vi.fn(),
}));

// Mock framer-motion (same pattern as existing settings.test.tsx)
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t: unknown, prop: string | symbol) => {
      if (prop === '__esModule') return false;
      return ({
        children,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        whileHover: _whileHover,
        whileTap: _whileTap,
        whileInView: _whileInView,
        variants: _variants,
        ...rest
      }: Record<string, unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag as string, rest, children as React.ReactNode);
      };
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock auth store
vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock the preferences client (service)
vi.mock('../../../src/services/user-preferences.client', () => ({
  userPreferencesClient: {
    update: vi.fn(),
    updateNotifications: updateNotificationsMock,
  },
  UserPreferencesApiError: class extends Error {},
}));

import { NotificationsTab } from '../../../src/components/settings/NotificationsTab';
import { useAuthStore } from '../../../src/store/auth.store';
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function mockUser(preferences?: Record<string, unknown> | null) {
  return {
    id: USER_ID,
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    status: 'ACTIVE',
    timezone: 'Europe/Rome',
    currency: 'EUR',
    preferences,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    fullName: 'John Doe',
    isEmailVerified: true,
    isActive: true,
  };
}

describe('<NotificationsTab />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUserMock.mockReset();
    updateNotificationsMock.mockReset();
    mockUseAuthStore.mockReturnValue({
      user: mockUser(),
      setUser: setUserMock,
    });
    updateNotificationsMock.mockResolvedValue({
      notifications: {
        channels: { email: true, push: true, inApp: true },
        types: {},
        quietHours: { enabled: false, from: '22:00', to: '08:00' },
      },
    });
  });

  describe('Rendering & hydration', () => {
    it('renders channel headings and the 3 channel toggles', () => {
      render(<NotificationsTab />);
      expect(screen.getByText('Canali di Notifica')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Notifiche Email')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Notifiche Push')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifiche In-App')).toBeInTheDocument();
    });

    it('renders all 8 notification types', () => {
      render(<NotificationsTab />);
      expect(screen.getByLabelText('Rapporto Mensile AI')).toBeInTheDocument();
      expect(screen.getByLabelText('Alert Budget')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Consigli AI Personalizzati')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Aggiornamenti Investimenti')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Scadenze Ricorrenti')).toBeInTheDocument();
      expect(screen.getByLabelText('Obiettivi Raggiunti')).toBeInTheDocument();
      expect(screen.getByLabelText('Nuove Funzionalità')).toBeInTheDocument();
      expect(screen.getByLabelText('Promozioni e Offerte')).toBeInTheDocument();
    });

    it('renders quiet hours controls with defaults', () => {
      render(<NotificationsTab />);
      expect(screen.getByText('Orario Silenziamento')).toBeInTheDocument();
      expect(screen.getByLabelText('Dalle')).toHaveValue('22:00');
      expect(screen.getByLabelText('Alle')).toHaveValue('08:00');
      // disabled initially
      expect(screen.getByLabelText('Dalle')).toBeDisabled();
      expect(screen.getByLabelText('Alle')).toBeDisabled();
    });

    it('hydrates toggles from user.preferences.notifications (nested shape)', () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser({
          notifications: {
            channels: { email: false, push: true, inApp: false },
            types: {
              monthlyReport: false,
              budgetAlerts: true,
              aiAdvice: true,
              investmentUpdates: true,
              recurringDeadlines: true,
              goalsAchieved: true,
              newFeatures: true,
              promotions: false,
            },
            quietHours: { enabled: true, from: '23:30', to: '07:15' },
          },
        }),
        setUser: setUserMock,
      });

      render(<NotificationsTab />);

      expect(screen.getByLabelText('Notifiche Email')).not.toBeChecked();
      expect(screen.getByLabelText('Notifiche Push')).toBeChecked();
      expect(screen.getByLabelText('Notifiche In-App')).not.toBeChecked();
      expect(screen.getByLabelText('Rapporto Mensile AI')).not.toBeChecked();
      expect(screen.getByLabelText('Nuove Funzionalità')).toBeChecked();
      expect(screen.getByLabelText('Dalle')).toHaveValue('23:30');
      expect(screen.getByLabelText('Alle')).toHaveValue('07:15');
      expect(screen.getByLabelText('Dalle')).not.toBeDisabled();
    });

    it('hydrates from legacy flat preferences shape', () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser({
          notifications: {
            email: false,
            push: true,
            categories: true,
            budgets: false,
          },
        }),
        setUser: setUserMock,
      });
      render(<NotificationsTab />);
      expect(screen.getByLabelText('Notifiche Email')).not.toBeChecked();
      expect(screen.getByLabelText('Notifiche Push')).toBeChecked();
      expect(screen.getByLabelText('Alert Budget')).not.toBeChecked();
    });

    it('renders nothing breaking when preferences is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser(null),
        setUser: setUserMock,
      });
      render(<NotificationsTab />);
      // All channels default to true, all types default reasonable
      expect(screen.getByLabelText('Notifiche Email')).toBeChecked();
      expect(screen.getByLabelText('Promozioni e Offerte')).not.toBeChecked();
    });
  });

  describe('Toggle interactions', () => {
    it('toggles a channel when clicked', async () => {
      const { user } = render(<NotificationsTab />);
      const email = screen.getByLabelText('Notifiche Email') as HTMLInputElement;
      expect(email).toBeChecked();
      await user.click(email);
      expect(email).not.toBeChecked();
      await user.click(email);
      expect(email).toBeChecked();
    });

    it('toggles a notification type when clicked', async () => {
      const { user } = render(<NotificationsTab />);
      const promos = screen.getByLabelText(
        'Promozioni e Offerte'
      ) as HTMLInputElement;
      expect(promos).not.toBeChecked();
      await user.click(promos);
      expect(promos).toBeChecked();
    });

    it('enables quiet hours inputs when the switch is toggled on', async () => {
      const { user } = render(<NotificationsTab />);
      const qhSwitch = screen.getByLabelText(
        'Abilita silenziamento'
      ) as HTMLInputElement;
      expect(screen.getByLabelText('Dalle')).toBeDisabled();
      await user.click(qhSwitch);
      expect(qhSwitch).toBeChecked();
      expect(screen.getByLabelText('Dalle')).not.toBeDisabled();
    });

    it('updates quiet hours times', async () => {
      const { user } = render(<NotificationsTab />);
      await user.click(screen.getByLabelText('Abilita silenziamento'));
      const from = screen.getByLabelText('Dalle') as HTMLInputElement;
      // time inputs in jsdom don't accept keyboard typing reliably — use change event
      fireEvent.change(from, { target: { value: '23:45' } });
      expect(from).toHaveValue('23:45');
    });
  });

  describe('Save flow', () => {
    it('calls updateNotifications with the current state on save', async () => {
      const { user } = render(<NotificationsTab />);
      // Flip a couple of toggles
      await user.click(screen.getByLabelText('Notifiche Email'));
      await user.click(screen.getByLabelText('Promozioni e Offerte'));
      await user.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );

      expect(updateNotificationsMock).toHaveBeenCalledTimes(1);
      const [uid, existing, payload] = updateNotificationsMock.mock.calls[0];
      expect(uid).toBe(USER_ID);
      expect(existing).toEqual(mockUser().preferences);
      expect(payload.channels.email).toBe(false);
      expect(payload.types.promotions).toBe(true);
      expect(payload.quietHours.enabled).toBe(false);
    });

    it('calls setUser with merged preferences on successful save', async () => {
      const merged = {
        theme: 'dracula',
        notifications: {
          channels: { email: false, push: true, inApp: true },
          types: {},
          quietHours: { enabled: false, from: '22:00', to: '08:00' },
        },
      };
      updateNotificationsMock.mockResolvedValueOnce(merged);

      const { user } = render(<NotificationsTab />);
      await user.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );

      await waitFor(() => {
        expect(setUserMock).toHaveBeenCalledTimes(1);
      });
      const updatedUser = setUserMock.mock.calls[0][0];
      expect(updatedUser.preferences).toEqual(merged);
      expect(updatedUser.id).toBe(USER_ID);
    });

    it('shows "Salvato!" feedback after successful save', async () => {
      render(<NotificationsTab />);
      fireEvent.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );
      expect(
        await screen.findByRole('button', { name: /Salvato/i })
      ).toBeInTheDocument();
    });

    it('shows error message when service rejects', async () => {
      updateNotificationsMock.mockRejectedValueOnce(
        new Error('Network boom')
      );
      render(<NotificationsTab />);
      fireEvent.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Network boom/);
      expect(setUserMock).not.toHaveBeenCalled();
    });

    it('shows a generic error message if the rejection is not an Error instance', async () => {
      updateNotificationsMock.mockRejectedValueOnce('some string');
      render(<NotificationsTab />);
      fireEvent.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        /Impossibile salvare le preferenze notifiche/
      );
    });

    it('blocks save and shows an error when quiet hours are enabled with invalid time values', async () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser({
          notifications: {
            channels: { email: true, push: true, inApp: true },
            types: {},
            // Seed a valid payload; we'll make it invalid via the UI below.
            quietHours: { enabled: true, from: '22:00', to: '08:00' },
          },
        }),
        setUser: setUserMock,
      });
      render(<NotificationsTab />);
      // Clear `from` — <input type="time"> can emit an empty string.
      fireEvent.change(screen.getByLabelText('Dalle'), {
        target: { value: '' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Orari di silenziamento non validi/i);
      expect(updateNotificationsMock).not.toHaveBeenCalled();
    });

    it('shows error and skips service call when user is missing id', async () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser(), id: '' },
        setUser: setUserMock,
      });
      render(<NotificationsTab />);
      fireEvent.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Utente non trovato/i);
      expect(updateNotificationsMock).not.toHaveBeenCalled();
    });

    it('disables save button while saving', async () => {
      let resolvePromise: ((v: unknown) => void) | undefined;
      updateNotificationsMock.mockImplementationOnce(
        () => new Promise((r) => (resolvePromise = r))
      );

      render(<NotificationsTab />);
      fireEvent.click(
        screen.getByRole('button', { name: /Salva Preferenze/i })
      );
      // Button re-renders with "Salvataggio..." label while isSaving=true
      const savingBtn = await screen.findByRole('button', {
        name: /Salvataggio/i,
      });
      expect(savingBtn).toBeDisabled();

      resolvePromise!({ notifications: {} });
      await screen.findByRole('button', { name: /Salvato/i });
    });
  });

  describe('User absent', () => {
    it('renders defaults and no crash when user is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: setUserMock,
      });
      render(<NotificationsTab />);
      expect(screen.getByText('Canali di Notifica')).toBeInTheDocument();
    });
  });
});
