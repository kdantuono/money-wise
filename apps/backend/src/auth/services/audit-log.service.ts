import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',

  // Registration events
  REGISTRATION_SUCCESS = 'registration_success',
  REGISTRATION_FAILED = 'registration_failed',

  // Email verification events
  EMAIL_VERIFICATION_SENT = 'email_verification_sent',
  EMAIL_VERIFIED = 'email_verified',
  EMAIL_VERIFICATION_FAILED = 'email_verification_failed',

  // Password events
  PASSWORD_CHANGE_SUCCESS = 'password_change_success',
  PASSWORD_CHANGE_FAILED = 'password_change_failed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_RESET_FAILED = 'password_reset_failed',

  // Account security events
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  FAILED_LOGIN_ATTEMPT = 'failed_login_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // Two-factor authentication events
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  TWO_FACTOR_SUCCESS = 'two_factor_success',
  TWO_FACTOR_FAILED = 'two_factor_failed',

  // Profile events
  PROFILE_UPDATE = 'profile_update',
  EMAIL_CHANGE = 'email_change',

  // Security events
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SESSION_EXPIRED = 'session_expired',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

export interface AuditQuery {
  userId?: string;
  eventType?: AuditEventType | AuditEventType[];
  severity?: AuditSeverity | AuditSeverity[];
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Simple in-memory audit log entity for demonstration
// In production, this would be a proper database table
interface AuditLogEntry extends AuditEvent {
  id: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private auditLogs: AuditLogEntry[] = []; // In-memory storage for demo
  private readonly maxLogEntries = 10000; // Keep last 10,000 entries

  constructor(
    private configService: ConfigService,
  ) {
    // In production, you would inject a proper repository
    // @InjectRepository(AuditLog) private auditLogRepository: Repository<AuditLog>
  }

  /**
   * Log an audit event
   */
  async logEvent(
    eventType: AuditEventType,
    request: Request,
    details: Record<string, unknown> = {},
    userId?: string,
    email?: string,
  ): Promise<void> {
    try {
      const auditEvent: AuditLogEntry = {
        id: this.generateId(),
        eventType,
        severity: this.determineSeverity(eventType),
        userId,
        email,
        ipAddress: this.getClientIp(request),
        userAgent: request.get('User-Agent') || 'unknown',
        details,
        timestamp: new Date(),
        sessionId: this.extractSessionId(request),
        location: await this.getLocationFromIp(this.getClientIp(request)),
      };

      // Store audit event (in production, this would go to database)
      this.auditLogs.push(auditEvent);

      // Keep only the most recent entries
      if (this.auditLogs.length > this.maxLogEntries) {
        this.auditLogs = this.auditLogs.slice(-this.maxLogEntries);
      }

      // Log to application logger based on severity
      const logMessage = `[AUDIT] ${eventType}: ${userId || email || 'anonymous'} from ${auditEvent.ipAddress}`;

      switch (auditEvent.severity) {
        case AuditSeverity.CRITICAL:
          this.logger.error(logMessage, auditEvent);
          break;
        case AuditSeverity.HIGH:
          this.logger.warn(logMessage, auditEvent);
          break;
        case AuditSeverity.MEDIUM:
          this.logger.log(logMessage);
          break;
        case AuditSeverity.LOW:
          this.logger.debug(logMessage);
          break;
      }

      // In production, you might want to send alerts for critical events
      if (auditEvent.severity === AuditSeverity.CRITICAL) {
        await this.sendSecurityAlert(auditEvent);
      }

    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(request: Request, userId: string, email: string): Promise<void> {
    await this.logEvent(
      AuditEventType.LOGIN_SUCCESS,
      request,
      { method: 'password' },
      userId,
      email,
    );
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailed(request: Request, email: string, reason: string): Promise<void> {
    await this.logEvent(
      AuditEventType.LOGIN_FAILED,
      request,
      { email, reason },
      undefined,
      email,
    );
  }

  /**
   * Log account lockout
   */
  async logAccountLocked(request: Request, userId: string, email: string, details: Record<string, unknown>): Promise<void> {
    await this.logEvent(
      AuditEventType.ACCOUNT_LOCKED,
      request,
      details,
      userId,
      email,
    );
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    request: Request,
    description: string,
    userId?: string,
    email?: string,
  ): Promise<void> {
    await this.logEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      request,
      { description },
      userId,
      email,
    );
  }

  /**
   * Log password change
   */
  async logPasswordChange(request: Request, userId: string, email: string, success: boolean): Promise<void> {
    await this.logEvent(
      success ? AuditEventType.PASSWORD_CHANGE_SUCCESS : AuditEventType.PASSWORD_CHANGE_FAILED,
      request,
      { method: 'user_initiated' },
      userId,
      email,
    );
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditQuery): Promise<{ events: AuditLogEntry[]; total: number }> {
    try {
      let filteredLogs = [...this.auditLogs];

      // Apply filters
      if (query.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
      }

      if (query.eventType) {
        const eventTypes = Array.isArray(query.eventType) ? query.eventType : [query.eventType];
        filteredLogs = filteredLogs.filter(log => eventTypes.includes(log.eventType));
      }

      if (query.severity) {
        const severities = Array.isArray(query.severity) ? query.severity : [query.severity];
        filteredLogs = filteredLogs.filter(log => severities.includes(log.severity));
      }

      if (query.ipAddress) {
        filteredLogs = filteredLogs.filter(log => log.ipAddress === query.ipAddress);
      }

      if (query.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
      }

      if (query.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
      }

      // Sort by timestamp (newest first)
      filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const total = filteredLogs.length;

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      const paginatedLogs = filteredLogs.slice(offset, offset + limit);

      return { events: paginatedLogs, total };
    } catch (error) {
      this.logger.error('Error querying audit logs:', error);
      return { events: [], total: 0 };
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    uniqueUsers: number;
    uniqueIPs: number;
  }> {
    try {
      const now = new Date();
      let startTime: Date;

      switch (timeframe) {
        case 'hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const recentLogs = this.auditLogs.filter(log => log.timestamp >= startTime);

      const eventsByType = {} as Record<AuditEventType, number>;
      const eventsBySeverity = {} as Record<AuditSeverity, number>;
      const uniqueUsers = new Set<string>();
      const uniqueIPs = new Set<string>();

      for (const log of recentLogs) {
        // Count by event type
        eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;

        // Count by severity
        eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;

        // Track unique users and IPs
        if (log.userId) uniqueUsers.add(log.userId);
        uniqueIPs.add(log.ipAddress);
      }

      return {
        totalEvents: recentLogs.length,
        eventsByType,
        eventsBySeverity,
        uniqueUsers: uniqueUsers.size,
        uniqueIPs: uniqueIPs.size,
      };
    } catch (error) {
      this.logger.error('Error getting audit stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {} as Record<AuditSeverity, number>,
        uniqueUsers: 0,
        uniqueIPs: 0,
      };
    }
  }

  private determineSeverity(eventType: AuditEventType): AuditSeverity {
    switch (eventType) {
      case AuditEventType.SUSPICIOUS_ACTIVITY:
      case AuditEventType.ACCOUNT_LOCKED:
        return AuditSeverity.CRITICAL;

      case AuditEventType.LOGIN_FAILED:
      case AuditEventType.PASSWORD_RESET_FAILED:
      case AuditEventType.TWO_FACTOR_FAILED:
      case AuditEventType.RATE_LIMIT_EXCEEDED:
        return AuditSeverity.HIGH;

      case AuditEventType.PASSWORD_CHANGE_SUCCESS:
      case AuditEventType.EMAIL_CHANGE:
      case AuditEventType.TWO_FACTOR_ENABLED:
      case AuditEventType.TWO_FACTOR_DISABLED:
        return AuditSeverity.MEDIUM;

      default:
        return AuditSeverity.LOW;
    }
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

  private extractSessionId(request: Request): string | undefined {
    // Extract session ID from request (implementation depends on session management)
    return request.headers['x-session-id'] as string || undefined;
  }

  // eslint-disable-next-line no-unused-vars
  private async getLocationFromIp(_ip: string): Promise<{ country?: string; city?: string; region?: string } | undefined> {
    // In production, you would use a GeoIP service
    // For now, return undefined
    return undefined;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendSecurityAlert(auditEvent: AuditLogEntry): Promise<void> {
    // In production, send alerts via email, Slack, etc.
    this.logger.error('SECURITY ALERT', auditEvent);
  }
}