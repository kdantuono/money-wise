/**
 * Tests for OnboardingGate (Sprint 1.5 behavior).
 *
 * Strategy:
 * - Mock useAuthStore with selector pattern.
 * - Mock useRouter to capture replace() calls.
 * - Assert: onboarded=true → children rendered; onboarded=false → replace()
 *   called + loader shown (no children); user=null → children rendered (defer
 *   to ProtectedRoute).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import type { User } from '../../../lib/auth';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  storeState: { user: null as unknown },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replaceMock,
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = mocks.storeState;
    return selector ? selector(state) : state;
  },
}));

import { OnboardingGate } from '../../../src/components/onboarding/onboarding-gate';

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

describe('OnboardingGate (Sprint 1.5 — redirect behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mocks.storeState as { user: unknown }).user = null;
  });

  it('renders children when user is null (auth still loading)', () => {
    (mocks.storeState as { user: unknown }).user = null;
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(mocks.replaceMock).not.toHaveBeenCalled();
  });

  it('renders children when user is already onboarded', () => {
    (mocks.storeState as { user: unknown }).user = makeUser({ onboarded: true });
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(mocks.replaceMock).not.toHaveBeenCalled();
  });

  it('calls router.replace("/onboarding/plan") when user is not onboarded', async () => {
    (mocks.storeState as { user: unknown }).user = makeUser({ onboarded: false });
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );

    // Children NOT rendered while redirect is pending
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();

    // useEffect fires and calls replace
    await waitFor(() => {
      expect(mocks.replaceMock).toHaveBeenCalledWith('/onboarding/plan');
    });
  });

  it('shows loader (not dashboard) while redirecting non-onboarded user', () => {
    (mocks.storeState as { user: unknown }).user = makeUser({ onboarded: false });
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    // Loader present, children absent
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    // The loader has aria-live="polite" — check container is rendered
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('does not call router.replace when user is null', () => {
    (mocks.storeState as { user: unknown }).user = null;
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    expect(mocks.replaceMock).not.toHaveBeenCalled();
  });

  it('does not call router.replace when user is already onboarded', () => {
    (mocks.storeState as { user: unknown }).user = makeUser({ onboarded: true });
    render(
      <OnboardingGate>
        <div data-testid="dashboard">Dashboard</div>
      </OnboardingGate>
    );
    expect(mocks.replaceMock).not.toHaveBeenCalled();
  });
});
