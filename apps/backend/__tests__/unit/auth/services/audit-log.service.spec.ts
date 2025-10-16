import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  AuditLogService,
  AuditEventType,
  AuditSeverity,
  AuditEvent,
  AuditQuery,
} from '../../../../src/auth/services/audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockConfigService: jest.Mocked<ConfigService>;

  const createMockRequest = (overrides?: Partial<Request>): Request => {
    return {
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '192.168.1.1',
      },
      connection: { remoteAddress: '192.168.1.1' },
      socket: { remoteAddress: '192.168.1.1' },
      ...overrides,
    } as any;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    // Clear in-memory audit logs
    (service as any).auditLogs = [];
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should log a basic audit event', async () => {
      const request = createMockRequest();
      const eventType = AuditEventType.LOGIN_SUCCESS;
      const details = { method: 'password' };
      const userId = 'user-123';
      const email = 'test@example.com';

      await service.logEvent(eventType, request, details, userId, email);

      const stats = await service.getAuditStats('hour');
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType[AuditEventType.LOGIN_SUCCESS]).toBe(1);
    });

    it('should extract client IP from x-forwarded-for header', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' } as any,
      });

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].ipAddress).toBe('203.0.113.1');
    });

    it('should extract client IP from x-real-ip header when x-forwarded-for not available', async () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '203.0.113.2' } as any,
      });

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].ipAddress).toBe('203.0.113.2');
    });

    it('should fall back to connection.remoteAddress for IP', async () => {
      const request = createMockRequest({
        headers: {} as any,
        connection: { remoteAddress: '203.0.113.3' } as any,
      });

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].ipAddress).toBe('203.0.113.3');
    });

    it('should use "unknown" when no IP can be determined', async () => {
      const request = createMockRequest({
        headers: {} as any,
        connection: {} as any,
        socket: {} as any,
      });

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].ipAddress).toBe('unknown');
    });

    it('should extract session ID from x-session-id header', async () => {
      const sessionId = 'session-abc-123';
      const request = createMockRequest({
        headers: { 'x-session-id': sessionId } as any,
      });

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].sessionId).toBe(sessionId);
    });

    it('should extract user-agent from request', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const request = createMockRequest();
      request.get = jest.fn().mockReturnValue(userAgent);

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].userAgent).toBe(userAgent);
    });

    it('should use "unknown" for missing user-agent', async () => {
      const request = createMockRequest();
      request.get = jest.fn().mockReturnValue(undefined);

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].userAgent).toBe('unknown');
    });

    it('should store custom details in audit event', async () => {
      const request = createMockRequest();
      const customDetails = { customField: 'customValue', nestedData: { key: 'value' } };

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, customDetails);

      const logs = await service.queryLogs({});
      expect(logs.events[0].details).toEqual(customDetails);
    });

    it('should not throw on logging errors', async () => {
      const request = createMockRequest();

      // Force an internal error by mocking generateId to throw
      jest.spyOn(service as any, 'generateId').mockImplementation(() => {
        throw new Error('ID generation failed');
      });

      await expect(service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {})).resolves.not.toThrow();
    });

    it('should cap audit logs at maxLogEntries (10000)', async () => {
      const request = createMockRequest();

      // Set initial logs to near limit
      (service as any).auditLogs = new Array(9999).fill(null).map((_, i) => ({
        id: `audit_${i}`,
        eventType: AuditEventType.LOGIN_SUCCESS,
        severity: AuditSeverity.LOW,
        ipAddress: '192.168.1.1',
        userAgent: 'test',
        details: {},
        timestamp: new Date(),
      }));

      // Add 2 more logs
      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});
      await service.logEvent(AuditEventType.LOGIN_FAILED, request, {});

      const auditLogs = (service as any).auditLogs;
      expect(auditLogs.length).toBe(10000); // Should be capped
      expect(auditLogs[auditLogs.length - 1].eventType).toBe(AuditEventType.LOGIN_FAILED); // Latest event
    });
  });

  describe('determineSeverity', () => {
    it('should assign CRITICAL severity to suspicious activity', async () => {
      const request = createMockRequest();
      await service.logEvent(AuditEventType.SUSPICIOUS_ACTIVITY, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].severity).toBe(AuditSeverity.CRITICAL);
    });

    it('should assign CRITICAL severity to account locked', async () => {
      const request = createMockRequest();
      await service.logEvent(AuditEventType.ACCOUNT_LOCKED, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].severity).toBe(AuditSeverity.CRITICAL);
    });

    it('should assign HIGH severity to login failed', async () => {
      const request = createMockRequest();
      await service.logEvent(AuditEventType.LOGIN_FAILED, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].severity).toBe(AuditSeverity.HIGH);
    });

    it('should assign HIGH severity to rate limit exceeded', async () => {
      const request = createMockRequest();
      await service.logEvent(AuditEventType.RATE_LIMIT_EXCEEDED, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].severity).toBe(AuditSeverity.HIGH);
    });

    it('should assign MEDIUM severity to password change success', async () => {
      const request = createMockRequest();
      await service.logEvent(AuditEventType.PASSWORD_CHANGE_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].severity).toBe(AuditSeverity.MEDIUM);
    });

    it('should assign LOW severity to login success', async () => {
      const request = createMockRequest();
      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].severity).toBe(AuditSeverity.LOW);
    });
  });

  describe('logLoginSuccess', () => {
    it('should log successful login with user details', async () => {
      const request = createMockRequest();
      const userId = 'user-123';
      const email = 'test@example.com';

      await service.logLoginSuccess(request, userId, email);

      const logs = await service.queryLogs({ userId });
      expect(logs.events.length).toBe(1);
      expect(logs.events[0].eventType).toBe(AuditEventType.LOGIN_SUCCESS);
      expect(logs.events[0].userId).toBe(userId);
      expect(logs.events[0].email).toBe(email);
      expect(logs.events[0].details).toEqual({ method: 'password' });
    });
  });

  describe('logLoginFailed', () => {
    it('should log failed login attempt with reason', async () => {
      const request = createMockRequest();
      const email = 'test@example.com';
      const reason = 'Invalid password';

      await service.logLoginFailed(request, email, reason);

      const logs = await service.queryLogs({});
      const failedLoginEvents = logs.events.filter(e => e.eventType === AuditEventType.LOGIN_FAILED);
      expect(failedLoginEvents.length).toBe(1);
      expect(failedLoginEvents[0].email).toBe(email);
      expect(failedLoginEvents[0].details).toEqual({ email, reason });
    });
  });

  describe('logAccountLocked', () => {
    it('should log account lockout with details', async () => {
      const request = createMockRequest();
      const userId = 'user-123';
      const email = 'test@example.com';
      const details = { failedAttempts: 5, lockDuration: 3600 };

      await service.logAccountLocked(request, userId, email, details);

      const logs = await service.queryLogs({ userId });
      expect(logs.events.length).toBe(1);
      expect(logs.events[0].eventType).toBe(AuditEventType.ACCOUNT_LOCKED);
      expect(logs.events[0].severity).toBe(AuditSeverity.CRITICAL);
      expect(logs.events[0].details).toEqual(details);
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity with description', async () => {
      const request = createMockRequest();
      const description = 'Multiple failed 2FA attempts from different IPs';
      const userId = 'user-123';
      const email = 'test@example.com';

      await service.logSuspiciousActivity(request, description, userId, email);

      const logs = await service.queryLogs({ userId });
      expect(logs.events.length).toBe(1);
      expect(logs.events[0].eventType).toBe(AuditEventType.SUSPICIOUS_ACTIVITY);
      expect(logs.events[0].severity).toBe(AuditSeverity.CRITICAL);
      expect(logs.events[0].details).toEqual({ description });
    });

    it('should log anonymous suspicious activity', async () => {
      const request = createMockRequest();
      const description = 'Brute force attack detected';

      await service.logSuspiciousActivity(request, description);

      const logs = await service.queryLogs({});
      expect(logs.events.length).toBe(1);
      expect(logs.events[0].userId).toBeUndefined();
      expect(logs.events[0].email).toBeUndefined();
    });
  });

  describe('logPasswordChange', () => {
    it('should log successful password change', async () => {
      const request = createMockRequest();
      const userId = 'user-123';
      const email = 'test@example.com';

      await service.logPasswordChange(request, userId, email, true);

      const logs = await service.queryLogs({ userId });
      expect(logs.events.length).toBe(1);
      expect(logs.events[0].eventType).toBe(AuditEventType.PASSWORD_CHANGE_SUCCESS);
      expect(logs.events[0].details).toEqual({ method: 'user_initiated' });
    });

    it('should log failed password change', async () => {
      const request = createMockRequest();
      const userId = 'user-123';
      const email = 'test@example.com';

      await service.logPasswordChange(request, userId, email, false);

      const logs = await service.queryLogs({ userId });
      expect(logs.events.length).toBe(1);
      expect(logs.events[0].eventType).toBe(AuditEventType.PASSWORD_CHANGE_FAILED);
    });
  });

  describe('queryLogs', () => {
    beforeEach(async () => {
      const request = createMockRequest();

      // Create test data
      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {}, 'user-1', 'user1@example.com');
      await service.logEvent(AuditEventType.LOGIN_FAILED, request, {}, undefined, 'user2@example.com');
      await service.logEvent(AuditEventType.ACCOUNT_LOCKED, request, {}, 'user-2', 'user2@example.com');
      await service.logEvent(AuditEventType.PASSWORD_CHANGE_SUCCESS, request, {}, 'user-1', 'user1@example.com');
    });

    it('should query all logs without filters', async () => {
      const result = await service.queryLogs({});

      expect(result.total).toBe(4);
      expect(result.events.length).toBe(4);
    });

    it('should filter logs by userId', async () => {
      const result = await service.queryLogs({ userId: 'user-1' });

      expect(result.total).toBe(2);
      expect(result.events.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should filter logs by single eventType', async () => {
      const result = await service.queryLogs({ eventType: AuditEventType.LOGIN_FAILED });

      expect(result.total).toBe(1);
      expect(result.events[0].eventType).toBe(AuditEventType.LOGIN_FAILED);
    });

    it('should filter logs by multiple eventTypes', async () => {
      const result = await service.queryLogs({
        eventType: [AuditEventType.LOGIN_SUCCESS, AuditEventType.LOGIN_FAILED],
      });

      expect(result.total).toBe(2);
      expect(result.events.every(e =>
        e.eventType === AuditEventType.LOGIN_SUCCESS || e.eventType === AuditEventType.LOGIN_FAILED,
      )).toBe(true);
    });

    it('should filter logs by single severity', async () => {
      const result = await service.queryLogs({ severity: AuditSeverity.CRITICAL });

      expect(result.total).toBe(1);
      expect(result.events[0].severity).toBe(AuditSeverity.CRITICAL);
    });

    it('should filter logs by multiple severities', async () => {
      const result = await service.queryLogs({
        severity: [AuditSeverity.LOW, AuditSeverity.MEDIUM],
      });

      expect(result.total).toBe(2);
    });

    it('should filter logs by ipAddress', async () => {
      const result = await service.queryLogs({ ipAddress: '192.168.1.1' });

      expect(result.total).toBe(4);
      expect(result.events.every(e => e.ipAddress === '192.168.1.1')).toBe(true);
    });

    it('should filter logs by date range (startDate)', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const result = await service.queryLogs({ startDate: futureDate });

      expect(result.total).toBe(0);
    });

    it('should filter logs by date range (endDate)', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const result = await service.queryLogs({ endDate: pastDate });

      expect(result.total).toBe(0);
    });

    it('should filter logs by date range (startDate and endDate)', async () => {
      const startDate = new Date(Date.now() - 60000);
      const endDate = new Date(Date.now() + 60000);
      const result = await service.queryLogs({ startDate, endDate });

      expect(result.total).toBe(4);
    });

    it('should sort logs by timestamp (newest first)', async () => {
      const result = await service.queryLogs({});

      for (let i = 0; i < result.events.length - 1; i++) {
        expect(result.events[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result.events[i + 1].timestamp.getTime(),
        );
      }
    });

    it('should apply pagination with offset and limit', async () => {
      const result1 = await service.queryLogs({ offset: 0, limit: 2 });
      expect(result1.events.length).toBe(2);
      expect(result1.total).toBe(4);

      const result2 = await service.queryLogs({ offset: 2, limit: 2 });
      expect(result2.events.length).toBe(2);
      expect(result2.total).toBe(4);
    });

    it('should apply default pagination (limit 100)', async () => {
      const result = await service.queryLogs({});

      expect(result.events.length).toBeLessThanOrEqual(100);
    });

    it('should handle errors gracefully', async () => {
      // Force an error by making auditLogs non-array
      (service as any).auditLogs = null;

      const result = await service.queryLogs({});

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should combine multiple filters', async () => {
      const result = await service.queryLogs({
        userId: 'user-1',
        eventType: AuditEventType.PASSWORD_CHANGE_SUCCESS,
        severity: AuditSeverity.MEDIUM,
      });

      expect(result.total).toBe(1);
      expect(result.events[0].userId).toBe('user-1');
      expect(result.events[0].eventType).toBe(AuditEventType.PASSWORD_CHANGE_SUCCESS);
      expect(result.events[0].severity).toBe(AuditSeverity.MEDIUM);
    });
  });

  describe('getAuditStats', () => {
    beforeEach(async () => {
      const request = createMockRequest();

      // Create diverse test data
      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {}, 'user-1', 'user1@example.com');
      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {}, 'user-2', 'user2@example.com');
      await service.logEvent(AuditEventType.LOGIN_FAILED, request, {}, undefined, 'user3@example.com');
      await service.logEvent(AuditEventType.ACCOUNT_LOCKED, request, {}, 'user-2', 'user2@example.com');
      await service.logEvent(AuditEventType.PASSWORD_CHANGE_SUCCESS, request, {}, 'user-1', 'user1@example.com');
    });

    it('should return stats for hour timeframe', async () => {
      const stats = await service.getAuditStats('hour');

      expect(stats.totalEvents).toBe(5);
      expect(stats.eventsByType[AuditEventType.LOGIN_SUCCESS]).toBe(2);
      expect(stats.eventsByType[AuditEventType.LOGIN_FAILED]).toBe(1);
      expect(stats.eventsByType[AuditEventType.ACCOUNT_LOCKED]).toBe(1);
      expect(stats.eventsByType[AuditEventType.PASSWORD_CHANGE_SUCCESS]).toBe(1);
    });

    it('should return stats for day timeframe (default)', async () => {
      const stats = await service.getAuditStats('day');

      expect(stats.totalEvents).toBe(5);
    });

    it('should count unique users correctly', async () => {
      const stats = await service.getAuditStats('hour');

      expect(stats.uniqueUsers).toBe(2); // user-1 and user-2
    });

    it('should count unique IPs correctly', async () => {
      const stats = await service.getAuditStats('hour');

      expect(stats.uniqueIPs).toBe(1); // All from 192.168.1.1
    });

    it('should count events by severity', async () => {
      const stats = await service.getAuditStats('hour');

      expect(stats.eventsBySeverity[AuditSeverity.LOW]).toBe(2); // 2x LOGIN_SUCCESS
      expect(stats.eventsBySeverity[AuditSeverity.HIGH]).toBe(1); // 1x LOGIN_FAILED
      expect(stats.eventsBySeverity[AuditSeverity.MEDIUM]).toBe(1); // 1x PASSWORD_CHANGE
      expect(stats.eventsBySeverity[AuditSeverity.CRITICAL]).toBe(1); // 1x ACCOUNT_LOCKED
    });

    it('should handle week timeframe', async () => {
      const stats = await service.getAuditStats('week');

      expect(stats.totalEvents).toBe(5);
    });

    it('should handle month timeframe', async () => {
      const stats = await service.getAuditStats('month');

      expect(stats.totalEvents).toBe(5);
    });

    it('should exclude events outside timeframe', async () => {
      // Manually insert old event
      const oldEvent = {
        id: 'audit_old',
        eventType: AuditEventType.LOGIN_SUCCESS,
        severity: AuditSeverity.LOW,
        userId: 'user-old',
        ipAddress: '192.168.1.1',
        userAgent: 'test',
        details: {},
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };
      (service as any).auditLogs.unshift(oldEvent);

      const statsWeek = await service.getAuditStats('week');
      const statsMonth = await service.getAuditStats('month');

      expect(statsWeek.totalEvents).toBe(5); // Excludes 8-day-old event
      expect(statsMonth.totalEvents).toBe(6); // Includes 8-day-old event
    });

    it('should handle errors gracefully', async () => {
      // Force an error
      (service as any).auditLogs = null;

      const stats = await service.getAuditStats('hour');

      expect(stats.totalEvents).toBe(0);
      expect(stats.eventsByType).toEqual({});
      expect(stats.eventsBySeverity).toEqual({});
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.uniqueIPs).toBe(0);
    });

    it('should handle empty audit logs', async () => {
      (service as any).auditLogs = [];

      const stats = await service.getAuditStats('hour');

      expect(stats.totalEvents).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.uniqueIPs).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple events from same user at different IPs', async () => {
      const request1 = createMockRequest({ headers: { 'x-forwarded-for': '1.1.1.1' } as any });
      const request2 = createMockRequest({ headers: { 'x-forwarded-for': '2.2.2.2' } as any });

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request1, {}, 'user-1');
      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request2, {}, 'user-1');

      const stats = await service.getAuditStats('hour');
      expect(stats.uniqueUsers).toBe(1);
      expect(stats.uniqueIPs).toBe(2);
    });

    it('should handle events with empty details', async () => {
      const request = createMockRequest();

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].details).toEqual({});
    });

    it('should handle events without userId or email', async () => {
      const request = createMockRequest();

      await service.logEvent(AuditEventType.RATE_LIMIT_EXCEEDED, request, {});

      const logs = await service.queryLogs({});
      expect(logs.events[0].userId).toBeUndefined();
      expect(logs.events[0].email).toBeUndefined();
    });

    it('should generate unique IDs for all events', async () => {
      const request = createMockRequest();

      await Promise.all([
        service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {}),
        service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {}),
        service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {}),
      ]);

      const logs = await service.queryLogs({});
      const ids = logs.events.map(e => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle very large details objects', async () => {
      const request = createMockRequest();
      const largeDetails = {
        metadata: Array(1000).fill(null).map((_, i) => ({ key: `value-${i}` })),
      };

      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, largeDetails);

      const logs = await service.queryLogs({});
      expect(logs.events[0].details).toEqual(largeDetails);
    });

    it('should handle pagination beyond available logs', async () => {
      const request = createMockRequest();
      await service.logEvent(AuditEventType.LOGIN_SUCCESS, request, {});

      const result = await service.queryLogs({ offset: 100, limit: 10 });

      expect(result.events.length).toBe(0);
      expect(result.total).toBe(1);
    });

    it('should handle concurrent logging of multiple events', async () => {
      const request = createMockRequest();

      const promises = Array(50).fill(null).map((_, i) =>
        service.logEvent(
          i % 2 === 0 ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILED,
          request,
          {},
          `user-${i}`,
        ),
      );

      await Promise.all(promises);

      const stats = await service.getAuditStats('hour');
      expect(stats.totalEvents).toBe(50);
      expect(stats.uniqueUsers).toBe(50);
    });
  });
});
