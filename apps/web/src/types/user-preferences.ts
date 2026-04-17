/**
 * User Preferences — Shared Types
 *
 * Schema for the JSONB `profiles.preferences` column.
 * Structured nested shape over the legacy flat shape, with a parse helper
 * that migrates old payloads forward at read time.
 *
 * @module types/user-preferences
 */

export type ThemePreference = 'system' | 'dracula' | 'italian';

export interface NotificationChannels {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface NotificationTypes {
  monthlyReport: boolean;
  budgetAlerts: boolean;
  aiAdvice: boolean;
  investmentUpdates: boolean;
  recurringDeadlines: boolean;
  goalsAchieved: boolean;
  newFeatures: boolean;
  promotions: boolean;
}

export interface QuietHours {
  enabled: boolean;
  /** HH:MM 24h format */
  from: string;
  /** HH:MM 24h format */
  to: string;
}

export interface NotificationPreferences {
  channels: NotificationChannels;
  types: NotificationTypes;
  quietHours: QuietHours;
}

export interface UserPreferences {
  theme?: ThemePreference;
  language?: string;
  notifications?: NotificationPreferences;
}

// =============================================================================
// Defaults
// =============================================================================

export function defaultNotificationChannels(): NotificationChannels {
  return { email: true, push: true, inApp: true };
}

export function defaultNotificationTypes(): NotificationTypes {
  return {
    monthlyReport: true,
    budgetAlerts: true,
    aiAdvice: true,
    investmentUpdates: true,
    recurringDeadlines: true,
    goalsAchieved: true,
    newFeatures: false,
    promotions: false,
  };
}

export function defaultQuietHours(): QuietHours {
  return { enabled: false, from: '22:00', to: '08:00' };
}

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    channels: defaultNotificationChannels(),
    types: defaultNotificationTypes(),
    quietHours: defaultQuietHours(),
  };
}

// =============================================================================
// Parse / migration helpers
// =============================================================================

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseTime(value: unknown, fallback: string): string {
  return typeof value === 'string' && TIME_REGEX.test(value) ? value : fallback;
}

/**
 * Parse a raw preferences.notifications payload into the canonical nested
 * shape. Accepts:
 *   - the current nested shape { channels, types, quietHours }
 *   - the legacy flat shape { email, push, categories, budgets }
 *   - null / undefined / any invalid input (returns full defaults)
 *
 * Unknown keys are ignored. Missing keys use defaults.
 */
export function parseNotificationPreferences(
  raw: unknown
): NotificationPreferences {
  const defaults = defaultNotificationPreferences();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const source = raw as Record<string, unknown>;

  // Detect legacy flat shape: has `email`/`push` at top-level, no `channels` nested
  const isLegacyFlat =
    !('channels' in source) &&
    ('email' in source || 'push' in source || 'budgets' in source);

  if (isLegacyFlat) {
    return {
      channels: {
        email: parseBool(source.email, defaults.channels.email),
        push: parseBool(source.push, defaults.channels.push),
        inApp: defaults.channels.inApp,
      },
      types: {
        ...defaults.types,
        // map legacy `budgets` → budgetAlerts
        budgetAlerts: parseBool(source.budgets, defaults.types.budgetAlerts),
      },
      quietHours: defaults.quietHours,
    };
  }

  const channelsSource = (source.channels ?? {}) as Record<string, unknown>;
  const typesSource = (source.types ?? {}) as Record<string, unknown>;
  const quietSource = (source.quietHours ?? {}) as Record<string, unknown>;

  return {
    channels: {
      email: parseBool(channelsSource.email, defaults.channels.email),
      push: parseBool(channelsSource.push, defaults.channels.push),
      inApp: parseBool(channelsSource.inApp, defaults.channels.inApp),
    },
    types: {
      monthlyReport: parseBool(
        typesSource.monthlyReport,
        defaults.types.monthlyReport
      ),
      budgetAlerts: parseBool(
        typesSource.budgetAlerts,
        defaults.types.budgetAlerts
      ),
      aiAdvice: parseBool(typesSource.aiAdvice, defaults.types.aiAdvice),
      investmentUpdates: parseBool(
        typesSource.investmentUpdates,
        defaults.types.investmentUpdates
      ),
      recurringDeadlines: parseBool(
        typesSource.recurringDeadlines,
        defaults.types.recurringDeadlines
      ),
      goalsAchieved: parseBool(
        typesSource.goalsAchieved,
        defaults.types.goalsAchieved
      ),
      newFeatures: parseBool(
        typesSource.newFeatures,
        defaults.types.newFeatures
      ),
      promotions: parseBool(typesSource.promotions, defaults.types.promotions),
    },
    quietHours: {
      enabled: parseBool(quietSource.enabled, defaults.quietHours.enabled),
      from: parseTime(quietSource.from, defaults.quietHours.from),
      to: parseTime(quietSource.to, defaults.quietHours.to),
    },
  };
}
