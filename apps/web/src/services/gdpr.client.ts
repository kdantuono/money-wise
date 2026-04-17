/**
 * GDPR Client — account deletion via the `account-delete` edge function.
 *
 * The edge function (PR #441) re-verifies the password, optionally exports
 * all user data as JSON, then cascade-deletes via Postgres ON DELETE
 * CASCADE triggered by `auth.admin.deleteUser`.
 *
 * @module services/gdpr.client
 */

import { createClient } from '@/utils/supabase/client';
import type { DeleteAccountResult } from '@/types/gdpr';

// =============================================================================
// Error class
// =============================================================================

export type GdprErrorCode =
  | 'password_mismatch'
  | 'profile_not_found'
  | 'export_failed'
  | 'delete_failed'
  | 'network'
  | 'unknown';

export class GdprApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: GdprErrorCode = 'unknown',
    public details?: unknown
  ) {
    super(message);
    this.name = 'GdprApiError';
  }
}

// =============================================================================
// Helpers
// =============================================================================

type SupabaseLike = {
  functions: {
    invoke: <T = unknown>(
      name: string,
      opts: { body: unknown }
    ) => Promise<{
      data: T | null;
      error:
        | { message?: string; context?: { status?: number } }
        | null;
    }>;
  };
};

function mapErrorCode(
  serverError: string | undefined,
  httpStatus: number | undefined
): GdprErrorCode {
  const msg = (serverError || '').toLowerCase();
  if (msg.includes('password_mismatch')) return 'password_mismatch';
  if (msg.includes('profile_not_found')) return 'profile_not_found';
  if (msg.startsWith('export_failed')) return 'export_failed';
  if (msg.includes('family_delete_failed') || msg.includes('user_delete_failed')) {
    return 'delete_failed';
  }
  if (httpStatus && httpStatus >= 500) return 'delete_failed';
  return 'unknown';
}

// =============================================================================
// Client
// =============================================================================

export const gdprClient = {
  /**
   * Delete the current user's account. The server re-verifies the password
   * and optionally returns a JSON export of all personal data.
   *
   * After a successful call the session is dead — the caller MUST redirect
   * to a public route (usually /auth/login) and invalidate the local store.
   *
   * @throws {GdprApiError} with a typed `code` routed to the UI:
   *   - `password_mismatch` (401) → FIELD error on the password input
   *   - `profile_not_found` (404) → TOP-LEVEL alert; likely corrupted state
   *   - `export_failed` (500) → TOP-LEVEL alert; retry without export
   *   - `delete_failed` (500) → TOP-LEVEL alert; retry
   *   - `network` (0) → TOP-LEVEL alert; check connectivity
   *   - `unknown` (varies) → TOP-LEVEL alert; generic fallback
   */
  async deleteAccount(params: {
    password: string;
    exportDataFirst: boolean;
  }): Promise<DeleteAccountResult> {
    const supabase = createClient() as unknown as SupabaseLike;

    type InvokeResponse = {
      data: DeleteAccountResult | null;
      error:
        | { message?: string; context?: { status?: number } }
        | null;
    };
    let response: InvokeResponse;
    try {
      response = (await supabase.functions.invoke<DeleteAccountResult>(
        'account-delete',
        { body: params }
      )) as InvokeResponse;
    } catch (err) {
      throw new GdprApiError(
        'Connessione persa mentre eliminavamo il tuo account. Riprova.',
        0,
        'network',
        err
      );
    }

    const { data, error } = response;
    if (error) {
      const status = error.context?.status;
      // Edge function returns { error: "<code_or_message>" } on non-2xx
      const serverMsg = error.message || '';
      const code = mapErrorCode(serverMsg, status);
      const humanMessage =
        code === 'password_mismatch'
          ? 'La password non è corretta'
          : code === 'profile_not_found'
            ? 'Profilo non trovato. Contatta il supporto.'
            : code === 'export_failed'
              ? 'Non è stato possibile esportare i tuoi dati. Riprova senza export.'
              : code === 'delete_failed'
                ? 'Eliminazione fallita. Riprova più tardi.'
                : serverMsg || 'Errore imprevisto durante l\'eliminazione.';
      throw new GdprApiError(humanMessage, status || 500, code, error);
    }

    if (!data || data.success !== true) {
      throw new GdprApiError(
        'Risposta inattesa dal server',
        500,
        'unknown',
        data
      );
    }

    return data;
  },
};

export default gdprClient;
