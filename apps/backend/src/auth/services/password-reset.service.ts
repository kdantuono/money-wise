import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../../core/database/entities/user.entity';
import { AuditLog, AuditEventType } from '../../core/database/entities/audit-log.entity';
import { PasswordSecurityService } from './password-security.service';
import { RateLimitService } from './rate-limit.service';

// Enhanced interface combining both approaches
export interface PasswordResetToken {
  id: string;
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordResetRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  requiresEmailVerification?: boolean;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly tokenExpirationMinutes = 30;
  private readonly maxActiveTokens = 3;
  private redis: Redis;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private passwordSecurityService: PasswordSecurityService,
    private rateLimitService: RateLimitService,
    private configService: ConfigService,
  ) {
    // Enhanced Redis configuration from epic branch
    this.redis = new Redis({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async requestPasswordReset(
    email: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string; token?: string }> {
    // Check rate limit
    const rateLimitResult = await this.rateLimitService.checkRateLimit(
      metadata?.ipAddress || email,
      'passwordReset'
    );

    if (!rateLimitResult.allowed) {
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      const lockoutMessage = rateLimitResult.isLocked
        ? `Too many password reset attempts. Try again after ${rateLimitResult.lockoutExpiry?.toISOString()}`
        : `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 60000)} minutes`;

      // Log the rate limit event
      await this.logResetEvent(
        null,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        `Password reset rate limit exceeded for email: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { rateLimited: true, email }
      );

      return {
        success: false,
        message: lockoutMessage,
      };
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'status'],
    });

    // Always return success message for security (don't reveal if email exists)
    const successMessage = 'If an account with that email exists, you will receive a password reset link shortly.';

    if (!user) {
      // Record attempt even for non-existent users
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      await this.logResetEvent(
        null,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        `Password reset requested for non-existent email: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { email, userExists: false }
      );

      return {
        success: true,
        message: successMessage,
      };
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      await this.logResetEvent(
        user.id,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        `Password reset requested for inactive user: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { email, userStatus: user.status }
      );

      return {
        success: true,
        message: successMessage,
      };
    }

    try {
      // Clean up expired tokens and limit active tokens
      await this.cleanupExpiredTokens(user.id);
      await this.limitActiveTokens(user.id);

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.tokenExpirationMinutes);

      // Store token (in a real app, you'd store this in a separate table)
      // For now, we'll use a simple in-memory approach or extend user entity
      const tokenData: PasswordResetToken = {
        id: uuidv4(),
        userId: user.id,
        token: resetToken,
        email: user.email,
        expiresAt,
        createdAt: new Date(),
        used: false,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };

      // Store token in Redis or database (for this example, we'll log it)
      await this.storeResetToken(tokenData);

      // Record successful request
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', true);

      // Log the event
      await this.logResetEvent(
        user.id,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        'Password reset token generated successfully',
        metadata?.ipAddress,
        metadata?.userAgent,
        {
          tokenId: tokenData.id,
          expiresAt: expiresAt.toISOString(),
        }
      );

      this.logger.log(`Password reset token generated for user ${user.id}`);

      // In a real application, you would send an email here
      // For development, we'll return the token
      return {
        success: true,
        message: successMessage,
        token: this.configService.get<string>('NODE_ENV') === 'development' ? resetToken : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to generate password reset token for ${email}:`, error);
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      return {
        success: true, // Still return success for security
        message: successMessage,
      };
    }
  }

  async validateResetToken(
    token: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ valid: boolean; userId?: string; email?: string; expiresAt?: Date; error?: string }> {
    try {
      const tokenData = await this.getResetToken(token);

      if (!tokenData) {
        await this.logResetEvent(
          null,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          'Invalid password reset token used',
          metadata?.ipAddress,
          metadata?.userAgent,
          { invalidToken: true }
        );

        return { valid: false, error: 'Invalid or expired reset token' };
      }

      if (tokenData.used) {
        await this.logResetEvent(
          tokenData.userId,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          'Already used password reset token attempted',
          metadata?.ipAddress,
          metadata?.userAgent,
          { tokenId: tokenData.id, alreadyUsed: true }
        );

        return { valid: false, error: 'Reset token has already been used' };
      }

      if (tokenData.expiresAt < new Date()) {
        await this.logResetEvent(
          tokenData.userId,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          'Expired password reset token used',
          metadata?.ipAddress,
          metadata?.userAgent,
          { tokenId: tokenData.id, expired: true }
        );

        return { valid: false, error: 'Reset token has expired' };
      }

      // Verify user still exists and is active
      const user = await this.userRepository.findOne({
        where: { id: tokenData.userId },
        select: ['id', 'status'],
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        return { valid: false, error: 'User account is not available' };
      }

      return {
        valid: true,
        userId: tokenData.userId,
        email: tokenData.email,
        expiresAt: tokenData.expiresAt
      };
    } catch (error) {
      this.logger.error('Error validating reset token:', error);
      return { valid: false, error: 'Invalid or expired reset token' };
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; error?: string; message?: string; requiresEmailVerification?: boolean }> {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    // Validate token
    const tokenValidation = await this.validateResetToken(token, metadata);
    if (!tokenValidation.valid || !tokenValidation.userId) {
      return { success: false, error: tokenValidation.error || 'Invalid token' };
    }

    try {
      const userId = tokenValidation.userId;

      // Change password using security service
      const changeResult = await this.passwordSecurityService.changePassword(
        userId,
        newPassword,
        {
          ...metadata,
          isReset: true,
        }
      );

      if (!changeResult.success) {
        await this.logResetEvent(
          userId,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          `Password reset failed: ${changeResult.error}`,
          metadata?.ipAddress,
          metadata?.userAgent,
          { validationError: changeResult.error }
        );

        return { success: false, error: changeResult.error };
      }

      // Mark token as used
      await this.markTokenAsUsed(token);

      // Clear any rate limits for successful reset
      await this.rateLimitService.clearRateLimit(metadata?.ipAddress || userId, 'passwordReset');

      // Log successful reset
      await this.logResetEvent(
        userId,
        AuditEventType.PASSWORD_RESET_COMPLETED,
        'Password reset completed successfully',
        metadata?.ipAddress,
        metadata?.userAgent,
        { tokenUsed: true }
      );

      this.logger.log(`Password reset completed for user ${userId}`);

      // Get user to check email verification status
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['emailVerifiedAt'],
      });

      return {
        success: true,
        message: 'Password has been reset successfully',
        requiresEmailVerification: !user?.emailVerifiedAt
      };
    } catch (error) {
      this.logger.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  // Enhanced storeResetToken implementation using Redis
  private async storeResetToken(tokenData: PasswordResetToken): Promise<void> {
    const tokenKey = `password_reset:${tokenData.token}`;
    const userTokenKey = `password_reset_user:${tokenData.userId}`;

    await this.redis.setex(
      tokenKey,
      this.tokenExpirationMinutes * 60,
      JSON.stringify(tokenData),
    );

    // Store reverse lookup
    await this.redis.setex(userTokenKey, this.tokenExpirationMinutes * 60, tokenData.token);
  }

  // Enhanced getResetToken implementation using Redis
  private async getResetToken(token: string): Promise<PasswordResetToken | null> {
    const tokenKey = `password_reset:${token}`;
    const tokenDataStr = await this.redis.get(tokenKey);

    if (!tokenDataStr) {
      return null;
    }

    const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      await this.redis.del(tokenKey);
      await this.redis.del(`password_reset_user:${tokenData.userId}`);
      return null;
    }

    return tokenData;
  }

  // Enhanced markTokenAsUsed implementation using Redis
  private async markTokenAsUsed(token: string): Promise<void> {
    const tokenKey = `password_reset:${token}`;
    const tokenDataStr = await this.redis.get(tokenKey);

    if (tokenDataStr) {
      const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);
      tokenData.used = true;

      // Keep for audit purposes for 1 hour
      await this.redis.setex(tokenKey, 60 * 60, JSON.stringify(tokenData));
    }
  }

  // Enhanced cleanupExpiredTokens implementation using Redis
  private async cleanupExpiredTokens(userId: string): Promise<void> {
    const userTokenKey = `password_reset_user:${userId}`;
    const existingToken = await this.redis.get(userTokenKey);

    if (existingToken) {
      const tokenKey = `password_reset:${existingToken}`;
      const tokenDataStr = await this.redis.get(tokenKey);

      if (tokenDataStr) {
        const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

        // Clean up if expired
        if (new Date() > tokenData.expiresAt) {
          await this.redis.del(tokenKey);
          await this.redis.del(userTokenKey);
        }
      }
    }
  }

  // Enhanced limitActiveTokens implementation using Redis
  private async limitActiveTokens(userId: string): Promise<void> {
    const userTokenKey = `password_reset_user:${userId}`;
    const existingToken = await this.redis.get(userTokenKey);

    if (existingToken) {
      const tokenKey = `password_reset:${existingToken}`;
      const tokenDataStr = await this.redis.get(tokenKey);

      if (tokenDataStr) {
        const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

        // If token was created less than 5 minutes ago, keep it
        if (Date.now() - tokenData.createdAt.getTime() < 5 * 60 * 1000) {
          return;
        }

        // Clean up old token to allow new one
        await this.redis.del(tokenKey);
        await this.redis.del(userTokenKey);
      }
    }
  }

  private async logResetEvent(
    userId: string | null,
    eventType: AuditEventType,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      eventType,
      description,
      ipAddress,
      userAgent,
      metadata,
      isSecurityEvent: true,
    });

    await this.auditLogRepository.save(auditLog);
  }

  /**
   * Get password reset statistics (from epic branch)
   */
  async getPasswordResetStats(): Promise<{
    activeTokens: number;
    usedTokens: number;
    expiredTokens: number;
    recentResets: number;
  }> {
    try {
      const pattern = 'password_reset:*';
      const keys = await this.redis.keys(pattern);
      let activeTokens = 0;
      let usedTokens = 0;
      let expiredTokens = 0;
      const now = new Date();

      for (const key of keys) {
        const tokenDataStr = await this.redis.get(key);
        if (tokenDataStr) {
          const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

          if (tokenData.used) {
            usedTokens++;
          } else if (now > tokenData.expiresAt) {
            expiredTokens++;
          } else {
            activeTokens++;
          }
        }
      }

      return {
        activeTokens,
        usedTokens,
        expiredTokens,
        recentResets: usedTokens,
      };
    } catch (error) {
      this.logger.error('Error getting password reset stats:', error);
      return {
        activeTokens: 0,
        usedTokens: 0,
        expiredTokens: 0,
        recentResets: 0,
      };
    }
  }

  /**
   * Clean up expired tokens (maintenance function)
   */
  async cleanupExpiredTokensAll(): Promise<number> {
    try {
      const pattern = 'password_reset:*';
      const keys = await this.redis.keys(pattern);
      let deletedCount = 0;

      for (const key of keys) {
        const tokenDataStr = await this.redis.get(key);
        if (tokenDataStr) {
          const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

          // Delete if expired and not recently used (keep used tokens for audit)
          if (
            new Date() > tokenData.expiresAt &&
            (!tokenData.used || Date.now() - tokenData.createdAt.getTime() > 7 * 24 * 60 * 60 * 1000)
          ) {
            await this.redis.del(key);
            await this.redis.del(`password_reset_user:${tokenData.userId}`);
            deletedCount++;
          }
        }
      }

      this.logger.debug(`Cleaned up ${deletedCount} expired password reset tokens`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Revoke all password reset tokens for a user (from epic branch)
   */
  async revokeUserTokens(userId: string): Promise<void> {
    try {
      const userTokenKey = `password_reset_user:${userId}`;
      const token = await this.redis.get(userTokenKey);

      if (token) {
        const tokenKey = `password_reset:${token}`;
        await this.redis.del(tokenKey);
        await this.redis.del(userTokenKey);

        this.logger.log(`Revoked password reset tokens for user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Error revoking user tokens:', error);
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}