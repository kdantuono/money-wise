/**
 * Security — shared types for the Settings > Sicurezza flow.
 *
 * Schema for password change requests. Mirrors the register flow's `min(8)`
 * policy (see `app/auth/register/page.tsx`) and adds:
 *   - confirmPassword match
 *   - newPassword must differ from currentPassword
 *
 * Supabase Auth enforces its own server-side rules; this client schema is
 * for UX feedback and defensive pre-submit validation.
 *
 * @module types/security
 */

import { z } from 'zod';

// =============================================================================
// Password policy
// =============================================================================

/** Minimum length — aligned with register flow. */
export const PASSWORD_MIN_LENGTH = 8;

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'La password attuale è obbligatoria'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri`),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'La nuova password deve essere diversa da quella attuale',
    path: ['newPassword'],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// =============================================================================
// Result shape
// =============================================================================

export interface PasswordChangeResult {
  changedAt: string;
}
