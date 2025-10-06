/**
 * Mobile App Environment Configuration
 *
 * Type-safe environment variable validation using Zod.
 * Validates at build time for Expo/React Native.
 *
 * Usage:
 * ```typescript
 * import { env } from '@/config/env';
 *
 * const apiUrl = env.EXPO_PUBLIC_API_URL; // Type-safe, validated
 * ```
 */
import { z } from 'zod';
import Constants from 'expo-constants';

const envSchema = z.object({
  // Application Configuration
  EXPO_PUBLIC_APP_NAME: z.string().default('MoneyWise Mobile'),

  EXPO_PUBLIC_APP_VERSION: z.string().optional(),

  EXPO_PUBLIC_API_URL: z.string().url({
    message: 'EXPO_PUBLIC_API_URL must be a valid URL',
  }),

  // Sentry Error Tracking
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),

  EXPO_PUBLIC_SENTRY_RELEASE: z.string().optional(),

  // Analytics Configuration
  EXPO_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Get environment variable from Expo Constants
 * Expo automatically exposes EXPO_PUBLIC_* variables through Constants.expoConfig.extra
 */
const getEnvVar = (key: string): string | undefined => {
  // In Expo, EXPO_PUBLIC_* variables are available through Constants
  return Constants.expoConfig?.extra?.[key];
};

/**
 * Validated environment configuration
 * Throws error at build time if validation fails
 */
export const env = envSchema.parse({
  EXPO_PUBLIC_APP_NAME: getEnvVar('EXPO_PUBLIC_APP_NAME'),
  EXPO_PUBLIC_APP_VERSION: getEnvVar('EXPO_PUBLIC_APP_VERSION'),
  EXPO_PUBLIC_API_URL: getEnvVar('EXPO_PUBLIC_API_URL'),
  EXPO_PUBLIC_SENTRY_DSN: getEnvVar('EXPO_PUBLIC_SENTRY_DSN'),
  EXPO_PUBLIC_SENTRY_RELEASE: getEnvVar('EXPO_PUBLIC_SENTRY_RELEASE'),
  EXPO_PUBLIC_ANALYTICS_ENABLED: getEnvVar('EXPO_PUBLIC_ANALYTICS_ENABLED'),
});

/**
 * Helper function to check if analytics is enabled
 */
export const isAnalyticsEnabled = () => env.EXPO_PUBLIC_ANALYTICS_ENABLED;
