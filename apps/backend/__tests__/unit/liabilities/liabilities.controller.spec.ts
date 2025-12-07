import { Test, TestingModule } from '@nestjs/testing';
import { LiabilitiesController } from '../../../src/liabilities/liabilities.controller';
import { LiabilitiesService } from '../../../src/liabilities/liabilities.service';
import { LiabilityType, LiabilityStatus } from '../../../generated/prisma';
import { LiabilityFactory } from '../../utils/factories';
import { CurrentUserPayload } from '../../../src/auth/types/current-user.types';

/**
 * LiabilitiesController Unit Tests
 *
 * Test Coverage Strategy:
 * - All HTTP endpoints
 * - Request validation (params, body, query)
 * - Response transformation
 * - Error propagation from service
 */
describe('LiabilitiesController', () => {
  let controller: LiabilitiesController;
  let service: jest.Mocked<LiabilitiesService>;

  const mockUser: CurrentUserPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER' as any,
    familyId: 'family-456',
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getUpcomingPayments: jest.fn(),
      createInstallmentPlan: jest.fn(),
      markInstallmentPaid: jest.fn(),
      detectBNPLFromTransaction: jest.fn(),
      getSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiabilitiesController],
      providers: [
        { provide: LiabilitiesService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<LiabilitiesController>(LiabilitiesController);
    service = module.get(LiabilitiesService);

    LiabilityFactory.resetCounter();
  });

  describe('create', () => {
    it('should create a liability and return it', async () => {
      // Arrange
      const createDto = LiabilityFactory.buildCreateDto({ name: 'Test Card' });
      const expectedResponse = {
        id: 'liability-1',
        name: 'Test Card',
        type: LiabilityType.CREDIT_CARD,
        status: LiabilityStatus.ACTIVE,
        currentBalance: 1500,
        familyId: 'family-456',
        currency: 'USD',
        isBNPL: false,
        isCreditCard: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.create.mockResolvedValue(expectedResponse as any);

      // Act
      const result = await controller.create(createDto, mockUser);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });

  describe('findAll', () => {
    it('should return all liabilities for the user', async () => {
      // Arrange
      const liabilities = [
        { id: 'liability-1', name: 'Card 1', type: LiabilityType.CREDIT_CARD },
        { id: 'liability-2', name: 'Card 2', type: LiabilityType.BNPL },
      ];
      service.findAll.mockResolvedValue(liabilities as any);

      // Act
      const result = await controller.findAll(mockUser);

      // Assert
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return a single liability by ID', async () => {
      // Arrange
      const liability = {
        id: 'liability-1',
        name: 'Test Card',
        type: LiabilityType.CREDIT_CARD,
      };
      service.findOne.mockResolvedValue(liability as any);

      // Act
      const result = await controller.findOne('liability-1', mockUser);

      // Assert
      expect(result).toEqual(liability);
      expect(service.findOne).toHaveBeenCalledWith('liability-1', mockUser.id);
    });
  });

  describe('update', () => {
    it('should update a liability', async () => {
      // Arrange
      const updateDto = { name: 'Updated Name', currentBalance: 2000 };
      const updatedLiability = {
        id: 'liability-1',
        name: 'Updated Name',
        currentBalance: 2000,
      };
      service.update.mockResolvedValue(updatedLiability as any);

      // Act
      const result = await controller.update('liability-1', updateDto, mockUser);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(service.update).toHaveBeenCalledWith('liability-1', mockUser.id, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a liability', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('liability-1', mockUser);

      // Assert
      expect(service.remove).toHaveBeenCalledWith('liability-1', mockUser.id);
    });
  });

  describe('getSummary', () => {
    it('should return liabilities summary', async () => {
      // Arrange
      const summary = {
        totalLiabilities: 5,
        totalOwed: 10000,
        totalCreditLimit: 50000,
        overallUtilization: 20,
        upcomingPaymentCount: 3,
        upcomingPaymentTotal: 500,
        byType: {
          [LiabilityType.CREDIT_CARD]: { count: 3, totalOwed: 8000 },
          [LiabilityType.BNPL]: { count: 2, totalOwed: 2000 },
        },
      };
      service.getSummary.mockResolvedValue(summary as any);

      // Act
      const result = await controller.getSummary(mockUser);

      // Assert
      expect(result.totalLiabilities).toBe(5);
      expect(result.totalOwed).toBe(10000);
      expect(service.getSummary).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getUpcomingPayments', () => {
    it('should return upcoming payments with default 30 days', async () => {
      // Arrange
      const payments = [
        {
          liabilityId: 'liability-1',
          liabilityName: 'Test Card',
          dueDate: new Date(),
          amount: 100,
          isInstallment: true,
        },
      ];
      service.getUpcomingPayments.mockResolvedValue(payments as any);

      // Act
      const result = await controller.getUpcomingPayments(mockUser);

      // Assert
      expect(result).toHaveLength(1);
      expect(service.getUpcomingPayments).toHaveBeenCalledWith(mockUser.id, 30);
    });

    it('should accept custom days parameter', async () => {
      // Arrange
      service.getUpcomingPayments.mockResolvedValue([]);

      // Act
      await controller.getUpcomingPayments(mockUser, 60);

      // Assert
      expect(service.getUpcomingPayments).toHaveBeenCalledWith(mockUser.id, 60);
    });
  });

  describe('detectBNPL', () => {
    it('should detect BNPL from transaction description', async () => {
      // Arrange
      const detectionResult = {
        provider: 'Klarna',
        confidence: 0.9,
        matchedPattern: 'klarna',
        suggestedName: 'Klarna Purchase',
      };
      service.detectBNPLFromTransaction.mockReturnValue(detectionResult);

      // Act
      const result = await controller.detectBNPL('KLARNA* payment', undefined);

      // Assert
      expect(result).toEqual(detectionResult);
      expect(service.detectBNPLFromTransaction).toHaveBeenCalledWith('KLARNA* payment', undefined);
    });

    it('should return null for non-BNPL transactions', async () => {
      // Arrange
      service.detectBNPLFromTransaction.mockReturnValue(null);

      // Act
      const result = await controller.detectBNPL('Amazon purchase', 'Amazon');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createInstallmentPlan', () => {
    it('should create an installment plan for a liability', async () => {
      // Arrange
      const planDto = {
        totalAmount: 300,
        installmentAmount: 100,
        numberOfInstallments: 3,
        startDate: '2024-01-15',
      };
      const createdPlan = {
        id: 'plan-1',
        liabilityId: 'liability-1',
        totalAmount: 300,
        numberOfInstallments: 3,
        installments: [],
      };
      service.createInstallmentPlan.mockResolvedValue(createdPlan as any);

      // Act
      const result = await controller.createInstallmentPlan('liability-1', planDto, mockUser);

      // Assert
      expect(result.totalAmount).toBe(300);
      expect(service.createInstallmentPlan).toHaveBeenCalledWith(
        'liability-1',
        mockUser.id,
        planDto,
      );
    });
  });

  describe('markInstallmentPaid', () => {
    it('should mark an installment as paid', async () => {
      // Arrange
      const paidInstallment = {
        id: 'installment-1',
        planId: 'plan-1',
        isPaid: true,
        paidAt: new Date(),
      };
      service.markInstallmentPaid.mockResolvedValue(paidInstallment as any);

      // Act
      const result = await controller.markInstallmentPaid(
        'liability-1',
        'installment-1',
        undefined,
        mockUser,
      );

      // Assert
      expect(result.isPaid).toBe(true);
      expect(service.markInstallmentPaid).toHaveBeenCalledWith(
        'liability-1',
        'installment-1',
        mockUser.id,
        undefined,
      );
    });

    it('should link transaction when transactionId provided', async () => {
      // Arrange
      const paidInstallment = {
        id: 'installment-1',
        isPaid: true,
        transactionId: 'txn-123',
      };
      service.markInstallmentPaid.mockResolvedValue(paidInstallment as any);

      // Act
      const result = await controller.markInstallmentPaid(
        'liability-1',
        'installment-1',
        'txn-123',
        mockUser,
      );

      // Assert
      expect(result.transactionId).toBe('txn-123');
      expect(service.markInstallmentPaid).toHaveBeenCalledWith(
        'liability-1',
        'installment-1',
        mockUser.id,
        'txn-123',
      );
    });
  });
});
