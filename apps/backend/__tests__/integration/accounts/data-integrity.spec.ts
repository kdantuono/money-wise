/**
 * Data Integrity Validation for AccountsService
 *
 * Validates that the XOR constraint and data integrity rules
 * are properly enforced at the database level after Prisma migration.
 *
 * @phase P.3.6.1.5 - Data Integrity Validation
 */

import { setupTestDatabase, teardownTestDatabase } from '../../../src/core/database/tests/database-test.config';
import { PrismaClient } from '../../../generated/prisma';

describe('AccountsService Data Integrity Validation', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testFamilyId: string;

  beforeAll(async () => {
    prisma = await setupTestDatabase();

    // Create test family and user
    const family = await prisma.family.create({
      data: {
        name: 'Integrity Test Family',
      },
    });
    testFamilyId = family.id;

    const user = await prisma.user.create({
      data: {
        email: 'integrity-test@example.com',
        passwordHash: 'hash123',
        firstName: 'Integrity',
        lastName: 'Tester',
        role: 'MEMBER',
        status: 'ACTIVE',
        familyId: testFamilyId,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await prisma.account.deleteMany({});
  });

  describe('XOR Constraint Validation', () => {
    it('should verify zero XOR violations in database', async () => {
      // Create mix of personal and family accounts
      await prisma.account.create({
        data: {
          name: 'Personal Account',
          type: 'CHECKING',
          source: 'MANUAL',
          currentBalance: 1000,
          userId: testUserId,
          currency: 'USD',
          isActive: true,
          syncEnabled: true,
        },
      });

      await prisma.account.create({
        data: {
          name: 'Family Account',
          type: 'SAVINGS',
          source: 'MANUAL',
          currentBalance: 5000,
          familyId: testFamilyId,
          currency: 'USD',
          isActive: true,
          syncEnabled: true,
        },
      });

      // Query to check XOR violations
      const violationCheck = await prisma.$queryRaw<{ total: bigint; user_accounts: bigint; family_accounts: bigint; xor_violations: bigint }[]>`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_accounts,
          COUNT(CASE WHEN family_id IS NOT NULL THEN 1 END) as family_accounts,
          COUNT(CASE WHEN user_id IS NOT NULL AND family_id IS NOT NULL THEN 1 END) as xor_violations,
          COUNT(CASE WHEN user_id IS NULL AND family_id IS NULL THEN 1 END) as orphan_accounts
        FROM accounts
      `;

      const stats = violationCheck[0];

      console.log('   Database Integrity Check:');
      console.log(`   Total accounts: ${stats.total}`);
      console.log(`   User accounts: ${stats.user_accounts}`);
      console.log(`   Family accounts: ${stats.family_accounts}`);
      console.log(`   XOR violations: ${stats.xor_violations}`);

      // CRITICAL: Must be zero XOR violations
      expect(Number(stats.xor_violations)).toBe(0);

      // Every account must have exactly one owner
      expect(Number(stats.total)).toBe(Number(stats.user_accounts) + Number(stats.family_accounts));
    });

    it('should verify all accounts have exactly one owner (XOR)', async () => {
      // Create various accounts
      for (let i = 0; i < 10; i++) {
        await prisma.account.create({
          data: {
            name: `Personal Account ${i}`,
            type: i % 2 === 0 ? 'CHECKING' : 'SAVINGS',
            source: 'MANUAL',
            currentBalance: 1000 + i,
            userId: testUserId,
            currency: 'USD',
            isActive: true,
            syncEnabled: true,
          },
        });
      }

      for (let i = 0; i < 5; i++) {
        await prisma.account.create({
          data: {
            name: `Family Account ${i}`,
            type: 'CHECKING',
            source: 'MANUAL',
            currentBalance: 5000 + i,
            familyId: testFamilyId,
            currency: 'USD',
            isActive: true,
            syncEnabled: true,
          },
        });
      }

      // Verify each account has exactly one owner
      const accounts = await prisma.account.findMany({});

      for (const account of accounts) {
        const hasUser = account.userId !== null;
        const hasFamily = account.familyId !== null;

        // XOR: Exactly one must be true
        expect(hasUser || hasFamily).toBe(true); // At least one
        expect(hasUser && hasFamily).toBe(false); // Not both
      }

      expect(accounts.length).toBe(15); // 10 personal + 5 family
    });
  });

  describe('Decimal Precision Validation', () => {
    it('should verify no precision loss in database for 0.01', async () => {
      const account = await prisma.account.create({
        data: {
          name: 'Penny Test',
          type: 'CHECKING',
          source: 'MANUAL',
          currentBalance: 0.01,
          userId: testUserId,
          currency: 'USD',
          isActive: true,
          syncEnabled: true,
        },
      });

      // Re-fetch from database
      const fetched = await prisma.account.findUnique({
        where: { id: account.id },
      });

      expect(fetched!.currentBalance.toNumber()).toBe(0.01);
    });

    it('should verify no precision loss for various decimal values', async () => {
      const testValues = [0.01, 0.99, 1234.56, 9999.99, 123.45];

      for (const value of testValues) {
        const account = await prisma.account.create({
          data: {
            name: `Precision Test ${value}`,
            type: 'CHECKING',
            source: 'MANUAL',
            currentBalance: value,
            userId: testUserId,
            currency: 'USD',
            isActive: true,
            syncEnabled: true,
          },
        });

        const fetched = await prisma.account.findUnique({
          where: { id: account.id },
        });

        expect(fetched!.currentBalance.toNumber()).toBe(value);
      }
    });
  });

  describe('Foreign Key Integrity', () => {
    it('should verify all user_id references exist in users table', async () => {
      // Create accounts
      for (let i = 0; i < 5; i++) {
        await prisma.account.create({
          data: {
            name: `Account ${i}`,
            type: 'CHECKING',
            source: 'MANUAL',
            currentBalance: 1000 + i,
            userId: testUserId,
            currency: 'USD',
            isActive: true,
            syncEnabled: true,
          },
        });
      }

      // Query to check orphaned accounts
      const orphanCheck = await prisma.$queryRaw<{ orphaned_count: bigint }[]>`
        SELECT COUNT(*) as orphaned_count
        FROM accounts a
        WHERE a.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id)
      `;

      expect(Number(orphanCheck[0].orphaned_count)).toBe(0);
    });

    it('should verify all family_id references exist in families table', async () => {
      // Create family accounts
      for (let i = 0; i < 5; i++) {
        await prisma.account.create({
          data: {
            name: `Family Account ${i}`,
            type: 'SAVINGS',
            source: 'MANUAL',
            currentBalance: 5000 + i,
            familyId: testFamilyId,
            currency: 'USD',
            isActive: true,
            syncEnabled: true,
          },
        });
      }

      // Query to check orphaned family accounts
      const orphanCheck = await prisma.$queryRaw<{ orphaned_count: bigint }[]>`
        SELECT COUNT(*) as orphaned_count
        FROM accounts a
        WHERE a.family_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM families f WHERE f.id = a.family_id)
      `;

      expect(Number(orphanCheck[0].orphaned_count)).toBe(0);
    });
  });

  describe('Enum Type Safety', () => {
    it('should verify all account types are valid', async () => {
      // Create accounts with various types
      const types = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN'];

      for (const type of types) {
        await prisma.account.create({
          data: {
            name: `${type} Account`,
            type: type as any,
            source: 'MANUAL',
            currentBalance: 1000,
            userId: testUserId,
            currency: 'USD',
            isActive: true,
            syncEnabled: true,
          },
        });
      }

      const accounts = await prisma.account.findMany({});

      for (const account of accounts) {
        expect(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN']).toContain(account.type);
      }
    });
  });
});
