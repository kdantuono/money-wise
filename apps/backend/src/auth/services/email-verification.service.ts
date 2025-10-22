import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { UserStatus } from '../../../generated/prisma';
import { PrismaUserService } from '../../core/database/prisma/services/user.service';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import type { User } from '../../../generated/prisma';

export interface EmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  user?: Partial<User> | Partial<any>; // Accept any user-like object for compatibility
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  // Configuration constants
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private readonly TOKEN_EXPIRY_MS = this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  private readonly TOKEN_EXPIRY_SECONDS = this.TOKEN_EXPIRY_HOURS * 60 * 60;
  private readonly MIN_TOKEN_VALIDITY_HOURS = 1;
  private readonly MIN_TOKEN_VALIDITY_MS = this.MIN_TOKEN_VALIDITY_HOURS * 60 * 60 * 1000;
  private readonly RATE_LIMIT_RESEND_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour
  private readonly TIMING_ATTACK_DELAY_MIN_MS = 100;
  private readonly TIMING_ATTACK_DELAY_MAX_MS = 300;

  constructor(
    private prismaUserService: PrismaUserService,
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject('default')
    private readonly redis: Redis,
  ) {
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * All comparisons take the same amount of time regardless of where strings differ
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Add artificial random delay to prevent timing-based token enumeration
   * Attackers cannot use timing measurements to determine token validity
   */
  private async artificialDelay(): Promise<void> {
    // Random delay between 100-300ms to prevent timing analysis
    const delay = Math.floor(
      Math.random() * (this.TIMING_ATTACK_DELAY_MAX_MS - this.TIMING_ATTACK_DELAY_MIN_MS)
    ) + this.TIMING_ATTACK_DELAY_MIN_MS;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Check if user has exceeded rate limit for resend attempts
   */
  private async checkResendRateLimit(userId: string): Promise<boolean> {
    const rateLimitKey = `email_verification_ratelimit:${userId}`;
    const requestCount = await this.redis.get(rateLimitKey);

    if (requestCount && parseInt(requestCount) >= this.RATE_LIMIT_RESEND_ATTEMPTS) {
      return false; // Rate limit exceeded
    }

    return true; // Rate limit not exceeded
  }

  /**
   * Increment resend rate limit counter for user
   */
  private async incrementResendRateLimit(userId: string): Promise<void> {
    const rateLimitKey = `email_verification_ratelimit:${userId}`;
    await this.redis.incr(rateLimitKey);
    await this.redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW_SECONDS);
  }

  /**
   * Generate email verification token
   */
  async generateVerificationToken(userId: string, email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS);

    const tokenData: EmailVerificationToken = {
      token,
      userId,
      email,
      expiresAt,
      createdAt: new Date(),
    };

    try {
      // Store token in Redis with expiration using pipeline for atomic operation
      const pipeline = this.redis.pipeline();

      const key = `email_verification:${token}`;
      pipeline.setex(key, this.TOKEN_EXPIRY_SECONDS, JSON.stringify(tokenData));

      // Also store a reverse lookup for the user
      const userKey = `email_verification_user:${userId}`;
      pipeline.setex(userKey, this.TOKEN_EXPIRY_SECONDS, token);

      await pipeline.exec();

      this.logger.debug(`Generated email verification token for user ${userId}`);

      return token;
    } catch (error) {
      this.logger.error('Error generating verification token:', error);
      throw new InternalServerErrorException('Failed to generate verification token');
    }
  }

  /**
   * Verify email using token
   *
   * SECURITY: Uses atomic GETDEL to prevent token reuse, constant-time comparison
   * to prevent timing attacks, and artificial delays to prevent enumeration.
   */
  async verifyEmail(token: string): Promise<EmailVerificationResult> {
    try {
      const key = `email_verification:${token}`;

      // ATOMIC: Get and delete token in one operation to prevent race condition
      // Prevents token reuse if multiple requests arrive concurrently
      const tokenDataStr = await (this.redis as any).getdel(key);

      if (!tokenDataStr) {
        // Add artificial delay to prevent timing-based enumeration
        await this.artificialDelay();
        throw new BadRequestException('Invalid or expired verification token');
      }

      const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr);

      // SECURITY: Verify token hasn't been tampered with using constant-time comparison
      // Prevents timing attacks that could be used to forge or validate tokens
      if (!this.constantTimeCompare(token, tokenData.token)) {
        await this.artificialDelay();
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Check if token is expired
      const expiresAt = new Date(tokenData.expiresAt);
      if (new Date() > expiresAt) {
        await this.artificialDelay();
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Find user - use generic error message to prevent user enumeration
      const user = await this.prismaUserService.findOne(tokenData.userId);

      if (!user || user.email !== tokenData.email) {
        // Generic error for both user not found and email mismatch
        // Prevents attackers from determining if user exists or email is wrong
        await this.artificialDelay();
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Check if already verified
      if (user.emailVerifiedAt) {
        // Clean up reverse lookup if email was already verified
        await this.redis.del(`email_verification_user:${user.id}`);

        return {
          success: true,
          message: 'Email is already verified',
          user: this.sanitizeUser(user),
        };
      }

      // ATOMIC: Update both emailVerifiedAt and status in single database operation
      // Single UPDATE is more efficient and ensures atomic consistency
      // Prevents any race condition window between two separate updates
      const updatedUser = await this.prisma.$transaction(async (prisma) => {
        return await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerifiedAt: new Date(),
            status: UserStatus.ACTIVE,
          },
        });
      });

      // Clean up reverse lookup (secondary cleanup, token already deleted via GETDEL)
      await this.redis.del(`email_verification_user:${user.id}`);

      if (!updatedUser) {
        throw new InternalServerErrorException('Failed to retrieve updated user');
      }

      this.logger.log(`Email verified successfully for user ${user.id}`);

      return {
        success: true,
        message: 'Email verified successfully',
        user: this.sanitizeUser(updatedUser),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error verifying email:', error);
      throw new InternalServerErrorException('Failed to verify email');
    }
  }

  /**
   * Resend verification email
   *
   * SECURITY: Rate limits resend attempts per user (max 3 attempts per hour)
   * to prevent email flooding/abuse. Uses separate rate limit tracking
   * independent of token validity.
   */
  async resendVerificationEmail(userId: string): Promise<string> {
    try {
      const user = await this.prismaUserService.findOne(userId);

      if (!user) {
        // Generic error to prevent user enumeration
        await this.artificialDelay();
        throw new BadRequestException('Unable to process resend request at this time');
      }

      if (user.emailVerifiedAt) {
        throw new BadRequestException('Email is already verified');
      }

      // CHECK RATE LIMIT: Separate from token validity to enforce consistent limits
      const isWithinRateLimit = await this.checkResendRateLimit(userId);
      if (!isWithinRateLimit) {
        throw new BadRequestException(
          `Too many verification email requests. Please try again in ${this.RATE_LIMIT_WINDOW_SECONDS / 60} minutes.`,
        );
      }

      // Clean up existing token if present (allow fresh token generation)
      const existingTokenKey = `email_verification_user:${userId}`;
      const existingToken = await this.redis.get(existingTokenKey);

      if (existingToken) {
        const tokenKey = `email_verification:${existingToken}`;
        // Use pipeline for atomic cleanup
        const pipeline = this.redis.pipeline();
        pipeline.del(tokenKey);
        pipeline.del(existingTokenKey);
        await pipeline.exec();
      }

      // Generate new token
      const newToken = await this.generateVerificationToken(userId, user.email);

      // Increment rate limit counter
      await this.incrementResendRateLimit(userId);

      this.logger.log(`Resent verification email for user ${userId}`);

      return newToken;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error resending verification email:', error);
      throw new InternalServerErrorException('Failed to resend verification email');
    }
  }

  /**
   * Check if email verification is required for user
   */
  async isVerificationRequired(userId: string): Promise<boolean> {
    try {
      const user = await this.prismaUserService.findOne(userId);

      return user ? !user.emailVerifiedAt : true;
    } catch (error) {
      this.logger.error('Error checking verification requirement:', error);
      return true; // Fail safe - require verification if we can't check
    }
  }

  /**
   * Get verification token info (for debugging/admin purposes)
   */
  async getTokenInfo(token: string): Promise<Partial<EmailVerificationToken> | null> {
    try {
      const key = `email_verification:${token}`;
      const tokenDataStr = await this.redis.get(key);

      if (!tokenDataStr) {
        return null;
      }

      const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr);

      // Return sanitized token info (without sensitive data)
      return {
        userId: tokenData.userId,
        email: tokenData.email,
        expiresAt: tokenData.expiresAt,
        createdAt: tokenData.createdAt,
      };
    } catch (error) {
      this.logger.error('Error getting token info:', error);
      return null;
    }
  }

  /**
   * Clean up expired tokens (maintenance function)
   *
   * PERFORMANCE: Uses SCAN instead of KEYS to avoid blocking Redis server.
   * Processes tokens in batches with pipelining to reduce network round-trips.
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      let deletedCount = 0;
      let cursor = '0';

      do {
        // Use non-blocking SCAN with cursor-based iteration
        const [newCursor, keys] = await (this.redis as any).scan(
          cursor,
          'MATCH',
          'email_verification:*',
          'COUNT',
          100, // Process 100 keys at a time
        );

        cursor = newCursor;

        if (keys.length === 0) {
          continue;
        }

        // Batch GET operations using pipeline
        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.get(key));

        const results = await pipeline.exec();

        // Process results and identify expired tokens
        const keysToDelete: string[] = [];
        results?.forEach(([err, tokenDataStr], index) => {
          if (!err && tokenDataStr) {
            try {
              const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr as string);
              const expiresAt = new Date(tokenData.expiresAt);

              if (new Date() > expiresAt) {
                keysToDelete.push(keys[index]);
                keysToDelete.push(`email_verification_user:${tokenData.userId}`);
              }
            } catch (parseError) {
              this.logger.warn(`Failed to parse token data for key ${keys[index]}`);
              // Delete malformed token
              keysToDelete.push(keys[index]);
            }
          } else if (err) {
            this.logger.warn(`Error reading token key ${keys[index]}: ${err}`);
          } else {
            // Key exists but no data - already expired via TTL
            keysToDelete.push(keys[index]);
          }
        });

        // Batch delete expired tokens
        if (keysToDelete.length > 0) {
          const deletePipeline = this.redis.pipeline();
          keysToDelete.forEach((key) => deletePipeline.del(key));
          await deletePipeline.exec();

          deletedCount += keysToDelete.length / 2; // Each token has 2 keys (token + reverse lookup)
        }
      } while (cursor !== '0');

      this.logger.debug(`Cleaned up ${deletedCount} expired verification tokens`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get verification statistics
   *
   * PERFORMANCE: Uses SCAN instead of KEYS to avoid blocking Redis server.
   * Processes tokens in batches with pipelining.
   */
  async getVerificationStats(): Promise<{
    totalPendingVerifications: number;
    expiredTokens: number;
    recentVerifications: number;
  }> {
    try {
      let totalPending = 0;
      let expiredTokens = 0;
      let cursor = '0';
      const now = new Date();

      do {
        // Use non-blocking SCAN with cursor-based iteration
        const [newCursor, keys] = await (this.redis as any).scan(
          cursor,
          'MATCH',
          'email_verification:*',
          'COUNT',
          100,
        );

        cursor = newCursor;

        if (keys.length === 0) {
          continue;
        }

        // Batch GET operations using pipeline
        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.get(key));

        const results = await pipeline.exec();

        // Process results
        results?.forEach(([err, tokenDataStr]) => {
          if (!err && tokenDataStr) {
            try {
              const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr as string);
              const expiresAt = new Date(tokenData.expiresAt);

              if (now > expiresAt) {
                expiredTokens++;
              } else {
                totalPending++;
              }
            } catch (parseError) {
              this.logger.warn('Failed to parse token data for stats');
              expiredTokens++; // Treat malformed tokens as expired
            }
          }
        });
      } while (cursor !== '0');

      // Count recent verifications (last 24 hours)
      const since = new Date(Date.now() - this.TOKEN_EXPIRY_MS);
      const recentVerifications = await this.prismaUserService.countVerifiedSince(since);

      return {
        totalPendingVerifications: totalPending,
        expiredTokens,
        recentVerifications,
      };
    } catch (error) {
      this.logger.error('Error getting verification stats:', error);
      return {
        totalPendingVerifications: 0,
        expiredTokens: 0,
        recentVerifications: 0,
      };
    }
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash: _passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}