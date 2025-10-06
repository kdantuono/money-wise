/**
 * Root Configuration Schema
 *
 * Validates all configuration domains at application startup.
 * Provides fail-fast behavior to prevent misconfiguration.
 */
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppConfig } from './app.config';
import { DatabaseConfig } from './database.config';
import { AuthConfig } from './auth.config';
import { RedisConfig } from './redis.config';
import { MonitoringConfig } from './monitoring.config';
import { TimescaleDbConfig } from '../../config/timescaledb.config';

export class RootConfigSchema {
  @ValidateNested()
  @Type(() => AppConfig)
  app: AppConfig;

  @ValidateNested()
  @Type(() => DatabaseConfig)
  database: DatabaseConfig;

  @ValidateNested()
  @Type(() => AuthConfig)
  auth: AuthConfig;

  @ValidateNested()
  @Type(() => RedisConfig)
  redis: RedisConfig;

  @ValidateNested()
  @Type(() => MonitoringConfig)
  monitoring: MonitoringConfig;

  @ValidateNested()
  @Type(() => TimescaleDbConfig)
  timescaledb: TimescaleDbConfig;
}
