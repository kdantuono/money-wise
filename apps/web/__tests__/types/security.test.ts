/**
 * Tests for types/security — passwordChangeSchema validation.
 */

import { describe, it, expect } from 'vitest';
import {
  passwordChangeSchema,
  PASSWORD_MIN_LENGTH,
} from '../../src/types/security';

describe('passwordChangeSchema', () => {
  const valid = {
    currentPassword: 'OldSecure123',
    newPassword: 'NewSecure456',
    confirmPassword: 'NewSecure456',
  };

  it('accepts a valid change', () => {
    const r = passwordChangeSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('rejects empty currentPassword', () => {
    const r = passwordChangeSchema.safeParse({ ...valid, currentPassword: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some(
          (i) => i.path[0] === 'currentPassword' && i.message.includes('obbligatoria')
        )
      ).toBe(true);
    }
  });

  it('rejects newPassword shorter than the minimum', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    const r = passwordChangeSchema.safeParse({
      ...valid,
      newPassword: short,
      confirmPassword: short,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some(
          (i) =>
            i.path[0] === 'newPassword' &&
            i.message.includes(String(PASSWORD_MIN_LENGTH))
        )
      ).toBe(true);
    }
  });

  it('rejects when confirmPassword does not match newPassword', () => {
    const r = passwordChangeSchema.safeParse({
      ...valid,
      confirmPassword: 'DifferentValue99',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some(
          (i) =>
            i.path[0] === 'confirmPassword' &&
            i.message.toLowerCase().includes('coincidono')
        )
      ).toBe(true);
    }
  });

  it('rejects when newPassword equals currentPassword (must differ)', () => {
    const r = passwordChangeSchema.safeParse({
      currentPassword: 'SamePass999',
      newPassword: 'SamePass999',
      confirmPassword: 'SamePass999',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some(
          (i) =>
            i.path[0] === 'newPassword' &&
            i.message.toLowerCase().includes('diversa')
        )
      ).toBe(true);
    }
  });

  it('reports multiple issues at once when relevant', () => {
    const r = passwordChangeSchema.safeParse({
      currentPassword: '',
      newPassword: 'short',
      confirmPassword: 'mismatch',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('currentPassword');
      expect(paths).toContain('newPassword');
    }
  });
});

describe('PASSWORD_MIN_LENGTH', () => {
  it('is aligned with the register flow (min 8)', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
