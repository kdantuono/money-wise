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

/**
 * Configuration validation function
 * Validates environment variables against configuration classes
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
  };

  // Validate all configurations
  const allErrors = Object.entries(configs).flatMap(([name, configObject]) => {
    const errors = validateSync(configObject, { skipMissingProperties: false });
    return errors.map((error) => ({
      config: name,
      constraints: error.constraints || {},
      property: error.property,
    }));
  });

  if (allErrors.length > 0) {
    const errorMessages = allErrors.map(
      (error) =>
        `[${error.config}.${error.property}] ${Object.values(error.constraints).join(', ')}`,
    );

    throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
  }

  return configs;
}

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateConfig,
      cache: true,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}