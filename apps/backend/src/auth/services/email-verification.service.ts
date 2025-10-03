import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { User, UserStatus } from '../../core/database/entities/user.entity';

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
  user?: Partial<User>;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    @Inject('default')
    private readonly redis: Redis,
  ) {
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  /**
   * Generate email verification token
   */
  async generateVerificationToken(userId: string, email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const tokenData: EmailVerificationToken = {
      token,
      userId,
      email,
      expiresAt,
      createdAt: new Date(),
    };

    try {
      // Store token in Redis with expiration
      const key = `email_verification:${token}`;
      await this.redis.setex(
        key,
        24 * 60 * 60, // 24 hours in seconds
        JSON.stringify(tokenData),
      );

      // Also store a reverse lookup for the user
      const userKey = `email_verification_user:${userId}`;
      await this.redis.setex(userKey, 24 * 60 * 60, token);

      this.logger.debug(`Generated email verification token for user ${userId}`);

      return token;
    } catch (error) {
      this.logger.error('Error generating verification token:', error);
      throw new Error('Failed to generate verification token');
    }
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<EmailVerificationResult> {
    try {
      const key = `email_verification:${token}`;
      const tokenDataStr = await this.redis.get(key);

      if (!tokenDataStr) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr);

      // Check if token is expired
      const expiresAt = new Date(tokenData.expiresAt);
      if (new Date() > expiresAt) {
        await this.redis.del(key);
        throw new BadRequestException('Verification token has expired');
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: tokenData.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if email matches
      if (user.email !== tokenData.email) {
        throw new BadRequestException('Email verification token does not match user email');
      }

      // Check if already verified
      if (user.emailVerifiedAt) {
        await this.redis.del(key);
        await this.redis.del(`email_verification_user:${user.id}`);

        return {
          success: true,
          message: 'Email is already verified',
          user: this.sanitizeUser(user),
        };
      }

      // Update user verification status
      await this.userRepository.update(user.id, {
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE, // Ensure user is active after verification
      });

      // Clean up tokens
      await this.redis.del(key);
      await this.redis.del(`email_verification_user:${user.id}`);

      const updatedUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      this.logger.log(`Email verified successfully for user ${user.id}`);

      return {
        success: true,
        message: 'Email verified successfully',
        user: this.sanitizeUser(updatedUser!),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error verifying email:', error);
      throw new Error('Failed to verify email');
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<string> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.emailVerifiedAt) {
        throw new BadRequestException('Email is already verified');
      }

      // Check if there's an existing token
      const existingTokenKey = `email_verification_user:${userId}`;
      const existingToken = await this.redis.get(existingTokenKey);

      if (existingToken) {
        // Check if existing token is still valid
        const tokenKey = `email_verification:${existingToken}`;
        const tokenDataStr = await this.redis.get(tokenKey);

        if (tokenDataStr) {
          const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr);
          const expiresAt = new Date(tokenData.expiresAt);

          // If token is still valid for more than 1 hour, don't generate a new one
          if (expiresAt.getTime() - Date.now() > 60 * 60 * 1000) {
            throw new BadRequestException('Verification email was already sent recently. Please check your inbox.');
          }
        }

        // Clean up existing token
        await this.redis.del(tokenKey);
        await this.redis.del(existingTokenKey);
      }

      // Generate new token
      const newToken = await this.generateVerificationToken(userId, user.email);

      this.logger.log(`Resent verification email for user ${userId}`);

      return newToken;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error resending verification email:', error);
      throw new Error('Failed to resend verification email');
    }
  }

  /**
   * Check if email verification is required for user
   */
  async isVerificationRequired(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['emailVerifiedAt'],
      });

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
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const pattern = 'email_verification:*';
      const keys = await this.redis.keys(pattern);
      let deletedCount = 0;

      for (const key of keys) {
        const tokenDataStr = await this.redis.get(key);
        if (tokenDataStr) {
          const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr);
          const expiresAt = new Date(tokenData.expiresAt);

          if (new Date() > expiresAt) {
            await this.redis.del(key);
            await this.redis.del(`email_verification_user:${tokenData.userId}`);
            deletedCount++;
          }
        } else {
          // Key exists but no data - already expired via TTL, remove orphaned key
          await this.redis.del(key);
          deletedCount++;
        }
      }

      this.logger.debug(`Cleaned up ${deletedCount} expired verification tokens`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<{
    totalPendingVerifications: number;
    expiredTokens: number;
    recentVerifications: number;
  }> {
    try {
      const pattern = 'email_verification:*';
      const keys = await this.redis.keys(pattern);
      let totalPending = 0;
      let expiredTokens = 0;
      const now = new Date();

      for (const key of keys) {
        const tokenDataStr = await this.redis.get(key);
        if (tokenDataStr) {
          const tokenData: EmailVerificationToken = JSON.parse(tokenDataStr);
          const expiresAt = new Date(tokenData.expiresAt);

          if (now > expiresAt) {
            expiredTokens++;
          } else {
            totalPending++;
          }
        }
      }

      // Count recent verifications (last 24 hours)
      const recentVerifications = await this.userRepository
        .createQueryBuilder('user')
        .where('user.emailVerifiedAt > :since', {
          since: new Date(Date.now() - 24 * 60 * 60 * 1000)
        })
        .getCount();

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