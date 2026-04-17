/**
 * Tests for services/gdpr.client — account-delete edge function wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('../../src/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    functions: { invoke: mocks.invoke },
  })),
}));

import { gdprClient, GdprApiError } from '../../src/services/gdpr.client';

describe('gdprClient.deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockReset();
  });

  it('returns the server result on happy path', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        success: true,
        deletedAt: '2026-04-17T20:00:00.000Z',
        familyDeleted: true,
      },
      error: null,
    });

    const r = await gdprClient.deleteAccount({
      password: 'p',
      exportDataFirst: false,
    });
    expect(r.success).toBe(true);
    expect(r.deletedAt).toBe('2026-04-17T20:00:00.000Z');
    expect(r.familyDeleted).toBe(true);

    expect(mocks.invoke).toHaveBeenCalledWith('account-delete', {
      body: { password: 'p', exportDataFirst: false },
    });
  });

  it('passes exportData through when server returns it', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        success: true,
        deletedAt: '2026-04-17T20:00:00.000Z',
        familyDeleted: false,
        exportData: { profile: { id: 'u' } },
      },
      error: null,
    });

    const r = await gdprClient.deleteAccount({
      password: 'p',
      exportDataFirst: true,
    });
    expect(r.exportData).toEqual({ profile: { id: 'u' } });
  });

  it('maps password_mismatch to code=password_mismatch (401)', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'password_mismatch', context: { status: 401 } },
    });

    await expect(
      gdprClient.deleteAccount({ password: 'p', exportDataFirst: false })
    ).rejects.toMatchObject({
      name: 'GdprApiError',
      code: 'password_mismatch',
      statusCode: 401,
    });
  });

  it('maps profile_not_found to code=profile_not_found (404)', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'profile_not_found', context: { status: 404 } },
    });

    await expect(
      gdprClient.deleteAccount({ password: 'p', exportDataFirst: false })
    ).rejects.toMatchObject({ code: 'profile_not_found', statusCode: 404 });
  });

  it('maps export_failed prefix to code=export_failed', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'export_failed: something broke', context: { status: 500 } },
    });

    await expect(
      gdprClient.deleteAccount({ password: 'p', exportDataFirst: true })
    ).rejects.toMatchObject({ code: 'export_failed', statusCode: 500 });
  });

  it('maps family_delete_failed / user_delete_failed to code=delete_failed', async () => {
    for (const msg of ['family_delete_failed: x', 'user_delete_failed: y']) {
      mocks.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: msg, context: { status: 500 } },
      });
      await expect(
        gdprClient.deleteAccount({ password: 'p', exportDataFirst: false })
      ).rejects.toMatchObject({ code: 'delete_failed' });
    }
  });

  it('maps generic 500 to code=delete_failed', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'internal_error: unknown', context: { status: 500 } },
    });
    await expect(
      gdprClient.deleteAccount({ password: 'p', exportDataFirst: false })
    ).rejects.toMatchObject({ code: 'delete_failed' });
  });

  it('throws network error when invoke itself rejects', async () => {
    mocks.invoke.mockRejectedValueOnce(new Error('fetch failed'));
    await expect(
      gdprClient.deleteAccount({ password: 'p', exportDataFirst: false })
    ).rejects.toMatchObject({
      code: 'network',
      statusCode: 0,
      message: expect.stringContaining('Connessione'),
    });
  });

  it('throws unknown error when data is missing / success!=true', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      gdprClient.deleteAccount({ password: 'p', exportDataFirst: false })
    ).rejects.toMatchObject({ code: 'unknown' });

    mocks.invoke.mockResolvedValueOnce({
      data: { success: false } as unknown,
      error: null,
    });
    await expect(
      gdprClient.deleteAccount({ password: 'p', exportDataFirst: false })
    ).rejects.toMatchObject({ code: 'unknown' });
  });
});

describe('GdprApiError', () => {
  it('carries code + statusCode + details', () => {
    const err = new GdprApiError('msg', 418, 'unknown', { x: 1 });
    expect(err.message).toBe('msg');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('unknown');
    expect(err.details).toEqual({ x: 1 });
    expect(err.name).toBe('GdprApiError');
  });

  it('defaults code to unknown', () => {
    const err = new GdprApiError('x', 500);
    expect(err.code).toBe('unknown');
  });
});
