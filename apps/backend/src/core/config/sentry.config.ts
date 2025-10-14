import { IsString, IsOptional, IsUrl, Min, Max, IsNumber, ValidateIf } from 'class-validator';

/**
 * Sentry Error Tracking Configuration
 * Validates Sentry DSN and monitoring settings
 */
export class SentryConfig {
  /**
   * Sentry DSN (Data Source Name)
   * Get from: https://sentry.io/settings/projects/
   * IMPORTANT: Use separate projects for each environment
   * - Development: moneywise-development
   * - Staging: moneywise-staging
   * - Production: moneywise-production
   * If empty, Sentry is disabled
   */
  @ValidateIf((o) => o.SENTRY_DSN && o.SENTRY_DSN.length > 0)
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
    },
    {
      message: 'SENTRY_DSN must be a valid HTTPS URL or empty to disable Sentry',
    }
  )
  @IsOptional()
  SENTRY_DSN?: string;

  /**
   * Sentry Environment Name
   * Must match NODE_ENV or be explicitly set
   * Values: development, staging, production
   */
  @IsString()
  @IsOptional()
  SENTRY_ENVIRONMENT?: string;

  /**
   * Sentry Release Version
   * Usually set by CI/CD (Git SHA or semantic version tag)
   * Format: git SHA (e.g., a3f2d1b) or semver (e.g., v1.2.3)
   */
  @IsString()
  @IsOptional()
  SENTRY_RELEASE?: string;

  /**
   * Sentry Traces Sample Rate (0.0 - 1.0)
   * Production: 0.1 (10%)
   * Staging: 0.5 (50%)
   * Development: 1.0 (100%)
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  SENTRY_TRACES_SAMPLE_RATE?: number;

  /**
   * Sentry Profiles Sample Rate (0.0 - 1.0)
   * Production: 0.1 (10%)
   * Staging: 0.2 (20%)
   * Development: 0.0 (disabled - overhead)
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  SENTRY_PROFILES_SAMPLE_RATE?: number;

  /**
   * Get environment-specific sampling rates based on SENTRY_ENVIRONMENT
   */
  getSamplingRates(): { traces: number; profiles: number } {
    const environment = this.SENTRY_ENVIRONMENT?.toLowerCase() || 'development';

    switch (environment) {
      case 'production':
        return {
          traces: this.SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
          profiles: this.SENTRY_PROFILES_SAMPLE_RATE ?? 0.1,
        };
      case 'staging':
        return {
          traces: this.SENTRY_TRACES_SAMPLE_RATE ?? 0.5,
          profiles: this.SENTRY_PROFILES_SAMPLE_RATE ?? 0.2,
        };
      case 'development':
      default:
        return {
          traces: this.SENTRY_TRACES_SAMPLE_RATE ?? 1.0,
          profiles: this.SENTRY_PROFILES_SAMPLE_RATE ?? 0.0,
        };
    }
  }

  /**
   * Check if Sentry is enabled (DSN is provided)
   */
  isEnabled(): boolean {
    return !!this.SENTRY_DSN && this.SENTRY_DSN.length > 0;
  }
}
