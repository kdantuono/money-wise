/**
 * Configuration Validator
 *
 * Validates environment configuration at application startup.
 * Provides detailed error messages for misconfiguration.
 */
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RootConfigSchema } from './config.schema';

export function validateConfig(config: Record<string, unknown>) {
  // Transform flat process.env to nested config object
  const configObject = transformToNested(config);

  // Validate against schema
  const validatedConfig = plainToInstance(RootConfigSchema, configObject, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false, // Allow extra env vars
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints)
          : [];
        const childErrors = error.children
          ? error.children.map((child) =>
              child.constraints ? Object.values(child.constraints) : [],
            )
          : [];

        return [...constraints, ...childErrors.flat()];
      })
      .flat()
      .join('\n  - ');

    throw new Error(
      `❌ Configuration Validation Failed:\n\n  - ${errorMessages}\n\nPlease check your .env file and ensure all required variables are set correctly.`,
    );
  }

  return configObject;
}

function transformToNested(env: Record<string, unknown>) {
  return {
    app: {
      NODE_ENV: env.NODE_ENV,
      PORT: parseInt(env.PORT as string, 10) || 3001,
      APP_NAME: env.APP_NAME,
      APP_VERSION: env.APP_VERSION || env.npm_package_version,
      API_PREFIX: env.API_PREFIX,
      CORS_ORIGIN: env.CORS_ORIGIN || 'http://localhost:3000',
    },
    database: {
      DB_HOST: env.DB_HOST,
      DB_PORT: parseInt(env.DB_PORT as string, 10) || 5432,
      DB_USERNAME: env.DB_USERNAME,
      DB_PASSWORD: env.DB_PASSWORD,
      DB_NAME: env.DB_NAME,
      DB_SCHEMA: env.DB_SCHEMA || 'public',
      DB_SYNCHRONIZE: env.DB_SYNCHRONIZE === 'true',
      DB_LOGGING: env.DB_LOGGING === 'true',
    },
    auth: {
      JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
      JWT_ACCESS_EXPIRES_IN: env.JWT_ACCESS_EXPIRES_IN || '15m',
      JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
      JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    redis: {
      REDIS_HOST: env.REDIS_HOST || 'localhost',
      REDIS_PORT: parseInt(env.REDIS_PORT as string, 10) || 6379,
      REDIS_PASSWORD: env.REDIS_PASSWORD,
      REDIS_DB: parseInt(env.REDIS_DB as string, 10) || 0,
    },
    monitoring: {
      sentry: {
        SENTRY_DSN: env.SENTRY_DSN,
        SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
        SENTRY_RELEASE: env.SENTRY_RELEASE,
      },
      cloudwatch: {
        CLOUDWATCH_ENABLED: env.CLOUDWATCH_ENABLED === 'true',
        CLOUDWATCH_NAMESPACE: env.CLOUDWATCH_NAMESPACE,
        AWS_REGION: env.AWS_REGION,
        AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
      },
      METRICS_ENABLED: env.METRICS_ENABLED !== 'false',
      METRICS_FLUSH_INTERVAL:
        parseInt(env.METRICS_FLUSH_INTERVAL as string, 10) ||
        (env.NODE_ENV === 'production' ? 60000 : 30000),
      HEALTH_CHECK_ENABLED: env.HEALTH_CHECK_ENABLED !== 'false',
    },
    timescaledb: {
      TIMESCALEDB_ENABLED: env.TIMESCALEDB_ENABLED === 'true',
      TIMESCALEDB_COMPRESSION_ENABLED:
        env.TIMESCALEDB_COMPRESSION_ENABLED === 'true',
      TIMESCALEDB_RETENTION_ENABLED:
        env.TIMESCALEDB_RETENTION_ENABLED === 'true',
      TIMESCALEDB_CHUNK_TIME_INTERVAL:
        env.TIMESCALEDB_CHUNK_TIME_INTERVAL || '1 day',
      TIMESCALEDB_COMPRESSION_AFTER:
        env.TIMESCALEDB_COMPRESSION_AFTER || '7 days',
      TIMESCALEDB_RETENTION_AFTER:
        env.TIMESCALEDB_RETENTION_AFTER || '7 years',
    },
  };
}
