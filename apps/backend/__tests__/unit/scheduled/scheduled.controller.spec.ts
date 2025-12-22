import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledController } from '../../../src/scheduled/scheduled.controller';
import { ScheduledService } from '../../../src/scheduled/scheduled.service';
import {
  ScheduledTransactionStatus,
  TransactionType,
  FlowType,
  RecurrenceFrequency,
} from '../../../generated/prisma';

describe('ScheduledController', () => {
  let controller: ScheduledController;
  let service: jest.Mocked<ScheduledService>;

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockScheduledResponse = {
    id: 'scheduled-123',
    familyId: 'family-123',
    accountId: 'account-123',
    status: ScheduledTransactionStatus.ACTIVE,
    amount: 100,
    type: TransactionType.DEBIT,
    flowType: FlowType.EXPENSE,
    currency: 'USD',
    description: 'Test subscription',
    merchantName: 'Netflix',
    categoryId: 'category-123',
    nextDueDate: new Date('2024-01-15'),
    lastExecutedAt: undefined,
    autoCreate: false,
    reminderDaysBefore: 3,
    metadata: undefined,
    recurrenceRule: {
      id: 'rule-123',
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      dayOfMonth: 15,
      occurrenceCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: false,
    daysUntilDue: 10,
    recurrenceDescription: 'Monthly on day 15',
  };

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getUpcoming: jest.fn(),
    getCalendarEvents: jest.fn(),
    skipNextOccurrence: jest.fn(),
    markCompleted: jest.fn(),
    generateFromLiabilities: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledController],
      providers: [
        {
          provide: ScheduledService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ScheduledController>(ScheduledController);
    service = module.get(ScheduledService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a scheduled transaction', async () => {
      const createDto = {
        accountId: 'account-123',
        amount: 100,
        type: TransactionType.DEBIT,
        description: 'New subscription',
        nextDueDate: '2024-01-15',
      };

      mockService.create.mockResolvedValue(mockScheduledResponse);

      const result = await controller.create(createDto, mockUser as any);

      expect(result).toEqual(mockScheduledResponse);
      expect(mockService.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });

  describe('findAll', () => {
    it('should return all scheduled transactions', async () => {
      mockService.findAll.mockResolvedValue([mockScheduledResponse]);

      const result = await controller.findAll(mockUser as any);

      expect(result).toEqual([mockScheduledResponse]);
      expect(mockService.findAll).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
    });

    it('should pass filter options', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll(
        mockUser as any,
        ScheduledTransactionStatus.ACTIVE,
        TransactionType.DEBIT,
        FlowType.EXPENSE,
        'account-123',
        'category-123',
        0,
        10,
      );

      expect(mockService.findAll).toHaveBeenCalledWith(mockUser.id, {
        status: ScheduledTransactionStatus.ACTIVE,
        type: TransactionType.DEBIT,
        flowType: FlowType.EXPENSE,
        accountId: 'account-123',
        categoryId: 'category-123',
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return a scheduled transaction by id', async () => {
      mockService.findOne.mockResolvedValue(mockScheduledResponse);

      const result = await controller.findOne('scheduled-123', mockUser as any);

      expect(result).toEqual(mockScheduledResponse);
      expect(mockService.findOne).toHaveBeenCalledWith('scheduled-123', mockUser.id);
    });
  });

  describe('update', () => {
    it('should update a scheduled transaction', async () => {
      const updateDto = { description: 'Updated subscription' };
      const updatedResponse = { ...mockScheduledResponse, description: 'Updated subscription' };

      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update('scheduled-123', updateDto, mockUser as any);

      expect(result.description).toBe('Updated subscription');
      expect(mockService.update).toHaveBeenCalledWith('scheduled-123', mockUser.id, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a scheduled transaction', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('scheduled-123', mockUser as any);

      expect(mockService.remove).toHaveBeenCalledWith('scheduled-123', mockUser.id);
    });
  });

  describe('getUpcoming', () => {
    it('should return upcoming scheduled transactions', async () => {
      const upcomingResponse = [
        {
          scheduledTransactionId: 'scheduled-123',
          dueDate: new Date('2024-01-15'),
          description: 'Test subscription',
          amount: 100,
          currency: 'USD',
          type: TransactionType.DEBIT,
          accountId: 'account-123',
          daysUntilDue: 10,
          isOverdue: false,
        },
      ];

      mockService.getUpcoming.mockResolvedValue(upcomingResponse);

      const result = await controller.getUpcoming(mockUser as any, 30);

      expect(result).toEqual(upcomingResponse);
      expect(mockService.getUpcoming).toHaveBeenCalledWith(mockUser.id, 30);
    });

    it('should use default days when not provided', async () => {
      mockService.getUpcoming.mockResolvedValue([]);

      await controller.getUpcoming(mockUser as any, undefined);

      expect(mockService.getUpcoming).toHaveBeenCalledWith(mockUser.id, 30);
    });
  });

  describe('getCalendarEvents', () => {
    it('should return calendar events', async () => {
      const calendarResponse = [
        {
          id: 'scheduled-123-0',
          scheduledTransactionId: 'scheduled-123',
          date: new Date('2024-01-15'),
          description: 'Test subscription',
          amount: 100,
          currency: 'USD',
          type: TransactionType.DEBIT,
          isOverdue: false,
          status: ScheduledTransactionStatus.ACTIVE,
        },
      ];

      mockService.getCalendarEvents.mockResolvedValue(calendarResponse);

      const result = await controller.getCalendarEvents(
        mockUser as any,
        '2024-01-01',
        '2024-01-31',
      );

      expect(result).toEqual(calendarResponse);
      expect(mockService.getCalendarEvents).toHaveBeenCalledWith(
        mockUser.id,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });
  });

  describe('skipNext', () => {
    it('should skip next occurrence', async () => {
      const skippedResponse = {
        ...mockScheduledResponse,
        nextDueDate: new Date('2024-02-15'),
      };

      mockService.skipNextOccurrence.mockResolvedValue(skippedResponse);

      const result = await controller.skipNext('scheduled-123', mockUser as any);

      expect(result.nextDueDate).toEqual(new Date('2024-02-15'));
      expect(mockService.skipNextOccurrence).toHaveBeenCalledWith('scheduled-123', mockUser.id);
    });
  });

  describe('markCompleted', () => {
    it('should mark as completed', async () => {
      const completedResponse = {
        ...mockScheduledResponse,
        status: ScheduledTransactionStatus.COMPLETED,
      };

      mockService.markCompleted.mockResolvedValue(completedResponse);

      const result = await controller.markCompleted('scheduled-123', undefined, mockUser as any);

      expect(result.status).toBe(ScheduledTransactionStatus.COMPLETED);
      expect(mockService.markCompleted).toHaveBeenCalledWith(
        'scheduled-123',
        mockUser.id,
        undefined,
      );
    });

    it('should pass transaction ID when provided', async () => {
      mockService.markCompleted.mockResolvedValue(mockScheduledResponse);

      await controller.markCompleted('scheduled-123', 'tx-456', mockUser as any);

      expect(mockService.markCompleted).toHaveBeenCalledWith(
        'scheduled-123',
        mockUser.id,
        'tx-456',
      );
    });
  });

  describe('generateFromLiabilities', () => {
    it('should generate scheduled transactions from liabilities', async () => {
      mockService.generateFromLiabilities.mockResolvedValue([mockScheduledResponse]);

      const result = await controller.generateFromLiabilities(mockUser as any);

      expect(result).toEqual([mockScheduledResponse]);
      expect(mockService.generateFromLiabilities).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
