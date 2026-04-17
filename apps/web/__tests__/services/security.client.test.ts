/**
 * Tests for services/security.client — two-step password change flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('../../src/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
    },
  })),
}));

import {
  securityClient,
  SecurityApiError,
} from '../../src/services/security.client';

const EMAIL = 'user@example.com';
const CURR = 'OldSecure123';
const NEW = 'NewSecure456';

describe('securityClient.changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithPassword.mockReset();
    mocks.updateUser.mockReset();
  });

  it('rejects when email is missing', async () => {
    await expect(
      securityClient.changePassword({
        email: '',
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      name: 'SecurityApiError',
      statusCode: 400,
      code: 'missing_email',
    });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('re-verifies current password before updating', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ error: null });
    mocks.updateUser.mockResolvedValueOnce({ error: null });

    const result = await securityClient.changePassword({
      email: EMAIL,
      currentPassword: CURR,
      newPassword: NEW,
    });

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL,
      password: CURR,
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: NEW });
    expect(result.changedAt).toEqual(expect.any(String));
    expect(new Date(result.changedAt).toString()).not.toBe('Invalid Date');
  });

  it('throws current_password_mismatch when reverify returns invalid_credentials code', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'whatever', code: 'invalid_credentials', status: 400 },
    });

    await expect(
      securityClient.changePassword({
        email: EMAIL,
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      name: 'SecurityApiError',
      statusCode: 401,
      code: 'current_password_mismatch',
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('throws current_password_mismatch on legacy "Invalid login credentials" message without code', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });

    await expect(
      securityClient.changePassword({
        email: EMAIL,
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      code: 'current_password_mismatch',
    });
  });

  it('throws reverify_failed (NOT mismatch) on rate-limit errors', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: {
        message: 'For security purposes, you can only request this after 60 seconds.',
        status: 429,
      },
    });

    await expect(
      securityClient.changePassword({
        email: EMAIL,
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      name: 'SecurityApiError',
      statusCode: 429,
      code: 'reverify_failed',
      message: expect.stringContaining('60 seconds'),
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('throws reverify_failed on email-not-confirmed error', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: {
        message: 'Email not confirmed',
        code: 'email_not_confirmed',
        status: 400,
      },
    });

    await expect(
      securityClient.changePassword({
        email: EMAIL,
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      code: 'reverify_failed',
      statusCode: 400,
    });
  });

  it('throws reverify_failed with fallback message when reverify error has no message', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { message: '' } as { message: string },
    });

    await expect(
      securityClient.changePassword({
        email: EMAIL,
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      code: 'reverify_failed',
      statusCode: 500,
      message: expect.stringContaining('Impossibile verificare'),
    });
  });

  it('throws update_failed when updateUser rejects', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ error: null });
    mocks.updateUser.mockResolvedValueOnce({
      error: { message: 'weak password per server policy' },
    });

    await expect(
      securityClient.changePassword({
        email: EMAIL,
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      name: 'SecurityApiError',
      statusCode: 500,
      code: 'update_failed',
      message: expect.stringContaining('weak password'),
    });
  });

  it('uses a fallback message when update error has no message', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ error: null });
    mocks.updateUser.mockResolvedValueOnce({
      error: { message: '' } as { message: string },
    });

    await expect(
      securityClient.changePassword({
        email: EMAIL,
        currentPassword: CURR,
        newPassword: NEW,
      })
    ).rejects.toMatchObject({
      code: 'update_failed',
      message: expect.stringContaining('Impossibile'),
    });
  });
});

describe('SecurityApiError', () => {
  it('carries code + statusCode + optional details', () => {
    const err = new SecurityApiError(
      'boom',
      418,
      'unknown',
      { extra: 1 }
    );
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('unknown');
    expect(err.details).toEqual({ extra: 1 });
    expect(err.name).toBe('SecurityApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults code to "unknown" when not provided', () => {
    const err = new SecurityApiError('oops', 500);
    expect(err.code).toBe('unknown');
  });
});
