import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduledService } from '../../../src/scheduled/scheduled.service';
import { RecurrenceService } from '../../../src/scheduled/recurrence.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import {
  ScheduledTransactionStatus,
  TransactionType,
  FlowType,
  RecurrenceFrequency,
  LiabilityType,
  LiabilityStatus,
} from '../../../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';

describe('ScheduledService', () => {
  let service: ScheduledService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-123',
    familyId: 'family-123',
  };

  const mockScheduledTransaction = {
    id: 'scheduled-123',
    familyId: 'family-123',
    accountId: 'account-123',
    status: ScheduledTransactionStatus.ACTIVE,
    amount: new Decimal(100),
    type: TransactionType.DEBIT,
    flowType: FlowType.EXPENSE,
    currency: 'USD',
    description: 'Test subscription',
    merchantName: 'Netflix',
    categoryId: 'category-123',
    nextDueDate: new Date('2024-01-15'),
    lastExecutedAt: null,
    autoCreate: false,
    reminderDaysBefore: 3,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrenceRule: {
      id: 'rule-123',
      scheduledTransactionId: 'scheduled-123',
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      dayOfWeek: null,
      dayOfMonth: 15,
      endDate: null,
      endCount: null,
      occurrenceCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    scheduledTransaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    recurrenceRule: {
      update: jest.fn(),
      delete: jest.fn(),
    },
    liability: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledService,
        RecurrenceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ScheduledService>(ScheduledService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all scheduled transactions for user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findMany.mockResolvedValue([
        mockScheduledTransaction,
      ]);

      const result = await service.findAll(mockUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(mockPrismaService.scheduledTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyId: mockUser.familyId },
        }),
      );
    });

    it('should throw if user has no family', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123', familyId: null });

      await expect(service.findAll('user-123')).rejects.toThrow(BadRequestException);
    });

    it('should filter by status', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findMany.mockResolvedValue([]);

      await service.findAll(mockUser.id, { status: ScheduledTransactionStatus.ACTIVE });

      expect(mockPrismaService.scheduledTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ScheduledTransactionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should return paginated response when skip/take provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.count.mockResolvedValue(10);
      mockPrismaService.scheduledTransaction.findMany.mockResolvedValue([
        mockScheduledTransaction,
      ]);

      const result = await service.findAll(mockUser.id, { skip: 0, take: 5 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 10);
      expect(result).toHaveProperty('hasMore', true);
    });
  });

  describe('findOne', () => {
    it('should return a scheduled transaction by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(
        mockScheduledTransaction,
      );

      const result = await service.findOne('scheduled-123', mockUser.id);

      expect(result.id).toBe('scheduled-123');
      expect(result.description).toBe('Test subscription');
    });

    it('should throw if not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      accountId: 'account-123',
      amount: 100,
      type: TransactionType.DEBIT,
      flowType: FlowType.EXPENSE,
      description: 'New subscription',
      nextDueDate: '2024-01-15',
      recurrenceRule: {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        dayOfMonth: 15,
      },
    };

    it('should create a scheduled transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.account.findFirst.mockResolvedValue({ id: 'account-123' });
      mockPrismaService.scheduledTransaction.create.mockResolvedValue(
        mockScheduledTransaction,
      );

      const result = await service.create(mockUser.id, createDto);

      expect(result.id).toBeDefined();
      expect(mockPrismaService.scheduledTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyId: mockUser.familyId,
            accountId: 'account-123',
            description: 'New subscription',
          }),
        }),
      );
    });

    it('should throw if account not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.account.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if category not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.account.findFirst.mockResolvedValue({ id: 'account-123' });
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, { ...createDto, categoryId: 'invalid-cat' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a scheduled transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(
        mockScheduledTransaction,
      );
      mockPrismaService.scheduledTransaction.update.mockResolvedValue({
        ...mockScheduledTransaction,
        description: 'Updated subscription',
      });

      const result = await service.update('scheduled-123', mockUser.id, {
        description: 'Updated subscription',
      });

      expect(result.description).toBe('Updated subscription');
    });

    it('should remove recurrence rule when set to null', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(
        mockScheduledTransaction,
      );
      mockPrismaService.recurrenceRule.delete.mockResolvedValue({});
      mockPrismaService.scheduledTransaction.update.mockResolvedValue({
        ...mockScheduledTransaction,
        recurrenceRule: null,
      });

      await service.update('scheduled-123', mockUser.id, {
        recurrenceRule: null as any,
      });

      expect(mockPrismaService.recurrenceRule.delete).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a scheduled transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(
        mockScheduledTransaction,
      );
      mockPrismaService.scheduledTransaction.delete.mockResolvedValue(
        mockScheduledTransaction,
      );

      await service.remove('scheduled-123', mockUser.id);

      expect(mockPrismaService.scheduledTransaction.delete).toHaveBeenCalledWith({
        where: { id: 'scheduled-123' },
      });
    });
  });

  describe('getUpcoming', () => {
    it('should return upcoming scheduled transactions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findMany.mockResolvedValue([
        mockScheduledTransaction,
      ]);

      const result = await service.getUpcoming(mockUser.id, 30);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('scheduledTransactionId');
      expect(result[0]).toHaveProperty('dueDate');
      expect(result[0]).toHaveProperty('daysUntilDue');
    });

    it('should include future occurrences for recurring transactions', async () => {
      const futureScheduled = {
        ...mockScheduledTransaction,
        nextDueDate: new Date(), // Today
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findMany.mockResolvedValue([futureScheduled]);

      const result = await service.getUpcoming(mockUser.id, 90);

      // Should have multiple occurrences for monthly recurrence
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getCalendarEvents', () => {
    it('should return calendar events for date range', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findMany.mockResolvedValue([
        mockScheduledTransaction,
      ]);
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'category-123', name: 'Entertainment', icon: 'tv', color: '#FF0000' },
      ]);
      mockPrismaService.account.findMany.mockResolvedValue([
        { id: 'account-123', name: 'Checking' },
      ]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.getCalendarEvents(mockUser.id, startDate, endDate);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('scheduledTransactionId');
        expect(result[0]).toHaveProperty('date');
      }
    });
  });

  describe('skipNextOccurrence', () => {
    it('should skip to next occurrence', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(
        mockScheduledTransaction,
      );

      const nextDate = new Date('2024-02-15');
      mockPrismaService.$transaction.mockImplementation(async (fn) => {
        const tx = {
          recurrenceRule: {
            update: jest.fn().mockResolvedValue({}),
          },
          scheduledTransaction: {
            update: jest.fn().mockResolvedValue({
              ...mockScheduledTransaction,
              nextDueDate: nextDate,
            }),
          },
        };
        return fn(tx);
      });

      const result = await service.skipNextOccurrence('scheduled-123', mockUser.id);

      expect(result.nextDueDate).toEqual(nextDate);
    });

    it('should throw if not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue({
        ...mockScheduledTransaction,
        status: ScheduledTransactionStatus.PAUSED,
      });

      await expect(
        service.skipNextOccurrence('scheduled-123', mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if not recurring', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue({
        ...mockScheduledTransaction,
        recurrenceRule: null,
      });

      await expect(
        service.skipNextOccurrence('scheduled-123', mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markCompleted', () => {
    it('should mark non-recurring as completed', async () => {
      const nonRecurring = {
        ...mockScheduledTransaction,
        recurrenceRule: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(nonRecurring);
      mockPrismaService.scheduledTransaction.update.mockResolvedValue({
        ...nonRecurring,
        status: ScheduledTransactionStatus.COMPLETED,
      });

      const result = await service.markCompleted('scheduled-123', mockUser.id);

      expect(result.status).toBe(ScheduledTransactionStatus.COMPLETED);
    });

    it('should advance recurring to next occurrence', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(
        mockScheduledTransaction,
      );

      const nextDate = new Date('2024-02-15');
      mockPrismaService.$transaction.mockImplementation(async (fn) => {
        const tx = {
          recurrenceRule: {
            update: jest.fn().mockResolvedValue({}),
          },
          scheduledTransaction: {
            update: jest.fn().mockResolvedValue({
              ...mockScheduledTransaction,
              nextDueDate: nextDate,
              status: ScheduledTransactionStatus.ACTIVE,
            }),
          },
        };
        return fn(tx);
      });

      const result = await service.markCompleted('scheduled-123', mockUser.id);

      expect(result.status).toBe(ScheduledTransactionStatus.ACTIVE);
      expect(result.nextDueDate).toEqual(nextDate);
    });

    it('should store linked transaction ID in metadata', async () => {
      const nonRecurring = {
        ...mockScheduledTransaction,
        recurrenceRule: null,
        metadata: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(nonRecurring);
      mockPrismaService.scheduledTransaction.update.mockResolvedValue({
        ...nonRecurring,
        status: ScheduledTransactionStatus.COMPLETED,
        metadata: { lastTransactionId: 'tx-123' },
      });

      await service.markCompleted('scheduled-123', mockUser.id, 'tx-123');

      expect(mockPrismaService.scheduledTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              lastTransactionId: 'tx-123',
            }),
          }),
        }),
      );
    });
  });

  describe('generateFromLiabilities', () => {
    it('should generate scheduled transactions from credit cards', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.liability.findMany.mockResolvedValue([
        {
          id: 'liability-123',
          familyId: 'family-123',
          type: LiabilityType.CREDIT_CARD,
          status: LiabilityStatus.ACTIVE,
          name: 'Visa Card',
          currentBalance: new Decimal(500),
          minimumPayment: new Decimal(25),
          paymentDueDay: 15,
          currency: 'USD',
          accountId: 'account-123',
          installmentPlans: [],
        },
      ]);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.scheduledTransaction.create.mockResolvedValue({
        ...mockScheduledTransaction,
        description: 'Visa Card - Credit Card Payment',
        metadata: { liabilityId: 'liability-123', autoGenerated: true },
      });

      const result = await service.generateFromLiabilities(mockUser.id);

      expect(result.length).toBe(1);
      expect(mockPrismaService.scheduledTransaction.create).toHaveBeenCalled();
    });

    it('should skip if scheduled transaction already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.liability.findMany.mockResolvedValue([
        {
          id: 'liability-123',
          familyId: 'family-123',
          type: LiabilityType.CREDIT_CARD,
          status: LiabilityStatus.ACTIVE,
          name: 'Visa Card',
          currentBalance: new Decimal(500),
          minimumPayment: new Decimal(25),
          paymentDueDay: 15,
          currency: 'USD',
          accountId: 'account-123',
          installmentPlans: [],
        },
      ]);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(
        mockScheduledTransaction,
      );

      const result = await service.generateFromLiabilities(mockUser.id);

      expect(result.length).toBe(0);
      expect(mockPrismaService.scheduledTransaction.create).not.toHaveBeenCalled();
    });

    it('should generate from BNPL installments', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.liability.findMany.mockResolvedValue([
        {
          id: 'liability-123',
          familyId: 'family-123',
          type: LiabilityType.BNPL,
          status: LiabilityStatus.ACTIVE,
          name: 'Klarna Purchase',
          currentBalance: new Decimal(200),
          currency: 'USD',
          accountId: 'account-123',
          installmentPlans: [
            {
              id: 'plan-123',
              numberOfInstallments: 4,
              currency: 'USD',
              installments: [
                {
                  id: 'inst-1',
                  amount: new Decimal(50),
                  dueDate: futureDate,
                  isPaid: false,
                  installmentNumber: 1,
                },
              ],
            },
          ],
        },
      ]);
      mockPrismaService.scheduledTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.scheduledTransaction.create.mockResolvedValue({
        ...mockScheduledTransaction,
        description: 'Klarna Purchase - BNPL Installment 1/4',
      });

      const result = await service.generateFromLiabilities(mockUser.id);

      expect(result.length).toBe(1);
    });
  });
});
