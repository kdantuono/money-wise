import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private redis: Redis;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
  }
}