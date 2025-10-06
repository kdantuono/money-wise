import { IsString, IsOptional, MinLength } from 'class-validator';

/**
 * JWT Authentication Configuration
 * Validates JWT secret keys and token expiration settings
 */
export class AuthConfig {
  /**
   * JWT Access Token Secret
   * CRITICAL: Must be at least 32 characters for security
   * IMPORTANT: Rotate regularly in production
   */
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET: string;

  /**
   * JWT Access Token Expiration
   * Default: 15m (15 minutes)
   * Format: https://github.com/vercel/ms
   */
  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string = '15m';

  /**
   * JWT Refresh Token Secret
   * CRITICAL: Must be at least 32 characters for security
   * IMPORTANT: Must be DIFFERENT from access secret
   * IMPORTANT: Rotate regularly in production
   */
  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET: string;

  /**
   * JWT Refresh Token Expiration
   * Default: 7d (7 days)
   * Format: https://github.com/vercel/ms
   */
  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';
}
