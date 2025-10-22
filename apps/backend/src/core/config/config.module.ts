/**
 * Configuration Module
 *
 * Provides type-safe, validated configuration access across the application.
 * Uses NestJS ConfigModule with class-validator for fail-fast validation.
 *
 * Configuration Domains:
 * - app: Application settings (NODE_ENV, PORT, CORS)
 * - database: PostgreSQL/TimescaleDB connection
 * - auth: JWT authentication secrets
 * - redis: Redis connection for sessions/cache
 * - sentry: Sentry error tracking
 * - monitoring: CloudWatch metrics and monitoring
 * - emailVerification: Email verification security and rate limiting
 */
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppConfig } from './app.config';
import { DatabaseConfig } from './database.config';
import { AuthConfig } from './auth.config';
import { RedisConfig } from './redis.config';
import { SentryConfig } from './sentry.config';
import { MonitoringConfig } from './monitoring.config';
import { EmailVerificationConfig } from './email-verification.config';
import { formatValidationErrors } from './utils/format-validation-errors';

/**
 * Configuration validation function
 * Validates environment variables against configuration classes
 * Enhanced with detailed error messages and security hardening
 */
function validateConfig(config: Record<string, unknown>) {
  // Transform to configuration objects with implicit conversion
  const configs = {
    app: plainToInstance(AppConfig, config, { enableImplicitConversion: true }),
    database: plainToInstance(DatabaseConfig, config, { enableImplicitConversion: true }),
    auth: plainToInstance(AuthConfig, config, { enableImplicitConversion: true }),
    redis: plainToInstance(RedisConfig, config, { enableImplicitConversion: true }),
    sentry: plainToInstance(SentryConfig, config, { enableImplicitConversion: true }),
    monitoring: plainToInstance(MonitoringConfig, config, { enableImplicitConversion: true }),
    emailVerification: plainToInstance(EmailVerificationConfig, config, { enableImplicitConversion: true }),
  };

  // Validate all configurations with security hardening
  const allErrors = Object.entries(configs).flatMap(([name, configObject]) => {
    const errors = validateSync(configObject, {
      skipMissingProperties: false,
      whitelist: true,
      forbidNonWhitelisted: false, // Allow unknown env vars (npm, system vars, etc.)
    });

    // Prefix errors with config domain name for clarity
    return errors.map((error) => ({
      ...error,
      property: `${name}.${error.property}`,
    }));
  });

  if (allErrors.length > 0) {
    throw new Error(formatValidationErrors(allErrors));
  }

  return configs;
}

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local', // Local overrides (gitignored)
        `.env.${process.env.NODE_ENV}`, // Environment-specific
        '.env', // Default
      ],
      validate: validateConfig,
      validationOptions: {
        abortEarly: false, // Show all validation errors
      },
      cache: true,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
