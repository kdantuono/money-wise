import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Request } from 'express';

export interface SessionInfo {
  userId: string;
  lastActivity: number;
  createdAt: number;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class SessionTimeoutGuard implements CanActivate {
  private readonly logger = new Logger(SessionTimeoutGuard.name);
  private redis: Redis;

  constructor(
    private jwtService: JwtService,
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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return true; // Let other guards handle missing token
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      const sessionKey = `session:${payload.sub}:${this.hashToken(token)}`;
      const sessionInfo = await this.getSessionInfo(sessionKey);

      if (!sessionInfo) {
        // Create new session
        await this.createSession(sessionKey, payload.sub, request);
        return true;
      }

      // Check session timeout policies
      const timeoutPolicies = this.getTimeoutPolicies();
      const now = Date.now();

      // Check absolute timeout (maximum session duration)
      if (now - sessionInfo.createdAt > timeoutPolicies.maxSessionDuration) {
        await this.invalidateSession(sessionKey);
        this.logger.warn(`Session expired due to absolute timeout for user ${payload.sub}`);
        throw new UnauthorizedException('Session expired due to maximum duration reached');
      }

      // Check idle timeout (maximum time since last activity)
      if (now - sessionInfo.lastActivity > timeoutPolicies.idleTimeout) {
        await this.invalidateSession(sessionKey);
        this.logger.warn(`Session expired due to idle timeout for user ${payload.sub}`);
        throw new UnauthorizedException('Session expired due to inactivity');
      }

      // Update last activity
      await this.updateSessionActivity(sessionKey, sessionInfo);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Session timeout guard error:', error);
      return true; // Don't block on Redis errors
    }
  }

  private async createSession(
    sessionKey: string,
    userId: string,
    request: Request,
  ): Promise<void> {
    const sessionInfo: SessionInfo = {
      userId,
      lastActivity: Date.now(),
      createdAt: Date.now(),
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
    };

    const timeoutPolicies = this.getTimeoutPolicies();

    await this.redis.setex(
      sessionKey,
      Math.ceil(timeoutPolicies.maxSessionDuration / 1000),
      JSON.stringify(sessionInfo),
    );
  }

  private async getSessionInfo(sessionKey: string): Promise<SessionInfo | null> {
    try {
      const sessionData = await this.redis.get(sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      this.logger.error('Error getting session info:', error);
      return null;
    }
  }

  private async updateSessionActivity(
    sessionKey: string,
    sessionInfo: SessionInfo,
  ): Promise<void> {
    try {
      sessionInfo.lastActivity = Date.now();

      const timeoutPolicies = this.getTimeoutPolicies();
      const ttl = Math.ceil(
        Math.min(
          timeoutPolicies.maxSessionDuration - (Date.now() - sessionInfo.createdAt),
          timeoutPolicies.idleTimeout,
        ) / 1000,
      );

      if (ttl > 0) {
        await this.redis.setex(sessionKey, ttl, JSON.stringify(sessionInfo));
      } else {
        await this.redis.del(sessionKey);
      }
    } catch (error) {
      this.logger.error('Error updating session activity:', error);
    }
  }

  private async invalidateSession(sessionKey: string): Promise<void> {
    try {
      await this.redis.del(sessionKey);
    } catch (error) {
      this.logger.error('Error invalidating session:', error);
    }
  }

  private getTimeoutPolicies() {
    return {
      // Maximum session duration (8 hours)
      maxSessionDuration: this.configService.get<number>('SESSION_MAX_DURATION', 8 * 60 * 60 * 1000),
      // Idle timeout (30 minutes)
      idleTimeout: this.configService.get<number>('SESSION_IDLE_TIMEOUT', 30 * 60 * 1000),
    };
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private hashToken(token: string): string {
    // Use a simple hash for session key generation
    // In production, you might want to use a more sophisticated approach
    return Buffer.from(token.slice(-20)).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
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

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Session management service for administrative functions
@Injectable()
export class SessionManagementService {
  private readonly logger = new Logger(SessionManagementService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const pattern = `session:${userId}:*`;
      const keys = await this.redis.keys(pattern);
      const sessions: SessionInfo[] = [];

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        }
      }

      return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (error) {
      this.logger.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<number> {
    try {
      const pattern = `session:${userId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      this.logger.info(`Invalidated ${keys.length} sessions for user ${userId}`);

      return keys.length;
    } catch (error) {
      this.logger.error('Error invalidating user sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    sessionsByUser: Record<string, number>;
    oldestSession: Date | null;
  }> {
    try {
      const pattern = 'session:*';
      const keys = await this.redis.keys(pattern);
      const sessionsByUser: Record<string, number> = {};
      let oldestSessionTime = Date.now();

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: SessionInfo = JSON.parse(sessionData);
          sessionsByUser[session.userId] = (sessionsByUser[session.userId] || 0) + 1;
          oldestSessionTime = Math.min(oldestSessionTime, session.createdAt);
        }
      }

      return {
        totalActiveSessions: keys.length,
        sessionsByUser,
        oldestSession: keys.length > 0 ? new Date(oldestSessionTime) : null,
      };
    } catch (error) {
      this.logger.error('Error getting session stats:', error);
      return {
        totalActiveSessions: 0,
        sessionsByUser: {},
        oldestSession: null,
      };
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}