import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
<<<<<<< HEAD
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../../core/database/entities/user.entity';
import { AuditLog, AuditEventType } from '../../core/database/entities/audit-log.entity';
import { PasswordSecurityService } from './password-security.service';
import { RateLimitService } from './rate-limit.service';

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  ipAddress?: string;
  userAgent?: string;
=======
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { User, UserStatus } from '../../core/database/entities/user.entity';
import { PasswordSecurityService } from './password-security.service';

export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
  ipAddress: string;
  userAgent: string;
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
>>>>>>> origin/epic/milestone-1-foundation
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
<<<<<<< HEAD
  private readonly tokenExpirationMinutes = 30;
  private readonly maxActiveTokens = 3;
=======
  private redis: Redis;
>>>>>>> origin/epic/milestone-1-foundation

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
<<<<<<< HEAD
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private passwordSecurityService: PasswordSecurityService,
    private rateLimitService: RateLimitService,
  ) {}

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
        expiresAt,
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
        token: process.env.NODE_ENV === 'development' ? resetToken : undefined,
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
  ): Promise<{ valid: boolean; userId?: string; error?: string }> {
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

      return { valid: true, userId: tokenData.userId };
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
  ): Promise<{ success: boolean; error?: string }> {
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

      return { success: true };
    } catch (error) {
      this.logger.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  private async storeResetToken(tokenData: PasswordResetToken): Promise<void> {
    // In a real application, store this in Redis or a database table
    // For this example, we'll use a simple approach
    this.logger.debug(`Storing reset token ${tokenData.id} for user ${tokenData.userId}`);
  }

  private async getResetToken(token: string): Promise<PasswordResetToken | null> {
    // In a real application, retrieve from Redis or database
    // For this example, return null to simulate not found
    this.logger.debug(`Retrieving reset token ${token}`);
    return null;
  }

  private async markTokenAsUsed(token: string): Promise<void> {
    // In a real application, mark the token as used in storage
    this.logger.debug(`Marking token ${token} as used`);
  }

  private async cleanupExpiredTokens(userId: string): Promise<void> {
    // In a real application, remove expired tokens from storage
    this.logger.debug(`Cleaning up expired tokens for user ${userId}`);
  }

  private async limitActiveTokens(userId: string): Promise<void> {
    // In a real application, limit the number of active tokens per user
    this.logger.debug(`Limiting active tokens for user ${userId} to ${this.maxActiveTokens}`);
  }

  private async logResetEvent(
    userId: string | null,
    eventType: AuditEventType,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any
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
=======
    private configService: ConfigService,
    private passwordSecurityService: PasswordSecurityService,
  ) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      // retryDelayOnFailover: removed in ioredis v5,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  /**
   * Request password reset - generate secure token
   */
  async requestPasswordReset(
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ token: string; expiresIn: number }> {
    try {
      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      // Always return success to prevent email enumeration
      // but only send email if user exists
      if (!user) {
        this.logger.warn(`Password reset requested for non-existent email: ${email}`);

        // Generate a fake token to prevent timing attacks
        const fakeToken = crypto.randomBytes(32).toString('hex');
        return {
          token: fakeToken,
          expiresIn: 30 * 60, // 30 minutes
        };
      }

      // Check if user account is active
      if (user.status !== UserStatus.ACTIVE) {
        this.logger.warn(`Password reset requested for inactive user: ${email}`);
        throw new BadRequestException('Account is not active');
      }

      // Check for existing reset token
      const existingTokenKey = `password_reset_user:${user.id}`;
      const existingToken = await this.redis.get(existingTokenKey);

      if (existingToken) {
        // Check if existing token is still valid and recent
        const tokenKey = `password_reset:${existingToken}`;
        const tokenDataStr = await this.redis.get(tokenKey);

        if (tokenDataStr) {
          const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

          // If token was created less than 5 minutes ago, don't generate a new one
          if (Date.now() - tokenData.createdAt.getTime() < 5 * 60 * 1000) {
            throw new BadRequestException('Password reset email was already sent recently. Please check your inbox.');
          }
        }

        // Clean up existing token
        await this.redis.del(tokenKey);
        await this.redis.del(existingTokenKey);
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const tokenData: PasswordResetToken = {
        token,
        userId: user.id,
        email: user.email,
        expiresAt,
        createdAt: new Date(),
        used: false,
        ipAddress,
        userAgent,
      };

      // Store token in Redis
      const tokenKey = `password_reset:${token}`;
      await this.redis.setex(
        tokenKey,
        30 * 60, // 30 minutes in seconds
        JSON.stringify(tokenData),
      );

      // Store reverse lookup
      await this.redis.setex(existingTokenKey, 30 * 60, token);

      this.logger.log(`Password reset token generated for user ${user.id}`);

      return {
        token,
        expiresIn: 30 * 60, // 30 minutes in seconds
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error requesting password reset:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    expiresAt?: Date;
  }> {
    try {
      const tokenKey = `password_reset:${token}`;
      const tokenDataStr = await this.redis.get(tokenKey);

      if (!tokenDataStr) {
        return { valid: false };
      }

      const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        await this.redis.del(tokenKey);
        await this.redis.del(`password_reset_user:${tokenData.userId}`);
        return { valid: false };
      }

      // Check if token was already used
      if (tokenData.used) {
        return { valid: false };
      }

      return {
        valid: true,
        email: tokenData.email,
        expiresAt: tokenData.expiresAt,
      };
    } catch (error) {
      this.logger.error('Error validating reset token:', error);
      return { valid: false };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<PasswordResetResult> {
    try {
      const tokenKey = `password_reset:${token}`;
      const tokenDataStr = await this.redis.get(tokenKey);

      if (!tokenDataStr) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      const tokenData: PasswordResetToken = JSON.parse(tokenDataStr);

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        await this.redis.del(tokenKey);
        await this.redis.del(`password_reset_user:${tokenData.userId}`);
        throw new BadRequestException('Password reset token has expired');
      }

      // Check if token was already used
      if (tokenData.used) {
        throw new BadRequestException('Password reset token has already been used');
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: tokenData.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate new password
      const passwordValidation = this.passwordSecurityService.validatePassword(
        newPassword,
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      );

      if (!passwordValidation.meets_requirements) {
        throw new BadRequestException({
          message: 'Password does not meet security requirements',
          feedback: passwordValidation.feedback,
          strength: passwordValidation.strength,
          score: passwordValidation.score,
        });
      }

      // Check if new password is in user's password history
      const isInHistory = await this.passwordSecurityService.isPasswordInHistory(
        user.id,
        newPassword,
      );

      if (isInHistory) {
        throw new BadRequestException('You cannot reuse a recently used password');
      }

      // Hash new password
      const passwordHash = await this.passwordSecurityService.hashPassword(newPassword);

      // Update user password and clear any lockout
      await this.userRepository.update(user.id, {
        passwordHash,
        status: UserStatus.ACTIVE, // Ensure user is active after password reset
      });

      // Mark token as used
      tokenData.used = true;
      await this.redis.setex(tokenKey, 60 * 60, JSON.stringify(tokenData)); // Keep for 1 hour for audit

      // Clean up user lookup
      await this.redis.del(`password_reset_user:${user.id}`);

      this.logger.log(`Password reset successfully for user ${user.id}`, {
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
      });

      return {
        success: true,
        message: 'Password has been reset successfully',
        requiresEmailVerification: !user.emailVerifiedAt,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error('Error resetting password:', error);
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Get password reset statistics
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

      // Count recent successful password resets (this would typically come from audit logs)
      // For now, we'll count used tokens from the last 24 hours
      const recentResets = usedTokens; // Simplified for demo

      return {
        activeTokens,
        usedTokens,
        expiredTokens,
        recentResets,
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
  async cleanupExpiredTokens(): Promise<number> {
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
   * Revoke all password reset tokens for a user (security function)
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
>>>>>>> origin/epic/milestone-1-foundation
  }
}