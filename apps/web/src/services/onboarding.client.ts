/**
 * Onboarding Client — Supabase
 *
 * Persists OnboardingWizard completion to the `profiles` table.
 * Atomic update: merges the new `onboarding` slice into `preferences` JSONB
 * and flips `onboarded = true` in the same UPDATE statement, so a page
 * refresh between the two steps cannot leave the user in a half-onboarded
 * state.
 *
 * Caller responsibility: none. The service reads current preferences itself
 * to preserve unrelated keys (e.g. `notifications` from the Settings tab).
 *
 * @module services/onboarding.client
 */

import { createClient } from '@/utils/supabase/client';
import type { OnboardingData, OnboardingPayload } from '@/types/onboarding';

// =============================================================================
// Error class
// =============================================================================

export class OnboardingApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'OnboardingApiError';
  }
}

// =============================================================================
// Client
// =============================================================================

type SelectResult = Promise<{
  data: { preferences: Record<string, unknown> | null } | null;
  error: { message: string } | null;
}>;

type UpdateResult = Promise<{ error: { message: string } | null }>;

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => SelectResult;
      };
    };
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => UpdateResult;
    };
  };
};

async function readCurrentPreferences(
  client: SupabaseLike,
  userId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await client
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single();

  if (error) {
    throw new OnboardingApiError(
      error.message || 'Failed to read profile preferences',
      500,
      error
    );
  }

  const raw = data?.preferences;
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, unknown>;
}

export const onboardingClient = {
  /**
   * Persist the OnboardingWizard result. Sets `profiles.onboarded = true` and
   * merges `{ onboarding: { ...data, completedAt } }` into `preferences`,
   * preserving all other keys in that JSONB column.
   *
   * @throws {OnboardingApiError} on validation or Supabase failure.
   */
  async completeOnboarding(
    userId: string,
    data: OnboardingData
  ): Promise<OnboardingPayload> {
    if (!userId) {
      throw new OnboardingApiError('userId is required', 400);
    }

    const supabase = createClient() as unknown as SupabaseLike;

    const existing = await readCurrentPreferences(supabase, userId);

    const payload: OnboardingPayload = {
      ...data,
      completedAt: new Date().toISOString(),
    };

    const merged = {
      ...existing,
      onboarding: JSON.parse(JSON.stringify(payload)) as Record<string, unknown>,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: merged, onboarded: true })
      .eq('id', userId);

    if (error) {
      throw new OnboardingApiError(
        error.message || 'Failed to persist onboarding',
        500,
        error
      );
    }

    return payload;
  },
};

export default onboardingClient;
