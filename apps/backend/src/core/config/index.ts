/**
 * Configuration Module Exports
 *
 * Central export point for all configuration classes and utilities.
 */
export { ConfigModule } from './config.module';
export { validateConfig } from './config.validator';
export { RootConfigSchema } from './config.schema';

// Configuration Classes
export { AppConfig, Environment } from './app.config';
export { DatabaseConfig } from './database.config';
export { AuthConfig } from './auth.config';
export { RedisConfig } from './redis.config';
export {
  MonitoringConfig,
  SentryConfig,
  CloudWatchConfig,
} from './monitoring.config';
export { TimescaleDbConfig } from '../../config/timescaledb.config';

// Custom Validators
export { IsUniqueSecret, IsStrongPassword } from './validators';
