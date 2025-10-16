/**
 * AccountsService Integration Tests (Real Prisma Database)
 *
 * Tests the AccountsService with a real PostgreSQL test database
 * to validate the Prisma migration from TypeORM.
 *
 * Coverage:
 * - XOR constraint enforcement (userId XOR familyId)
 * - Family account authorization
 * - Decimal precision for monetary values
 * - Authorization checks (personal/family ownership)
 * - CRUD operations
 * - Business logic (getSummary, getBalance, syncAccount)
 *
 * @phase P.3.6.1.5 - Integration Validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../../../src/accounts/accounts.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { setupTestDatabase, teardownTestDatabase } from '../../../src/core/database/tests/database-test.config';
import { AccountType, AccountStatus, AccountSource, UserRole, PrismaClient } from '../../../generated/prisma';
import { CreateAccountDto } from '../../../src/accounts/dto/create-account.dto';
import { UpdateAccountDto } from '../../../src/accounts/dto/update-account.dto';

describe('AccountsService Integration Tests (Real Database)', () => {
  let service: AccountsService;
  let prisma: PrismaClient;

  // Test fixtures
  let testUserId: string;
  let testUserId2: string;
  let testFamilyId: string;
  let testFamilyId2: string;
  let testAccountId: string;

  beforeAll(async () => {
    prisma = await setupTestDatabase();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);

    // Create test families first (REQUIRED due to familyId constraint)
    const family1 = await prisma.family.create({
      data: {
        name: 'Test Family 1',
      },
    });
    testFamilyId = family1.id;

    const family2 = await prisma.family.create({
      data: {
        name: 'Test Family 2',
      },
    });
    testFamilyId2 = family2.id;

    // Create test users (familyId is REQUIRED)
    const user1 = await prisma.user.create({
      data: {
        email: 'test-user1@example.com',
        passwordHash: 'hash123',
        firstName: 'Test',
        lastName: 'User1',
        role: UserRole.MEMBER,
        status: 'ACTIVE',
        familyId: testFamilyId, // REQUIRED field
      },
    });
    testUserId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'test-user2@example.com',
        passwordHash: 'hash456',
        firstName: 'Test',
        lastName: 'User2',
        role: UserRole.MEMBER,
        status: 'ACTIVE',
        familyId: testFamilyId2, // REQUIRED field
      },
    });
    testUserId2 = user2.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean accounts before each test
    await prisma.account.deleteMany({});
  });

  describe('create()', () => {
    it('should create a personal account with userId', async () => {
      const createDto: CreateAccountDto = {
        name: 'Personal Checking',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 1000,
      };

      const account = await service.create(createDto, testUserId, undefined);

      expect(account).toBeDefined();
      expect(account.id).toBeDefined();
      expect(account.userId).toBe(testUserId);
      expect(account.name).toBe('Personal Checking');
      expect(account.type).toBe(AccountType.CHECKING);
      expect(account.currentBalance).toBe(1000);
      expect(account.currency).toBe('USD'); // Default
    });

    it('should create a family account with familyId', async () => {
      const createDto: CreateAccountDto = {
        name: 'Family Savings',
        type: AccountType.SAVINGS,
        source: AccountSource.MANUAL,
        currentBalance: 5000,
      };

      const account = await service.create(createDto, undefined, testFamilyId);

      expect(account).toBeDefined();
      expect(account.id).toBeDefined();
      expect(account.userId).toBeNull();
      expect(account.name).toBe('Family Savings');
      expect(account.currentBalance).toBe(5000);
    });

    it('should reject creation with both userId and familyId (XOR violation)', async () => {
      const createDto: CreateAccountDto = {
        name: 'Invalid Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 0,
      };

      await expect(
        service.create(createDto, testUserId, testFamilyId)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(createDto, testUserId, testFamilyId)
      ).rejects.toThrow('Exactly one of userId or familyId must be provided');
    });

    it('should reject creation with neither userId nor familyId (XOR violation)', async () => {
      const createDto: CreateAccountDto = {
        name: 'Invalid Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 0,
      };

      await expect(
        service.create(createDto, undefined, undefined)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(createDto, undefined, undefined)
      ).rejects.toThrow('Exactly one of userId or familyId must be provided');
    });

    it('should allow negative balance for credit accounts', async () => {
      const createDto: CreateAccountDto = {
        name: 'Credit Card',
        type: AccountType.CREDIT_CARD,
        source: AccountSource.MANUAL,
        currentBalance: -500, // Negative balance (owe $500)
      };

      const account = await service.create(createDto, testUserId, undefined);

      expect(account.currentBalance).toBe(-500);
    });

    it('should handle decimal precision correctly (0.01)', async () => {
      const createDto: CreateAccountDto = {
        name: 'Penny Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 0.01,
      };

      const account = await service.create(createDto, testUserId, undefined);

      expect(account.currentBalance).toBe(0.01);
    });
  });

  describe('findAll()', () => {
    beforeEach(async () => {
      // Create test accounts
      await service.create(
        { name: 'Account 1', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 1000 },
        testUserId,
        undefined
      );
      await service.create(
        { name: 'Account 2', type: AccountType.SAVINGS, source: AccountSource.MANUAL, currentBalance: 2000 },
        testUserId,
        undefined
      );
      await service.create(
        { name: 'Other User Account', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 3000 },
        testUserId2,
        undefined
      );
      await service.create(
        { name: 'Family Account', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 5000 },
        undefined,
        testFamilyId
      );
    });

    it('should find all accounts for a user', async () => {
      const accounts = await service.findAll(testUserId, undefined);

      expect(accounts).toHaveLength(2);
      expect(accounts.every(acc => acc.userId === testUserId)).toBe(true);
    });

    it('should find all accounts for a family', async () => {
      const accounts = await service.findAll(undefined, testFamilyId);

      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Family Account');
    });

    it('should return empty array when user has no accounts', async () => {
      const newFamily = await prisma.family.create({
        data: {
          name: 'New User Family',
        },
      });

      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@example.com',
          passwordHash: 'hash',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.MEMBER,
          status: 'ACTIVE',
          familyId: newFamily.id, // REQUIRED field
        },
      });

      const accounts = await service.findAll(newUser.id, undefined);

      expect(accounts).toEqual([]);
    });

    it('should reject with neither userId nor familyId (XOR violation)', async () => {
      await expect(
        service.findAll(undefined, undefined)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject with both userId and familyId (XOR violation)', async () => {
      await expect(
        service.findAll(testUserId, testFamilyId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne()', () => {
    beforeEach(async () => {
      const account = await service.create(
        { name: 'Test Account', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 1500 },
        testUserId,
        undefined
      );
      testAccountId = account.id;
    });

    it('should find account when user owns it', async () => {
      const account = await service.findOne(testAccountId, testUserId, undefined, UserRole.MEMBER);

      expect(account).toBeDefined();
      expect(account.id).toBe(testAccountId);
      expect(account.userId).toBe(testUserId);
    });

    it('should throw NotFoundException when account does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.findOne(fakeId, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findOne(fakeId, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow(`Account with ID ${fakeId} not found`);
    });

    it('should throw ForbiddenException when user does not own account', async () => {
      await expect(
        service.findOne(testAccountId, testUserId2, undefined, UserRole.MEMBER)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.findOne(testAccountId, testUserId2, undefined, UserRole.MEMBER)
      ).rejects.toThrow('Access denied to this account');
    });

    it('should allow admin access to any account', async () => {
      const account = await service.findOne(testAccountId, testUserId2, undefined, UserRole.ADMIN);

      expect(account).toBeDefined();
      expect(account.id).toBe(testAccountId);
    });

    it('should allow family member to access family account', async () => {
      const familyAccount = await service.create(
        { name: 'Family Account', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 10000 },
        undefined,
        testFamilyId
      );

      const account = await service.findOne(familyAccount.id, undefined, testFamilyId, UserRole.MEMBER);

      expect(account).toBeDefined();
      expect(account.id).toBe(familyAccount.id);
    });

    it('should allow admin to access family account without providing familyId', async () => {
      const familyAccount = await service.create(
        { name: 'Family Account', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 10000 },
        undefined,
        testFamilyId
      );

      // Admin accesses family account without providing familyId
      const account = await service.findOne(familyAccount.id, testUserId2, undefined, UserRole.ADMIN);

      expect(account).toBeDefined();
      expect(account.id).toBe(familyAccount.id);
      expect(account.userId).toBeNull(); // Verify it's a family account (not a personal account)
    });
  });

  describe('update()', () => {
    beforeEach(async () => {
      const account = await service.create(
        { name: 'Original Name', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 1000 },
        testUserId,
        undefined
      );
      testAccountId = account.id;
    });

    it('should update account when user owns it', async () => {
      const updateDto: UpdateAccountDto = {
        name: 'Updated Name',
        currentBalance: 2000,
      };

      const updated = await service.update(testAccountId, updateDto, testUserId, undefined, UserRole.MEMBER);

      expect(updated.name).toBe('Updated Name');
      expect(updated.currentBalance).toBe(2000);
    });

    it('should throw NotFoundException when account does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateAccountDto = { name: 'New Name' };

      await expect(
        service.update(fakeId, updateDto, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own account', async () => {
      const updateDto: UpdateAccountDto = { name: 'Hacked Name' };

      await expect(
        service.update(testAccountId, updateDto, testUserId2, undefined, UserRole.MEMBER)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update any account', async () => {
      const updateDto: UpdateAccountDto = { name: 'Admin Updated' };

      const updated = await service.update(testAccountId, updateDto, testUserId2, undefined, UserRole.ADMIN);

      expect(updated.name).toBe('Admin Updated');
    });

    it('should update partial fields without affecting others', async () => {
      const updateDto: UpdateAccountDto = { currentBalance: 3000 };

      const updated = await service.update(testAccountId, updateDto, testUserId, undefined, UserRole.MEMBER);

      expect(updated.currentBalance).toBe(3000);
      expect(updated.name).toBe('Original Name'); // Unchanged
    });
  });

  describe('remove()', () => {
    beforeEach(async () => {
      const account = await service.create(
        { name: 'Account to Delete', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 1000 },
        testUserId,
        undefined
      );
      testAccountId = account.id;
    });

    it('should delete account when user owns it', async () => {
      await service.remove(testAccountId, testUserId, undefined, UserRole.MEMBER);

      // Verify deletion
      const deleted = await prisma.account.findUnique({
        where: { id: testAccountId },
      });

      expect(deleted).toBeNull();
    });

    it('should throw NotFoundException when account does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.remove(fakeId, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own account', async () => {
      await expect(
        service.remove(testAccountId, testUserId2, undefined, UserRole.MEMBER)
      ).rejects.toThrow(ForbiddenException);

      // Verify account still exists
      const account = await prisma.account.findUnique({
        where: { id: testAccountId },
      });

      expect(account).not.toBeNull();
    });

    it('should allow admin to delete any account', async () => {
      await service.remove(testAccountId, testUserId2, undefined, UserRole.ADMIN);

      const deleted = await prisma.account.findUnique({
        where: { id: testAccountId },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('getBalance()', () => {
    beforeEach(async () => {
      const account = await service.create(
        {
          name: 'Balance Test',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1234.56,
          availableBalance: 1000.50,
        },
        testUserId,
        undefined
      );
      testAccountId = account.id;
    });

    it('should return account balance when user owns it', async () => {
      const balance = await service.getBalance(testAccountId, testUserId, undefined, UserRole.MEMBER);

      expect(balance.currentBalance).toBe(1234.56);
      expect(balance.availableBalance).toBe(1000.50);
      expect(balance.currency).toBe('USD');
    });

    it('should handle decimal precision correctly (0.01)', async () => {
      const pennyAccount = await service.create(
        {
          name: 'Penny Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 0.01,
        },
        testUserId,
        undefined
      );

      const balance = await service.getBalance(pennyAccount.id, testUserId, undefined, UserRole.MEMBER);

      expect(balance.currentBalance).toBe(0.01);
    });

    it('should throw NotFoundException when account does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.getBalance(fakeId, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own account', async () => {
      await expect(
        service.getBalance(testAccountId, testUserId2, undefined, UserRole.MEMBER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSummary()', () => {
    beforeEach(async () => {
      await service.create(
        { name: 'Checking 1', type: AccountType.CHECKING, source: AccountSource.MANUAL, currentBalance: 1000 },
        testUserId,
        undefined
      );
      await service.create(
        { name: 'Savings 1', type: AccountType.SAVINGS, source: AccountSource.MANUAL, currentBalance: 5000 },
        testUserId,
        undefined
      );
      await service.create(
        { name: 'Credit Card', type: AccountType.CREDIT_CARD, source: AccountSource.MANUAL, currentBalance: 0 },
        testUserId,
        undefined
      );
    });

    it('should return summary statistics for user accounts', async () => {
      const summary = await service.getSummary(testUserId, undefined);

      expect(summary.totalAccounts).toBe(3);
      expect(summary.totalBalance).toBe(6000); // 1000 + 5000 + 0
      expect(summary.activeAccounts).toBe(3);
    });

    it('should group accounts by type with count and totalBalance', async () => {
      const summary = await service.getSummary(testUserId, undefined);

      expect(summary.byType[AccountType.CHECKING]).toEqual({
        count: 1,
        totalBalance: 1000,
      });
      expect(summary.byType[AccountType.SAVINGS]).toEqual({
        count: 1,
        totalBalance: 5000,
      });
      expect(summary.byType[AccountType.CREDIT_CARD]).toEqual({
        count: 1,
        totalBalance: 0,
      });
    });

    it('should return empty summary when user has no accounts', async () => {
      const emptyFamily = await prisma.family.create({
        data: {
          name: 'Empty User Family',
        },
      });

      const newUser = await prisma.user.create({
        data: {
          email: 'emptyuser@example.com',
          passwordHash: 'hash',
          firstName: 'Empty',
          lastName: 'User',
          role: UserRole.MEMBER,
          status: 'ACTIVE',
          familyId: emptyFamily.id, // REQUIRED field
        },
      });

      const summary = await service.getSummary(newUser.id, undefined);

      expect(summary.totalAccounts).toBe(0);
      expect(summary.totalBalance).toBe(0);
      expect(summary.activeAccounts).toBe(0);
      expect(summary.byType).toEqual({});
    });

    it('should reject with neither userId nor familyId (XOR violation)', async () => {
      await expect(
        service.getSummary(undefined, undefined)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject with both userId and familyId (XOR violation)', async () => {
      await expect(
        service.getSummary(testUserId, testFamilyId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('syncAccount()', () => {
    let plaidAccountId: string;
    let manualAccountId: string;

    beforeEach(async () => {
      const plaidAccount = await service.create(
        {
          name: 'Plaid Account',
          type: AccountType.CHECKING,
          source: AccountSource.PLAID,
          currentBalance: 2000,
          plaidAccountId: 'plaid_123',
        },
        testUserId,
        undefined
      );
      plaidAccountId = plaidAccount.id;

      const manualAccount = await service.create(
        {
          name: 'Manual Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
        },
        testUserId,
        undefined
      );
      manualAccountId = manualAccount.id;
    });

    it('should sync PLAID account when user owns it', async () => {
      const synced = await service.syncAccount(plaidAccountId, testUserId, undefined, UserRole.MEMBER);

      expect(synced).toBeDefined();
      expect(synced.lastSyncAt).toBeInstanceOf(Date);
      expect(synced.syncError).toBeNull();
    });

    it('should reject syncing MANUAL account', async () => {
      await expect(
        service.syncAccount(manualAccountId, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.syncAccount(manualAccountId, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow('This operation requires a PLAID account');
    });

    it('should throw NotFoundException when account does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.syncAccount(fakeId, testUserId, undefined, UserRole.MEMBER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own account', async () => {
      await expect(
        service.syncAccount(plaidAccountId, testUserId2, undefined, UserRole.MEMBER)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
