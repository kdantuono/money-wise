import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * Redis Configuration
 * Validates Redis connection settings for session storage and caching
 */
export class RedisConfig {
  /**
   * Redis Server Host
   * Development: localhost
   * Production: Managed Redis service (AWS ElastiCache, Redis Cloud, etc.)
   */
  @IsString()
  REDIS_HOST: string = 'localhost';

  /**
   * Redis Server Port
   * Default: 6379 (standard Redis port)
   */
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number = 6379;

  /**
   * Redis Password (optional for local dev, required for production)
   * CRITICAL: Always set in staging/production
   */
  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  /**
   * Redis Database Number (0-15)
   * Default: 0
   * Use different databases for different environments if needed
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(15)
  REDIS_DB?: number = 0;

  /**
   * Redis Connection URL (alternative to individual settings)
   * Format: redis://[[username]:[password]@][host][:port][/db-number]
   * If provided, overrides REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
   */
  @IsString()
  @IsOptional()
  REDIS_URL?: string;
}
