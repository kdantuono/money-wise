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
 * Validated environment configuration
 * Throws error at build time if validation fails
 */
export const env = envSchema.parse({
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
  EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_SENTRY_RELEASE: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
  EXPO_PUBLIC_ANALYTICS_ENABLED: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED,
});

/**
 * Helper function to check if analytics is enabled
 */
export const isAnalyticsEnabled = () => env.EXPO_PUBLIC_ANALYTICS_ENABLED;
