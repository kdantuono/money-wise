/**
 * Tests for user-preferences types + parse helpers
 */

import { describe, it, expect } from 'vitest';
import {
  defaultNotificationChannels,
  defaultNotificationPreferences,
  defaultNotificationTypes,
  defaultQuietHours,
  parseNotificationPreferences,
} from '../../src/types/user-preferences';

describe('default factories', () => {
  it('defaultNotificationChannels has all channels enabled', () => {
    expect(defaultNotificationChannels()).toEqual({
      email: true,
      push: true,
      inApp: true,
    });
  });

  it('defaultNotificationTypes has sensible defaults (promos/newFeatures off)', () => {
    const types = defaultNotificationTypes();
    expect(types.monthlyReport).toBe(true);
    expect(types.budgetAlerts).toBe(true);
    expect(types.aiAdvice).toBe(true);
    expect(types.investmentUpdates).toBe(true);
    expect(types.recurringDeadlines).toBe(true);
    expect(types.goalsAchieved).toBe(true);
    expect(types.newFeatures).toBe(false);
    expect(types.promotions).toBe(false);
  });

  it('defaultQuietHours is disabled by default, 22:00 → 08:00', () => {
    expect(defaultQuietHours()).toEqual({
      enabled: false,
      from: '22:00',
      to: '08:00',
    });
  });

  it('defaultNotificationPreferences composes the three sub-defaults', () => {
    expect(defaultNotificationPreferences()).toEqual({
      channels: defaultNotificationChannels(),
      types: defaultNotificationTypes(),
      quietHours: defaultQuietHours(),
    });
  });
});

describe('parseNotificationPreferences — invalid / empty input', () => {
  it('returns defaults for null', () => {
    expect(parseNotificationPreferences(null)).toEqual(
      defaultNotificationPreferences()
    );
  });

  it('returns defaults for undefined', () => {
    expect(parseNotificationPreferences(undefined)).toEqual(
      defaultNotificationPreferences()
    );
  });

  it('returns defaults for scalar input', () => {
    expect(parseNotificationPreferences('hello')).toEqual(
      defaultNotificationPreferences()
    );
    expect(parseNotificationPreferences(42)).toEqual(
      defaultNotificationPreferences()
    );
    expect(parseNotificationPreferences(true)).toEqual(
      defaultNotificationPreferences()
    );
  });

  it('returns defaults for empty object', () => {
    expect(parseNotificationPreferences({})).toEqual(
      defaultNotificationPreferences()
    );
  });
});

describe('parseNotificationPreferences — legacy flat shape', () => {
  it('migrates {email,push,budgets,categories} to nested shape', () => {
    const parsed = parseNotificationPreferences({
      email: false,
      push: false,
      categories: true,
      budgets: false,
    });
    expect(parsed.channels.email).toBe(false);
    expect(parsed.channels.push).toBe(false);
    // inApp not in legacy → falls back to default
    expect(parsed.channels.inApp).toBe(true);
    // legacy `budgets` → new `budgetAlerts`
    expect(parsed.types.budgetAlerts).toBe(false);
    // `categories` has no slot in new schema; other types remain at defaults
    expect(parsed.types.monthlyReport).toBe(true);
    expect(parsed.quietHours).toEqual(defaultQuietHours());
  });

  it('treats missing legacy booleans as fallback to defaults', () => {
    // Only `email: false`; others should default
    const parsed = parseNotificationPreferences({ email: false });
    expect(parsed.channels.email).toBe(false);
    expect(parsed.channels.push).toBe(true);
    expect(parsed.types).toEqual(defaultNotificationTypes());
  });
});

describe('parseNotificationPreferences — nested (current) shape', () => {
  it('round-trips a full valid payload unchanged', () => {
    const payload = defaultNotificationPreferences();
    expect(parseNotificationPreferences(payload)).toEqual(payload);
  });

  it('fills missing sub-keys with defaults', () => {
    const partial = {
      channels: { email: false }, // push/inApp missing
      types: { promotions: true }, // others missing
      quietHours: { enabled: true }, // from/to missing
    };
    const parsed = parseNotificationPreferences(partial);
    expect(parsed.channels).toEqual({
      email: false,
      push: true,
      inApp: true,
    });
    expect(parsed.types.promotions).toBe(true);
    expect(parsed.types.monthlyReport).toBe(true); // default
    expect(parsed.quietHours).toEqual({
      enabled: true,
      from: '22:00',
      to: '08:00',
    });
  });

  it('rejects malformed time strings (defaults to fallback)', () => {
    const parsed = parseNotificationPreferences({
      quietHours: { enabled: true, from: 'not-a-time', to: '25:99' },
    });
    expect(parsed.quietHours.from).toBe('22:00');
    expect(parsed.quietHours.to).toBe('08:00');
    expect(parsed.quietHours.enabled).toBe(true);
  });

  it('accepts valid HH:MM boundary values', () => {
    const parsed = parseNotificationPreferences({
      quietHours: { from: '00:00', to: '23:59' },
    });
    expect(parsed.quietHours.from).toBe('00:00');
    expect(parsed.quietHours.to).toBe('23:59');
  });

  it('rejects non-boolean values for flags', () => {
    const parsed = parseNotificationPreferences({
      channels: { email: 'yes', push: 1, inApp: null },
      types: { monthlyReport: 'true' },
    });
    expect(parsed.channels.email).toBe(true); // defaulted
    expect(parsed.channels.push).toBe(true); // defaulted
    expect(parsed.channels.inApp).toBe(true);
    expect(parsed.types.monthlyReport).toBe(true); // defaulted
  });

  it('ignores unknown top-level keys', () => {
    const parsed = parseNotificationPreferences({
      channels: { email: false, push: true, inApp: true },
      types: defaultNotificationTypes(),
      quietHours: defaultQuietHours(),
      foo: 'bar',
      __proto__: { evil: true },
    });
    expect(parsed.channels.email).toBe(false);
    expect((parsed as unknown as Record<string, unknown>).foo).toBeUndefined();
  });
});
