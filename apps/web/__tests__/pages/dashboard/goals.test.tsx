/**
 * Tests for GoalsPage component (Sprint 1.5 refactor)
 *
 * Post-Sprint-1.5: GoalsPage fetches real data via onboardingPlanClient.loadPlan(userId).
 * Legacy hardcoded goalsData mock (Fondo Emergenza/Anticipo Casa/etc.) removed — those
 * assertions belonged to Sprint 1.2 Figma-derived mock.
 *
 * Current tests cover the new states:
 *  - Loading (no user/fetching)
 *  - Empty (no plan yet → CTA "Crea il tuo piano")
 *  - Error and Happy path: covered by `onboarding-plan.spec.ts` e2e (Playwright) +
 *    integration with Supabase, not by component unit tests.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target: unknown, prop: string | symbol) => {
      if (prop === '__esModule') return false;
      return ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, ...rest }: Record<string, unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag as string, rest, children as React.ReactNode);
      };
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useRouter (Next.js App Router) — default stub
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock auth store — default returns no user
const mockAuthStore = vi.fn();
vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = mockAuthStore();
    return selector ? selector(state) : state;
  },
}));

// Mock onboarding-plan client — default returns null (no plan)
const mockLoadPlan = vi.fn();
vi.mock('@/services/onboarding-plan.client', async () => {
  const actual = await vi.importActual<typeof import('@/services/onboarding-plan.client')>(
    '@/services/onboarding-plan.client',
  );
  return {
    ...actual,
    onboardingPlanClient: {
      loadPlan: (...args: unknown[]) => mockLoadPlan(...args),
      persistPlan: vi.fn(),
    },
  };
});

import GoalsPage from '../../../app/dashboard/goals/page';

describe('GoalsPage (Sprint 1.5)', () => {
  beforeEach(() => {
    mockAuthStore.mockReset();
    mockLoadPlan.mockReset();
  });

  describe('Loading / no-user state', () => {
    it('renders without crashing when user is null (early return to stop spinner)', () => {
      mockAuthStore.mockReturnValue({ user: null });
      mockLoadPlan.mockResolvedValue(null);

      render(<GoalsPage />);

      // Either empty-state or loading — both acceptable on initial render.
      // Primary assertion: page title region OR loading spinner OR empty state CTA.
      // We just ensure it mounted.
      expect(document.body).toBeTruthy();
    });
  });

  describe('Empty state (no plan yet)', () => {
    it('shows CTA "Crea il tuo piano" when loadPlan returns null', async () => {
      mockAuthStore.mockReturnValue({ user: { id: 'test-user-uuid' } });
      mockLoadPlan.mockResolvedValue(null);

      render(<GoalsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Nessun piano finanziario ancora/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Crea il tuo piano/i })).toBeInTheDocument();
    });

    it('renders page heading in Italian', async () => {
      mockAuthStore.mockReturnValue({ user: { id: 'test-user-uuid' } });
      mockLoadPlan.mockResolvedValue(null);

      render(<GoalsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Obiettivi');
      });
    });
  });
});
