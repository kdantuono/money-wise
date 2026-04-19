/**
 * User Preferences Client — Supabase
 *
 * Persists user preferences (theme, language, notifications) to
 * `profiles.preferences` JSONB column. RLS enforces user_id = auth.uid().
 *
 * @module services/user-preferences.client
 */

import { createClient } from '@/utils/supabase/client';
import type {
  NotificationPreferences,
  ThemePreference,
  UserPreferences,
} from '@/types/user-preferences';

// =============================================================================
// Error class
// =============================================================================

export class UserPreferencesApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'UserPreferencesApiError';
  }
}

// =============================================================================
// Client
// =============================================================================

type SupabaseLike = {
  from: (table: string) => {
    update: (payload: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
};

async function persistPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  if (!userId) {
    throw new UserPreferencesApiError('userId is required', 400);
  }

  const supabase = createClient() as unknown as SupabaseLike;

  // Clone to a plain object — avoids serialization issues with class instances
  // and matches the Supabase JSONB contract.
  const payload = JSON.parse(JSON.stringify(preferences)) as Record<
    string,
    unknown
  >;

  const { error } = await supabase
    .from('profiles')
    .update({ preferences: payload })
    .eq('id', userId);

  if (error) {
    throw new UserPreferencesApiError(
      error.message || 'Failed to update preferences',
      500,
      error
    );
  }
}

export const userPreferencesClient = {
  /**
   * Persist the full preferences object. Caller is responsible for merging
   * with existing values before calling — this replaces the whole JSON column.
   */
  async update(userId: string, preferences: UserPreferences): Promise<void> {
    return persistPreferences(userId, preferences);
  },

  /**
   * Convenience: update just the notification slice, preserving the rest.
   * Callers that already have the full preferences object should prefer
   * `update()` to save a read round-trip.
   */
  async updateNotifications(
    userId: string,
    currentPreferences: UserPreferences | null | undefined,
    notifications: NotificationPreferences
  ): Promise<UserPreferences> {
    const merged: UserPreferences = {
      ...(currentPreferences ?? {}),
      notifications,
    };
    await persistPreferences(userId, merged);
    return merged;
  },

  /**
   * Convenience: update just the theme, preserving all other preference keys.
   * Caller passes the current in-memory preferences to avoid a read round-trip.
   * Fire-and-forget safe — caller should catch and surface an error on failure.
   */
  async updateTheme(
    userId: string,
    currentPreferences: UserPreferences | null | undefined,
    theme: ThemePreference
  ): Promise<void> {
    const merged: UserPreferences = {
      ...(currentPreferences ?? {}),
      theme,
    };
    await persistPreferences(userId, merged);
  },
};

export default userPreferencesClient;
