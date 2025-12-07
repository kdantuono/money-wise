import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LiabilitiesService } from '../../../src/liabilities/liabilities.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { LiabilityType, LiabilityStatus, Prisma } from '../../../generated/prisma';
import { LiabilityFactory } from '../../utils/factories';
import { createMockPrismaService, resetPrismaMocks } from '../../utils/mocks';

/**
 * LiabilitiesService Unit Tests
 *
 * Test Coverage Strategy:
 * - CRUD operations: create, findAll, findOne, update, remove
 * - Specialized methods: getUpcomingPayments, createInstallmentPlan, markInstallmentPaid
 * - BNPL detection: detectBNPLFromTransaction
 * - Authorization: family ownership verification
 * - Error handling: NotFoundException, BadRequestException
 *
 * Pattern: AAA (Arrange-Act-Assert)
 */
describe('LiabilitiesService', () => {
  let service: LiabilitiesService;
  let prisma: any;

  const mockUserId = 'user-123';
  const mockFamilyId = 'family-456';

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiabilitiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LiabilitiesService>(LiabilitiesService);
    prisma = module.get(PrismaService);

    // Default mock for user lookup
    prisma.user.findUnique.mockResolvedValue({ familyId: mockFamilyId });

    LiabilityFactory.resetCounter();
  });

  afterEach(() => {
    resetPrismaMocks(prisma);
  });

  describe('findAll', () => {
    it('should return all liabilities for user\'s family', async () => {
      // Arrange
      const liabilities = LiabilityFactory.buildMany(3, { familyId: mockFamilyId });
      prisma.liability.findMany.mockResolvedValue(liabilities);

      // Act
      const result = await service.findAll(mockUserId);

      // Assert
      expect(result).toHaveLength(3);
      expect(prisma.liability.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId },
        include: {
          installmentPlans: {
            include: { installments: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw BadRequestException if user has no family', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue({ familyId: null });

      // Act & Assert
      await expect(service.findAll(mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(mockUserId)).rejects.toThrow('User must belong to a family');
    });

    it('should transform Decimal values to numbers in response', async () => {
      // Arrange
      const liability = LiabilityFactory.buildCreditCard({
        familyId: mockFamilyId,
        currentBalance: new Prisma.Decimal(1500.50),
        creditLimit: new Prisma.Decimal(10000),
      });
      prisma.liability.findMany.mockResolvedValue([liability]);

      // Act
      const result = await service.findAll(mockUserId);

      // Assert
      expect(typeof result[0].currentBalance).toBe('number');
      expect(result[0].currentBalance).toBe(1500.50);
      expect(result[0].creditLimit).toBe(10000);
    });

    it('should compute availableCredit for credit cards', async () => {
      // Arrange
      const liability = LiabilityFactory.buildCreditCard({
        familyId: mockFamilyId,
        currentBalance: new Prisma.Decimal(1500),
        creditLimit: new Prisma.Decimal(10000),
      });
      prisma.liability.findMany.mockResolvedValue([liability]);

      // Act
      const result = await service.findAll(mockUserId);

      // Assert
      expect(result[0].availableCredit).toBe(8500);
      expect(result[0].utilizationPercent).toBe(15);
    });

    it('should support pagination with skip and take', async () => {
      // Arrange
      const liabilities = LiabilityFactory.buildMany(2, { familyId: mockFamilyId });
      prisma.liability.findMany.mockResolvedValue(liabilities);
      prisma.liability.count.mockResolvedValue(10);

      // Act
      const result = await service.findAll(mockUserId, { skip: 2, take: 2 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(prisma.liability.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 2,
          take: 2,
        })
      );
    });

    it('should return paginated response when options provided', async () => {
      // Arrange
      const liabilities = LiabilityFactory.buildMany(5, { familyId: mockFamilyId });
      prisma.liability.findMany.mockResolvedValue(liabilities);
      prisma.liability.count.mockResolvedValue(20);

      // Act
      const result = await service.findAll(mockUserId, { take: 5 });

      // Assert
      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(20);
      expect(result.hasMore).toBe(true);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const liabilities = LiabilityFactory.buildMany(1, { familyId: mockFamilyId });
      prisma.liability.findMany.mockResolvedValue(liabilities);
      prisma.liability.count.mockResolvedValue(1);

      // Act
      await service.findAll(mockUserId, { status: 'ACTIVE' });

      // Assert
      expect(prisma.liability.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by type when provided', async () => {
      // Arrange
      const liabilities = LiabilityFactory.buildMany(1, { familyId: mockFamilyId });
      prisma.liability.findMany.mockResolvedValue(liabilities);
      prisma.liability.count.mockResolvedValue(1);

      // Act
      await service.findAll(mockUserId, { type: 'CREDIT_CARD' });

      // Assert
      expect(prisma.liability.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'CREDIT_CARD',
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return a liability by ID', async () => {
      // Arrange
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      prisma.liability.findFirst.mockResolvedValue(liability);

      // Act
      const result = await service.findOne(liability.id, mockUserId);

      // Assert
      expect(result.id).toBe(liability.id);
      expect(prisma.liability.findFirst).toHaveBeenCalledWith({
        where: { id: liability.id, familyId: mockFamilyId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if liability not found', async () => {
      // Arrange
      prisma.liability.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent', mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a credit card liability', async () => {
      // Arrange
      const createDto = LiabilityFactory.buildCreateDto({
        type: LiabilityType.CREDIT_CARD,
        name: 'Chase Sapphire',
        currentBalance: 1500,
        creditLimit: 10000,
      });
      const createdLiability = LiabilityFactory.buildFromDto(createDto, {
        familyId: mockFamilyId,
      });
      prisma.liability.create.mockResolvedValue(createdLiability);

      // Act
      const result = await service.create(mockUserId, createDto);

      // Assert
      expect(result.name).toBe('Chase Sapphire');
      expect(result.type).toBe(LiabilityType.CREDIT_CARD);
      expect(prisma.liability.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: mockFamilyId,
          type: LiabilityType.CREDIT_CARD,
          name: 'Chase Sapphire',
        }),
        include: expect.any(Object),
      });
    });

    it('should create a BNPL liability', async () => {
      // Arrange
      const createDto = LiabilityFactory.buildCreateDto({
        type: LiabilityType.BNPL,
        name: 'Klarna Purchase',
        provider: 'Klarna',
        originalAmount: 300,
        currentBalance: 200,
      });
      const createdLiability = LiabilityFactory.buildBNPL({
        familyId: mockFamilyId,
        name: 'Klarna Purchase',
      });
      prisma.liability.create.mockResolvedValue(createdLiability);

      // Act
      const result = await service.create(mockUserId, createDto);

      // Assert
      expect(result.type).toBe(LiabilityType.BNPL);
      expect(result.isBNPL).toBe(true);
    });

    it('should validate linked account exists', async () => {
      // Arrange
      const createDto = LiabilityFactory.buildCreateDto({ accountId: 'account-999' });
      prisma.account.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockUserId, createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(mockUserId, createDto)).rejects.toThrow('Linked account not found');
    });

    it('should set default values correctly', async () => {
      // Arrange
      const createDto = LiabilityFactory.buildCreateDto({
        status: undefined,
        currency: undefined,
        currentBalance: undefined,
      });
      const createdLiability = LiabilityFactory.build({ familyId: mockFamilyId });
      prisma.liability.create.mockResolvedValue(createdLiability);

      // Act
      await service.create(mockUserId, createDto);

      // Assert
      expect(prisma.liability.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: LiabilityStatus.ACTIVE,
          currency: 'USD',
          currentBalance: new Prisma.Decimal(0),
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update liability fields', async () => {
      // Arrange
      const existingLiability = LiabilityFactory.build({ familyId: mockFamilyId });
      const updatedLiability = { ...existingLiability, name: 'Updated Name' };
      prisma.liability.findFirst.mockResolvedValue(existingLiability);
      prisma.liability.update.mockResolvedValue(updatedLiability);

      // Act
      const result = await service.update(existingLiability.id, mockUserId, { name: 'Updated Name' });

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(prisma.liability.update).toHaveBeenCalledWith({
        where: { id: existingLiability.id },
        data: { name: 'Updated Name' },
        include: expect.any(Object),
      });
    });

    it('should update balance as Decimal', async () => {
      // Arrange
      const existingLiability = LiabilityFactory.build({ familyId: mockFamilyId });
      const updatedLiability = {
        ...existingLiability,
        currentBalance: new Prisma.Decimal(2500.75),
      };
      prisma.liability.findFirst.mockResolvedValue(existingLiability);
      prisma.liability.update.mockResolvedValue(updatedLiability);

      // Act
      await service.update(existingLiability.id, mockUserId, { currentBalance: 2500.75 });

      // Assert
      expect(prisma.liability.update).toHaveBeenCalledWith({
        where: { id: existingLiability.id },
        data: expect.objectContaining({
          currentBalance: new Prisma.Decimal(2500.75),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if liability not owned by user\'s family', async () => {
      // Arrange
      prisma.liability.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('liability-999', mockUserId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a liability', async () => {
      // Arrange
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      prisma.liability.findFirst.mockResolvedValue(liability);
      prisma.liability.delete.mockResolvedValue(liability);

      // Act
      await service.remove(liability.id, mockUserId);

      // Assert
      expect(prisma.liability.delete).toHaveBeenCalledWith({
        where: { id: liability.id },
      });
    });

    it('should throw NotFoundException if liability not found', async () => {
      // Arrange
      prisma.liability.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent', mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUpcomingPayments', () => {
    it('should return unpaid installments due within specified days', async () => {
      // Arrange
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 10);

      const liability = LiabilityFactory.build({ familyId: mockFamilyId, id: 'liability-1' });
      const plan = LiabilityFactory.buildInstallmentPlan({
        id: 'plan-1',
        liabilityId: liability.id,
        numberOfInstallments: 3,
        currency: 'USD',
        liability: liability, // Nested relation
      });
      const installment = {
        ...LiabilityFactory.buildInstallment({
          planId: plan.id,
          dueDate: futureDate,
          amount: new Prisma.Decimal(100),
          installmentNumber: 2,
        }),
        plan: {
          ...plan,
          liability: liability,
        },
      };

      prisma.installment.findMany.mockResolvedValue([installment]);
      prisma.liability.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getUpcomingPayments(mockUserId, 30);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isInstallment).toBe(true);
      expect(result[0].installmentNumber).toBe(2);
      expect(result[0].amount).toBe(100);
    });

    it('should include credit card minimum payments', async () => {
      // Arrange
      const now = new Date();
      const paymentDueDay = now.getDate() + 5 > 28 ? 5 : now.getDate() + 5;

      const creditCard = LiabilityFactory.buildCreditCard({
        familyId: mockFamilyId,
        paymentDueDay,
        minimumPayment: new Prisma.Decimal(35),
        currentBalance: new Prisma.Decimal(1000),
      });

      prisma.installment.findMany.mockResolvedValue([]);
      prisma.liability.findMany.mockResolvedValue([creditCard]);

      // Act
      const result = await service.getUpcomingPayments(mockUserId, 30);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(1);
      const ccPayment = result.find((p) => p.liabilityId === creditCard.id);
      expect(ccPayment).toBeDefined();
      expect(ccPayment?.isInstallment).toBe(false);
      expect(ccPayment?.amount).toBe(35);
    });

    it('should sort payments by due date', async () => {
      // Arrange
      const now = new Date();
      const date1 = new Date(now);
      date1.setDate(now.getDate() + 5);
      const date2 = new Date(now);
      date2.setDate(now.getDate() + 2);

      const liability1 = LiabilityFactory.build({ familyId: mockFamilyId, id: 'liability-a' });
      const plan1 = LiabilityFactory.buildInstallmentPlan({
        id: 'plan-a',
        liabilityId: liability1.id,
        numberOfInstallments: 3,
        currency: 'USD',
      });
      const installment1 = {
        ...LiabilityFactory.buildInstallment({
          planId: plan1.id,
          dueDate: date1,
          amount: new Prisma.Decimal(100),
        }),
        plan: {
          ...plan1,
          liability: liability1,
        },
      };

      const liability2 = LiabilityFactory.build({ familyId: mockFamilyId, id: 'liability-b' });
      const plan2 = LiabilityFactory.buildInstallmentPlan({
        id: 'plan-b',
        liabilityId: liability2.id,
        numberOfInstallments: 2,
        currency: 'USD',
      });
      const installment2 = {
        ...LiabilityFactory.buildInstallment({
          planId: plan2.id,
          dueDate: date2,
          amount: new Prisma.Decimal(50),
        }),
        plan: {
          ...plan2,
          liability: liability2,
        },
      };

      prisma.installment.findMany.mockResolvedValue([installment1, installment2]);
      prisma.liability.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getUpcomingPayments(mockUserId, 30);

      // Assert
      expect(result[0].amount).toBe(50); // Earlier date first
      expect(result[1].amount).toBe(100);
    });
  });

  describe('createInstallmentPlan', () => {
    it('should create an installment plan with individual installments', async () => {
      // Arrange
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      prisma.liability.findFirst.mockResolvedValue(liability);

      const planDto = {
        totalAmount: 300,
        installmentAmount: 100,
        numberOfInstallments: 3,
        startDate: '2024-01-15',
      };

      const createdPlan = LiabilityFactory.buildInstallmentPlan({
        liabilityId: liability.id,
        totalAmount: new Prisma.Decimal(300),
        installmentAmount: new Prisma.Decimal(100),
        numberOfInstallments: 3,
        installments: LiabilityFactory.buildInstallmentsForPlan(
          'plan-1',
          3,
          new Date('2024-01-15'),
          100,
        ),
      });

      prisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          installmentPlan: {
            create: jest.fn().mockResolvedValue(createdPlan),
            findUnique: jest.fn().mockResolvedValue(createdPlan),
          },
          installment: {
            createMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
        });
      });

      // Act
      const result = await service.createInstallmentPlan(liability.id, mockUserId, planDto);

      // Assert
      expect(result.numberOfInstallments).toBe(3);
      expect(result.totalAmount).toBe(300);
      expect(result.installments).toHaveLength(3);
    });

    it('should calculate end date based on number of installments', async () => {
      // Arrange
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      prisma.liability.findFirst.mockResolvedValue(liability);

      const planDto = {
        totalAmount: 400,
        installmentAmount: 100,
        numberOfInstallments: 4,
        startDate: '2024-01-15',
      };

      const createdPlan = LiabilityFactory.buildInstallmentPlan({
        liabilityId: liability.id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-04-15'),
        numberOfInstallments: 4,
        installments: [],
      });

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const result = await fn({
          installmentPlan: {
            create: jest.fn().mockResolvedValue(createdPlan),
            findUnique: jest.fn().mockResolvedValue(createdPlan),
          },
          installment: {
            createMany: jest.fn().mockResolvedValue({ count: 4 }),
          },
        });
        return result;
      });

      // Act
      const result = await service.createInstallmentPlan(liability.id, mockUserId, planDto);

      // Assert
      expect(result.startDate).toEqual(new Date('2024-01-15'));
      expect(result.endDate).toEqual(new Date('2024-04-15'));
    });
  });

  describe('markInstallmentPaid', () => {
    it('should mark an installment as paid and update remaining count', async () => {
      // Arrange
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      const installment = LiabilityFactory.buildInstallment({
        planId: 'plan-1',
        isPaid: false,
        amount: new Prisma.Decimal(100),
        plan: { liabilityId: liability.id },
      });

      prisma.liability.findFirst.mockResolvedValue(liability);
      prisma.installment.findFirst.mockResolvedValue(installment);

      const updatedInstallment = { ...installment, isPaid: true, paidAt: new Date() };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          installment: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }), // Optimistic lock succeeded
            findUnique: jest.fn().mockResolvedValue(updatedInstallment),
          },
          installmentPlan: {
            update: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue({ remainingInstallments: 2 }),
          },
          liability: {
            update: jest.fn().mockResolvedValue(liability),
          },
        });
      });

      // Act
      const result = await service.markInstallmentPaid(
        liability.id,
        installment.id,
        mockUserId,
      );

      // Assert
      expect(result.isPaid).toBe(true);
      expect(result.paidAt).toBeDefined();
    });

    it('should throw BadRequestException if installment already paid', async () => {
      // Arrange
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      const installment = LiabilityFactory.buildInstallment({
        isPaid: true,
        plan: { liabilityId: liability.id },
      });

      prisma.liability.findFirst.mockResolvedValue(liability);
      prisma.installment.findFirst.mockResolvedValue(installment);

      // Act & Assert
      await expect(
        service.markInstallmentPaid(liability.id, installment.id, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.markInstallmentPaid(liability.id, installment.id, mockUserId),
      ).rejects.toThrow('already paid');
    });

    it('should throw NotFoundException if installment not found', async () => {
      // Arrange
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      prisma.liability.findFirst.mockResolvedValue(liability);
      prisma.installment.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.markInstallmentPaid(liability.id, 'non-existent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use optimistic locking to prevent double payment (race condition)', async () => {
      // Arrange: Simulate concurrent request where installment is paid between check and update
      const liability = LiabilityFactory.build({ familyId: mockFamilyId });
      const installment = LiabilityFactory.buildInstallment({
        planId: 'plan-1',
        isPaid: false, // Initially unpaid
        amount: new Prisma.Decimal(100),
        plan: { liabilityId: liability.id },
      });

      prisma.liability.findFirst.mockResolvedValue(liability);
      prisma.installment.findFirst.mockResolvedValue(installment);

      // Simulate race condition: updateMany returns 0 (no rows updated because isPaid was already true)
      prisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          installment: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }), // No rows updated (was already paid)
            findUnique: jest.fn().mockResolvedValue({ ...installment, isPaid: true }), // Now shows as paid
          },
          installmentPlan: {
            update: jest.fn(),
            findUnique: jest.fn(),
          },
          liability: {
            update: jest.fn(),
          },
        });
      });

      // Act & Assert: Should throw because updateMany returned 0 (concurrent payment won)
      await expect(
        service.markInstallmentPaid(liability.id, installment.id, mockUserId),
      ).rejects.toThrow('already paid');
    });
  });

  describe('detectBNPLFromTransaction', () => {
    it('should detect Klarna transactions', () => {
      // Act
      const result = service.detectBNPLFromTransaction('Payment to KLARNA* Store');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('Klarna');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect PayPal Pay in 3', () => {
      // Act
      const result = service.detectBNPLFromTransaction('PAYPAL *Pay in 3');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('PayPal Pay in 3');
    });

    it('should detect PayPal Pay in 4', () => {
      // Act
      const result = service.detectBNPLFromTransaction('Purchase PAYPAL PAY IN 4');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('PayPal Pay in 4');
    });

    it('should detect Afterpay', () => {
      // Act
      const result = service.detectBNPLFromTransaction('AFTERPAY purchase');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('Afterpay');
    });

    it('should detect Affirm', () => {
      // Act
      const result = service.detectBNPLFromTransaction('AFFIRM* payment');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('Affirm');
    });

    it('should detect Clearpay', () => {
      // Act
      const result = service.detectBNPLFromTransaction('CLEARPAY payment');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('Clearpay');
    });

    it('should return null for non-BNPL transactions', () => {
      // Act
      const result = service.detectBNPLFromTransaction('Amazon Purchase');

      // Assert
      expect(result).toBeNull();
    });

    it('should check merchant name as well', () => {
      // Act
      const result = service.detectBNPLFromTransaction(
        'Generic purchase',
        'KLARNA AB',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('Klarna');
    });
  });

  describe('getSummary', () => {
    it('should calculate total owed across all liabilities', async () => {
      // Arrange
      const liabilities = [
        LiabilityFactory.buildCreditCard({
          familyId: mockFamilyId,
          currentBalance: new Prisma.Decimal(1500),
          creditLimit: new Prisma.Decimal(5000),
        }),
        LiabilityFactory.buildCreditCard({
          familyId: mockFamilyId,
          currentBalance: new Prisma.Decimal(2500),
          creditLimit: new Prisma.Decimal(10000),
        }),
      ];

      prisma.liability.findMany.mockResolvedValue(liabilities);
      prisma.installment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getSummary(mockUserId);

      // Assert
      expect(result.totalLiabilities).toBe(2);
      expect(result.totalOwed).toBe(4000);
      expect(result.totalCreditLimit).toBe(15000);
    });

    it('should calculate overall credit utilization', async () => {
      // Arrange
      const liabilities = [
        LiabilityFactory.buildCreditCard({
          familyId: mockFamilyId,
          currentBalance: new Prisma.Decimal(2000),
          creditLimit: new Prisma.Decimal(10000),
        }),
      ];

      prisma.liability.findMany.mockResolvedValue(liabilities);
      prisma.installment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getSummary(mockUserId);

      // Assert
      expect(result.overallUtilization).toBe(20);
    });

    it('should group totals by liability type', async () => {
      // Arrange
      const liabilities = [
        LiabilityFactory.buildCreditCard({
          familyId: mockFamilyId,
          currentBalance: new Prisma.Decimal(1000),
        }),
        LiabilityFactory.buildBNPL({
          familyId: mockFamilyId,
          currentBalance: new Prisma.Decimal(200),
        }),
        LiabilityFactory.buildLoan({
          familyId: mockFamilyId,
          currentBalance: new Prisma.Decimal(5000),
        }),
      ];

      prisma.liability.findMany.mockResolvedValue(liabilities);
      prisma.installment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getSummary(mockUserId);

      // Assert
      expect(result.byType[LiabilityType.CREDIT_CARD]?.count).toBe(1);
      expect(result.byType[LiabilityType.CREDIT_CARD]?.totalOwed).toBe(1000);
      expect(result.byType[LiabilityType.BNPL]?.count).toBe(1);
      expect(result.byType[LiabilityType.LOAN]?.count).toBe(1);
    });
  });
});
