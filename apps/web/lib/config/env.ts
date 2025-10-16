/**
 * Frontend Environment Configuration
 *
 * Type-safe environment variable validation using Zod.
 * Validates at build time to prevent deployment with invalid configuration.
 *
 * Usage:
 * ```typescript
 * import { env } from '@/config/env';
 *
 * const apiUrl = env.NEXT_PUBLIC_API_URL; // Type-safe, validated
 * ```
 */
import { z } from 'zod';

const envSchema = z.object({
  // Application Configuration
  NEXT_PUBLIC_APP_NAME: z.string().default('MoneyWise'),

  NEXT_PUBLIC_APP_VERSION: z.string().optional(),

  NEXT_PUBLIC_API_URL: z.string().url({
    message: 'NEXT_PUBLIC_API_URL must be a valid URL',
  }),

  // Sentry Error Tracking
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),

  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z
    .enum(['development', 'staging', 'production'])
    .optional()
    .default('development'),

  NEXT_PUBLIC_SENTRY_RELEASE: z.string().optional(),

  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(0).max(1).optional())
    .optional(),

  NEXT_PUBLIC_SENTRY_DEBUG: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  // Analytics Configuration
  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  // Server-side Sentry (for source map upload)
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_ENVIRONMENT: z
    .enum(['development', 'staging', 'production'])
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment configuration
 * Throws error at build time if validation fails
 */
export const env = envSchema.parse({
  // Application
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,

  // Sentry (client-side)
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  NEXT_PUBLIC_SENTRY_DEBUG: process.env.NEXT_PUBLIC_SENTRY_DEBUG,

  // Analytics
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,

  // Sentry (server-side)
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  SENTRY_RELEASE: process.env.SENTRY_RELEASE,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
});

/**
 * Helper function to check if we're in development
 */
export const isDevelopment = () =>
  env.NEXT_PUBLIC_SENTRY_ENVIRONMENT === 'development';

/**
 * Helper function to check if we're in production
 */
export const isProduction = () =>
  env.NEXT_PUBLIC_SENTRY_ENVIRONMENT === 'production';

/**
 * Helper function to check if analytics is enabled
 */
export const isAnalyticsEnabled = () => env.NEXT_PUBLIC_ANALYTICS_ENABLED;
