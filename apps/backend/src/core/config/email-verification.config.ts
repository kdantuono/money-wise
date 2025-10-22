import { IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * Email Verification Configuration
 * Manages all configurable parameters for email verification and security hardening
 *
 * Environment Variables:
 * - EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: Token validity period (default: 24)
 * - EMAIL_VERIFICATION_MIN_VALIDITY_HOURS: Minimum token validity after generation (default: 1)
 * - EMAIL_VERIFICATION_RESEND_RATE_LIMIT: Max resend attempts per hour (default: 3)
 * - EMAIL_VERIFICATION_VERIFICATION_RATE_LIMIT: Max verification attempts per token per hour (default: 5)
 * - EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MIN_MS: Minimum artificial delay in ms (default: 100)
 * - EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MAX_MS: Maximum artificial delay in ms (default: 300)
 */
export class EmailVerificationConfig {
  /**
   * Email Verification Token Expiry (in hours)
   * How long a verification token remains valid after generation
   * Default: 24 hours
   * Recommended Range: 1-72 hours
   */
  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS must be at least 1' })
  @Max(720, { message: 'EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS must not exceed 720 (30 days)' })
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: number = 24;

  /**
   * Minimum Token Validity (in hours)
   * Minimum time token must remain valid after generation
   * Used to prevent tokens from expiring too quickly
   * Default: 1 hour
   * Recommended Range: 0.5-2 hours
   */
  @IsNumber()
  @IsOptional()
  @Min(0.5, { message: 'EMAIL_VERIFICATION_MIN_VALIDITY_HOURS must be at least 0.5' })
  @Max(24, { message: 'EMAIL_VERIFICATION_MIN_VALIDITY_HOURS must not exceed 24' })
  EMAIL_VERIFICATION_MIN_VALIDITY_HOURS: number = 1;

  /**
   * Resend Rate Limit (attempts per hour)
   * Maximum number of times user can request a new verification email per hour
   * Default: 3 attempts per hour
   * Range: 1-10 attempts
   * Security: Prevents email spam while allowing legitimate retries
   */
  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'EMAIL_VERIFICATION_RESEND_RATE_LIMIT must be at least 1' })
  @Max(10, { message: 'EMAIL_VERIFICATION_RESEND_RATE_LIMIT must not exceed 10' })
  EMAIL_VERIFICATION_RESEND_RATE_LIMIT: number = 3;

  /**
   * Verification Rate Limit (attempts per token per hour)
   * Maximum number of times user can attempt to verify a token per hour
   * Default: 5 attempts per hour
   * Range: 1-10 attempts
   * Security: Prevents brute force attacks on token guessing
   * Note: Attacker needs (32^64 / 5) = 3.7e97 hours per token to guess it
   */
  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'EMAIL_VERIFICATION_VERIFICATION_RATE_LIMIT must be at least 1' })
  @Max(100, { message: 'EMAIL_VERIFICATION_VERIFICATION_RATE_LIMIT must not exceed 100' })
  EMAIL_VERIFICATION_VERIFICATION_RATE_LIMIT: number = 5;

  /**
   * Timing Attack Prevention - Minimum Delay (milliseconds)
   * Minimum artificial delay added to error responses
   * Prevents timing attacks that leak information about token validity
   * Default: 100ms
   * Range: 50-500ms
   */
  @IsNumber()
  @IsOptional()
  @Min(50, { message: 'EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MIN_MS must be at least 50' })
  @Max(500, { message: 'EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MIN_MS must not exceed 500' })
  EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MIN_MS: number = 100;

  /**
   * Timing Attack Prevention - Maximum Delay (milliseconds)
   * Maximum artificial delay added to error responses
   * Creates randomized delay to prevent timing analysis
   * Default: 300ms
   * Range: 100-1000ms
   * Constraint: Must be >= EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MIN_MS
   */
  @IsNumber()
  @IsOptional()
  @Min(100, { message: 'EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MAX_MS must be at least 100' })
  @Max(1000, { message: 'EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MAX_MS must not exceed 1000' })
  EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MAX_MS: number = 300;

  /**
   * Computed values (read-only after initialization)
   */
  readonly TOKEN_EXPIRY_MS: number;
  readonly TOKEN_EXPIRY_SECONDS: number;
  readonly MIN_TOKEN_VALIDITY_MS: number;
  readonly RATE_LIMIT_WINDOW_SECONDS: number = 3600; // Always 1 hour

  constructor(config: Partial<EmailVerificationConfig> = {}) {
    // Apply provided config
    Object.assign(this, config);

    // Compute derived values
    this.TOKEN_EXPIRY_SECONDS = this.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60;
    this.TOKEN_EXPIRY_MS = this.TOKEN_EXPIRY_SECONDS * 1000;
    this.MIN_TOKEN_VALIDITY_MS = this.EMAIL_VERIFICATION_MIN_VALIDITY_HOURS * 60 * 60 * 1000;
  }
}
