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

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseTime(value: unknown, fallback: string): string {
  return typeof value === 'string' && TIME_REGEX.test(value) ? value : fallback;
}

// Use own-property checks to avoid prototype-pollution influencing parsing.
function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getOwn(obj: Record<string, unknown>, key: string): unknown {
  return hasOwn(obj, key) ? obj[key] : undefined;
}

function asOwnObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
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

  // Detect legacy flat shape: has any documented legacy top-level key, no `channels` nested
  const isLegacyFlat =
    !hasOwn(source, 'channels') &&
    (hasOwn(source, 'email') ||
      hasOwn(source, 'push') ||
      hasOwn(source, 'categories') ||
      hasOwn(source, 'budgets'));

  if (isLegacyFlat) {
    return {
      channels: {
        email: parseBool(getOwn(source, 'email'), defaults.channels.email),
        push: parseBool(getOwn(source, 'push'), defaults.channels.push),
        inApp: defaults.channels.inApp,
      },
      types: {
        ...defaults.types,
        // map legacy `budgets` → budgetAlerts
        budgetAlerts: parseBool(
          getOwn(source, 'budgets'),
          defaults.types.budgetAlerts
        ),
      },
      quietHours: defaults.quietHours,
    };
  }

  const channelsSource = asOwnObject(getOwn(source, 'channels'));
  const typesSource = asOwnObject(getOwn(source, 'types'));
  const quietSource = asOwnObject(getOwn(source, 'quietHours'));

  return {
    channels: {
      email: parseBool(
        getOwn(channelsSource, 'email'),
        defaults.channels.email
      ),
      push: parseBool(getOwn(channelsSource, 'push'), defaults.channels.push),
      inApp: parseBool(
        getOwn(channelsSource, 'inApp'),
        defaults.channels.inApp
      ),
    },
    types: {
      monthlyReport: parseBool(
        getOwn(typesSource, 'monthlyReport'),
        defaults.types.monthlyReport
      ),
      budgetAlerts: parseBool(
        getOwn(typesSource, 'budgetAlerts'),
        defaults.types.budgetAlerts
      ),
      aiAdvice: parseBool(
        getOwn(typesSource, 'aiAdvice'),
        defaults.types.aiAdvice
      ),
      investmentUpdates: parseBool(
        getOwn(typesSource, 'investmentUpdates'),
        defaults.types.investmentUpdates
      ),
      recurringDeadlines: parseBool(
        getOwn(typesSource, 'recurringDeadlines'),
        defaults.types.recurringDeadlines
      ),
      goalsAchieved: parseBool(
        getOwn(typesSource, 'goalsAchieved'),
        defaults.types.goalsAchieved
      ),
      newFeatures: parseBool(
        getOwn(typesSource, 'newFeatures'),
        defaults.types.newFeatures
      ),
      promotions: parseBool(
        getOwn(typesSource, 'promotions'),
        defaults.types.promotions
      ),
    },
    quietHours: {
      enabled: parseBool(
        getOwn(quietSource, 'enabled'),
        defaults.quietHours.enabled
      ),
      from: parseTime(getOwn(quietSource, 'from'), defaults.quietHours.from),
      to: parseTime(getOwn(quietSource, 'to'), defaults.quietHours.to),
    },
  };
}
