/**
 * Tests for user-preferences.client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client BEFORE importing the module under test
type MockChain = {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
};

const chain: MockChain = {
  update: vi.fn(),
  eq: vi.fn(),
};
const fromMock = vi.fn(() => chain);

vi.mock('../../src/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

import {
  userPreferencesClient,
  UserPreferencesApiError,
} from '../../src/services/user-preferences.client';
import {
  defaultNotificationPreferences,
  type UserPreferences,
} from '../../src/types/user-preferences';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeEqResolver(error: { message: string } | null) {
  return { error };
}

describe('userPreferencesClient.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chain.update.mockReset().mockReturnValue(chain);
    chain.eq.mockReset().mockResolvedValue(makeEqResolver(null));
  });

  it('rejects when userId is empty', async () => {
    await expect(
      userPreferencesClient.update('', { theme: 'dracula' })
    ).rejects.toBeInstanceOf(UserPreferencesApiError);
  });

  it('writes preferences to the profiles table, targeting the user row', async () => {
    const prefs: UserPreferences = {
      theme: 'dracula',
      language: 'it',
      notifications: defaultNotificationPreferences(),
    };

    await userPreferencesClient.update(USER_ID, prefs);

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(chain.update).toHaveBeenCalledTimes(1);
    const call = chain.update.mock.calls[0][0];
    expect(call).toHaveProperty('preferences');
    // The payload must be JSON-safe (plain object, not class instance)
    expect(JSON.parse(JSON.stringify(call.preferences))).toEqual(prefs);
    expect(chain.eq).toHaveBeenCalledWith('id', USER_ID);
  });

  it('wraps Supabase errors in UserPreferencesApiError', async () => {
    chain.eq.mockResolvedValueOnce(
      makeEqResolver({ message: 'RLS violation' })
    );

    await expect(
      userPreferencesClient.update(USER_ID, { theme: 'system' })
    ).rejects.toMatchObject({
      name: 'UserPreferencesApiError',
      statusCode: 500,
      message: expect.stringContaining('RLS violation'),
    });
  });

  it('uses a fallback message when Supabase error has no message', async () => {
    chain.eq.mockResolvedValueOnce(
      makeEqResolver({ message: '' } as { message: string })
    );
    await expect(
      userPreferencesClient.update(USER_ID, {})
    ).rejects.toMatchObject({
      message: 'Failed to update preferences',
      statusCode: 500,
    });
  });

  it('strips non-serializable values (functions, undefined) before persisting', async () => {
    const prefs = {
      theme: 'italian',
      extra: () => 'should be dropped',
      dropMe: undefined,
      notifications: defaultNotificationPreferences(),
    } as unknown as UserPreferences;

    await userPreferencesClient.update(USER_ID, prefs);

    const payload = chain.update.mock.calls[0][0].preferences;
    expect(payload).not.toHaveProperty('extra');
    expect(payload).not.toHaveProperty('dropMe');
    expect(payload.theme).toBe('italian');
    expect(payload.notifications).toBeDefined();
  });
});

describe('userPreferencesClient.updateNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chain.update.mockReset().mockReturnValue(chain);
    chain.eq.mockReset().mockResolvedValue(makeEqResolver(null));
  });

  it('merges notifications into existing preferences and returns the merged object', async () => {
    const current: UserPreferences = {
      theme: 'dracula',
      language: 'it',
    };
    const nextNotifications = defaultNotificationPreferences();

    const merged = await userPreferencesClient.updateNotifications(
      USER_ID,
      current,
      nextNotifications
    );

    expect(merged).toEqual({
      theme: 'dracula',
      language: 'it',
      notifications: nextNotifications,
    });
    const payload = chain.update.mock.calls[0][0].preferences;
    expect(payload).toEqual(merged);
  });

  it('handles null/undefined existing preferences', async () => {
    const nextNotifications = defaultNotificationPreferences();

    const mergedUndefined = await userPreferencesClient.updateNotifications(
      USER_ID,
      undefined,
      nextNotifications
    );
    expect(mergedUndefined).toEqual({ notifications: nextNotifications });

    const mergedNull = await userPreferencesClient.updateNotifications(
      USER_ID,
      null,
      nextNotifications
    );
    expect(mergedNull).toEqual({ notifications: nextNotifications });
  });

  it('overwrites previous notifications value (does not deep-merge channels)', async () => {
    const current: UserPreferences = {
      notifications: {
        channels: { email: false, push: false, inApp: false },
        types: defaultNotificationPreferences().types,
        quietHours: defaultNotificationPreferences().quietHours,
      },
    };
    const next = defaultNotificationPreferences();

    const merged = await userPreferencesClient.updateNotifications(
      USER_ID,
      current,
      next
    );

    expect(merged.notifications).toEqual(next);
    expect(merged.notifications?.channels.email).toBe(true);
  });

  it('rethrows when Supabase returns an error', async () => {
    chain.eq.mockResolvedValueOnce(
      makeEqResolver({ message: 'timeout' })
    );
    await expect(
      userPreferencesClient.updateNotifications(
        USER_ID,
        {},
        defaultNotificationPreferences()
      )
    ).rejects.toBeInstanceOf(UserPreferencesApiError);
  });

  it('rejects when userId is empty', async () => {
    await expect(
      userPreferencesClient.updateNotifications(
        '',
        {},
        defaultNotificationPreferences()
      )
    ).rejects.toBeInstanceOf(UserPreferencesApiError);
  });
});

describe('userPreferencesClient.updateTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chain.update.mockReset().mockReturnValue(chain);
    chain.eq.mockReset().mockResolvedValue(makeEqResolver(null));
  });

  it('persists theme merged with existing preferences', async () => {
    const current: UserPreferences = {
      theme: 'dracula',
      language: 'it',
    };

    await userPreferencesClient.updateTheme(USER_ID, current, 'italian');

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(chain.update).toHaveBeenCalledTimes(1);
    const payload = chain.update.mock.calls[0][0].preferences;
    expect(payload.theme).toBe('italian');
    // Other keys must be preserved
    expect(payload.language).toBe('it');
    expect(chain.eq).toHaveBeenCalledWith('id', USER_ID);
  });

  it('handles null existing preferences (first-time write)', async () => {
    await userPreferencesClient.updateTheme(USER_ID, null, 'dracula');

    const payload = chain.update.mock.calls[0][0].preferences;
    expect(payload.theme).toBe('dracula');
  });

  it('handles undefined existing preferences', async () => {
    await userPreferencesClient.updateTheme(USER_ID, undefined, 'system');

    const payload = chain.update.mock.calls[0][0].preferences;
    expect(payload.theme).toBe('system');
  });

  it('preserves notifications when updating theme', async () => {
    const current: UserPreferences = {
      theme: 'system',
      notifications: {
        channels: { email: false, push: true, inApp: true },
        types: defaultNotificationPreferences().types,
        quietHours: defaultNotificationPreferences().quietHours,
      },
    };

    await userPreferencesClient.updateTheme(USER_ID, current, 'dracula');

    const payload = chain.update.mock.calls[0][0].preferences;
    expect(payload.theme).toBe('dracula');
    expect(payload.notifications).toBeDefined();
    expect(payload.notifications.channels.email).toBe(false);
  });

  it('throws UserPreferencesApiError when userId is empty', async () => {
    await expect(
      userPreferencesClient.updateTheme('', null, 'italian')
    ).rejects.toBeInstanceOf(UserPreferencesApiError);
  });

  it('throws UserPreferencesApiError when Supabase returns an error', async () => {
    chain.eq.mockResolvedValueOnce(
      makeEqResolver({ message: 'RLS violation' })
    );

    await expect(
      userPreferencesClient.updateTheme(USER_ID, {}, 'dracula')
    ).rejects.toMatchObject({
      name: 'UserPreferencesApiError',
      statusCode: 500,
      message: expect.stringContaining('RLS violation'),
    });
  });
});

describe('UserPreferencesApiError', () => {
  it('carries statusCode and optional details', () => {
    const err = new UserPreferencesApiError('boom', 418, { x: 1 });
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(418);
    expect(err.details).toEqual({ x: 1 });
    expect(err.name).toBe('UserPreferencesApiError');
    expect(err).toBeInstanceOf(Error);
  });
});
