import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface SecurityThreat {
  type:
    | 'brute_force'
    | 'suspicious_pattern'
    | 'rate_limit_exceeded'
    | 'invalid_request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
}

export interface ApiKeyValidation {
  isValid: boolean;
  appId?: string;
  permissions: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  // Rate limiting configurations
  private readonly rateLimits = {
    auth: { requests: 5, window: 300 }, // 5 requests per 5 minutes
    api: { requests: 100, window: 60 }, // 100 requests per minute
    password_reset: { requests: 3, window: 3600 }, // 3 requests per hour
    mfa: { requests: 10, window: 300 }, // 10 attempts per 5 minutes
  };

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Check rate limit for specific endpoint and identifier
   */
  async checkRateLimit(
    identifier: string,
    endpoint: string,
    customLimit?: { requests: number; window: number }
  ): Promise<RateLimitResult> {
    const limit =
      customLimit || this.rateLimits[endpoint] || this.rateLimits.api;
    const key = `rate_limit:${endpoint}:${identifier}`;

    const current = await this.redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit.requests) {
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + ttl * 1000,
        retryAfter: ttl,
      };
    }

    // Increment counter
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    if (count === 0) {
      pipeline.expire(key, limit.window);
    }
    await pipeline.exec();

    return {
      allowed: true,
      remaining: limit.requests - count - 1,
      resetTime: Date.now() + limit.window * 1000,
    };
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(
    request: Request
  ): Promise<SecurityThreat | null> {
    const ip = this.getClientIp(request);
    const userAgent = request.get('User-Agent') || '';
    const endpoint = request.path;

    // Check for brute force attempts
    const bruteForceCheck = await this.checkBruteForce(ip, endpoint);
    if (bruteForceCheck) {
      return bruteForceCheck;
    }

    // Check for suspicious patterns
    const patternCheck = await this.checkSuspiciousPatterns(request);
    if (patternCheck) {
      return patternCheck;
    }

    // Check for invalid request patterns
    const invalidRequestCheck = this.checkInvalidRequestPatterns(request);
    if (invalidRequestCheck) {
      return invalidRequestCheck;
    }

    return null;
  }

  /**
   * Validate API key for mobile applications
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
    if (!apiKey || apiKey.length < 32) {
      return { isValid: false, permissions: [] };
    }

    // In production, this would validate against a database
    // For now, using a simple validation pattern
    const keyData = await this.redis.get(`api_key:${apiKey}`);

    if (!keyData) {
      return { isValid: false, permissions: [] };
    }

    try {
      const parsed = JSON.parse(keyData);
      return {
        isValid: true,
        appId: parsed.appId,
        permissions: parsed.permissions || [],
        rateLimit: parsed.rateLimit,
      };
    } catch {
      return { isValid: false, permissions: [] };
    }
  }

  /**
   * Validate request signature for critical operations
   */
  async validateRequestSignature(request: Request): Promise<boolean> {
    const signature = request.get('X-Signature');
    const timestamp = request.get('X-Timestamp');
    const body = JSON.stringify(request.body);

    if (!signature || !timestamp) {
      return false;
    }

    // Check timestamp freshness (5 minute window)
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (Math.abs(now - requestTime) > 300000) {
      return false;
    }

    // In production, this would use a shared secret
    const secret = process.env.API_SECRET || 'moneywise-api-secret';
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata: Record<string, any>
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      metadata,
    };

    this.logger.warn(`Security Event: ${event}`, logEntry);

    // Store in Redis for analysis
    await this.redis.lpush('security_events', JSON.stringify(logEntry));
    await this.redis.ltrim('security_events', 0, 9999); // Keep last 10k events
  }

  /**
   * Check for brute force attempts
   */
  private async checkBruteForce(
    ip: string,
    endpoint: string
  ): Promise<SecurityThreat | null> {
    const key = `brute_force:${ip}:${endpoint}`;
    const attempts = await this.redis.get(key);
    const count = attempts ? parseInt(attempts, 10) : 0;

    // Log attempt
    await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1 hour window

    if (count > 20) {
      return {
        type: 'brute_force',
        severity: 'critical',
        description: `Potential brute force attack from IP: ${ip}`,
        metadata: { ip, endpoint, attempts: count },
      };
    }

    if (count > 10) {
      return {
        type: 'brute_force',
        severity: 'high',
        description: `Multiple failed attempts from IP: ${ip}`,
        metadata: { ip, endpoint, attempts: count },
      };
    }

    return null;
  }

  /**
   * Check for suspicious request patterns
   */
  private async checkSuspiciousPatterns(
    request: Request
  ): Promise<SecurityThreat | null> {
    const userAgent = request.get('User-Agent') || '';
    const ip = this.getClientIp(request);

    // Check for automated tools
    const suspiciousAgents = [
      'curl',
      'wget',
      'python-requests',
      'postman',
      'insomnia',
      'httpclient',
      'apache-httpclient',
      'okhttp',
    ];

    if (
      suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))
    ) {
      return {
        type: 'suspicious_pattern',
        severity: 'medium',
        description: 'Automated tool detected',
        metadata: { userAgent, ip },
      };
    }

    // Check for missing or suspicious headers
    if (!request.get('Accept') || !request.get('Accept-Language')) {
      return {
        type: 'suspicious_pattern',
        severity: 'low',
        description: 'Missing standard browser headers',
        metadata: { ip, headers: request.headers },
      };
    }

    return null;
  }

  /**
   * Check for invalid request patterns
   */
  private checkInvalidRequestPatterns(request: Request): SecurityThreat | null {
    const body = JSON.stringify(request.body);
    const query = JSON.stringify(request.query);

    // Check for SQL injection patterns
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
      /(union|select|insert|delete|update|drop|create|alter)/i,
    ];

    if (
      sqlPatterns.some(pattern => pattern.test(body) || pattern.test(query))
    ) {
      return {
        type: 'invalid_request',
        severity: 'high',
        description: 'Potential SQL injection attempt',
        metadata: { body, query },
      };
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    if (
      xssPatterns.some(pattern => pattern.test(body) || pattern.test(query))
    ) {
      return {
        type: 'invalid_request',
        severity: 'high',
        description: 'Potential XSS attempt',
        metadata: { body, query },
      };
    }

    return null;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      request.get('X-Forwarded-For')?.split(',')[0] ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      ''
    ).trim();
  }
}
