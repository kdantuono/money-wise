/**
 * Monitoring Configuration
 *
 * Error tracking (Sentry) and metrics (CloudWatch) configuration.
 * Includes environment-aware defaults for sampling rates.
 */
import { registerAs } from '@nestjs/config';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
  ValidateIf,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SentryConfig {
  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsString()
  @IsOptional()
  SENTRY_ENVIRONMENT?: string;

  @IsString()
  @IsOptional()
  SENTRY_RELEASE?: string;
}

export class CloudWatchConfig {
  @IsBoolean()
  @IsOptional()
  CLOUDWATCH_ENABLED?: boolean = false;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true, {
    message: 'CLOUDWATCH_NAMESPACE is required when CloudWatch is enabled',
  })
  CLOUDWATCH_NAMESPACE?: string;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true, {
    message: 'AWS_REGION is required when CloudWatch is enabled',
  })
  AWS_REGION?: string;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true, {
    message: 'AWS_ACCESS_KEY_ID is required when CloudWatch is enabled',
  })
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true, {
    message: 'AWS_SECRET_ACCESS_KEY is required when CloudWatch is enabled',
  })
  AWS_SECRET_ACCESS_KEY?: string;
}

export class MonitoringConfig {
  @ValidateNested()
  @Type(() => SentryConfig)
  sentry: SentryConfig;

  @ValidateNested()
  @Type(() => CloudWatchConfig)
  cloudwatch: CloudWatchConfig;

  @IsBoolean()
  @IsOptional()
  METRICS_ENABLED?: boolean = true;

  @IsNumber()
  @Min(1000, { message: 'METRICS_FLUSH_INTERVAL must be at least 1000ms' })
  @IsOptional()
  METRICS_FLUSH_INTERVAL?: number;

  @IsBoolean()
  @IsOptional()
  HEALTH_CHECK_ENABLED?: boolean = true;
}

export default registerAs('monitoring', () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    sentry: {
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    },
    cloudwatch: {
      CLOUDWATCH_ENABLED: process.env.CLOUDWATCH_ENABLED === 'true',
      CLOUDWATCH_NAMESPACE: process.env.CLOUDWATCH_NAMESPACE,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    },
    METRICS_ENABLED: process.env.METRICS_ENABLED !== 'false',
    METRICS_FLUSH_INTERVAL:
      parseInt(process.env.METRICS_FLUSH_INTERVAL, 10) ||
      (isProduction ? 60000 : 30000),
    HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED !== 'false',
  };
});
