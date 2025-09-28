import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { User } from '../../core/database/entities/user.entity';

export interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerificationResult {
  success: boolean;
  message: string;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private redis: Redis;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  /**
   * Generate 2FA setup for a user
   */
  async setupTwoFactor(userId: string): Promise<TwoFactorSetupResult> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Generate secret for TOTP
      const secret = speakeasy.generateSecret({
        name: `MoneyWise (${user.email})`,
        issuer: 'MoneyWise',
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store temporary setup data in Redis (expires in 10 minutes)
      const setupKey = `2fa_setup:${userId}`;
      await this.redis.setex(
        setupKey,
        10 * 60, // 10 minutes
        JSON.stringify({
          secret: secret.base32,
          backupCodes,
          createdAt: new Date(),
        }),
      );

      this.logger.info(`2FA setup initiated for user ${userId}`);

      return {
        secret: secret.base32!,
        qrCodeUrl,
        backupCodes: backupCodes.map(bc => bc.code),
      };
    } catch (error) {
      this.logger.error('Error setting up 2FA:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  /**
   * Verify 2FA setup and enable it for the user
   */
  async verifyAndEnable2FA(
    userId: string,
    token: string,
  ): Promise<TwoFactorVerificationResult> {
    try {
      const setupKey = `2fa_setup:${userId}`;
      const setupDataStr = await this.redis.get(setupKey);

      if (!setupDataStr) {
        throw new BadRequestException('2FA setup not found or expired');
      }

      const setupData = JSON.parse(setupDataStr);

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: setupData.secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps before/after
      });

      if (!verified) {
        throw new BadRequestException('Invalid 2FA token');
      }

      // Enable 2FA for the user
      // In a real implementation, you would add 2FA fields to the User entity
      // For now, we'll store in Redis
      const userKey = `2fa_user:${userId}`;
      await this.redis.set(
        userKey,
        JSON.stringify({
          secret: setupData.secret,
          backupCodes: setupData.backupCodes,
          enabledAt: new Date(),
        }),
      );

      // Clean up setup data
      await this.redis.del(setupKey);

      this.logger.info(`2FA enabled for user ${userId}`);

      return {
        success: true,
        message: 'Two-factor authentication enabled successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error verifying 2FA setup:', error);
      throw new Error('Failed to verify two-factor authentication');
    }
  }

  /**
   * Verify 2FA token during login
   */
  async verifyTwoFactor(
    userId: string,
    token: string,
  ): Promise<TwoFactorVerificationResult> {
    try {
      const userKey = `2fa_user:${userId}`;
      const userDataStr = await this.redis.get(userKey);

      if (!userDataStr) {
        throw new BadRequestException('2FA not enabled for this user');
      }

      const userData = JSON.parse(userDataStr);

      // First try TOTP verification
      const verified = speakeasy.totp.verify({
        secret: userData.secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (verified) {
        return {
          success: true,
          message: '2FA verification successful',
        };
      }

      // If TOTP failed, try backup codes
      const backupCodeResult = await this.verifyBackupCode(userId, token);
      if (backupCodeResult.success) {
        return backupCodeResult;
      }

      throw new BadRequestException('Invalid 2FA token or backup code');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error verifying 2FA:', error);
      throw new Error('Failed to verify two-factor authentication');
    }
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string, token: string): Promise<TwoFactorVerificationResult> {
    try {
      // Verify current 2FA token before disabling
      const verificationResult = await this.verifyTwoFactor(userId, token);

      if (!verificationResult.success) {
        throw new BadRequestException('Invalid 2FA token');
      }

      // Remove 2FA data
      const userKey = `2fa_user:${userId}`;
      await this.redis.del(userKey);

      this.logger.info(`2FA disabled for user ${userId}`);

      return {
        success: true,
        message: 'Two-factor authentication disabled successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable two-factor authentication');
    }
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const userKey = `2fa_user:${userId}`;
      const exists = await this.redis.exists(userKey);
      return exists === 1;
    } catch (error) {
      this.logger.error('Error checking 2FA status:', error);
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(
    userId: string,
    token: string,
  ): Promise<{ backupCodes: string[] }> {
    try {
      // Verify current 2FA token
      const verificationResult = await this.verifyTwoFactor(userId, token);

      if (!verificationResult.success) {
        throw new BadRequestException('Invalid 2FA token');
      }

      const userKey = `2fa_user:${userId}`;
      const userDataStr = await this.redis.get(userKey);

      if (!userDataStr) {
        throw new BadRequestException('2FA not enabled for this user');
      }

      const userData = JSON.parse(userDataStr);
      const newBackupCodes = this.generateBackupCodes();

      // Update user data with new backup codes
      userData.backupCodes = newBackupCodes;
      await this.redis.set(userKey, JSON.stringify(userData));

      this.logger.info(`New backup codes generated for user ${userId}`);

      return {
        backupCodes: newBackupCodes.map(bc => bc.code),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error generating new backup codes:', error);
      throw new Error('Failed to generate new backup codes');
    }
  }

  private async verifyBackupCode(
    userId: string,
    code: string,
  ): Promise<TwoFactorVerificationResult> {
    try {
      const userKey = `2fa_user:${userId}`;
      const userDataStr = await this.redis.get(userKey);

      if (!userDataStr) {
        return { success: false, message: '2FA not enabled' };
      }

      const userData = JSON.parse(userDataStr);
      const backupCodes: BackupCode[] = userData.backupCodes || [];

      // Find matching backup code
      const backupCode = backupCodes.find(bc => bc.code === code && !bc.used);

      if (!backupCode) {
        return { success: false, message: 'Invalid or used backup code' };
      }

      // Mark backup code as used
      backupCode.used = true;
      backupCode.usedAt = new Date();

      // Update user data
      await this.redis.set(userKey, JSON.stringify(userData));

      this.logger.info(`Backup code used for user ${userId}`);

      return {
        success: true,
        message: 'Backup code verification successful',
      };
    } catch (error) {
      this.logger.error('Error verifying backup code:', error);
      return { success: false, message: 'Backup code verification failed' };
    }
  }

  private generateBackupCodes(): BackupCode[] {
    const codes: BackupCode[] = [];

    for (let i = 0; i < 10; i++) {
      codes.push({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        used: false,
      });
    }

    return codes;
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Note: In a production implementation, you would need to:
// 1. Add 2FA fields to the User entity (twoFactorSecret, twoFactorEnabled, backupCodes)
// 2. Install required dependencies: npm install speakeasy qrcode @types/speakeasy @types/qrcode
// 3. Update the auth flow to check for 2FA requirement after password verification
// 4. Add proper database migrations for 2FA fields
// 5. Implement proper backup code storage and management