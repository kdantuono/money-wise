/**
 * Tests for onboarding.client.
 *
 * Mocks the Supabase client with two chains:
 *   from('profiles').select('preferences').eq('id', id).single() → read
 *   from('profiles').update(payload).eq('id', id)                → write
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type SelectChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

type UpdateChain = {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
};

const selectChain: SelectChain = {
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
};

const updateChain: UpdateChain = {
  update: vi.fn(),
  eq: vi.fn(),
};

const fromMock = vi.fn();

vi.mock('../../src/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

import {
  onboardingClient,
  OnboardingApiError,
} from '../../src/services/onboarding.client';
import type { OnboardingData } from '../../src/types/onboarding';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const ONBOARDING: OnboardingData = {
  incomeRange: '1500-3000',
  savingsGoal: 'emergency-fund',
  goals: ['safety-net'],
  aiPreferences: ['auto-categorize'],
};

function primeSupabase(opts: {
  existingPreferences?: Record<string, unknown> | null;
  selectError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  const {
    existingPreferences = null,
    selectError = null,
    updateError = null,
  } = opts;

  selectChain.single.mockResolvedValue({
    data: existingPreferences === null
      ? null
      : { preferences: existingPreferences },
    error: selectError,
  });
  selectChain.eq.mockReturnValue({ single: selectChain.single });
  selectChain.select.mockReturnValue({ eq: selectChain.eq });

  updateChain.eq.mockResolvedValue({ error: updateError });
  updateChain.update.mockReturnValue({ eq: updateChain.eq });

  fromMock.mockReset();
  fromMock.mockImplementation(() => ({
    select: selectChain.select,
    update: updateChain.update,
  }));
}

describe('onboardingClient.completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectChain.select.mockReset();
    selectChain.eq.mockReset();
    selectChain.single.mockReset();
    updateChain.update.mockReset();
    updateChain.eq.mockReset();
  });

  it('rejects when userId is empty', async () => {
    primeSupabase({});
    await expect(
      onboardingClient.completeOnboarding('', ONBOARDING)
    ).rejects.toBeInstanceOf(OnboardingApiError);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('writes onboarded=true and merges onboarding into preferences', async () => {
    primeSupabase({ existingPreferences: { theme: 'dracula', notifications: { channels: { email: true } } } });

    const result = await onboardingClient.completeOnboarding(USER_ID, ONBOARDING);

    expect(selectChain.select).toHaveBeenCalledWith('preferences');
    expect(selectChain.eq).toHaveBeenCalledWith('id', USER_ID);

    const updatePayload = updateChain.update.mock.calls[0][0];
    expect(updatePayload.onboarded).toBe(true);
    expect(updatePayload.preferences.theme).toBe('dracula');
    expect(updatePayload.preferences.notifications.channels.email).toBe(true);
    expect(updatePayload.preferences.onboarding).toMatchObject(ONBOARDING);
    expect(updatePayload.preferences.onboarding.completedAt).toEqual(
      expect.any(String)
    );
    expect(updateChain.eq).toHaveBeenCalledWith('id', USER_ID);

    // Return value echoes what was persisted under onboarding
    expect(result).toMatchObject(ONBOARDING);
    expect(result.completedAt).toEqual(expect.any(String));
  });

  it('treats null/empty existing preferences as {} and still writes onboarding', async () => {
    primeSupabase({ existingPreferences: null });

    await onboardingClient.completeOnboarding(USER_ID, ONBOARDING);

    const updatePayload = updateChain.update.mock.calls[0][0];
    expect(Object.keys(updatePayload.preferences)).toEqual(['onboarding']);
    expect(updatePayload.onboarded).toBe(true);
  });

  it('wraps SELECT error in OnboardingApiError', async () => {
    primeSupabase({
      selectError: { message: 'RLS violation on SELECT' },
    });

    await expect(
      onboardingClient.completeOnboarding(USER_ID, ONBOARDING)
    ).rejects.toMatchObject({
      name: 'OnboardingApiError',
      statusCode: 500,
      message: expect.stringContaining('RLS violation'),
    });
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it('wraps UPDATE error in OnboardingApiError', async () => {
    primeSupabase({
      existingPreferences: {},
      updateError: { message: 'update failed' },
    });

    await expect(
      onboardingClient.completeOnboarding(USER_ID, ONBOARDING)
    ).rejects.toMatchObject({
      name: 'OnboardingApiError',
      statusCode: 500,
      message: expect.stringContaining('update failed'),
    });
  });

  it('uses fallback messages when Supabase errors lack .message', async () => {
    primeSupabase({ selectError: { message: '' } as { message: string } });
    await expect(
      onboardingClient.completeOnboarding(USER_ID, ONBOARDING)
    ).rejects.toMatchObject({
      message: 'Failed to read profile preferences',
    });

    primeSupabase({
      existingPreferences: {},
      updateError: { message: '' } as { message: string },
    });
    await expect(
      onboardingClient.completeOnboarding(USER_ID, ONBOARDING)
    ).rejects.toMatchObject({
      message: 'Failed to persist onboarding',
    });
  });

  it('handles non-object preferences in DB by treating them as empty', async () => {
    // Simulate a broken row with preferences being a scalar / array
    primeSupabase({ existingPreferences: 'legacy-string' as unknown as Record<string, unknown> });

    await onboardingClient.completeOnboarding(USER_ID, ONBOARDING);
    const updatePayload = updateChain.update.mock.calls[0][0];
    expect(updatePayload.preferences).toEqual(
      expect.objectContaining({ onboarding: expect.objectContaining(ONBOARDING) })
    );
    // The "legacy-string" scalar does not leak into the merged object
    expect(updatePayload.preferences.theme).toBeUndefined();
  });
});

describe('OnboardingApiError', () => {
  it('carries statusCode and optional details', () => {
    const err = new OnboardingApiError('boom', 418, { x: 1 });
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(418);
    expect(err.details).toEqual({ x: 1 });
    expect(err.name).toBe('OnboardingApiError');
    expect(err).toBeInstanceOf(Error);
  });
});
