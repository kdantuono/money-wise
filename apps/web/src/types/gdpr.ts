/**
 * GDPR — shared types for the Settings > Dati flow.
 *
 * Mirrors the contract of the `account-delete` Supabase Edge Function
 * (`supabase/functions/account-delete/index.ts`). Keep in sync if the
 * edge function's request/response shape changes.
 *
 * @module types/gdpr
 */

import { z } from 'zod';

// =============================================================================
// Delete-my-account request
// =============================================================================

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'La password è obbligatoria per conferma'),
  exportDataFirst: z.boolean(),
  /** Must be typed literally to confirm intent — Italian UX copy. */
  confirmPhrase: z
    .string()
    .refine((v) => v.trim().toUpperCase() === 'ELIMINA', {
      message: 'Digita ELIMINA per confermare',
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

/** Confirmation phrase expected in the "type to confirm" input. */
export const DELETE_CONFIRM_PHRASE = 'ELIMINA';
