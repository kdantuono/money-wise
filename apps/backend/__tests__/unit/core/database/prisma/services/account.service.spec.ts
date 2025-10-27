/**
 * PrismaAccountService Unit Tests (TDD Approach)
 *
 * Test suite for Account entity CRUD operations, dual ownership, and relationships using Prisma.
 * Written BEFORE implementation following Test-Driven Development methodology.
 *
 * Account entity is MEDIUM COMPLEXITY:
 * - 24 fields vs Family's 3 fields, User's 18 fields
 * - Dual ownership model (userId XOR familyId) - complex validation
 * - Enums (AccountType, AccountStatus, AccountSource)
 * - Money fields (Decimal for precise financial calculations)
 * - Plaid integration (4 fields, unique plaidAccountId)
 * - Relations (User, Family, Transaction[])
 * - CASCADE delete behavior (Account deleted → Transactions CASCADE deleted)
 *
 * Coverage Target: 80%+ for all metrics
 * Test Categories: Create (User/Family-owned), FindOne, Update, Delete, Relations, XOR Validation
 *
 * @phase Phase 2 - Core Entities Migration (TASK-1.5-P.2.9)
 */

import { Test, TestingModule } from '@nestjs/testing';
import type {
  PrismaClient,
  Account,
  User,
  Family,
  Transaction,
  AccountType,
  AccountStatus,
  AccountSource
} from '../../../../../../generated/prisma';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../../../../../src/core/database/prisma/prisma.service';
import { PrismaAccountService } from '../../../../../../src/core/database/prisma/services/account.service';
import type { CreateAccountDto } from '../../../../../../src/core/database/prisma/dto/create-account.dto';
import type { UpdateAccountDto } from '../../../../../../src/core/database/prisma/dto/update-account.dto';
import type {
  FindAllOptions,
  RelationOptions,
  AccountWithRelations
} from '../../../../../../src/core/database/prisma/services/account.service';

// Mock PrismaClient type with all Account model methods
type MockPrismaClient = DeepMockProxy<PrismaClient> & {
  account: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  transaction: {
    count: jest.Mock;
  };
};

describe('PrismaAccountService', () => {
  let service: PrismaAccountService;
  let prisma: MockPrismaClient;

  /**
   * Test Data Factory - Mock Account (User-owned)
   */
  const createMockUserAccount = (overrides: Partial<Account> = {}): Account => ({
    id: 'a1234567-89ab-cdef-0123-456789abcdef',
    name: 'Personal Checking',
    type: 'CHECKING' as AccountType,
    status: 'ACTIVE' as AccountStatus,
    source: 'MANUAL' as AccountSource,
    currentBalance: '1000.00' as any, // Prisma Decimal as string
    availableBalance: '950.00' as any,
    creditLimit: null,
    currency: 'USD',
    institutionName: 'Chase Bank',
    accountNumber: null,
    routingNumber: null,
    plaidAccountId: null,
    plaidItemId: null,
    plaidAccessToken: null,
    plaidMetadata: null,
    isActive: true,
    syncEnabled: true,
    lastSyncAt: null,
    syncError: null,
    settings: null,
    bankingProvider: null,
    saltEdgeAccountId: null,
    saltEdgeConnectionId: null,
    tinkAccountId: null,
    yalilyAccountId: null,
    syncStatus: 'PENDING' as any,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    userId: 'u1234567-89ab-cdef-0123-456789abcdef',
    familyId: null,
    ...overrides,
  });

  /**
   * Test Data Factory - Mock Account (Family-owned)
   */
  const createMockFamilyAccount = (overrides: Partial<Account> = {}): Account => ({
    id: 'a2345678-89ab-cdef-0123-456789abcdef',
    name: 'Family Savings',
    type: 'SAVINGS' as AccountType,
    status: 'ACTIVE' as AccountStatus,
    source: 'MANUAL' as AccountSource,
    currentBalance: '5000.00' as any,
    availableBalance: '5000.00' as any,
    creditLimit: null,
    currency: 'USD',
    institutionName: 'Wells Fargo',
    accountNumber: null,
    routingNumber: null,
    plaidAccountId: null,
    plaidItemId: null,
    plaidAccessToken: null,
    plaidMetadata: null,
    isActive: true,
    syncEnabled: true,
    lastSyncAt: null,
    syncError: null,
    settings: null,
    bankingProvider: null,
    saltEdgeAccountId: null,
    saltEdgeConnectionId: null,
    tinkAccountId: null,
    yalilyAccountId: null,
    syncStatus: 'PENDING' as any,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    userId: null,
    familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
    ...overrides,
  });

  /**
   * Test Data Factory - Mock User
   */
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'u1234567-89ab-cdef-0123-456789abcdef',
    email: 'user@example.com',
    passwordHash: '$2b$10$hash',
    firstName: 'John',
    lastName: 'Doe',
    role: 'MEMBER' as any,
    status: 'ACTIVE' as any,
    avatar: null,
    timezone: null,
    currency: 'USD',
    preferences: null,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
    ...overrides,
  });

  /**
   * Test Data Factory - Mock Family
   */
  const createMockFamily = (overrides: Partial<Family> = {}): Family => ({
    id: 'f1234567-89ab-cdef-0123-456789abcdef',
    name: 'Smith Family',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

  /**
   * Test Data Factory - Account with Relations
   */
  const createMockAccountWithRelations = (
    overrides: Partial<Account> & Partial<{
      user: User | null;
      family: Family | null;
      transactions: Transaction[];
    }> = {}
  ): AccountWithRelations => ({
    ...createMockUserAccount(),
    user: null,
    family: null,
    transactions: [],
    ...overrides,
  });

  beforeEach(async () => {
    // Create deep mock of PrismaClient
    prisma = mockDeep<PrismaClient>() as any;

    // Create testing module with mocked PrismaService and real PrismaAccountService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        PrismaAccountService,
      ],
    }).compile();

    service = module.get<PrismaAccountService>(PrismaAccountService);
  });

  afterEach(() => {
    // Reset all mocks between tests
    mockReset(prisma);
  });

  // ============================================================================
  // SETUP & TEARDOWN TESTS
  // ============================================================================

  describe('Setup & Teardown', () => {
    it('should initialize service successfully', () => {
      // Assert
      expect(service).toBeDefined();
      expect(prisma).toBeDefined();
    });

    it('should clean up test data after each test', () => {
      // Assert
      // mockReset is called in afterEach, verify it worked
      expect(prisma.account.create).not.toHaveBeenCalled();
      expect(prisma.account.findUnique).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CREATE TESTS - USER-OWNED ACCOUNTS
  // ============================================================================

  describe('create() - User-owned accounts', () => {
    const validUserAccountDto: CreateAccountDto = {
      name: 'My Checking Account',
      type: 'CHECKING' as AccountType,
      source: 'MANUAL' as AccountSource,
      userId: 'u1234567-89ab-cdef-0123-456789abcdef',
    };

    it('should create user account with valid data', async () => {
      // Arrange
      const expectedAccount = createMockUserAccount({
        id: 'new-account-id',
        name: validUserAccountDto.name,
        type: validUserAccountDto.type,
        userId: validUserAccountDto.userId,
        familyId: null,
        createdAt: new Date('2025-10-11T10:00:00Z'),
        updatedAt: new Date('2025-10-11T10:00:00Z'),
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(validUserAccountDto);

      // Assert
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          name: validUserAccountDto.name,
          type: validUserAccountDto.type,
          status: 'ACTIVE',
          source: validUserAccountDto.source,
          currentBalance: 0.00,
          availableBalance: null,
          creditLimit: null,
          currency: 'USD',
          institutionName: null,
          plaidAccountId: null,
          plaidItemId: null,
          plaidAccessToken: null,
          plaidMetadata: null,
          settings: null,
          userId: validUserAccountDto.userId,
          familyId: null,
        },
      });
      expect(result).toEqual(expectedAccount);
      expect(result.userId).toBe(validUserAccountDto.userId);
      expect(result.familyId).toBeNull();
    });

    it('should require name field', async () => {
      // Arrange
      const invalidDto = {
        type: 'CHECKING',
        source: 'MANUAL',
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        // name missing!
      } as CreateAccountDto;

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/name.*required/i);
    });

    it('should default type to OTHER', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account without type',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        // type not specified
      };

      const expectedAccount = createMockUserAccount({
        type: 'OTHER' as AccountType,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.type).toBe('OTHER');
    });

    it('should default status to ACTIVE', async () => {
      // Arrange
      const expectedAccount = createMockUserAccount({
        status: 'ACTIVE' as AccountStatus,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(validUserAccountDto);

      // Assert
      expect(result.status).toBe('ACTIVE');
    });

    it('should require source (PLAID or MANUAL)', async () => {
      // Arrange
      const invalidDto = {
        name: 'Account',
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        // source missing!
      } as CreateAccountDto;

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/source.*required/i);
    });

    it('should default currentBalance to 0', async () => {
      // Arrange
      const expectedAccount = createMockUserAccount({
        currentBalance: '0.00' as any,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(validUserAccountDto);

      // Assert
      expect(result.currentBalance).toBe('0.00');
    });

    it('should enforce userId XOR familyId (userId set, familyId null)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'User Account',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        familyId: null, // Explicitly null
      };

      const expectedAccount = createMockUserAccount({
        userId: dto.userId,
        familyId: null,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.userId).toBe(dto.userId);
      expect(result.familyId).toBeNull();
    });

    it('should validate userId exists (foreign key)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account',
        source: 'MANUAL' as AccountSource,
        userId: '00000000-0000-0000-0000-000000000000', // Non-existent user
      };

      const error = new Error('Foreign key constraint failed on the field: `userId`');
      prisma.account.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/foreign key/i);
    });

    it('should reject invalid UUID format for userId', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account',
        source: 'MANUAL' as AccountSource,
        userId: 'not-a-uuid',
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/uuid/i);
    });

    it('should reject when both userId AND familyId set (XOR violation)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Invalid Account',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef', // Both set!
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/userId.*familyId.*xor/i);
    });
  });

  // ============================================================================
  // CREATE TESTS - FAMILY-OWNED ACCOUNTS
  // ============================================================================

  describe('create() - Family-owned accounts', () => {
    const validFamilyAccountDto: CreateAccountDto = {
      name: 'Family Checking',
      type: 'CHECKING' as AccountType,
      source: 'MANUAL' as AccountSource,
      familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
    };

    it('should create family account with valid data', async () => {
      // Arrange
      const expectedAccount = createMockFamilyAccount({
        id: 'new-family-account-id',
        name: validFamilyAccountDto.name,
        familyId: validFamilyAccountDto.familyId,
        userId: null,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(validFamilyAccountDto);

      // Assert
      expect(result.familyId).toBe(validFamilyAccountDto.familyId);
      expect(result.userId).toBeNull();
    });

    it('should enforce userId XOR familyId (familyId set, userId null)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Family Account',
        source: 'MANUAL' as AccountSource,
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
        userId: null, // Explicitly null
      };

      const expectedAccount = createMockFamilyAccount({
        familyId: dto.familyId,
        userId: null,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.familyId).toBe(dto.familyId);
      expect(result.userId).toBeNull();
    });

    it('should validate familyId exists (foreign key)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account',
        source: 'MANUAL' as AccountSource,
        familyId: '00000000-0000-0000-0000-000000000000', // Non-existent family
      };

      const error = new Error('Foreign key constraint failed on the field: `familyId`');
      prisma.account.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/foreign key/i);
    });

    it('should reject invalid UUID format for familyId', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account',
        source: 'MANUAL' as AccountSource,
        familyId: 'not-a-uuid',
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/uuid/i);
    });

    it('should reject when both userId AND familyId set (XOR violation)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Invalid Account',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef', // Both set!
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/userId.*familyId.*xor/i);
    });

    it('should reject when neither userId NOR familyId set (XOR violation)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Invalid Account',
        source: 'MANUAL' as AccountSource,
        // Both userId and familyId missing!
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/userId.*familyId.*required/i);
    });

    it('should allow multiple accounts for same family', async () => {
      // Arrange
      const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';
      const account1 = createMockFamilyAccount({ id: 'account-1', familyId });
      const account2 = createMockFamilyAccount({ id: 'account-2', familyId });

      prisma.account.create
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);

      // Act
      const result1 = await service.create({ name: 'Account 1', source: 'MANUAL' as AccountSource, familyId });
      const result2 = await service.create({ name: 'Account 2', source: 'MANUAL' as AccountSource, familyId });

      // Assert
      expect(result1.familyId).toBe(familyId);
      expect(result2.familyId).toBe(familyId);
      expect(result1.id).not.toBe(result2.id);
    });

    it('should allow multiple accounts for same user', async () => {
      // Arrange
      const userId = 'u1234567-89ab-cdef-0123-456789abcdef';
      const account1 = createMockUserAccount({ id: 'account-1', userId });
      const account2 = createMockUserAccount({ id: 'account-2', userId });

      prisma.account.create
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);

      // Act
      const result1 = await service.create({ name: 'Account 1', source: 'MANUAL' as AccountSource, userId });
      const result2 = await service.create({ name: 'Account 2', source: 'MANUAL' as AccountSource, userId });

      // Assert
      expect(result1.userId).toBe(userId);
      expect(result2.userId).toBe(userId);
      expect(result1.id).not.toBe(result2.id);
    });
  });

  // ============================================================================
  // CREATE TESTS - PLAID INTEGRATION
  // ============================================================================

  describe('create() - Plaid integration', () => {
    it('should store Plaid fields when source=PLAID', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Plaid Checking',
        type: 'CHECKING' as AccountType,
        source: 'PLAID' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        plaidAccountId: 'plaid_account_123',
        plaidItemId: 'plaid_item_456',
        plaidAccessToken: 'access-sandbox-token',
        plaidMetadata: { mask: '1234', subtype: 'checking' },
      };

      const expectedAccount = createMockUserAccount({
        source: 'PLAID' as AccountSource,
        plaidAccountId: 'plaid_account_123',
        plaidItemId: 'plaid_item_456',
        plaidAccessToken: 'access-sandbox-token',
        plaidMetadata: { mask: '1234', subtype: 'checking' },
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.source).toBe('PLAID');
      expect(result.plaidAccountId).toBe('plaid_account_123');
      expect(result.plaidItemId).toBe('plaid_item_456');
      expect(result.plaidAccessToken).toBe('access-sandbox-token');
      expect(result.plaidMetadata).toEqual({ mask: '1234', subtype: 'checking' });
    });

    it('should enforce plaidAccountId uniqueness', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Duplicate Plaid Account',
        source: 'PLAID' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        plaidAccountId: 'existing_plaid_account',
      };

      const error = new Error('Unique constraint failed on the fields: (`plaidAccountId`)');
      prisma.account.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/unique/i);
    });

    it('should store plaidMetadata as JSONB', async () => {
      // Arrange
      const metadata = {
        mask: '4567',
        subtype: 'credit card',
        officialName: 'Chase Freedom Unlimited',
        persistentAccountId: 'persistent_123',
      };

      const dto: CreateAccountDto = {
        name: 'Plaid Credit Card',
        type: 'CREDIT_CARD' as AccountType,
        source: 'PLAID' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        plaidAccountId: 'plaid_cc_789',
        plaidMetadata: metadata,
      };

      const expectedAccount = createMockUserAccount({
        plaidMetadata: metadata,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.plaidMetadata).toEqual(metadata);
      expect(typeof result.plaidMetadata).toBe('object');
    });

    it('should allow multiple accounts with same plaidItemId (checking + savings)', async () => {
      // Arrange
      const plaidItemId = 'plaid_item_shared';
      const account1 = createMockUserAccount({
        id: 'account-1',
        type: 'CHECKING' as AccountType,
        plaidItemId,
        plaidAccountId: 'plaid_checking',
      });
      const account2 = createMockUserAccount({
        id: 'account-2',
        type: 'SAVINGS' as AccountType,
        plaidItemId,
        plaidAccountId: 'plaid_savings',
      });

      prisma.account.create
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);

      // Act
      const result1 = await service.create({
        name: 'Checking',
        source: 'PLAID' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        plaidItemId,
        plaidAccountId: 'plaid_checking',
      });
      const result2 = await service.create({
        name: 'Savings',
        source: 'PLAID' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        plaidItemId,
        plaidAccountId: 'plaid_savings',
      });

      // Assert
      expect(result1.plaidItemId).toBe(plaidItemId);
      expect(result2.plaidItemId).toBe(plaidItemId);
      expect(result1.plaidAccountId).not.toBe(result2.plaidAccountId);
    });

    it('should handle plaidAccessToken securely', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Secure Plaid Account',
        source: 'PLAID' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        plaidAccessToken: 'access-sandbox-very-long-secure-token-12345',
      };

      const expectedAccount = createMockUserAccount({
        plaidAccessToken: 'access-sandbox-very-long-secure-token-12345',
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.plaidAccessToken).toBeDefined();
      expect(result.plaidAccessToken).toHaveLength(43); // Actual token length
    });

    it('should allow null Plaid fields when source=MANUAL', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Manual Account',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        // No Plaid fields
      };

      const expectedAccount = createMockUserAccount({
        source: 'MANUAL' as AccountSource,
        plaidAccountId: null,
        plaidItemId: null,
        plaidAccessToken: null,
        plaidMetadata: null,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.source).toBe('MANUAL');
      expect(result.plaidAccountId).toBeNull();
      expect(result.plaidItemId).toBeNull();
      expect(result.plaidAccessToken).toBeNull();
      expect(result.plaidMetadata).toBeNull();
    });
  });

  // ============================================================================
  // CREATE TESTS - MONEY FIELDS (DECIMAL)
  // ============================================================================

  describe('create() - Money fields (Decimal)', () => {
    it('should store currentBalance as Decimal with 2 decimal places', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account with Balance',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        currentBalance: 1234.56,
      };

      const expectedAccount = createMockUserAccount({
        currentBalance: '1234.56' as any,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.currentBalance).toBe('1234.56');
    });

    it('should handle large balance values (up to 15 digits)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Large Balance Account',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        currentBalance: 9999999999999.99, // Max: 13 digits + 2 decimals = 15
      };

      const expectedAccount = createMockUserAccount({
        currentBalance: '9999999999999.99' as any,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.currentBalance).toBe('9999999999999.99');
    });

    it('should store availableBalance as optional Decimal', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account with Available Balance',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        currentBalance: 1000.00,
        availableBalance: 950.50,
      };

      const expectedAccount = createMockUserAccount({
        currentBalance: '1000.00' as any,
        availableBalance: '950.50' as any,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.currentBalance).toBe('1000.00');
      expect(result.availableBalance).toBe('950.50');
    });

    it('should store creditLimit for credit cards', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Credit Card',
        type: 'CREDIT_CARD' as AccountType,
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        currentBalance: -500.00, // Negative for debt
        creditLimit: 5000.00,
      };

      const expectedAccount = createMockUserAccount({
        type: 'CREDIT_CARD' as AccountType,
        currentBalance: '-500.00' as any,
        creditLimit: '5000.00' as any,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.creditLimit).toBe('5000.00');
      expect(result.currentBalance).toBe('-500.00');
    });

    it('should default currency to USD', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Account',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
      };

      const expectedAccount = createMockUserAccount({
        currency: 'USD',
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.currency).toBe('USD');
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne()', () => {
    const existingAccountId = 'a1234567-89ab-cdef-0123-456789abcdef';

    it('should find account by ID', async () => {
      // Arrange
      const expectedAccount = createMockUserAccount({ id: existingAccountId });
      prisma.account.findUnique.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.findOne(existingAccountId);

      // Assert
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: existingAccountId },
      });
      expect(result).toEqual(expectedAccount);
    });

    it('should return null for non-existent ID', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      prisma.account.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findOne(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });

    it('should validate UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow(/uuid/i);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      // Arrange
      const invalidId = 'invalid-uuid-format';

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow();
    });
  });

  // ============================================================================
  // FIND BY USER ID TESTS
  // ============================================================================

  describe('findByUserId()', () => {
    const userId = 'u1234567-89ab-cdef-0123-456789abcdef';

    it('should find all accounts for a user', async () => {
      // Arrange
      const userAccounts = [
        createMockUserAccount({ id: 'account-1', userId }),
        createMockUserAccount({ id: 'account-2', userId }),
      ];

      prisma.account.findMany.mockResolvedValue(userAccounts);

      // Act
      const result = await service.findByUserId(userId);

      // Assert
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toHaveLength(2);
      expect(result.every(a => a.userId === userId)).toBe(true);
    });

    it('should return empty array when user has no accounts', async () => {
      // Arrange
      prisma.account.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findByUserId(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should validate userId UUID format', async () => {
      // Arrange
      const invalidUserId = 'not-a-uuid';

      // Act & Assert
      await expect(service.findByUserId(invalidUserId)).rejects.toThrow(/uuid/i);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const activeAccounts = [
        createMockUserAccount({ userId, status: 'ACTIVE' as AccountStatus }),
      ];

      prisma.account.findMany.mockResolvedValue(activeAccounts);

      // Act
      const result = await service.findByUserId(userId, { status: 'ACTIVE' as AccountStatus });

      // Assert
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId, status: 'ACTIVE' },
      });
      expect(result.every(a => a.status === 'ACTIVE')).toBe(true);
    });
  });

  // ============================================================================
  // FIND BY FAMILY ID TESTS
  // ============================================================================

  describe('findByFamilyId()', () => {
    const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should find all accounts for a family', async () => {
      // Arrange
      const familyAccounts = [
        createMockFamilyAccount({ id: 'account-1', familyId }),
        createMockFamilyAccount({ id: 'account-2', familyId }),
      ];

      prisma.account.findMany.mockResolvedValue(familyAccounts);

      // Act
      const result = await service.findByFamilyId(familyId);

      // Assert
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { familyId },
      });
      expect(result).toHaveLength(2);
      expect(result.every(a => a.familyId === familyId)).toBe(true);
    });

    it('should return empty array when family has no accounts', async () => {
      // Arrange
      prisma.account.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findByFamilyId(familyId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should validate familyId UUID format', async () => {
      // Arrange
      const invalidFamilyId = 'not-a-uuid';

      // Act & Assert
      await expect(service.findByFamilyId(invalidFamilyId)).rejects.toThrow(/uuid/i);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const closedAccounts = [
        createMockFamilyAccount({ familyId, status: 'CLOSED' as AccountStatus }),
      ];

      prisma.account.findMany.mockResolvedValue(closedAccounts);

      // Act
      const result = await service.findByFamilyId(familyId, { status: 'CLOSED' as AccountStatus });

      // Assert
      expect(result.every(a => a.status === 'CLOSED')).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update()', () => {
    const accountId = 'a1234567-89ab-cdef-0123-456789abcdef';

    it('should update account name', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = {
        name: 'Updated Account Name',
      };

      const updatedAccount = createMockUserAccount({
        id: accountId,
        name: 'Updated Account Name',
        updatedAt: new Date('2025-10-11T15:00:00Z'),
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.update(accountId, updateDto);

      // Assert
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Account Name');
    });

    it('should update account type', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = {
        type: 'SAVINGS' as AccountType,
      };

      const updatedAccount = createMockUserAccount({
        type: 'SAVINGS' as AccountType,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.update(accountId, updateDto);

      // Assert
      expect(result.type).toBe('SAVINGS');
    });

    it('should update account status', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = {
        status: 'INACTIVE' as AccountStatus,
      };

      const updatedAccount = createMockUserAccount({
        status: 'INACTIVE' as AccountStatus,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.update(accountId, updateDto);

      // Assert
      expect(result.status).toBe('INACTIVE');
    });

    it('should update currentBalance', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = {
        currentBalance: 2500.75,
      };

      const updatedAccount = createMockUserAccount({
        currentBalance: '2500.75' as any,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.update(accountId, updateDto);

      // Assert
      expect(result.currentBalance).toBe('2500.75');
    });

    it('should update availableBalance and creditLimit', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = {
        availableBalance: 1800.00,
        creditLimit: 3000.00,
      };

      const updatedAccount = createMockUserAccount({
        availableBalance: '1800.00' as any,
        creditLimit: '3000.00' as any,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.update(accountId, updateDto);

      // Assert
      expect(result.availableBalance).toBe('1800.00');
      expect(result.creditLimit).toBe('3000.00');
    });

    it('should update sync settings (syncEnabled, lastSyncAt)', async () => {
      // Arrange
      const now = new Date('2025-10-11T12:00:00Z');
      const updateDto: UpdateAccountDto = {
        syncEnabled: false,
        lastSyncAt: now,
      };

      const updatedAccount = createMockUserAccount({
        syncEnabled: false,
        lastSyncAt: now,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.update(accountId, updateDto);

      // Assert
      expect(result.syncEnabled).toBe(false);
      expect(result.lastSyncAt).toEqual(now);
    });

    it('should NOT allow ownership change (userId/familyId immutable)', async () => {
      // Arrange
      const updateDto = {
        userId: 'new-user-id',
      } as UpdateAccountDto;

      // Act & Assert
      await expect(service.update(accountId, updateDto)).rejects.toThrow(/userId.*familyId.*immutable/i);
    });

    it('should validate UUID format for accountId', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.update(invalidId, { name: 'New Name' })).rejects.toThrow(/uuid/i);
    });
  });

  // ============================================================================
  // UPDATE BALANCE TESTS
  // ============================================================================

  describe('updateBalance()', () => {
    const accountId = 'a1234567-89ab-cdef-0123-456789abcdef';

    it('should update currentBalance with Decimal precision', async () => {
      // Arrange
      const newBalance = 1234.56;
      const updatedAccount = createMockUserAccount({
        currentBalance: '1234.56' as any,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      await service.updateBalance(accountId, newBalance);

      // Assert
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { currentBalance: newBalance },
      });
    });

    it('should update availableBalance separately', async () => {
      // Arrange
      const newAvailable = 900.00;
      const updatedAccount = createMockUserAccount({
        availableBalance: '900.00' as any,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      await service.updateBalance(accountId, undefined, newAvailable);

      // Assert
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { availableBalance: newAvailable },
      });
    });

    it('should handle negative balances (overdraft)', async () => {
      // Arrange
      const negativeBalance = -150.25;
      const updatedAccount = createMockUserAccount({
        currentBalance: '-150.25' as any,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      await service.updateBalance(accountId, negativeBalance);

      // Assert
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { currentBalance: negativeBalance },
      });
    });

    it('should validate accountId exists', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const error = new Error('Record to update not found');
      prisma.account.update.mockRejectedValue(error);

      // Act & Assert
      await expect(service.updateBalance(nonExistentId, 1000)).rejects.toThrow(/not found/i);
    });
  });

  // ============================================================================
  // UPDATE SYNC STATUS TESTS
  // ============================================================================

  describe('updateSyncStatus()', () => {
    const accountId = 'a1234567-89ab-cdef-0123-456789abcdef';

    it('should update lastSyncAt timestamp', async () => {
      // Arrange
      const now = new Date('2025-10-11T12:00:00Z');
      const updatedAccount = createMockUserAccount({
        lastSyncAt: now,
        syncError: null,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      await service.updateSyncStatus(accountId, now);

      // Assert
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { lastSyncAt: now, syncError: null },
      });
    });

    it('should clear syncError on successful sync', async () => {
      // Arrange
      const now = new Date();
      const updatedAccount = createMockUserAccount({
        lastSyncAt: now,
        syncError: null,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      await service.updateSyncStatus(accountId, now, null);

      // Assert
      expect(updatedAccount.syncError).toBeNull();
    });

    it('should set syncError on sync failure', async () => {
      // Arrange
      const errorMessage = 'Plaid item login required';
      const updatedAccount = createMockUserAccount({
        syncError: errorMessage,
        status: 'ERROR' as AccountStatus,
      });

      prisma.account.update.mockResolvedValue(updatedAccount);

      // Act
      await service.updateSyncStatus(accountId, new Date(), errorMessage);

      // Assert
      expect(updatedAccount.syncError).toBe(errorMessage);
      expect(updatedAccount.status).toBe('ERROR');
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe('delete()', () => {
    const accountId = 'a1234567-89ab-cdef-0123-456789abcdef';

    it('should delete account by ID', async () => {
      // Arrange
      const deletedAccount = createMockUserAccount({ id: accountId });
      prisma.account.delete.mockResolvedValue(deletedAccount);

      // Act
      await service.delete(accountId);

      // Assert
      expect(prisma.account.delete).toHaveBeenCalledWith({
        where: { id: accountId },
      });
    });

    it('should CASCADE delete related transactions', async () => {
      // Arrange
      // CASCADE is defined in schema (onDelete: Cascade)
      const deletedAccount = createMockUserAccount({ id: accountId });
      prisma.account.delete.mockResolvedValue(deletedAccount);

      // Act
      await service.delete(accountId);

      // Assert
      expect(prisma.account.delete).toHaveBeenCalled();
      // Related transactions deleted automatically by Prisma CASCADE
    });

    it('should throw NotFoundException for non-existent account', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const error = new Error('Record to delete does not exist');
      prisma.account.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(service.delete(nonExistentId)).rejects.toThrow(/not.*exist/i);
    });

    it('should validate UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(service.delete(invalidId)).rejects.toThrow(/uuid/i);
    });

    it('should permanently remove account (hard delete)', async () => {
      // Arrange
      const deletedAccount = createMockUserAccount({ id: accountId });
      prisma.account.delete.mockResolvedValue(deletedAccount);

      // Act
      await service.delete(accountId);

      // Find should return null after deletion
      prisma.account.findUnique.mockResolvedValue(null);
      const result = await service.findOne(accountId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // RELATIONS - USER TESTS
  // ============================================================================

  describe('Relations - User', () => {
    const accountId = 'a1234567-89ab-cdef-0123-456789abcdef';
    const userId = 'u1234567-89ab-cdef-0123-456789abcdef';

    it('should include user data when requested', async () => {
      // Arrange
      const user = createMockUser({ id: userId });
      const accountWithUser = createMockAccountWithRelations({
        id: accountId,
        userId,
        user,
      });

      prisma.account.findUnique.mockResolvedValue(accountWithUser);

      // Act
      const result = await service.findOneWithRelations(accountId, { user: true });

      // Assert
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: accountId },
        include: { user: true, family: false, transactions: false },
      });
      expect(result?.user).toBeDefined();
      expect(result?.user?.id).toBe(userId);
    });

    it('should handle null user for family accounts', async () => {
      // Arrange
      const familyAccount = createMockAccountWithRelations({
        id: accountId,
        familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
        userId: null,
        user: null,
      });

      prisma.account.findUnique.mockResolvedValue(familyAccount);

      // Act
      const result = await service.findOneWithRelations(accountId, { user: true });

      // Assert
      expect(result?.user).toBeNull();
      expect(result?.familyId).toBeDefined();
    });

    it('should cascade delete accounts when user deleted', async () => {
      // Arrange
      // CASCADE is defined in schema: User deleted → Accounts CASCADE deleted
      const userAccounts = [
        createMockUserAccount({ userId }),
      ];

      prisma.account.findMany.mockResolvedValue(userAccounts);

      // Simulate user deletion (accounts should be deleted automatically)
      prisma.account.findMany.mockResolvedValueOnce(userAccounts).mockResolvedValueOnce([]);

      // Act
      const before = await service.findByUserId(userId);
      const after = await service.findByUserId(userId); // After user deletion

      // Assert
      expect(before).toHaveLength(1);
      expect(after).toHaveLength(0);
    });
  });

  // ============================================================================
  // RELATIONS - FAMILY TESTS
  // ============================================================================

  describe('Relations - Family', () => {
    const accountId = 'a2345678-89ab-cdef-0123-456789abcdef';
    const familyId = 'f1234567-89ab-cdef-0123-456789abcdef';

    it('should include family data when requested', async () => {
      // Arrange
      const family = createMockFamily({ id: familyId });
      const accountWithFamily = createMockAccountWithRelations({
        id: accountId,
        familyId,
        family,
      });

      prisma.account.findUnique.mockResolvedValue(accountWithFamily);

      // Act
      const result = await service.findOneWithRelations(accountId, { family: true });

      // Assert
      expect(result?.family).toBeDefined();
      expect(result?.family?.id).toBe(familyId);
    });

    it('should handle null family for user accounts', async () => {
      // Arrange
      const userAccount = createMockAccountWithRelations({
        id: accountId,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        familyId: null,
        family: null,
      });

      prisma.account.findUnique.mockResolvedValue(userAccount);

      // Act
      const result = await service.findOneWithRelations(accountId, { family: true });

      // Assert
      expect(result?.family).toBeNull();
      expect(result?.userId).toBeDefined();
    });

    it('should cascade delete accounts when family deleted', async () => {
      // Arrange
      const familyAccounts = [
        createMockFamilyAccount({ familyId }),
      ];

      prisma.account.findMany.mockResolvedValue(familyAccounts);

      // Simulate family deletion
      prisma.account.findMany.mockResolvedValueOnce(familyAccounts).mockResolvedValueOnce([]);

      // Act
      const before = await service.findByFamilyId(familyId);
      const after = await service.findByFamilyId(familyId);

      // Assert
      expect(before).toHaveLength(1);
      expect(after).toHaveLength(0);
    });
  });

  // ============================================================================
  // RELATIONS - TRANSACTIONS TESTS
  // ============================================================================

  describe('Relations - Transactions', () => {
    const accountId = 'a1234567-89ab-cdef-0123-456789abcdef';

    it('should load account with transactions', async () => {
      // Arrange
      const transactions = [
        { id: 'tx-1', accountId, amount: '50.00' } as any,
        { id: 'tx-2', accountId, amount: '100.00' } as any,
      ];

      const accountWithTransactions = createMockAccountWithRelations({
        id: accountId,
        transactions,
      });

      prisma.account.findUnique.mockResolvedValue(accountWithTransactions);

      // Act
      const result = await service.findOneWithRelations(accountId, { transactions: true });

      // Assert
      expect(result?.transactions).toHaveLength(2);
      expect(result?.transactions?.[0].accountId).toBe(accountId);
    });

    it('should cascade delete transactions when account deleted', async () => {
      // Arrange
      const deletedAccount = createMockUserAccount({ id: accountId });
      prisma.account.delete.mockResolvedValue(deletedAccount);

      // Act
      await service.delete(accountId);

      // Assert
      expect(prisma.account.delete).toHaveBeenCalled();
      // Transactions automatically deleted by CASCADE
    });

    it('should count transactions for account', async () => {
      // Arrange
      prisma.transaction.count.mockResolvedValue(25);

      // Act
      const count = await service.countTransactions(accountId);

      // Assert
      expect(count).toBe(25);
    });
  });

  // ============================================================================
  // EDGE CASES & VALIDATION TESTS
  // ============================================================================

  describe('Edge Cases & Validation', () => {
    it('should reject name longer than 255 characters', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'A'.repeat(256),
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/name.*255/i);
    });

    it('should handle settings JSONB field', async () => {
      // Arrange
      const settings = {
        autoSync: true,
        syncFrequency: 'daily',
        notifications: { enabled: true },
        budgetIncluded: true,
      };

      const dto: CreateAccountDto = {
        name: 'Account with Settings',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        settings,
      };

      const expectedAccount = createMockUserAccount({
        settings,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.settings).toEqual(settings);
    });

    it('should validate enum values (type, status, source)', async () => {
      // Arrange
      const invalidDto = {
        name: 'Account',
        type: 'INVALID_TYPE', // Not in AccountType enum
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
      } as unknown as CreateAccountDto;

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(/invalid.*type/i);
    });

    it('should handle null optional fields gracefully', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Minimal Account',
        source: 'MANUAL' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
      };

      const expectedAccount = createMockUserAccount({
        availableBalance: null,
        creditLimit: null,
        institutionName: null,
        plaidAccountId: null,
        plaidItemId: null,
        plaidAccessToken: null,
        plaidMetadata: null,
        settings: null,
      });

      prisma.account.create.mockResolvedValue(expectedAccount);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.availableBalance).toBeNull();
      expect(result.creditLimit).toBeNull();
      expect(result.institutionName).toBeNull();
    });

    it('should enforce database constraints (unique plaidAccountId)', async () => {
      // Arrange
      const dto: CreateAccountDto = {
        name: 'Duplicate Plaid',
        source: 'PLAID' as AccountSource,
        userId: 'u1234567-89ab-cdef-0123-456789abcdef',
        plaidAccountId: 'existing_plaid_account',
      };

      const error = new Error('Unique constraint failed on the fields: (`plaidAccountId`)');
      prisma.account.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(/unique/i);
    });
  });
});
