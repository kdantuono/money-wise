import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { User, UserStatus } from '../../core/database/entities/user.entity';

export interface LockoutSettings {
  maxFailedAttempts: number;
  lockoutDurationMs: number;
  resetTimeMs: number; // Time after which failed attempts are reset
  progressiveLockout: boolean; // Increase lockout time with each lockout
}

export interface LockoutInfo {
  isLocked: boolean;
  failedAttempts: number;
  lockedUntil?: Date;
  nextAttemptAllowedAt?: Date;
}

@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);
  private redis: Redis;

  private readonly defaultSettings: LockoutSettings = {
    maxFailedAttempts: 5,
    lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
    resetTimeMs: 24 * 60 * 60 * 1000, // 24 hours
    progressiveLockout: true,
  };

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
   * Record a failed login attempt
   */
  async recordFailedAttempt(
    identifier: string, // email or user ID
    settings: Partial<LockoutSettings> = {},
  ): Promise<LockoutInfo> {
    const appliedSettings = { ...this.defaultSettings, ...settings };
    const key = `lockout:${identifier}`;

    try {
      // Get current lockout info
      const lockoutData = await this.redis.hmget(
        key,
        'failedAttempts',
        'lockedUntil',
        'lockoutCount',
        'firstFailedAt',
      );

      const now = Date.now();
      let failedAttempts = parseInt(lockoutData[0] || '0', 10);
      const lockedUntil = lockoutData[1] ? parseInt(lockoutData[1], 10) : null;
      const lockoutCount = parseInt(lockoutData[2] || '0', 10);
      const firstFailedAt = lockoutData[3] ? parseInt(lockoutData[3], 10) : now;

      // Check if account is currently locked
      if (lockedUntil && now < lockedUntil) {
        return {
          isLocked: true,
          failedAttempts,
          lockedUntil: new Date(lockedUntil),
          nextAttemptAllowedAt: new Date(lockedUntil),
        };
      }

      // Reset failed attempts if enough time has passed
      if (now - firstFailedAt > appliedSettings.resetTimeMs) {
        failedAttempts = 0;
      }

      // Increment failed attempts
      failedAttempts++;

      // Check if we should lock the account
      if (failedAttempts >= appliedSettings.maxFailedAttempts) {
        const lockoutDuration = appliedSettings.progressiveLockout
          ? this.calculateProgressiveLockout(lockoutCount, appliedSettings.lockoutDurationMs)
          : appliedSettings.lockoutDurationMs;

        const newLockedUntil = now + lockoutDuration;

        // Store lockout information
        await this.redis.hmset(key, {
          failedAttempts: 0, // Reset failed attempts after locking
          lockedUntil: newLockedUntil,
          lockoutCount: lockoutCount + 1,
          firstFailedAt: now,
        });

        // Set expiration for cleanup
        await this.redis.expire(key, Math.ceil(lockoutDuration / 1000) + 86400); // Extra day for safety

        this.logger.warn(`Account locked due to failed attempts`, {
          identifier,
          failedAttempts,
          lockoutCount: lockoutCount + 1,
          lockedUntil: new Date(newLockedUntil),
        });

        // Update user status if we have a user ID
        await this.updateUserLockoutStatus(identifier, true, new Date(newLockedUntil));

        return {
          isLocked: true,
          failedAttempts: appliedSettings.maxFailedAttempts,
          lockedUntil: new Date(newLockedUntil),
          nextAttemptAllowedAt: new Date(newLockedUntil),
        };
      }

      // Store updated failed attempts
      await this.redis.hmset(key, {
        failedAttempts,
        firstFailedAt: failedAttempts === 1 ? now : firstFailedAt,
      });

      // Set expiration for cleanup
      await this.redis.expire(key, Math.ceil(appliedSettings.resetTimeMs / 1000));

      return {
        isLocked: false,
        failedAttempts,
      };
    } catch (error) {
      this.logger.error('Error recording failed attempt:', error);
      // Return safe default
      return {
        isLocked: false,
        failedAttempts: 1,
      };
    }
  }

  /**
   * Clear failed attempts on successful login
   */
  async clearFailedAttempts(identifier: string): Promise<void> {
    const key = `lockout:${identifier}`;

    try {
      await this.redis.del(key);
      await this.updateUserLockoutStatus(identifier, false);

      this.logger.debug(`Cleared failed attempts for ${identifier}`);
    } catch (error) {
      this.logger.error('Error clearing failed attempts:', error);
    }
  }

  /**
   * Get current lockout info for an account
   */
  async getLockoutInfo(identifier: string): Promise<LockoutInfo> {
    const key = `lockout:${identifier}`;

    try {
      const lockoutData = await this.redis.hmget(
        key,
        'failedAttempts',
        'lockedUntil',
      );

      const failedAttempts = parseInt(lockoutData[0] || '0', 10);
      const lockedUntil = lockoutData[1] ? parseInt(lockoutData[1], 10) : null;
      const now = Date.now();

      if (lockedUntil && now < lockedUntil) {
        return {
          isLocked: true,
          failedAttempts,
          lockedUntil: new Date(lockedUntil),
          nextAttemptAllowedAt: new Date(lockedUntil),
        };
      }

      return {
        isLocked: false,
        failedAttempts,
      };
    } catch (error) {
      this.logger.error('Error getting lockout info:', error);
      return {
        isLocked: false,
        failedAttempts: 0,
      };
    }
  }

  /**
   * Manually unlock an account (admin function)
   */
  async unlockAccount(identifier: string): Promise<void> {
    const key = `lockout:${identifier}`;

    try {
      await this.redis.del(key);
      await this.updateUserLockoutStatus(identifier, false);

      this.logger.info(`Account manually unlocked: ${identifier}`);
    } catch (error) {
      this.logger.error('Error unlocking account:', error);
    }
  }

  /**
   * Get lockout statistics for monitoring
   */
  async getLockoutStats(): Promise<{
    totalLockedAccounts: number;
    recentLockouts: Array<{ identifier: string; lockedUntil: Date }>;
  }> {
    try {
      const pattern = 'lockout:*';
      const keys = await this.redis.keys(pattern);

      let totalLocked = 0;
      const recentLockouts: Array<{ identifier: string; lockedUntil: Date }> = [];
      const now = Date.now();

      for (const key of keys) {
        const lockedUntilStr = await this.redis.hget(key, 'lockedUntil');
        if (lockedUntilStr) {
          const lockedUntil = parseInt(lockedUntilStr, 10);
          if (now < lockedUntil) {
            totalLocked++;
            const identifier = key.replace('lockout:', '');
            recentLockouts.push({
              identifier,
              lockedUntil: new Date(lockedUntil),
            });
          }
        }
      }

      return {
        totalLockedAccounts: totalLocked,
        recentLockouts: recentLockouts.sort((a, b) => b.lockedUntil.getTime() - a.lockedUntil.getTime()).slice(0, 10),
      };
    } catch (error) {
      this.logger.error('Error getting lockout stats:', error);
      return {
        totalLockedAccounts: 0,
        recentLockouts: [],
      };
    }
  }

  private calculateProgressiveLockout(lockoutCount: number, baseDuration: number): number {
    // Progressive lockout: 30min, 1hr, 2hr, 4hr, 8hr, then 24hr
    const multipliers = [1, 2, 4, 8, 16, 48];
    const multiplier = multipliers[Math.min(lockoutCount, multipliers.length - 1)];
    return baseDuration * multiplier;
  }

  private async updateUserLockoutStatus(
    identifier: string,
    isLocked: boolean,
    lockedUntil?: Date,
  ): Promise<void> {
    try {
      // Check if identifier is an email or user ID
      const isEmail = identifier.includes('@');
      const whereCondition = isEmail ? { email: identifier } : { id: identifier };

      const user = await this.userRepository.findOne({
        where: whereCondition,
      });

      if (user) {
        // For now, we'll use the existing status field
        // In a production app, you might want separate lockout fields
        if (isLocked && user.status === UserStatus.ACTIVE) {
          await this.userRepository.update(user.id, {
            status: UserStatus.SUSPENDED,
          });
        } else if (!isLocked && user.status === UserStatus.SUSPENDED) {
          await this.userRepository.update(user.id, {
            status: UserStatus.ACTIVE,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error updating user lockout status:', error);
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}