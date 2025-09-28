import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
  progressiveLockout: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  resetTime: Date;
  isLocked: boolean;
  lockoutExpiry?: Date;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Default rate limit configurations
  private readonly configs = {
    login: { maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 30, progressiveLockout: true },
    passwordReset: { maxAttempts: 3, windowMinutes: 60, lockoutMinutes: 60, progressiveLockout: false },
    passwordChange: { maxAttempts: 10, windowMinutes: 60, lockoutMinutes: 15, progressiveLockout: false },
  };

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async checkRateLimit(
    identifier: string,
    action: keyof typeof this.configs,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const config = { ...this.configs[action], ...customConfig };
    const key = `rate_limit:${action}:${identifier}`;
    const lockKey = `lockout:${action}:${identifier}`;

    // Check if currently locked out
    const lockoutExpiry = await this.redis.get(lockKey);
    if (lockoutExpiry) {
      const expiryDate = new Date(parseInt(lockoutExpiry));
      if (expiryDate > new Date()) {
        return {
          allowed: false,
          attemptsRemaining: 0,
          resetTime: expiryDate,
          isLocked: true,
          lockoutExpiry: expiryDate,
        };
      } else {
        // Lockout expired, clean up
        await this.redis.del(lockKey);
        await this.redis.del(key);
      }
    }

    // Get current attempt count and window start
    const pipeline = this.redis.pipeline();
    pipeline.hgetall(key);
    const results = await pipeline.exec();
    const data = results?.[0]?.[1] as { count?: string; windowStart?: string; lockoutCount?: string } || {};

    const now = Date.now();
    const windowStart = data.windowStart ? parseInt(data.windowStart) : now;
    const windowEndTime = windowStart + (config.windowMinutes * 60 * 1000);
    const currentCount = parseInt(data.count || '0');
    const lockoutCount = parseInt(data.lockoutCount || '0');

    // Reset window if expired
    if (now > windowEndTime) {
      await this.redis.del(key);
      return {
        allowed: true,
        attemptsRemaining: config.maxAttempts - 1,
        resetTime: new Date(now + (config.windowMinutes * 60 * 1000)),
        isLocked: false,
      };
    }

    // Check if limit exceeded
    if (currentCount >= config.maxAttempts) {
      // Calculate lockout duration (progressive if enabled)
      let lockoutDuration = config.lockoutMinutes;
      if (config.progressiveLockout) {
        lockoutDuration = Math.min(config.lockoutMinutes * Math.pow(2, lockoutCount), 24 * 60); // Max 24 hours
      }

      const lockoutExpiry = now + (lockoutDuration * 60 * 1000);

      // Set lockout
      await this.redis.setex(lockKey, Math.ceil(lockoutDuration * 60), lockoutExpiry.toString());

      // Increment lockout count for progressive lockout
      if (config.progressiveLockout) {
        await this.redis.hset(key, 'lockoutCount', lockoutCount + 1);
        await this.redis.expire(key, 24 * 60 * 60); // Keep lockout count for 24 hours
      }

      this.logger.warn(`Rate limit exceeded for ${action}:${identifier}. Locked out until ${new Date(lockoutExpiry)}`);

      return {
        allowed: false,
        attemptsRemaining: 0,
        resetTime: new Date(lockoutExpiry),
        isLocked: true,
        lockoutExpiry: new Date(lockoutExpiry),
      };
    }

    return {
      allowed: true,
      attemptsRemaining: config.maxAttempts - currentCount - 1,
      resetTime: new Date(windowEndTime),
      isLocked: false,
    };
  }

  async recordAttempt(
    identifier: string,
    action: keyof typeof this.configs,
    success: boolean = false
  ): Promise<void> {
    const config = this.configs[action];
    const key = `rate_limit:${action}:${identifier}`;

    if (success) {
      // Clear rate limit on successful attempt
      await this.redis.del(key);
      return;
    }

    // Record failed attempt
    const now = Date.now();
    const pipeline = this.redis.pipeline();

    // Get current data
    const data = await this.redis.hgetall(key);
    const windowStart = data.windowStart ? parseInt(data.windowStart) : now;
    const currentCount = parseInt(data.count || '0');

    // Check if we need to reset the window
    const windowEndTime = windowStart + (config.windowMinutes * 60 * 1000);
    if (now > windowEndTime) {
      // Reset window
      pipeline.hset(key, {
        count: '1',
        windowStart: now.toString(),
        lockoutCount: data.lockoutCount || '0',
      });
    } else {
      // Increment count
      pipeline.hset(key, 'count', (currentCount + 1).toString());
    }

    pipeline.expire(key, config.windowMinutes * 60);
    await pipeline.exec();

    this.logger.debug(`Recorded failed attempt for ${action}:${identifier}. Count: ${currentCount + 1}`);
  }

  async clearRateLimit(identifier: string, action: keyof typeof this.configs): Promise<void> {
    const key = `rate_limit:${action}:${identifier}`;
    const lockKey = `lockout:${action}:${identifier}`;

    await this.redis.del(key);
    await this.redis.del(lockKey);

    this.logger.debug(`Cleared rate limit for ${action}:${identifier}`);
  }

  async getRateLimitStatus(identifier: string, action: keyof typeof this.configs): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, action);
  }

  async isCurrentlyLocked(identifier: string, action: keyof typeof this.configs): Promise<boolean> {
    const lockKey = `lockout:${action}:${identifier}`;
    const lockoutExpiry = await this.redis.get(lockKey);

    if (!lockoutExpiry) return false;

    const expiryDate = new Date(parseInt(lockoutExpiry));
    return expiryDate > new Date();
  }
}