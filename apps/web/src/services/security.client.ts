/**
 * Security Client — password change via Supabase Auth.
 *
 * Two-step flow for defense-in-depth against session hijack:
 *   1. Re-verify the current password via `signInWithPassword` (if wrong → abort)
 *   2. `updateUser({ password })` to apply the new one
 *
 * Supabase enforces server-side password rules as well; any rejection
 * bubbles up as `SecurityApiError`.
 *
 * @module services/security.client
 */

import { createClient } from '@/utils/supabase/client';
import type { PasswordChangeResult } from '@/types/security';

// =============================================================================
// Error class
// =============================================================================

export type SecurityErrorCode =
  | 'missing_email'
  | 'current_password_mismatch'
  | 'reverify_failed'
  | 'update_failed'
  | 'unknown';

export class SecurityApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: SecurityErrorCode = 'unknown',
    public details?: unknown
  ) {
    super(message);
    this.name = 'SecurityApiError';
  }
}

// =============================================================================
// Client
// =============================================================================

type SupabaseAuthError = {
  message: string;
  status?: number;
  code?: string;
  name?: string;
};

type SupabaseLike = {
  auth: {
    signInWithPassword: (creds: {
      email: string;
      password: string;
    }) => Promise<{ error: SupabaseAuthError | null }>;
    updateUser: (attrs: {
      password: string;
    }) => Promise<{ error: SupabaseAuthError | null }>;
  };
};

/**
 * Distinguish a genuine wrong-password from other Supabase auth failures
 * (rate limit, email not confirmed, network, server error). Only the first
 * should be routed to the currentPassword field as a validation error;
 * everything else belongs in the top-level alert.
 *
 * Supabase >= 2.43 returns `error.code = 'invalid_credentials'` on wrong
 * password. Older versions only expose `message: "Invalid login credentials"`.
 * We accept both.
 */
function isWrongPassword(err: SupabaseAuthError): boolean {
  if (err.code === 'invalid_credentials') return true;
  return /invalid\s*(login|credentials)/i.test(err.message || '');
}

export const securityClient = {
  /**
   * Change the current user's password.
   *
   * @throws {SecurityApiError} with `code='current_password_mismatch'` if the
   *  current password re-verification fails, or `code='update_failed'` if the
   *  new password is rejected by Supabase Auth.
   */
  async changePassword(params: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<PasswordChangeResult> {
    const { email, currentPassword, newPassword } = params;

    if (!email) {
      throw new SecurityApiError(
        'Email mancante nella sessione — rifai login e riprova',
        400,
        'missing_email'
      );
    }

    const supabase = createClient() as unknown as SupabaseLike;

    // Step 1: re-verify current password. signInWithPassword does not invalidate
    // the existing session on success — it just returns a fresh one; on failure
    // the existing session is untouched, so this is safe as a guard.
    const reverify = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (reverify.error) {
      const err = reverify.error;
      if (isWrongPassword(err)) {
        throw new SecurityApiError(
          'La password attuale non è corretta',
          401,
          'current_password_mismatch',
          err
        );
      }
      // Rate limit, email not confirmed, network, server error: surface
      // as a top-level banner, not a field error.
      throw new SecurityApiError(
        err.message ||
          'Impossibile verificare la password attuale. Riprova più tardi.',
        err.status || 500,
        'reverify_failed',
        err
      );
    }

    // Step 2: update to the new password.
    const update = await supabase.auth.updateUser({ password: newPassword });
    if (update.error) {
      throw new SecurityApiError(
        update.error.message ||
          'Impossibile aggiornare la password. Riprova più tardi.',
        update.error.status || 500,
        'update_failed',
        update.error
      );
    }

    return { changedAt: new Date().toISOString() };
  },
};

export default securityClient;
