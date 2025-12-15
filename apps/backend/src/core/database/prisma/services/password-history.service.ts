import { Injectable, BadRequestException } from '@nestjs/common';
import type { PasswordHistory } from '../../../../../generated/prisma';
import { Prisma } from '../../../../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { validateUuid } from '../../../../common/validators';

/**
 * Options for creating password history record
 */
export interface CreatePasswordHistoryDto {
  userId: string;
  passwordHash: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Subset of PasswordHistory for password reuse checks
 */
export interface PasswordHashRecord {
  passwordHash: string;
  createdAt: Date;
}

/**
 * PrismaPasswordHistoryService - Password history tracking for security compliance
 *
 * ARCHITECTURAL DECISIONS:
 * - Stores hashed passwords only (never plain text)
 * - Supports password reuse prevention (e.g., "no reuse of last 5 passwords")
 * - Tracks IP address and user agent for security auditing
 * - CASCADE delete when user deleted (privacy compliance)
 * - Ordered by createdAt DESC for efficient recent password queries
 *
 * SECURITY:
 * - passwordHash must be bcrypt or argon2 format
 * - No password verification methods (delegated to auth service)
 * - All queries validate UUID format (fail fast)
 *
 * USE CASES:
 * - Password change tracking
 * - Password reuse prevention
 * - Security audit trails
 * - Compliance reporting (PCI-DSS, SOC2)
 *
 * @example
 * ```typescript
 * // Track password change
 * await passwordHistoryService.create({
 *   userId: 'u123...',
 *   passwordHash: '$2b$10$...',
 *   ipAddress: '203.0.113.42',
 *   userAgent: 'Mozilla/5.0...'
 * });
 *
 * // Check last 5 passwords for reuse
 * const recent = await passwordHistoryService.getRecentPasswords(userId, 5);
 * for (const record of recent) {
 *   if (await bcrypt.compare(newPassword, record.passwordHash)) {
 *     throw new Error('Password was recently used');
 *   }
 * }
 *
 * // Cleanup old history (keep last 10)
 * await passwordHistoryService.deleteOldPasswords(userId, 10);
 * ```
 */
@Injectable()
export class PrismaPasswordHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  /**
   * Create a new PasswordHistory record
   *
   * VALIDATION:
   * - userId must be valid UUID
   * - passwordHash cannot be empty
   * - passwordHash must be in bcrypt/argon2 format
   * - ipAddress and userAgent are optional
   *
   * SECURITY:
   * - passwordHash must be pre-hashed (no hashing done here)
   * - Validates hash format to prevent storing plain text
   *
   * PRISMA BEHAVIOR:
   * - Generates UUID automatically
   * - Sets createdAt timestamp automatically
   * - Foreign key constraint enforces valid userId
   *
   * @param dto - Password history creation data
   * @returns Created PasswordHistory entity
   * @throws BadRequestException if validation fails
   * @throws BadRequestException if userId doesn't exist (FK constraint)
   */
  async create(dto: CreatePasswordHistoryDto): Promise<PasswordHistory> {
    // Validate userId UUID format
    validateUuid(dto.userId);

    // Validate passwordHash is not empty
    if (!dto.passwordHash || dto.passwordHash.trim().length === 0) {
      throw new BadRequestException('passwordHash cannot be empty');
    }

    // Validate passwordHash format (bcrypt or argon2)
    const bcryptRegex = /^\$2[aby]\$\d{2}\$.+$/;
    const argon2Regex = /^\$argon2(id|i|d)\$.+$/;
    if (!bcryptRegex.test(dto.passwordHash) && !argon2Regex.test(dto.passwordHash)) {
      throw new BadRequestException(
        'Invalid passwordHash format - must be bcrypt or argon2 hash'
      );
    }

    try {
      const passwordHistory = await this.prisma.passwordHistory.create({
        data: {
          userId: dto.userId,
          passwordHash: dto.passwordHash,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
        },
      });

      return passwordHistory;
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
   * Find all password history records for a user
   *
   * BEHAVIOR:
   * - Returns records ordered by createdAt DESC (newest first)
   * - Optional limit parameter for pagination
   * - Returns empty array if user has no history
   *
   * USE CASES:
   * - Display password change history to user
   * - Security audit trails
   * - Compliance reporting
   *
   * @param userId - User UUID
   * @param limit - Optional limit on number of records returned
   * @returns Array of PasswordHistory records (newest first)
   * @throws BadRequestException if UUID format is invalid
   */
  async findByUser(userId: string, limit?: number): Promise<PasswordHistory[]> {
    validateUuid(userId);

    const records = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });

    return records;
  }

  /**
   * Get recent password hashes for reuse checking
   *
   * BEHAVIOR:
   * - Returns only passwordHash and createdAt fields (minimal data)
   * - Ordered by createdAt DESC (newest first)
   * - Returns up to count records
   *
   * SECURITY:
   * - Used for password reuse prevention
   * - Caller must compare hashes using bcrypt/argon2
   * - Returns hashes for comparison (application layer verifies)
   *
   * USE CASES:
   * - Password reuse prevention (e.g., "no reuse of last 5 passwords")
   * - Password strength policies
   *
   * @param userId - User UUID
   * @param count - Number of recent passwords to retrieve
   * @returns Array of password hash records (newest first)
   * @throws BadRequestException if UUID format is invalid or count invalid
   *
   * @example
   * ```typescript
   * const recent = await service.getRecentPasswords(userId, 5);
   * for (const record of recent) {
   *   if (await bcrypt.compare(newPassword, record.passwordHash)) {
   *     throw new Error('Password recently used');
   *   }
   * }
   * ```
   */
  async getRecentPasswords(userId: string, count: number): Promise<PasswordHashRecord[]> {
    validateUuid(userId);

    // Validate count is positive
    if (count <= 0) {
      throw new BadRequestException('count must be positive');
    }

    const records = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: count,
      select: {
        passwordHash: true,
        createdAt: true,
      },
    });

    return records;
  }

  /**
   * Count password history records
   *
   * FILTERING:
   * - No filter: Count all records
   * - userId: Count records for specific user
   *
   * USE CASES:
   * - User statistics
   * - Compliance reporting
   * - Cleanup decision making
   *
   * @param where - Optional filter criteria
   * @returns Count of matching records
   */
  async count(where?: Prisma.PasswordHistoryWhereInput): Promise<number> {
    return await this.prisma.passwordHistory.count({
      where,
    });
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  /**
   * Delete old password records keeping only the most recent N
   *
   * BEHAVIOR:
   * - Identifies most recent keepCount records
   * - Deletes all older records
   * - Returns count of deleted records
   * - Returns 0 if user has <= keepCount records
   *
   * USE CASES:
   * - Periodic cleanup to limit storage
   * - Compliance with data retention policies
   * - After password change (e.g., "keep last 10")
   *
   * RATIONALE:
   * - Balances security (password history tracking) with privacy (data minimization)
   * - Keeps enough history for password reuse prevention
   * - Limits data exposure in case of breach
   *
   * @param userId - User UUID
   * @param keepCount - Number of recent passwords to keep
   * @returns Count of deleted records
   * @throws BadRequestException if UUID format is invalid or keepCount invalid
   *
   * @example
   * ```typescript
   * // After password change, keep last 10 passwords
   * await service.deleteOldPasswords(userId, 10);
   * ```
   */
  async deleteOldPasswords(userId: string, keepCount: number): Promise<number> {
    validateUuid(userId);

    // Validate keepCount is positive
    if (keepCount <= 0) {
      throw new BadRequestException('keepCount must be positive');
    }

    // Get IDs of most recent keepCount records
    const recentRecords = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: keepCount,
      select: { id: true },
    });

    // If user has <= keepCount records, nothing to delete
    if (recentRecords.length === 0) {
      return 0;
    }

    const recentIds = recentRecords.map(r => r.id);

    // Delete all records NOT in recent IDs
    const result = await this.prisma.passwordHistory.deleteMany({
      where: {
        userId,
        id: { notIn: recentIds },
      },
    });

    return result.count;
  }

  /**
   * Delete all password history for a user
   *
   * WARNING:
   * - This is a destructive operation
   * - Removes entire password history
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
    validateUuid(userId);

    const result = await this.prisma.passwordHistory.deleteMany({
      where: { userId },
    });

    return result.count;
  }

}
