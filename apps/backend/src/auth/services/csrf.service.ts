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
 * - Generated on demand (stateless - no server-side storage)
 * - Valid for 24 hours from creation
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
  private readonly tokenExpirationMs: number = 24 * 60 * 60 * 1000; // 24 hours

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

      this.logger.debug(`Generated CSRF token (expires in 24h)`);

      return csrfToken;
    } catch (error) {
      this.logger.error('Failed to generate CSRF token:', error);
      throw new Error('CSRF token generation failed');
    }
  }

  /**
   * Validate a CSRF token
   *
   * Checks:
   * 1. Token format is correct (3 parts separated by dots)
   * 2. Signature is valid (prevents tampering)
   * 3. Token has not expired (24 hour lifetime)
   *
   * @param token - The CSRF token to validate
   * @returns true if token is valid, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = await csrfService.validateToken(token);
   * if (!isValid) {
   *   throw new ForbiddenException('Invalid CSRF token');
   * }
   * ```
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      if (!token || typeof token !== 'string') {
        this.logger.warn('Invalid token format: token is null or not a string');
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

      // Check expiration (24 hours)
      const tokenAge = Date.now() - timestampNum;
      if (tokenAge > this.tokenExpirationMs) {
        this.logger.warn(
          `Token expired: age ${Math.round(tokenAge / 1000 / 60)} minutes (max 1440 minutes)`,
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

      this.logger.debug('CSRF token validated successfully');
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
}
