import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/core/database/prisma/prisma.service';
import { TransactionService } from '@/core/database/prisma/services/transaction.service';
import { TransactionType, TransactionStatus, TransactionSource, Prisma } from '../../../../../../generated/prisma';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PrismaTransactionService', () => {
  let service: TransactionService;
  let prisma: PrismaService;

  // Test data
  const mockAccountId = '550e8400-e29b-41d4-a716-446655440001';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440002';
  const mockTransactionId = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new transaction with required fields', async () => {
      const createDto = {
        accountId: mockAccountId,
        amount: new Decimal('100.50'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Grocery shopping',
      };

      const expectedTransaction = {
        id: mockTransactionId,
        ...createDto,
        categoryId: null,
        merchantName: null,
        originalDescription: null,
        reference: null,
        checkNumber: null,
        notes: null,
        isPending: false,
        isRecurring: false,
        isHidden: false,
        includeInBudget: true,
        plaidTransactionId: null,
        plaidAccountId: null,
        plaidMetadata: null,
        location: null,
        tags: null,
        attachments: null,
        splitDetails: null,
        currency: 'USD',
        authorizedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.transaction, 'create').mockResolvedValue(expectedTransaction);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedTransaction);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          amount: createDto.amount,
          type: createDto.type,
          status: createDto.status,
          source: createDto.source,
          date: createDto.date,
          description: createDto.description,
          account: {
            connect: { id: mockAccountId },
          },
        },
      });
    });

    it('should create a transaction with optional category', async () => {
      const createDto = {
        accountId: mockAccountId,
        categoryId: mockCategoryId,
        amount: new Decimal('50.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Restaurant',
      };

      jest.spyOn(prisma.transaction, 'create').mockResolvedValue({
        id: mockTransactionId,
        ...createDto,
        merchantName: null,
        originalDescription: null,
        reference: null,
        checkNumber: null,
        notes: null,
        isPending: false,
        isRecurring: false,
        isHidden: false,
        includeInBudget: true,
        plaidTransactionId: null,
        plaidAccountId: null,
        plaidMetadata: null,
        location: null,
        tags: null,
        attachments: null,
        splitDetails: null,
        currency: 'USD',
        authorizedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.categoryId).toBe(mockCategoryId);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          amount: createDto.amount,
          type: createDto.type,
          status: createDto.status,
          source: createDto.source,
          date: createDto.date,
          description: createDto.description,
          account: {
            connect: { id: mockAccountId },
          },
          category: {
            connect: { id: mockCategoryId },
          },
        },
      });
    });

    it('should create a Plaid transaction with metadata', async () => {
      const createDto = {
        accountId: mockAccountId,
        amount: new Decimal('75.25'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.PLAID,
        date: new Date('2025-10-11'),
        authorizedDate: new Date('2025-10-11T14:30:00Z'),
        description: 'AMAZON.COM',
        merchantName: 'Amazon',
        originalDescription: 'AMAZON.COM*MARKETPLACE',
        plaidTransactionId: 'plaid_tx_12345',
        plaidAccountId: 'plaid_acc_67890',
        plaidMetadata: {
          categoryId: 'shopping',
          transactionCode: 'purchase',
        },
      };

      jest.spyOn(prisma.transaction, 'create').mockResolvedValue({
        id: mockTransactionId,
        ...createDto,
        categoryId: null,
        reference: null,
        checkNumber: null,
        notes: null,
        isPending: false,
        isRecurring: false,
        isHidden: false,
        includeInBudget: true,
        location: null,
        tags: null,
        attachments: null,
        splitDetails: null,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.plaidTransactionId).toBe('plaid_tx_12345');
      expect(result.plaidMetadata).toEqual({ categoryId: 'shopping', transactionCode: 'purchase' });
    });

    it('should throw ConflictException for duplicate plaidTransactionId', async () => {
      const createDto = {
        accountId: mockAccountId,
        amount: new Decimal('100.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.PLAID,
        date: new Date('2025-10-11'),
        description: 'Duplicate transaction',
        plaidTransactionId: 'plaid_tx_duplicate',
      };

      jest.spyOn(prisma.transaction, 'create').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['plaidTransactionId'] },
        }),
      );

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid accountId', async () => {
      const createDto = {
        accountId: 'invalid-uuid',
        amount: new Decimal('100.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Test',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative amount', async () => {
      const createDto = {
        accountId: mockAccountId,
        amount: new Decimal('-50.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Test',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should find a transaction by id', async () => {
      const expectedTransaction = {
        id: mockTransactionId,
        accountId: mockAccountId,
        categoryId: null,
        amount: new Decimal('100.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Test transaction',
        merchantName: null,
        originalDescription: null,
        reference: null,
        checkNumber: null,
        notes: null,
        isPending: false,
        isRecurring: false,
        isHidden: false,
        includeInBudget: true,
        plaidTransactionId: null,
        plaidAccountId: null,
        plaidMetadata: null,
        location: null,
        tags: null,
        attachments: null,
        splitDetails: null,
        currency: 'USD',
        authorizedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(expectedTransaction);

      const result = await service.findOne(mockTransactionId);

      expect(result).toEqual(expectedTransaction);
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
      });
    });

    it('should return null for non-existent transaction', async () => {
      jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne(mockTransactionId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneWithRelations', () => {
    it('should find a transaction with account and category relations', async () => {
      const expectedTransaction = {
        id: mockTransactionId,
        accountId: mockAccountId,
        categoryId: mockCategoryId,
        amount: new Decimal('100.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Test transaction',
        account: {
          id: mockAccountId,
          name: 'Checking Account',
          type: 'CHECKING',
        },
        category: {
          id: mockCategoryId,
          name: 'Groceries',
          type: TransactionType.DEBIT,
        },
        merchantName: null,
        originalDescription: null,
        reference: null,
        checkNumber: null,
        notes: null,
        isPending: false,
        isRecurring: false,
        isHidden: false,
        includeInBudget: true,
        plaidTransactionId: null,
        plaidAccountId: null,
        plaidMetadata: null,
        location: null,
        tags: null,
        attachments: null,
        splitDetails: null,
        currency: 'USD',
        authorizedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(expectedTransaction);

      const result = await service.findOneWithRelations(mockTransactionId);

      expect(result).toEqual(expectedTransaction);
      expect(result.account).toBeDefined();
      expect(result.category).toBeDefined();
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
        include: {
          account: true,
          category: true,
        },
      });
    });
  });

  describe('findByAccountId', () => {
    it('should find all transactions for an account with pagination', async () => {
      const transactions = [
        {
          id: mockTransactionId,
          accountId: mockAccountId,
          amount: new Decimal('100.00'),
          type: TransactionType.DEBIT,
          status: TransactionStatus.POSTED,
          source: TransactionSource.MANUAL,
          date: new Date('2025-10-11'),
          description: 'Transaction 1',
          categoryId: null,
          merchantName: null,
          originalDescription: null,
          reference: null,
          checkNumber: null,
          notes: null,
          isPending: false,
          isRecurring: false,
          isHidden: false,
          includeInBudget: true,
          plaidTransactionId: null,
          plaidAccountId: null,
          plaidMetadata: null,
          location: null,
          tags: null,
          attachments: null,
          splitDetails: null,
          currency: 'USD',
          authorizedDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue(transactions);

      const result = await service.findByAccountId(mockAccountId, {
        skip: 0,
        take: 50,
        orderBy: { date: 'desc' },
      });

      expect(result).toEqual(transactions);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { accountId: mockAccountId },
        skip: 0,
        take: 50,
        orderBy: { date: 'desc' },
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);

      await service.findByAccountId(mockAccountId, {
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          accountId: mockAccountId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        skip: 0,
        take: 50,
        orderBy: { date: 'desc' },
      });
    });

    it('should filter by category', async () => {
      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);

      await service.findByAccountId(mockAccountId, {
        where: { categoryId: mockCategoryId },
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          accountId: mockAccountId,
          categoryId: mockCategoryId,
        },
        skip: 0,
        take: 50,
        orderBy: { date: 'desc' },
      });
    });

    it('should filter by status', async () => {
      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);

      await service.findByAccountId(mockAccountId, {
        where: { status: TransactionStatus.PENDING },
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          accountId: mockAccountId,
          status: TransactionStatus.PENDING,
        },
        skip: 0,
        take: 50,
        orderBy: { date: 'desc' },
      });
    });

    it('should throw BadRequestException for invalid accountId', async () => {
      await expect(service.findByAccountId('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByCategoryId', () => {
    it('should find all transactions for a category', async () => {
      const transactions = [
        {
          id: mockTransactionId,
          accountId: mockAccountId,
          categoryId: mockCategoryId,
          amount: new Decimal('50.00'),
          type: TransactionType.DEBIT,
          status: TransactionStatus.POSTED,
          source: TransactionSource.MANUAL,
          date: new Date('2025-10-11'),
          description: 'Category transaction',
          merchantName: null,
          originalDescription: null,
          reference: null,
          checkNumber: null,
          notes: null,
          isPending: false,
          isRecurring: false,
          isHidden: false,
          includeInBudget: true,
          plaidTransactionId: null,
          plaidAccountId: null,
          plaidMetadata: null,
          location: null,
          tags: null,
          attachments: null,
          splitDetails: null,
          currency: 'USD',
          authorizedDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue(transactions);

      const result = await service.findByCategoryId(mockCategoryId);

      expect(result).toEqual(transactions);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId },
        skip: 0,
        take: 50,
        orderBy: { date: 'desc' },
      });
    });

    it('should throw BadRequestException for invalid categoryId', async () => {
      await expect(service.findByCategoryId('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should find all transactions with default pagination', async () => {
      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);

      await service.findAll();

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        orderBy: { date: 'desc' },
      });
    });

    it('should support custom pagination', async () => {
      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);

      await service.findAll({
        skip: 100,
        take: 25,
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 100,
        take: 25,
        orderBy: { date: 'desc' },
      });
    });

    it('should support filtering and ordering', async () => {
      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);

      await service.findAll({
        where: {
          type: TransactionType.DEBIT,
          amount: { gte: new Decimal('100.00') },
        },
        orderBy: { amount: 'desc' },
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          type: TransactionType.DEBIT,
          amount: { gte: new Decimal('100.00') },
        },
        skip: 0,
        take: 50,
        orderBy: { amount: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const updateDto = {
        description: 'Updated description',
        categoryId: mockCategoryId,
        notes: 'Added notes',
      };

      const updatedTransaction = {
        id: mockTransactionId,
        accountId: mockAccountId,
        categoryId: mockCategoryId,
        amount: new Decimal('100.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Updated description',
        notes: 'Added notes',
        merchantName: null,
        originalDescription: null,
        reference: null,
        checkNumber: null,
        isPending: false,
        isRecurring: false,
        isHidden: false,
        includeInBudget: true,
        plaidTransactionId: null,
        plaidAccountId: null,
        plaidMetadata: null,
        location: null,
        tags: null,
        attachments: null,
        splitDetails: null,
        currency: 'USD',
        authorizedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.transaction, 'update').mockResolvedValue(updatedTransaction);

      const result = await service.update(mockTransactionId, updateDto);

      expect(result).toEqual(updatedTransaction);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
        data: updateDto,
      });
    });

    it('should throw NotFoundException for non-existent transaction', async () => {
      jest.spyOn(prisma.transaction, 'update').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '5.0.0',
        }),
      );

      await expect(
        service.update(mockTransactionId, { description: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.update('invalid-uuid', { description: 'Test' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a transaction', async () => {
      const deletedTransaction = {
        id: mockTransactionId,
        accountId: mockAccountId,
        categoryId: null,
        amount: new Decimal('100.00'),
        type: TransactionType.DEBIT,
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        date: new Date('2025-10-11'),
        description: 'Deleted transaction',
        merchantName: null,
        originalDescription: null,
        reference: null,
        checkNumber: null,
        notes: null,
        isPending: false,
        isRecurring: false,
        isHidden: false,
        includeInBudget: true,
        plaidTransactionId: null,
        plaidAccountId: null,
        plaidMetadata: null,
        location: null,
        tags: null,
        attachments: null,
        splitDetails: null,
        currency: 'USD',
        authorizedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.transaction, 'delete').mockResolvedValue(deletedTransaction);

      const result = await service.delete(mockTransactionId);

      expect(result).toEqual(deletedTransaction);
      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
      });
    });

    it('should throw NotFoundException for non-existent transaction', async () => {
      jest.spyOn(prisma.transaction, 'delete').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '5.0.0',
        }),
      );

      await expect(service.delete(mockTransactionId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.delete('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTotalByAccountId', () => {
    it('should calculate total for all transactions', async () => {
      jest.spyOn(prisma.transaction, 'aggregate').mockResolvedValue({
        _sum: { amount: new Decimal('1500.00') },
        _count: { _all: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      });

      const result = await service.getTotalByAccountId(mockAccountId);

      expect(result).toEqual(new Decimal('1500.00'));
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
        where: { accountId: mockAccountId },
        _sum: { amount: true },
      });
    });

    it('should filter by type when calculating total', async () => {
      jest.spyOn(prisma.transaction, 'aggregate').mockResolvedValue({
        _sum: { amount: new Decimal('500.00') },
        _count: { _all: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      });

      const result = await service.getTotalByAccountId(mockAccountId, TransactionType.DEBIT);

      expect(result).toEqual(new Decimal('500.00'));
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          accountId: mockAccountId,
          type: TransactionType.DEBIT,
        },
        _sum: { amount: true },
      });
    });

    it('should return zero when no transactions exist', async () => {
      jest.spyOn(prisma.transaction, 'aggregate').mockResolvedValue({
        _sum: { amount: null },
        _count: { _all: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      });

      const result = await service.getTotalByAccountId(mockAccountId);

      expect(result).toEqual(new Decimal('0'));
    });
  });

  describe('count', () => {
    it('should count all transactions for an account', async () => {
      jest.spyOn(prisma.transaction, 'count').mockResolvedValue(42);

      const result = await service.count({ accountId: mockAccountId });

      expect(result).toBe(42);
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: { accountId: mockAccountId },
      });
    });

    it('should count with filters', async () => {
      jest.spyOn(prisma.transaction, 'count').mockResolvedValue(10);

      const result = await service.count({
        accountId: mockAccountId,
        type: TransactionType.DEBIT,
        status: TransactionStatus.PENDING,
      });

      expect(result).toBe(10);
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: {
          accountId: mockAccountId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.PENDING,
        },
      });
    });
  });

  describe('exists', () => {
    it('should return true when transaction exists', async () => {
      jest.spyOn(prisma.transaction, 'count').mockResolvedValue(1);

      const result = await service.exists(mockTransactionId);

      expect(result).toBe(true);
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
      });
    });

    it('should return false when transaction does not exist', async () => {
      jest.spyOn(prisma.transaction, 'count').mockResolvedValue(0);

      const result = await service.exists(mockTransactionId);

      expect(result).toBe(false);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.exists('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUuid', () => {
    it('should validate correct UUIDs', () => {
      expect(() => service['validateUuid'](mockTransactionId)).not.toThrow();
      expect(() =>
        service['validateUuid']('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
      ).not.toThrow();
    });

    it('should throw BadRequestException for invalid UUIDs', () => {
      expect(() => service['validateUuid']('invalid')).toThrow(BadRequestException);
      expect(() => service['validateUuid']('123')).toThrow(BadRequestException);
      expect(() => service['validateUuid']('')).toThrow(BadRequestException);
      expect(() => service['validateUuid']('not-a-uuid-at-all')).toThrow(BadRequestException);
    });
  });
});
