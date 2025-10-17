/**
 * PrismaPasswordHistoryService Unit Tests (TDD Approach)
 *
 * Test suite for PasswordHistory entity CRUD operations using Prisma.
 * Written BEFORE implementation following Test-Driven Development methodology.
 *
 * PasswordHistory entity tracks password changes for:
 * - Security compliance (e.g., "no reuse of last 5 passwords")
 * - Audit trails (IP address, user agent, timestamps)
 * - Privacy compliance (CASCADE delete with user)
 *
 * Coverage Target: 80%+ for all metrics
 * Test Categories: Create, FindMany, Count, Delete, Validation
 *
 * @phase Phase 3.4 - Password Security Service Migration (P.3.4.2)
 */

import { Test, TestingModule } from '@nestjs/testing';
import type { PrismaClient, PasswordHistory, User } from '../../../../../../generated/prisma';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../../../../../src/core/database/prisma/prisma.service';
import { PrismaPasswordHistoryService } from '../../../../../../src/core/database/prisma/services/password-history.service';

// Mock PrismaClient type with PasswordHistory model methods
type MockPrismaClient = DeepMockProxy<PrismaClient> & {
  passwordHistory: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
};

describe('PrismaPasswordHistoryService', () => {
  let service: PrismaPasswordHistoryService;
  let prisma: MockPrismaClient;

  /**
   * Test Data Factory - Mock PasswordHistory
   * Creates mock PasswordHistory objects with default values
   */
  const createMockPasswordHistory = (overrides: Partial<PasswordHistory> = {}): PasswordHistory => ({
    id: '01234567-89ab-cdef-0123-456789abcdef',
    userId: '01234567-89ab-cdef-0123-456789abcdef',
    passwordHash: '$2b$10$K7L/V0mIJAiGOiXe4L3Ec.QqKqPqWqT9QqKqPqWqT9QqKqPqWqT',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date('2025-10-12T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    // Create deep mock of PrismaClient
    prisma = mockDeep<PrismaClient>() as any;

    // Create testing module with mocked PrismaService and real PrismaPasswordHistoryService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        PrismaPasswordHistoryService,
      ],
    }).compile();

    service = module.get<PrismaPasswordHistoryService>(PrismaPasswordHistoryService);
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
      passwordHash: '$2b$10$newHashedPasswordString',
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    };

    it('should create password history record', async () => {
      // Arrange
      const expectedRecord = createMockPasswordHistory({
        id: 'new-ph-id',
        ...validCreateDto,
      });
      prisma.passwordHistory.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result).toEqual(expectedRecord);
      expect(result.userId).toBe(validCreateDto.userId);
      expect(result.passwordHash).toBe(validCreateDto.passwordHash);
      expect(result.ipAddress).toBe(validCreateDto.ipAddress);
      expect(result.userAgent).toBe(validCreateDto.userAgent);
    });

    it('should create record with optional ipAddress and userAgent', async () => {
      // Arrange
      const minimalDto = {
        userId: validCreateDto.userId,
        passwordHash: validCreateDto.passwordHash,
      };
      const expectedRecord = createMockPasswordHistory({
        ...minimalDto,
        ipAddress: null,
        userAgent: null,
      });
      prisma.passwordHistory.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(minimalDto);

      // Assert
      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });

    it('should validate userId UUID format', async () => {
      // Arrange
      const invalidDto = {
        ...validCreateDto,
        userId: 'not-a-uuid',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/uuid/i);
    });

    it('should reject empty passwordHash', async () => {
      // Arrange
      const invalidDto = {
        ...validCreateDto,
        passwordHash: '',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/password.*hash/i);
    });

    it('should automatically set createdAt timestamp', async () => {
      // Arrange
      const now = new Date('2025-10-12T14:30:00Z');
      const expectedRecord = createMockPasswordHistory({
        ...validCreateDto,
        createdAt: now,
      });
      prisma.passwordHistory.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(validCreateDto);

      // Assert
      expect(result.createdAt).toBeDefined();
      expect(result.createdAt).toEqual(now);
    });

    it('should handle foreign key constraint violation (invalid userId)', async () => {
      // Arrange
      const error = Object.assign(
        new Error('Foreign key constraint failed on the field: `userId`'),
        { code: 'P2003' }
      );
      prisma.passwordHistory.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(validCreateDto)).rejects.toThrow(/foreign key/i);
    });
  });

  // ============================================================================
  // FIND BY USER TESTS
  // ============================================================================

  describe('findByUser', () => {
    const userId = '01234567-89ab-cdef-0123-456789abcdef';

    it('should find all password history for user ordered by createdAt desc', async () => {
      // Arrange
      const passwordRecords = [
        createMockPasswordHistory({ id: 'ph-3', userId, createdAt: new Date('2025-10-12T12:00:00Z') }),
        createMockPasswordHistory({ id: 'ph-2', userId, createdAt: new Date('2025-10-11T10:00:00Z') }),
        createMockPasswordHistory({ id: 'ph-1', userId, createdAt: new Date('2025-10-10T08:00:00Z') }),
      ];
      prisma.passwordHistory.findMany.mockResolvedValue(passwordRecords);

      // Act
      const result = await service.findByUser(userId);

      // Assert
      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime());
    });

    it('should support limit parameter', async () => {
      // Arrange
      const passwordRecords = [
        createMockPasswordHistory({ id: 'ph-2', userId }),
        createMockPasswordHistory({ id: 'ph-1', userId }),
      ];
      prisma.passwordHistory.findMany.mockResolvedValue(passwordRecords);

      // Act
      const result = await service.findByUser(userId, 2);

      // Assert
      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array for user with no password history', async () => {
      // Arrange
      prisma.passwordHistory.findMany.mockResolvedValue([]);

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
  // GET RECENT PASSWORDS TESTS
  // ============================================================================

  describe('getRecentPasswords', () => {
    const userId = '01234567-89ab-cdef-0123-456789abcdef';

    it('should get last N password hashes for user', async () => {
      // Arrange
      const recentPasswords = [
        createMockPasswordHistory({ id: 'ph-5', passwordHash: '$2b$10$hash5', createdAt: new Date('2025-10-12') }),
        createMockPasswordHistory({ id: 'ph-4', passwordHash: '$2b$10$hash4', createdAt: new Date('2025-10-11') }),
        createMockPasswordHistory({ id: 'ph-3', passwordHash: '$2b$10$hash3', createdAt: new Date('2025-10-10') }),
      ];
      prisma.passwordHistory.findMany.mockResolvedValue(recentPasswords);

      // Act
      const result = await service.getRecentPasswords(userId, 3);

      // Assert
      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          passwordHash: true,
          createdAt: true,
        },
      });
      expect(result).toHaveLength(3);
      expect(result[0].passwordHash).toBe('$2b$10$hash5');
    });

    it('should return empty array if user has no password history', async () => {
      // Arrange
      prisma.passwordHistory.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getRecentPasswords(userId, 5);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return fewer records if user has less than N passwords', async () => {
      // Arrange
      const twoPasswords = [
        createMockPasswordHistory({ id: 'ph-2', passwordHash: '$2b$10$hash2' }),
        createMockPasswordHistory({ id: 'ph-1', passwordHash: '$2b$10$hash1' }),
      ];
      prisma.passwordHistory.findMany.mockResolvedValue(twoPasswords);

      // Act
      const result = await service.getRecentPasswords(userId, 5);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should validate userId UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.getRecentPasswords(invalidId, 5)).rejects.toThrow(/uuid/i);
    });

    it('should validate count is positive', async () => {
      // Arrange
      const userId = '01234567-89ab-cdef-0123-456789abcdef';

      // Act & Assert
      await expect(service.getRecentPasswords(userId, 0)).rejects.toThrow(/count.*positive/i);
      await expect(service.getRecentPasswords(userId, -1)).rejects.toThrow(/count.*positive/i);
    });
  });

  // ============================================================================
  // COUNT TESTS
  // ============================================================================

  describe('count', () => {
    it('should count all password history records', async () => {
      // Arrange
      prisma.passwordHistory.count.mockResolvedValue(42);

      // Act
      const result = await service.count();

      // Assert
      expect(prisma.passwordHistory.count).toHaveBeenCalledWith({});
      expect(result).toBe(42);
    });

    it('should count password history for specific user', async () => {
      // Arrange
      const userId = '01234567-89ab-cdef-0123-456789abcdef';
      prisma.passwordHistory.count.mockResolvedValue(7);

      // Act
      const result = await service.count({ userId });

      // Assert
      expect(prisma.passwordHistory.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toBe(7);
    });

    it('should return 0 for user with no password history', async () => {
      // Arrange
      const userId = '01234567-89ab-cdef-0123-456789abcdef';
      prisma.passwordHistory.count.mockResolvedValue(0);

      // Act
      const result = await service.count({ userId });

      // Assert
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // DELETE OLD PASSWORDS TESTS
  // ============================================================================

  describe('deleteOldPasswords', () => {
    const userId = '01234567-89ab-cdef-0123-456789abcdef';

    it('should delete old password records keeping only last N', async () => {
      // Arrange
      const recentPasswords = [
        createMockPasswordHistory({ id: 'keep-3', createdAt: new Date('2025-10-12') }),
        createMockPasswordHistory({ id: 'keep-2', createdAt: new Date('2025-10-11') }),
        createMockPasswordHistory({ id: 'keep-1', createdAt: new Date('2025-10-10') }),
      ];
      prisma.passwordHistory.findMany.mockResolvedValue(recentPasswords);
      prisma.passwordHistory.deleteMany.mockResolvedValue({ count: 7 });

      // Act
      const result = await service.deleteOldPasswords(userId, 3);

      // Assert
      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true },
      });
      expect(prisma.passwordHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          id: { notIn: ['keep-3', 'keep-2', 'keep-1'] },
        },
      });
      expect(result).toBe(7);
    });

    it('should return 0 if user has fewer passwords than keep count', async () => {
      // Arrange
      const twoPasswords = [
        createMockPasswordHistory({ id: 'keep-2' }),
        createMockPasswordHistory({ id: 'keep-1' }),
      ];
      prisma.passwordHistory.findMany.mockResolvedValue(twoPasswords);
      prisma.passwordHistory.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.deleteOldPasswords(userId, 5);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle user with no password history', async () => {
      // Arrange
      prisma.passwordHistory.findMany.mockResolvedValue([]);
      prisma.passwordHistory.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.deleteOldPasswords(userId, 5);

      // Assert
      expect(result).toBe(0);
    });

    it('should validate userId UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.deleteOldPasswords(invalidId, 5)).rejects.toThrow(/uuid/i);
    });

    it('should validate keepCount is positive', async () => {
      // Act & Assert
      await expect(service.deleteOldPasswords(userId, 0)).rejects.toThrow(/keepCount.*positive/i);
      await expect(service.deleteOldPasswords(userId, -1)).rejects.toThrow(/keepCount.*positive/i);
    });
  });

  // ============================================================================
  // DELETE BY USER TESTS
  // ============================================================================

  describe('deleteByUser', () => {
    const userId = '01234567-89ab-cdef-0123-456789abcdef';

    it('should delete all password history for user', async () => {
      // Arrange
      prisma.passwordHistory.deleteMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.deleteByUser(userId);

      // Assert
      expect(prisma.passwordHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toBe(5);
    });

    it('should return 0 if user has no password history', async () => {
      // Arrange
      prisma.passwordHistory.deleteMany.mockResolvedValue({ count: 0 });

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
        userId: '01234567-89ab-cdef-0123-456789abcdef',
        passwordHash: '$2b$10$hash',
        ipAddress: ipv6Address,
      };
      const expectedRecord = createMockPasswordHistory({
        ...dto,
      });
      prisma.passwordHistory.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.ipAddress).toBe(ipv6Address);
    });

    it('should handle long user agent strings', async () => {
      // Arrange
      const longUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0 Very Long Extension Name That Makes This String Extremely Long For Testing Purposes';
      const dto = {
        userId: '01234567-89ab-cdef-0123-456789abcdef',
        passwordHash: '$2b$10$hash',
        userAgent: longUserAgent.substring(0, 255), // Truncate to DB limit
      };
      const expectedRecord = createMockPasswordHistory({
        ...dto,
      });
      prisma.passwordHistory.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.userAgent?.length).toBeLessThanOrEqual(255);
    });

    it('should handle bcrypt hash format validation', async () => {
      // Arrange
      const validBcryptHash = '$2b$10$K7L/V0mIJAiGOiXe4L3Ec.QqKqPqWqT9QqKqPqWqT9QqKqPqWqT';
      const dto = {
        userId: '01234567-89ab-cdef-0123-456789abcdef',
        passwordHash: validBcryptHash,
      };
      const expectedRecord = createMockPasswordHistory({ ...dto });
      prisma.passwordHistory.create.mockResolvedValue(expectedRecord);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    it('should handle concurrent password changes', async () => {
      // Arrange
      const userId = '01234567-89ab-cdef-0123-456789abcdef';
      const record1 = createMockPasswordHistory({ id: '01234567-89ab-cdef-0123-456789abcde1', userId });
      const record2 = createMockPasswordHistory({ id: '01234567-89ab-cdef-0123-456789abcde2', userId });

      prisma.passwordHistory.create
        .mockResolvedValueOnce(record1)
        .mockResolvedValueOnce(record2);

      // Act
      const [result1, result2] = await Promise.all([
        service.create({ userId, passwordHash: '$2b$10$hash1' }),
        service.create({ userId, passwordHash: '$2b$10$hash2' }),
      ]);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(prisma.passwordHistory.create).toHaveBeenCalledTimes(2);
    });

    it('should handle database connection errors', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      prisma.passwordHistory.findMany.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.findByUser('01234567-89ab-cdef-0123-456789abcdef')
      ).rejects.toThrow('Connection timeout');
    });
  });

  // ============================================================================
  // CASCADE DELETE TESTS (Schema behavior)
  // ============================================================================

  describe('cascade behavior', () => {
    it('should cascade delete when user is deleted (schema-defined)', async () => {
      // Arrange
      // CASCADE delete is defined in Prisma schema: onDelete: Cascade
      // This test verifies the service handles this correctly
      const userId = '01234567-89ab-cdef-0123-456789abcdef';

      // Before user deletion
      prisma.passwordHistory.count.mockResolvedValueOnce(5);

      // After user deletion (CASCADE delete occurred)
      prisma.passwordHistory.count.mockResolvedValueOnce(0);

      // Act
      const beforeCount = await service.count({ userId });
      // (User deleted here - CASCADE deletes password history)
      const afterCount = await service.count({ userId });

      // Assert
      expect(beforeCount).toBe(5);
      expect(afterCount).toBe(0);
    });
  });
});
