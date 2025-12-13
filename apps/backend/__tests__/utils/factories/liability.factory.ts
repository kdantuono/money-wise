import { LiabilityType, LiabilityStatus, Prisma } from '../../../generated/prisma';
import { CreateLiabilityDto } from '../../../src/liabilities/dto/create-liability.dto';

/**
 * Factory for creating Liability test data
 */
export class LiabilityFactory {
  private static counter = 0;

  /**
   * Build a Liability entity for testing
   */
  static build(overrides: Partial<any> = {}): any {
    this.counter++;
    const id = overrides.id || `liability-${this.counter}`;

    return {
      id,
      familyId: overrides.familyId || 'family-123',
      type: overrides.type || LiabilityType.CREDIT_CARD,
      status: overrides.status || LiabilityStatus.ACTIVE,
      name: overrides.name || `Test Liability ${this.counter}`,
      currentBalance: overrides.currentBalance ?? new Prisma.Decimal(1500),
      creditLimit: overrides.creditLimit ?? new Prisma.Decimal(10000),
      originalAmount: overrides.originalAmount ?? null,
      currency: overrides.currency || 'USD',
      interestRate: overrides.interestRate ?? new Prisma.Decimal(19.99),
      minimumPayment: overrides.minimumPayment ?? new Prisma.Decimal(35),
      billingCycleDay: overrides.billingCycleDay ?? 15,
      paymentDueDay: overrides.paymentDueDay ?? 20,
      statementCloseDay: overrides.statementCloseDay ?? 12,
      lastStatementDate: overrides.lastStatementDate ?? null,
      accountId: overrides.accountId ?? null,
      provider: overrides.provider ?? null,
      externalId: overrides.externalId ?? null,
      purchaseDate: overrides.purchaseDate ?? null,
      metadata: overrides.metadata ?? null,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      installmentPlans: overrides.installmentPlans || [],
    };
  }

  /**
   * Build a BNPL liability
   */
  static buildBNPL(overrides: Partial<any> = {}): any {
    return this.build({
      type: LiabilityType.BNPL,
      creditLimit: null,
      billingCycleDay: null,
      paymentDueDay: null,
      statementCloseDay: null,
      interestRate: new Prisma.Decimal(0),
      provider: 'Klarna',
      originalAmount: new Prisma.Decimal(300),
      currentBalance: new Prisma.Decimal(200),
      purchaseDate: new Date('2024-01-15'),
      ...overrides,
    });
  }

  /**
   * Build a credit card liability
   */
  static buildCreditCard(overrides: Partial<any> = {}): any {
    return this.build({
      type: LiabilityType.CREDIT_CARD,
      ...overrides,
    });
  }

  /**
   * Build a loan liability
   */
  static buildLoan(overrides: Partial<any> = {}): any {
    return this.build({
      type: LiabilityType.LOAN,
      creditLimit: null,
      billingCycleDay: null,
      statementCloseDay: null,
      originalAmount: new Prisma.Decimal(10000),
      interestRate: new Prisma.Decimal(7.5),
      ...overrides,
    });
  }

  /**
   * Build many liabilities
   */
  static buildMany(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build a CreateLiabilityDto
   */
  static buildCreateDto(overrides: Partial<CreateLiabilityDto> = {}): CreateLiabilityDto {
    // Do not spread overrides at the end, as it can override already set values
    const dto: CreateLiabilityDto = {
      type: LiabilityType.CREDIT_CARD,
      name: 'Test Credit Card',
      currentBalance: 1500,
      creditLimit: 10000,
      currency: 'USD',
      interestRate: 19.99,
      minimumPayment: 35,
      billingCycleDay: 15,
      paymentDueDay: 20,
    };

    // Apply overrides explicitly
    Object.assign(dto, overrides);
    return dto;
  }

  /**
   * Build a Liability entity from a DTO (with Decimal conversions)
   */
  static buildFromDto(dto: CreateLiabilityDto, overrides: Partial<any> = {}): any {
    return this.build({
      type: dto.type,
      name: dto.name,
      currentBalance: dto.currentBalance !== undefined
        ? new Prisma.Decimal(dto.currentBalance)
        : new Prisma.Decimal(0),
      creditLimit: dto.creditLimit !== undefined
        ? new Prisma.Decimal(dto.creditLimit)
        : null,
      originalAmount: dto.originalAmount !== undefined
        ? new Prisma.Decimal(dto.originalAmount)
        : null,
      currency: dto.currency || 'USD',
      interestRate: dto.interestRate !== undefined
        ? new Prisma.Decimal(dto.interestRate)
        : null,
      minimumPayment: dto.minimumPayment !== undefined
        ? new Prisma.Decimal(dto.minimumPayment)
        : null,
      billingCycleDay: dto.billingCycleDay ?? null,
      paymentDueDay: dto.paymentDueDay ?? null,
      provider: dto.provider ?? null,
      ...overrides,
    });
  }

  /**
   * Build an InstallmentPlan for testing
   */
  static buildInstallmentPlan(overrides: Partial<any> = {}): any {
    const id = overrides.id || `plan-${++this.counter}`;
    const startDate = overrides.startDate || new Date('2024-01-15');
    const endDate = overrides.endDate || new Date('2024-03-15');

    return {
      id,
      liabilityId: overrides.liabilityId || 'liability-1',
      totalAmount: overrides.totalAmount ?? new Prisma.Decimal(300),
      installmentAmount: overrides.installmentAmount ?? new Prisma.Decimal(100),
      numberOfInstallments: overrides.numberOfInstallments ?? 3,
      remainingInstallments: overrides.remainingInstallments ?? 3,
      currency: overrides.currency || 'USD',
      startDate,
      endDate,
      isPaidOff: overrides.isPaidOff ?? false,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      installments: overrides.installments || [],
    };
  }

  /**
   * Build an Installment for testing
   */
  static buildInstallment(overrides: Partial<any> = {}): any {
    const id = overrides.id || `installment-${++this.counter}`;

    return {
      id,
      planId: overrides.planId || 'plan-1',
      amount: overrides.amount ?? new Prisma.Decimal(100),
      dueDate: overrides.dueDate || new Date('2024-02-15'),
      installmentNumber: overrides.installmentNumber ?? 1,
      isPaid: overrides.isPaid ?? false,
      paidAt: overrides.paidAt ?? null,
      transactionId: overrides.transactionId ?? null,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
  }

  /**
   * Build installments for a plan
   */
  static buildInstallmentsForPlan(
    planId: string,
    count: number,
    startDate: Date,
    amount: number,
  ): any[] {
    const installments = [];
    const currentDate = new Date(startDate);

    for (let i = 1; i <= count; i++) {
      installments.push(
        this.buildInstallment({
          planId,
          amount: new Prisma.Decimal(amount),
          dueDate: new Date(currentDate),
          installmentNumber: i,
        }),
      );
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return installments;
  }

  /**
   * Reset counter (useful for consistent test data)
   */
  static resetCounter(): void {
    this.counter = 0;
  }
}
