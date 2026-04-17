/**
 * Tests for types/gdpr — deleteAccountSchema validation.
 */

import { describe, it, expect } from 'vitest';
import {
  deleteAccountSchema,
  DELETE_CONFIRM_PHRASE,
} from '../../src/types/gdpr';

const VALID = {
  password: 'hunter2',
  exportDataFirst: false,
  confirmPhrase: 'ELIMINA',
};

describe('deleteAccountSchema', () => {
  it('accepts valid input with exportDataFirst=false', () => {
    const r = deleteAccountSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  it('accepts valid input with exportDataFirst=true', () => {
    const r = deleteAccountSchema.safeParse({ ...VALID, exportDataFirst: true });
    expect(r.success).toBe(true);
  });

  it('rejects empty password', () => {
    const r = deleteAccountSchema.safeParse({ ...VALID, password: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'password')).toBe(true);
    }
  });

  it('rejects wrong confirm phrase', () => {
    const r = deleteAccountSchema.safeParse({ ...VALID, confirmPhrase: 'DELETE' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path[0] === 'confirmPhrase')
      ).toBe(true);
    }
  });

  it('accepts case-insensitive / trimmed confirm phrase', () => {
    for (const phrase of ['elimina', ' ELIMINA ', 'Elimina']) {
      expect(
        deleteAccountSchema.safeParse({ ...VALID, confirmPhrase: phrase }).success
      ).toBe(true);
    }
  });

  it('rejects missing exportDataFirst (must be boolean)', () => {
    const r = deleteAccountSchema.safeParse({
      password: 'p',
      confirmPhrase: 'ELIMINA',
    });
    expect(r.success).toBe(false);
  });
});

describe('DELETE_CONFIRM_PHRASE', () => {
  it('is the expected literal', () => {
    expect(DELETE_CONFIRM_PHRASE).toBe('ELIMINA');
  });
});
