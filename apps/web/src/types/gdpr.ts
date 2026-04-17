/**
 * GDPR — shared types for the Settings > Dati flow.
 *
 * The request sent to the `account-delete` edge function is
 * `{ password, exportDataFirst? }`; `confirmPhrase` is a UI-only field
 * that guards the submit button and is NOT forwarded to the server.
 * `DeleteAccountResult` mirrors the edge function's response shape
 * (`supabase/functions/account-delete/index.ts`) — keep in sync if it changes.
 *
 * @module types/gdpr
 */

import { z } from 'zod';

// =============================================================================
// Confirmation phrase — single source of truth
// =============================================================================

/** Literal word the user must type to confirm account deletion. */
export const DELETE_CONFIRM_PHRASE = 'ELIMINA';

// =============================================================================
// Delete-my-account request (UI form)
// =============================================================================

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'La password è obbligatoria per conferma'),
  exportDataFirst: z.boolean(),
  /**
   * UI-only: must be typed literally to confirm intent. NOT forwarded to
   * the edge function — callers destructure `{password, exportDataFirst}`
   * before invoking the server.
   */
  confirmPhrase: z
    .string()
    .refine((v) => v.trim().toUpperCase() === DELETE_CONFIRM_PHRASE, {
      message: `Digita ${DELETE_CONFIRM_PHRASE} per confermare`,
    }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/**
 * Successful response from `account-delete` edge function.
 * Matches the return of `handleDelete` in supabase/functions/account-delete/index.ts.
 */
export interface DeleteAccountResult {
  success: true;
  deletedAt: string;
  familyDeleted: boolean;
  /** Present when request had `exportDataFirst: true`. */
  exportData?: Record<string, unknown>;
}

