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
 * - monitoring: Sentry + CloudWatch monitoring
 * - timescaledb: TimescaleDB-specific settings
 */
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateConfig } from './config.validator';
import appConfig from './app.config';
import databaseConfig from './database.config';
import authConfig from './auth.config';
import redisConfig from './redis.config';
import monitoringConfig from './monitoring.config';
import timescaledbConfig from '../../config/timescaledb.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local', // Local overrides (gitignored)
        `.env.${process.env.NODE_ENV}`, // Environment-specific
        '.env', // Default
      ],
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        redisConfig,
        monitoringConfig,
        timescaledbConfig,
      ],
      validate: validateConfig,
      validationOptions: {
        abortEarly: false, // Show all validation errors
        forbidUnknownValues: false, // Allow extra env vars
      },
      cache: true,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}