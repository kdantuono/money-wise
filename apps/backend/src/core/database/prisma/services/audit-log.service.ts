import { Injectable, BadRequestException } from '@nestjs/common';
import type { AuditLog, AuditEventType } from '../../../../../generated/prisma';
import { Prisma } from '../../../../../generated/prisma';
import { PrismaService } from '../prisma.service';

/**
 * Options for creating audit log record
 */
export interface CreateAuditLogDto {
  userId?: string;
  eventType: AuditEventType;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue | Record<string, unknown>;
  isSecurityEvent?: boolean;
}

/**
 * PrismaAuditLogService - Security and activity event tracking
 *
 * ARCHITECTURAL DECISIONS:
 * - Track all security-sensitive events (login, password, account changes)
 * - Support forensic analysis (IP address, user agent, timestamps)
 * - Enable compliance reporting (PCI-DSS, SOC2, GDPR)
 * - userId nullable for system-level events (e.g., failed login without user match)
 * - CASCADE delete when user deleted (privacy compliance)
 * - Indexed for efficient queries by user, event type, IP, and security flag
 *
 * EVENT TYPES:
 * - PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED
 * - LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_LOCKED
 * - ACCOUNT_CREATED, ACCOUNT_DELETED, ACCOUNT_SUSPENDED, ACCOUNT_REACTIVATED
 * - TWO_FACTOR_ENABLED, TWO_FACTOR_DISABLED
 *
 * USE CASES:
 * - Security monitoring (detect suspicious activity)
 * - Compliance reporting (audit trails for regulators)
 * - Forensic analysis (investigate security incidents)
 * - User activity tracking (display timeline to users)
 *
 * @example
 * ```typescript
 * // Track successful login
 * await auditLogService.create({
 *   userId: 'u123...',
 *   eventType: 'LOGIN_SUCCESS',
 *   description: 'User logged in successfully',
 *   ipAddress: '203.0.113.42',
 *   userAgent: 'Mozilla/5.0...',
 *   isSecurityEvent: false,
 * });
 *
 * // Track failed login (no userId)
 * await auditLogService.create({
 *   eventType: 'LOGIN_FAILED',
 *   description: 'Failed login: non-existent email',
 *   ipAddress: '198.51.100.23',
 *   metadata: { email: 'nonexistent@example.com', attemptCount: 3 },
 *   isSecurityEvent: true,
 * });
 *
 * // Get recent security events
 * const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h
 * const events = await auditLogService.findRecent(since);
 * ```
 */
@Injectable()
export class PrismaAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  /**
   * Create a new AuditLog record
   *
   * VALIDATION:
   * - userId must be valid UUID (if provided)
   * - eventType must be valid AuditEventType enum
   * - description cannot be empty
   * - ipAddress, userAgent, metadata are optional
   * - isSecurityEvent defaults to false
   *
   * BEHAVIOR:
   * - userId can be null for system events (failed login with no user match)
   * - metadata stored as JSONB for flexible structure
   * - createdAt set automatically by Prisma
   *
   * PRISMA BEHAVIOR:
   * - Generates UUID automatically
   * - Sets createdAt timestamp automatically
   * - Foreign key constraint enforces valid userId (if provided)
   *
   * @param dto - Audit log creation data
   * @returns Created AuditLog entity
   * @throws BadRequestException if validation fails
   * @throws BadRequestException if userId doesn't exist (FK constraint)
   */
  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    // Validate userId UUID format (if provided)
    if (dto.userId) {
      this.validateUuid(dto.userId);
    }

    // Validate description is not empty
    if (!dto.description || dto.description.trim().length === 0) {
      throw new BadRequestException('description cannot be empty');
    }

    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: dto.userId ?? null,
          eventType: dto.eventType,
          description: dto.description,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
          metadata: (dto.metadata ?? null) as Prisma.InputJsonValue,
          isSecurityEvent: dto.isSecurityEvent ?? false,
        },
      });

      return auditLog;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2003: Foreign key constraint violation (invalid userId)
        if (error.code === 'P2003') {
          throw new BadRequestException('Foreign key constraint failed - userId does not reference an existing user');
        }
      }
      throw error;
    }
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Find all audit logs for a user
   *
   * BEHAVIOR:
   * - Returns records ordered by createdAt DESC (newest first)
   * - Optional limit parameter for pagination
   * - Returns empty array if user has no logs
   *
   * USE CASES:
   * - Display user activity timeline
   * - Security audit for specific user
   * - Compliance reporting
   *
   * @param userId - User UUID
   * @param limit - Optional limit on number of records returned
   * @returns Array of AuditLog records (newest first)
   * @throws BadRequestException if UUID format is invalid
   */
  async findByUser(userId: string, limit?: number): Promise<AuditLog[]> {
    this.validateUuid(userId);

    const records = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });

    return records;
  }

  /**
   * Find all audit logs for a specific event type
   *
   * BEHAVIOR:
   * - Returns records ordered by createdAt DESC (newest first)
   * - Optional limit parameter for pagination
   * - Returns empty array if no events of this type
   *
   * USE CASES:
   * - Monitor specific event patterns (e.g., all LOGIN_FAILED in last hour)
   * - Security analysis (e.g., all LOGIN_LOCKED events)
   * - Compliance reporting (e.g., all PASSWORD_CHANGED events)
   *
   * @param eventType - AuditEventType enum value
   * @param limit - Optional limit on number of records returned
   * @returns Array of AuditLog records (newest first)
   */
  async findByEventType(eventType: AuditEventType, limit?: number): Promise<AuditLog[]> {
    const records = await this.prisma.auditLog.findMany({
      where: { eventType },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });

    return records;
  }

  /**
   * Find all audit logs from a specific IP address
   *
   * BEHAVIOR:
   * - Returns records ordered by createdAt DESC (newest first)
   * - Optional limit parameter for pagination
   * - Returns empty array if no events from this IP
   *
   * USE CASES:
   * - Track suspicious IP addresses
   * - Geographic analysis of activity
   * - Rate limiting analysis
   * - Security incident investigation
   *
   * @param ipAddress - IP address (IPv4 or IPv6)
   * @param limit - Optional limit on number of records returned
   * @returns Array of AuditLog records (newest first)
   */
  async findByIpAddress(ipAddress: string, limit?: number): Promise<AuditLog[]> {
    const records = await this.prisma.auditLog.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });

    return records;
  }

  /**
   * Find all security events
   *
   * BEHAVIOR:
   * - Returns only records with isSecurityEvent=true
   * - Ordered by createdAt DESC (newest first)
   * - Optional limit parameter for pagination
   *
   * USE CASES:
   * - Security monitoring dashboard
   * - Real-time security alerts
   * - Security incident investigation
   * - Compliance reporting
   *
   * @param limit - Optional limit on number of records returned
   * @returns Array of AuditLog records (newest first)
   */
  async findSecurityEvents(limit?: number): Promise<AuditLog[]> {
    const records = await this.prisma.auditLog.findMany({
      where: { isSecurityEvent: true },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });

    return records;
  }

  /**
   * Find recent audit logs within date range
   *
   * BEHAVIOR:
   * - Returns records created on or after 'since' date
   * - Ordered by createdAt DESC (newest first)
   * - Optional limit parameter for pagination
   *
   * USE CASES:
   * - Time-based analysis (e.g., "last 24 hours")
   * - Periodic reporting (e.g., "this week's activity")
   * - Real-time monitoring (e.g., "last 5 minutes")
   *
   * @param since - Start date (inclusive)
   * @param limit - Optional limit on number of records returned
   * @returns Array of AuditLog records (newest first)
   */
  async findRecent(since: Date, limit?: number): Promise<AuditLog[]> {
    const records = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });

    return records;
  }

  /**
   * Count audit log records
   *
   * FILTERING:
   * - No filter: Count all records
   * - userId: Count records for specific user
   * - eventType: Count records for specific event type
   * - isSecurityEvent: Count security events
   * - Can combine multiple filters
   *
   * USE CASES:
   * - Statistics dashboard
   * - Compliance reporting
   * - Cleanup decision making
   * - Rate limiting analysis
   *
   * @param where - Optional filter criteria
   * @returns Count of matching records
   */
  async count(where?: Prisma.AuditLogWhereInput): Promise<number> {
    return await this.prisma.auditLog.count({
      where,
    });
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  /**
   * Delete old audit logs based on retention policy
   *
   * BEHAVIOR:
   * - Deletes all records older than specified date
   * - Returns count of deleted records
   * - Returns 0 if no records older than date
   *
   * USE CASES:
   * - Periodic cleanup (e.g., "delete logs older than 90 days")
   * - Compliance with data retention policies
   * - Storage management
   * - Privacy compliance (data minimization)
   *
   * RATIONALE:
   * - Balances audit trail needs with data minimization
   * - Reduces storage costs
   * - Limits data exposure in case of breach
   * - Complies with retention regulations
   *
   * @param olderThan - Delete records older than this date
   * @returns Count of deleted records
   *
   * @example
   * ```typescript
   * // Delete logs older than 90 days
   * const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
   * await service.deleteOldLogs(ninetyDaysAgo);
   * ```
   */
  async deleteOldLogs(olderThan: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: olderThan },
      },
    });

    return result.count;
  }

  /**
   * Delete all audit logs for a user
   *
   * WARNING:
   * - This is a destructive operation
   * - Removes entire audit trail for user
   * - Cannot be undone
   *
   * USE CASES:
   * - User account deletion (privacy compliance)
   * - Data purge requests (GDPR right to be forgotten)
   * - Testing/development cleanup
   *
   * NOTE:
   * - CASCADE delete from User deletion is preferred
   * - This method for explicit cleanup only
   *
   * @param userId - User UUID
   * @returns Count of deleted records
   * @throws BadRequestException if UUID format is invalid
   */
  async deleteByUser(userId: string): Promise<number> {
    this.validateUuid(userId);

    const result = await this.prisma.auditLog.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validate UUID format (RFC 4122)
   *
   * RATIONALE:
   * - Catch invalid UUIDs at service layer (fail fast)
   * - Prevents unnecessary database queries
   * - Provides clear error messages to clients
   *
   * @param id - UUID string to validate
   * @throws BadRequestException if format is invalid
   */
  private validateUuid(id: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`Invalid UUID format: ${id}`);
    }
  }
}
