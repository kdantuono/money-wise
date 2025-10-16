import { IsString, IsBoolean, IsOptional, IsNumber, Min } from 'class-validator';

/**
 * Monitoring and Metrics Configuration
 * Validates CloudWatch and application metrics settings
 */
export class MonitoringConfig {
  /**
   * Enable CloudWatch Metrics Integration
   * Default: false (disabled)
   * Set to true in staging/production if using AWS CloudWatch
   */
  @IsBoolean()
  @IsOptional()
  CLOUDWATCH_ENABLED?: boolean = false;

  /**
   * CloudWatch Metrics Namespace
   * Default: MoneyWise/Backend
   * Groups all metrics under this namespace in CloudWatch
   */
  @IsString()
  @IsOptional()
  CLOUDWATCH_NAMESPACE?: string = 'MoneyWise/Backend';

  /**
   * AWS Region for CloudWatch
   * Default: us-east-1
   * Must match your AWS deployment region
   */
  @IsString()
  @IsOptional()
  AWS_REGION?: string = 'us-east-1';

  /**
   * AWS Access Key ID (for CloudWatch authentication)
   * CRITICAL: Store in secrets manager in production
   * Prefer IAM roles over access keys when possible
   */
  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  /**
   * AWS Secret Access Key (for CloudWatch authentication)
   * CRITICAL: Store in secrets manager in production
   * Prefer IAM roles over access keys when possible
   */
  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  /**
   * Enable Application Metrics Collection
   * Default: true
   * Collects request counts, response times, error rates, etc.
   */
  @IsBoolean()
  @IsOptional()
  METRICS_ENABLED?: boolean = true;

  /**
   * Metrics Flush Interval (milliseconds)
   * Default: 30000 (30 seconds)
   * How often to batch and send metrics to CloudWatch
   */
  @IsNumber()
  @IsOptional()
  @Min(1000) // Minimum 1 second
  METRICS_FLUSH_INTERVAL?: number = 30000;

  /**
   * Enable Health Check Endpoints
   * Default: true
   * Exposes /health and /health/metrics endpoints
   */
  @IsBoolean()
  @IsOptional()
  HEALTH_CHECK_ENABLED?: boolean = true;

  /**
   * Check if CloudWatch is configured and enabled
   */
  isCloudWatchEnabled(): boolean {
    return this.CLOUDWATCH_ENABLED === true;
  }

  /**
   * Check if metrics collection is enabled
   */
  isMetricsEnabled(): boolean {
    return this.METRICS_ENABLED === true;
  }

  /**
   * Check if health checks are enabled
   */
  isHealthCheckEnabled(): boolean {
    return this.HEALTH_CHECK_ENABLED === true;
  }
}
