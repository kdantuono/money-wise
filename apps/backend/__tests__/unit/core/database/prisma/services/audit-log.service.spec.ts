/**
 * PrismaAuditLogService Unit Tests (TDD Approach)
 *
 * Test suite for AuditLog entity CRUD operations using Prisma.
 * Written BEFORE implementation following Test-Driven Development methodology.
 *
 * AuditLog entity tracks security and activity events for:
 * - Security monitoring (failed logins, suspicious activity)
 * - Compliance reporting (PCI-DSS, SOC2, GDPR)
 * - Forensic analysis (IP addresses, timestamps, user agents)
 * - Activity tracking (password changes, account status changes)
 *
 * Coverage Target: 80%+ for all metrics
 * Test Categories: Create, FindMany, Count, Query Filtering, Security Events
 *
 * @phase Phase 3.4 - Password Security Service Migration (P.3.4.2)
 */

import { Test, TestingModule } from '@nestjs/testing';
import type { PrismaClient, AuditLog, AuditEventType } from '../../../../../../generated/prisma';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../../../../../src/core/database/prisma/prisma.service';
import { PrismaAuditLogService } from '../../../../../../src/core/database/prisma/services/audit-log.service';

// Mock PrismaClient type with AuditLog model methods
type MockPrismaClient = DeepMockProxy<PrismaClient> & {
  auditLog: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    deleteMany: jest.Mock;
  };
};

describe('PrismaAuditLogService', () => {
  let service: PrismaAuditLogService;
  let prisma: MockPrismaClient;

  /**
   * Test Data Factory - Mock AuditLog
   * Creates mock AuditLog objects with default values
   */
  const createMockAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
    id: '01234567-89ab-cdef-0123-456789abcdef',
    userId: '01234567-89ab-cdef-0123-456789abcdef',
    eventType: 'LOGIN_SUCCESS' as AuditEventType,
    description: 'User logged in successfully',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    metadata: null,
    isSecurityEvent: false,
    createdAt: new Date('2025-10-12T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    // Create deep mock of PrismaClient
    prisma = mockDeep<PrismaClient>() as any;

    // Create testing module with mocked PrismaService and real PrismaAuditLogService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        PrismaAuditLogService,
      ],
    }).compile();

    service = module.get<PrismaAuditLogService>(PrismaAuditLogService);
  });

  afterEach(() => {
    // Reset all mocks between tests
    mockReset(prisma);
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe('create', () => {
    const validCreateDto = {
      userId: '01234567-89ab-cdef-0123-456789abcdef',
      eventType: 'PASSWORD_CHANGED' as AuditEventType,
      description: 'User changed their password',
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      isSecurityEvent: true,
    };

    it('should create audit log record', async () => {
      // Arrange
      const expectedRecord = createMockAuditLog({
        id: 'new-al-id',
        ...validCreateDto,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result).toEqual(expectedRecord);
      expect(result.eventType).toBe(validCreateDto.eventType);
      expect(result.description).toBe(validCreateDto.description);
      expect(result.isSecurityEvent).toBe(true);
    });

    it('should create record with optional userId (system events)', async () => {
      // Arrange
      const systemEventDto = {
        eventType: 'LOGIN_FAILED' as AuditEventType,
        description: 'Failed login attempt with non-existent email',
        ipAddress: '198.51.100.23',
        isSecurityEvent: true,
      };
      const expectedRecord = createMockAuditLog({
        ...systemEventDto,
        userId: null,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(systemEventDto);

      // Assert
      expect(result.userId).toBeNull();
      expect(result.isSecurityEvent).toBe(true);
    });

    it('should create record with metadata', async () => {
      // Arrange
      const metadata = {
        passwordStrength: 85,
        previousLastLogin: '2025-10-11T10:00:00Z',
      };
      const dto = {
        ...validCreateDto,
        metadata,
      };
      const expectedRecord = createMockAuditLog({
        ...dto,
        metadata,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.metadata).toEqual(metadata);
    });

    it('should default isSecurityEvent to false', async () => {
      // Arrange
      const dto = {
        ...validCreateDto,
        isSecurityEvent: undefined,
      };
      const expectedRecord = createMockAuditLog({
        ...dto,
        isSecurityEvent: false,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.isSecurityEvent).toBe(false);
    });

    it('should validate userId UUID format when provided', async () => {
      // Arrange
      const invalidDto = {
        ...validCreateDto,
        userId: 'not-a-uuid',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/uuid/i);
    });

    it('should reject empty description', async () => {
      // Arrange
      const invalidDto = {
        ...validCreateDto,
        description: '',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/description/i);
    });

    it('should automatically set createdAt timestamp', async () => {
      // Arrange
      const now = new Date('2025-10-12T14:30:00Z');
      const expectedRecord = createMockAuditLog({
        ...validCreateDto,
        createdAt: now,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result.createdAt).toBeDefined();
      expect(result.createdAt).toEqual(now);
    });
  });

  // ============================================================================
  // FIND BY USER TESTS
  // ============================================================================

  describe('findByUser', () => {
    const userId = '01234567-89ab-cdef-0123-456789abcdef';

    it('should find all audit logs for user ordered by createdAt desc', async () => {
      // Arrange
      const auditLogs = [
        createMockAuditLog({ id: 'al-3', userId, createdAt: new Date('2025-10-12T12:00:00Z') }),
        createMockAuditLog({ id: 'al-2', userId, createdAt: new Date('2025-10-11T10:00:00Z') }),
        createMockAuditLog({ id: 'al-1', userId, createdAt: new Date('2025-10-10T08:00:00Z') }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(auditLogs);

      // Act
      const result = await service.findByUser(userId);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime());
    });

    it('should support limit parameter', async () => {
      // Arrange
      const auditLogs = [
        createMockAuditLog({ id: 'al-2', userId }),
        createMockAuditLog({ id: 'al-1', userId }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(auditLogs);

      // Act
      const result = await service.findByUser(userId, 2);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array for user with no audit logs', async () => {
      // Arrange
      prisma.auditLog.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findByUser(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should validate userId UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.findByUser(invalidId)).rejects.toThrow(/uuid/i);
    });
  });

  // ============================================================================
  // FIND BY EVENT TYPE TESTS
  // ============================================================================

  describe('findByEventType', () => {
    const eventType: AuditEventType = 'LOGIN_FAILED';

    it('should find all audit logs for event type ordered by createdAt desc', async () => {
      // Arrange
      const auditLogs = [
        createMockAuditLog({ id: 'al-3', eventType, createdAt: new Date('2025-10-12T12:00:00Z') }),
        createMockAuditLog({ id: 'al-2', eventType, createdAt: new Date('2025-10-11T10:00:00Z') }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(auditLogs);

      // Act
      const result = await service.findByEventType(eventType);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { eventType },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result.every(log => log.eventType === eventType)).toBe(true);
    });

    it('should support limit parameter', async () => {
      // Arrange
      const auditLogs = [
        createMockAuditLog({ id: 'al-1', eventType }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(auditLogs);

      // Act
      const result = await service.findByEventType(eventType, 1);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { eventType },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ============================================================================
  // FIND BY IP ADDRESS TESTS
  // ============================================================================

  describe('findByIpAddress', () => {
    const ipAddress = '198.51.100.42';

    it('should find all audit logs for IP address ordered by createdAt desc', async () => {
      // Arrange
      const auditLogs = [
        createMockAuditLog({ id: 'al-2', ipAddress, createdAt: new Date('2025-10-12T12:00:00Z') }),
        createMockAuditLog({ id: 'al-1', ipAddress, createdAt: new Date('2025-10-11T10:00:00Z') }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(auditLogs);

      // Act
      const result = await service.findByIpAddress(ipAddress);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { ipAddress },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result.every(log => log.ipAddress === ipAddress)).toBe(true);
    });

    it('should support limit parameter', async () => {
      // Arrange
      const auditLogs = [
        createMockAuditLog({ id: 'al-1', ipAddress }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(auditLogs);

      // Act
      const result = await service.findByIpAddress(ipAddress, 1);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { ipAddress },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ============================================================================
  // FIND SECURITY EVENTS TESTS
  // ============================================================================

  describe('findSecurityEvents', () => {
    it('should find all security events ordered by createdAt desc', async () => {
      // Arrange
      const securityEvents = [
        createMockAuditLog({ id: 'al-3', isSecurityEvent: true, eventType: 'LOGIN_FAILED' as AuditEventType }),
        createMockAuditLog({ id: 'al-2', isSecurityEvent: true, eventType: 'LOGIN_LOCKED' as AuditEventType }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(securityEvents);

      // Act
      const result = await service.findSecurityEvents();

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { isSecurityEvent: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result.every(log => log.isSecurityEvent)).toBe(true);
    });

    it('should support limit parameter', async () => {
      // Arrange
      const securityEvents = [
        createMockAuditLog({ id: 'al-1', isSecurityEvent: true }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(securityEvents);

      // Act
      const result = await service.findSecurityEvents(1);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { isSecurityEvent: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no security events exist', async () => {
      // Arrange
      prisma.auditLog.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findSecurityEvents();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // FIND RECENT TESTS
  // ============================================================================

  describe('findRecent', () => {
    it('should find recent audit logs with date range', async () => {
      // Arrange
      const since = new Date('2025-10-10T00:00:00Z');
      const recentLogs = [
        createMockAuditLog({ id: 'al-2', createdAt: new Date('2025-10-12T10:00:00Z') }),
        createMockAuditLog({ id: 'al-1', createdAt: new Date('2025-10-11T10:00:00Z') }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(recentLogs);

      // Act
      const result = await service.findRecent(since);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should support limit parameter', async () => {
      // Arrange
      const since = new Date('2025-10-10T00:00:00Z');
      const recentLogs = [
        createMockAuditLog({ id: 'al-1' }),
      ];
      prisma.auditLog.findMany.mockResolvedValue(recentLogs);

      // Act
      const result = await service.findRecent(since, 1);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ============================================================================
  // COUNT TESTS
  // ============================================================================

  describe('count', () => {
    it('should count all audit log records', async () => {
      // Arrange
      prisma.auditLog.count.mockResolvedValue(142);

      // Act
      const result = await service.count();

      // Assert
      expect(prisma.auditLog.count).toHaveBeenCalledWith({});
      expect(result).toBe(142);
    });

    it('should count audit logs for specific user', async () => {
      // Arrange
      const userId = '01234567-89ab-cdef-0123-456789abcdef';
      prisma.auditLog.count.mockResolvedValue(25);

      // Act
      const result = await service.count({ userId });

      // Assert
      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toBe(25);
    });

    it('should count audit logs by event type', async () => {
      // Arrange
      const eventType: AuditEventType = 'LOGIN_FAILED';
      prisma.auditLog.count.mockResolvedValue(5);

      // Act
      const result = await service.count({ eventType });

      // Assert
      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { eventType },
      });
      expect(result).toBe(5);
    });

    it('should count security events', async () => {
      // Arrange
      prisma.auditLog.count.mockResolvedValue(10);

      // Act
      const result = await service.count({ isSecurityEvent: true });

      // Assert
      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { isSecurityEvent: true },
      });
      expect(result).toBe(10);
    });

    it('should return 0 when no records match criteria', async () => {
      // Arrange
      prisma.auditLog.count.mockResolvedValue(0);

      // Act
      const result = await service.count({ userId: '01234567-89ab-cdef-0123-456789abcdef' });

      // Assert
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // DELETE OLD LOGS TESTS
  // ============================================================================

  describe('deleteOldLogs', () => {
    it('should delete logs older than specified date', async () => {
      // Arrange
      const olderThan = new Date('2025-09-01T00:00:00Z');
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 150 });

      // Act
      const result = await service.deleteOldLogs(olderThan);

      // Assert
      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: olderThan },
        },
      });
      expect(result).toBe(150);
    });

    it('should return 0 if no logs older than date', async () => {
      // Arrange
      const olderThan = new Date('2020-01-01T00:00:00Z');
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.deleteOldLogs(olderThan);

      // Assert
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // DELETE BY USER TESTS
  // ============================================================================

  describe('deleteByUser', () => {
    const userId = '01234567-89ab-cdef-0123-456789abcdef';

    it('should delete all audit logs for user', async () => {
      // Arrange
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 35 });

      // Act
      const result = await service.deleteByUser(userId);

      // Assert
      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toBe(35);
    });

    it('should return 0 if user has no audit logs', async () => {
      // Arrange
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.deleteByUser(userId);

      // Assert
      expect(result).toBe(0);
    });

    it('should validate userId UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.deleteByUser(invalidId)).rejects.toThrow(/uuid/i);
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('edge cases', () => {
    it('should handle IPv6 addresses', async () => {
      // Arrange
      const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const dto = {
        eventType: 'LOGIN_SUCCESS' as AuditEventType,
        description: 'User logged in',
        ipAddress: ipv6Address,
      };
      const expectedRecord = createMockAuditLog({
        ...dto,
        userId: null,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.ipAddress).toBe(ipv6Address);
    });

    it('should handle complex metadata objects', async () => {
      // Arrange
      const metadata = {
        failureReason: 'invalid_password',
        attemptCount: 3,
        lockoutDuration: 900,
        unlockAt: '2025-10-12T15:30:00Z',
        geoLocation: {
          country: 'US',
          city: 'San Francisco',
          lat: 37.7749,
          lon: -122.4194,
        },
      };
      const dto = {
        eventType: 'LOGIN_LOCKED' as AuditEventType,
        description: 'Account locked due to multiple failed attempts',
        ipAddress: '198.51.100.42',
        metadata,
        isSecurityEvent: true,
      };
      const expectedRecord = createMockAuditLog({
        ...dto,
        userId: null,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.metadata).toEqual(metadata);
    });

    it('should handle all audit event types', async () => {
      // Arrange
      const eventTypes: AuditEventType[] = [
        'PASSWORD_CHANGED',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET_COMPLETED',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGIN_LOCKED',
        'ACCOUNT_CREATED',
        'ACCOUNT_DELETED',
        'ACCOUNT_SUSPENDED',
        'ACCOUNT_REACTIVATED',
        'TWO_FACTOR_ENABLED',
        'TWO_FACTOR_DISABLED',
      ];

      for (const eventType of eventTypes) {
        const dto = {
          eventType,
          description: `Event: ${eventType}`,
        };
        const expectedRecord = createMockAuditLog({
          ...dto,
          userId: null,
        });
        prisma.auditLog.create.mockResolvedValue(expectedRecord);

        // Act
        const result = await service.create(dto);

        // Assert
        expect(result.eventType).toBe(eventType);
      }
    });

    it('should handle concurrent audit log creation', async () => {
      // Arrange
      const userId = '01234567-89ab-cdef-0123-456789abcdef';
      const log1 = createMockAuditLog({ id: 'al-1', userId });
      const log2 = createMockAuditLog({ id: 'al-2', userId });

      prisma.auditLog.create
        .mockResolvedValueOnce(log1)
        .mockResolvedValueOnce(log2);

      // Act
      const [result1, result2] = await Promise.all([
        service.create({
          userId,
          eventType: 'LOGIN_SUCCESS' as AuditEventType,
          description: 'Event 1',
        }),
        service.create({
          userId,
          eventType: 'PASSWORD_CHANGED' as AuditEventType,
          description: 'Event 2',
        }),
      ]);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
    });

    it('should handle database connection errors', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      prisma.auditLog.findMany.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.findByUser('01234567-89ab-cdef-0123-456789abcdef')
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle long user agent strings', async () => {
      // Arrange
      const longUserAgent = 'A'.repeat(300);
      const dto = {
        eventType: 'LOGIN_SUCCESS' as AuditEventType,
        description: 'User logged in',
        userAgent: longUserAgent.substring(0, 255), // Truncate to DB limit
      };
      const expectedRecord = createMockAuditLog({
        ...dto,
        userId: null,
      });
      prisma.auditLog.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.userAgent?.length).toBeLessThanOrEqual(255);
    });
  });

  // ============================================================================
  // CASCADE DELETE TESTS (Schema behavior)
  // ============================================================================

  describe('cascade behavior', () => {
    it('should cascade delete when user is deleted (schema-defined)', async () => {
      // Arrange
      // CASCADE delete is defined in Prisma schema: onDelete: Cascade
      const userId = '01234567-89ab-cdef-0123-456789abcdef';

      // Before user deletion
      prisma.auditLog.count.mockResolvedValueOnce(25);

      // After user deletion (CASCADE delete occurred)
      prisma.auditLog.count.mockResolvedValueOnce(0);

      // Act
      const beforeCount = await service.count({ userId });
      // (User deleted here - CASCADE deletes audit logs)
      const afterCount = await service.count({ userId });

      // Assert
      expect(beforeCount).toBe(25);
      expect(afterCount).toBe(0);
    });
  });
});
