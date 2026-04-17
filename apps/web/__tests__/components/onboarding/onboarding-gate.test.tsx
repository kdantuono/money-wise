/**
 * Tests for OnboardingGate.
 *
 * Strategy: mock the underlying auth store + OnboardingWizard + service so we
 * can assert the gate's branching and submission flow without rendering the
 * real multi-step wizard or touching Supabase.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { User } from '../../../lib/auth';

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.mock runs before imports, so shared state must be hoisted)
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  completeOnboardingMock: vi.fn(),
  setUserMock: vi.fn(),
  storeState: { user: null as unknown, setUser: null as unknown as (u: unknown) => void },
}));

vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: () => mocks.storeState,
}));

vi.mock('../../../src/services/onboarding.client', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/services/onboarding.client')
  >('../../../src/services/onboarding.client');
  return {
    ...actual,
    onboardingClient: {
      completeOnboarding: mocks.completeOnboardingMock,
    },
  };
});

// Replace the wizard with a stub that exposes a button to trigger onComplete.
vi.mock('../../../src/components/onboarding/OnboardingWizard', () => ({
  OnboardingWizard: (props: {
    userName: string;
    onComplete: (data: unknown) => void;
  }) => (
    <div data-testid="wizard-stub">
      <p>Ciao {props.userName}</p>
      <button
        type="button"
        onClick={() =>
          props.onComplete({
            incomeRange: '1500-3000',
            savingsGoal: 'emergency-fund',
            goals: ['safety-net'],
            aiPreferences: ['auto-categorize'],
          })
        }
      >
        finish-wizard
      </button>
    </div>
  ),
}));

import { OnboardingGate } from '../../../src/components/onboarding/onboarding-gate';
import { OnboardingApiError } from '../../../src/services/onboarding.client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'u@example.com',
    firstName: 'Mario',
    lastName: 'Rossi',
    role: 'ADMIN',
    status: 'ACTIVE',
    currency: 'EUR',
    onboarded: false,
    createdAt: '2026-04-17T00:00:00Z',
    updatedAt: '2026-04-17T00:00:00Z',
    fullName: 'Mario Rossi',
    isEmailVerified: true,
    isActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnboardingGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeState.user = null;
    mocks.storeState.setUser = mocks.setUserMock;
  });

  it('renders children when user is null (auth still loading)', () => {
    mocks.storeState.user = null;
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('wizard-stub')).not.toBeInTheDocument();
  });

  it('renders children when user is already onboarded', () => {
    mocks.storeState.user = makeUser({ onboarded: true });
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('wizard-stub')).not.toBeInTheDocument();
  });

  it('renders the wizard (not children) when user is not onboarded', () => {
    mocks.storeState.user = makeUser({ onboarded: false });
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    expect(screen.getByTestId('wizard-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('passes firstName to the wizard as userName', () => {
    mocks.storeState.user = makeUser({ firstName: 'Giulia', onboarded: false });
    render(<OnboardingGate>{null}</OnboardingGate>);
    expect(screen.getByText(/Ciao Giulia/)).toBeInTheDocument();
  });

  it('falls back to fullName when firstName is empty', () => {
    mocks.storeState.user = makeUser({
      firstName: '',
      fullName: 'Utente Anonimo',
      onboarded: false,
    });
    render(<OnboardingGate>{null}</OnboardingGate>);
    expect(screen.getByText(/Ciao Utente Anonimo/)).toBeInTheDocument();
  });

  it('persists onboarding and marks the user onboarded on success', async () => {
    mocks.completeOnboardingMock.mockResolvedValueOnce({
      incomeRange: '1500-3000',
      savingsGoal: 'emergency-fund',
      goals: ['safety-net'],
      aiPreferences: ['auto-categorize'],
      completedAt: '2026-04-17T06:00:00.000Z',
    });
    mocks.storeState.user = makeUser({ onboarded: false });

    render(<OnboardingGate>{null}</OnboardingGate>);
    await userEvent.click(screen.getByText('finish-wizard'));

    await waitFor(() => {
      expect(mocks.completeOnboardingMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ incomeRange: '1500-3000' })
      );
    });

    expect(mocks.setUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', onboarded: true })
    );
  });

  it('shows an error message when persistence fails (OnboardingApiError)', async () => {
    mocks.completeOnboardingMock.mockRejectedValueOnce(
      new OnboardingApiError('salvataggio fallito', 500)
    );
    mocks.storeState.user = makeUser({ onboarded: false });

    render(<OnboardingGate>{null}</OnboardingGate>);
    await userEvent.click(screen.getByText('finish-wizard'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('salvataggio fallito');
    });
    expect(mocks.setUserMock).not.toHaveBeenCalled();
  });

  it('shows a generic message for non-OnboardingApiError failures', async () => {
    mocks.completeOnboardingMock.mockRejectedValueOnce(new Error('network down'));
    mocks.storeState.user = makeUser({ onboarded: false });

    render(<OnboardingGate>{null}</OnboardingGate>);
    await userEvent.click(screen.getByText('finish-wizard'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Impossibile salvare le preferenze/
      );
    });
    expect(mocks.setUserMock).not.toHaveBeenCalled();
  });
});
