import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';

/**
 * CSRF Token Service
 *
 * Implements Double Submit Cookie pattern for CSRF protection.
 * Tokens are cryptographically signed to prevent tampering.
 *
 * **Security Design:**
 * - Tokens are random 32-byte values (256 bits of entropy)
 * - Signed with HMAC-SHA256 using secret key
 * - Include timestamp for expiration validation
 * - Format: `{randomToken}.{timestamp}.{signature}`
 *
 * **Token Lifecycle:**
 * - Generated on demand (stateless generation)
 * - Valid for 1 hour from creation (reduced from 24h for security)
 * - Single-use only (replay attacks prevented)
 * - Client must include in X-CSRF-Token header for state-changing requests
 *
 * **Usage:**
 * ```typescript
 * const token = this.csrfService.generateToken();
 * const isValid = await this.csrfService.validateToken(token);
 * ```
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
 */
@Injectable()
export class CsrfService {
  private readonly logger = new Logger(CsrfService.name);
  private readonly csrfSecret: string;
  private readonly tokenExpirationMs: number = 60 * 60 * 1000; // 1 hour (reduced from 24h for security)

  // SECURITY: Track used tokens to prevent replay attacks
  private readonly usedTokens = new Set<string>();
  private readonly maxUsedTokensCache = 10000; // Prevent memory leak

  // SECURITY: Rate limiting to prevent brute force attacks
  private readonly validationAttempts = new Map<string, { count: number; resetTime: number }>();
  private readonly maxValidationAttempts = 10;
  private readonly rateLimitWindowMs = 60 * 1000; // 1 minute

  constructor(private readonly configService: ConfigService) {
    // Get CSRF secret from environment
    this.csrfSecret = this.configService.get<string>('CSRF_SECRET') ||
                     this.configService.get<string>('SESSION_SECRET') ||
                     'fallback-csrf-secret-change-in-production';

    if (this.csrfSecret === 'fallback-csrf-secret-change-in-production') {
      this.logger.warn(
        '⚠️  CSRF_SECRET not configured - using fallback (INSECURE for production!)',
      );
    }
  }

  /**
   * Generate a new CSRF token
   *
   * Token format: `{randomToken}.{timestamp}.{signature}`
   * - randomToken: 32 random bytes (hex encoded) = 64 characters
   * - timestamp: Unix timestamp in milliseconds
   * - signature: HMAC-SHA256 of randomToken + timestamp
   *
   * @returns Signed CSRF token string
   *
   * @example
   * ```typescript
   * const token = csrfService.generateToken();
   * // Returns: "a1b2c3d4...e5f6.1698765432000.9f8e7d6c..."
   * ```
   */
  generateToken(): string {
    try {
      // Generate cryptographically secure random token
      const randomToken = randomBytes(32).toString('hex'); // 64 hex characters

      // Current timestamp for expiration tracking
      const timestamp = Date.now().toString();

      // Create signature: HMAC-SHA256(randomToken + timestamp)
      const signature = this.createSignature(randomToken, timestamp);

      // Combine into final token
      const csrfToken = `${randomToken}.${timestamp}.${signature}`;

      this.logger.debug(`Generated CSRF token (expires in 1h)`);

      return csrfToken;
    } catch (error) {
      this.logger.error('Failed to generate CSRF token:', error);
      throw new Error('CSRF token generation failed');
    }
  }

  /**
   * Validate a CSRF token
   *
   * **Security Checks:**
   * 1. Rate limiting (max 10 attempts per minute per client)
   * 2. Token format is correct (3 parts separated by dots)
   * 3. Token has not been used before (single-use enforcement)
   * 4. Token has not expired (1 hour lifetime)
   * 5. Signature is valid (prevents tampering)
   *
   * **NOTE:** Tokens are marked as used ONLY if all validation passes.
   * This prevents consuming tokens on failed validation attempts.
   *
   * @param token - The CSRF token to validate
   * @param clientId - Optional client identifier for rate limiting (defaults to token hash)
   * @returns true if token is valid, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = await csrfService.validateToken(token, req.sessionID);
   * if (!isValid) {
   *   throw new ForbiddenException('Invalid CSRF token');
   * }
   * ```
   */
  async validateToken(token: string, clientId?: string): Promise<boolean> {
    try {
      if (!token || typeof token !== 'string') {
        this.logger.warn('Invalid token format: token is null or not a string');
        return false;
      }

      // SECURITY 1: Rate Limiting
      const rateLimitId = clientId || this.hashToken(token);
      if (!this.checkRateLimit(rateLimitId)) {
        this.logger.warn(`Rate limit exceeded for client: ${rateLimitId.substring(0, 8)}...`);
        return false;
      }

      // SECURITY 2: Single-use enforcement (check BEFORE validation)
      if (this.usedTokens.has(token)) {
        this.logger.warn('Token reuse attempt detected - token already consumed');
        return false;
      }

      // Parse token components
      const parts = token.split('.');

      if (parts.length !== 3) {
        this.logger.warn(`Invalid token format: expected 3 parts, got ${parts.length}`);
        return false;
      }

      const [randomToken, timestamp, providedSignature] = parts;

      // Validate timestamp format
      const timestampNum = parseInt(timestamp, 10);
      if (isNaN(timestampNum)) {
        this.logger.warn('Invalid token format: timestamp is not a number');
        return false;
      }

      // Check expiration (1 hour)
      const tokenAge = Date.now() - timestampNum;
      if (tokenAge > this.tokenExpirationMs) {
        this.logger.warn(
          `Token expired: age ${Math.round(tokenAge / 1000 / 60)} minutes (max 60 minutes)`,
        );
        return false;
      }

      if (tokenAge < 0) {
        this.logger.warn('Token from the future detected (possible clock skew or tampering)');
        return false;
      }

      // Verify signature
      const expectedSignature = this.createSignature(randomToken, timestamp);

      // Constant-time comparison to prevent timing attacks
      const isSignatureValid = this.constantTimeCompare(
        providedSignature,
        expectedSignature,
      );

      if (!isSignatureValid) {
        this.logger.warn('Invalid token signature (possible tampering detected)');
        return false;
      }

      // SECURITY 3: Mark token as used (single-use enforcement)
      this.usedTokens.add(token);

      // SECURITY 4: Cleanup to prevent memory leak
      if (this.usedTokens.size > this.maxUsedTokensCache) {
        this.logger.warn(
          `CSRF token cache exceeded ${this.maxUsedTokensCache} entries, clearing oldest entries`,
        );
        this.cleanupUsedTokens();
      }

      this.logger.debug('CSRF token validated successfully and marked as used');
      return true;
    } catch (error) {
      this.logger.error('Error validating CSRF token:', error);
      return false;
    }
  }

  /**
   * Create HMAC-SHA256 signature for token
   *
   * @private
   * @param randomToken - Random token component
   * @param timestamp - Timestamp component
   * @returns HMAC signature (hex encoded)
   */
  private createSignature(randomToken: string, timestamp: string): string {
    const hmac = createHmac('sha256', this.csrfSecret);
    hmac.update(`${randomToken}.${timestamp}`);
    return hmac.digest('hex');
  }

  /**
   * Constant-time string comparison
   *
   * Prevents timing attacks by ensuring comparison always takes the same time
   * regardless of where strings differ.
   *
   * @private
   * @param a - First string
   * @param b - Second string
   * @returns true if strings are equal
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Check rate limit for token validation attempts
   *
   * Prevents brute-force attacks by limiting validation attempts.
   * Allows max 10 attempts per minute per client.
   *
   * @private
   * @param clientId - Client identifier for rate limiting
   * @returns true if under rate limit, false if exceeded
   */
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const attempts = this.validationAttempts.get(clientId);

    if (!attempts || now > attempts.resetTime) {
      // First attempt or window expired - create new window
      this.validationAttempts.set(clientId, {
        count: 1,
        resetTime: now + this.rateLimitWindowMs,
      });
      return true;
    }

    if (attempts.count >= this.maxValidationAttempts) {
      // Rate limit exceeded
      return false;
    }

    // Increment counter
    attempts.count++;
    return true;
  }

  /**
   * Create SHA-256 hash of token for rate limiting identification
   *
   * @private
   * @param token - Token to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private hashToken(token: string): string {
    const hash = createHmac('sha256', this.csrfSecret);
    hash.update(token);
    return hash.digest('hex');
  }

  /**
   * Clean up used tokens cache to prevent memory leak
   *
   * Removes half of the oldest tokens when cache limit is reached.
   * Uses Set iteration order (insertion order) to remove oldest entries.
   *
   * @private
   */
  private cleanupUsedTokens(): void {
    const tokensToRemove = Math.floor(this.usedTokens.size / 2);
    let removed = 0;

    for (const token of this.usedTokens) {
      if (removed >= tokensToRemove) break;
      this.usedTokens.delete(token);
      removed++;
    }

    this.logger.debug(`Cleaned up ${removed} used tokens from cache`);
  }
}
