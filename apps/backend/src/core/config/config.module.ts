import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { plainToClass, Transform } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppConfig } from './app.config';
import { DatabaseConfig } from './database.config';

/**
 * Configuration validation function
 * Validates environment variables against configuration classes
 */
function validateConfig(config: Record<string, unknown>) {
  // Transform to configuration objects
  const appConfig = plainToClass(AppConfig, config, {
    enableImplicitConversion: true,
  });

  const databaseConfig = plainToClass(DatabaseConfig, config, {
    enableImplicitConversion: true,
  });

  // Validate app configuration
  const appErrors = validateSync(appConfig, {
    skipMissingProperties: false,
  });

  // Validate database configuration
  const dbErrors = validateSync(databaseConfig, {
    skipMissingProperties: false,
  });

  const allErrors = [...appErrors, ...dbErrors];

  if (allErrors.length > 0) {
    const errorMessages = allErrors
      .map((error) => Object.values(error.constraints || {}))
      .flat();

    throw new Error(`Configuration validation failed: ${errorMessages.join(', ')}`);
  }

  return {
    app: appConfig,
    database: databaseConfig,
  };
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