import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Max attempts per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  onLimitReached?: (req: Request) => void; // Callback when limit is reached
}

export const RATE_LIMIT_KEY = 'rate-limit';

// Decorator to set rate limit options
export const RateLimit = (options: RateLimitOptions) => {
  return (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      // Method decorator
      Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata(RATE_LIMIT_KEY, options, target);
    }
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly defaultOptions: RateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    @Inject('default') private readonly redis: Redis,
  ) {
    // Set up error handler for Redis connection
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Disable rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Get rate limit options from method or class
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    ) || this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getClass(),
    );

    if (!options) {
      return true; // No rate limiting configured
    }

    const appliedOptions = { ...this.defaultOptions, ...options };

    try {
      const allowed = await this.checkRateLimit(request, appliedOptions);
      return allowed;
    } catch (error) {
      // Re-throw HttpException (rate limit exceeded) to block the request
      // This is a business logic error that MUST propagate to the client
      if (error instanceof HttpException) {
        throw error;
      }

      // Only catch infrastructure errors (Redis failures)
      // Graceful degradation: allow request but log the error
      this.logger.error('Rate limiting infrastructure error (Redis):', error);
      return true;
    }
  }

  private async checkRateLimit(
    request: Request,
    options: RateLimitOptions,
  ): Promise<boolean> {
    const key = this.generateKey(request, options);
    const now = Date.now();
    const window = Math.floor(now / options.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    // Get current count
    const currentCount = await this.redis.get(redisKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= options.maxAttempts) {
      const resetTime = (window + 1) * options.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      // Call the onLimitReached callback if provided
      if (options.onLimitReached) {
        options.onLimitReached(request);
      }

      this.logger.warn(`Rate limit exceeded for key: ${key}`, {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        count,
        limit: options.maxAttempts,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          error: 'Too Many Requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    await this.redis.multi()
      .incr(redisKey)
      .expire(redisKey, Math.ceil(options.windowMs / 1000))
      .exec();

    return true;
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    // Default key generation: IP + endpoint
    const ip = this.getClientIp(request);
    const endpoint = `${request.method}:${request.route?.path || request.path}`;

    return `${ip}:${endpoint}`;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}

// Predefined rate limit configurations for common use cases
export const AuthRateLimits = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
  } as RateLimitOptions,

  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
  } as RateLimitOptions,

  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
  } as RateLimitOptions,

  EMAIL_VERIFICATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5,
  } as RateLimitOptions,
};