import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../core/database/prisma/prisma.service';
import {
  Liability,
  LiabilityType,
  LiabilityStatus,
  InstallmentPlan,
  Installment,
  Prisma,
} from '../../generated/prisma';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { UpdateLiabilityDto } from './dto/update-liability.dto';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import {
  LiabilityResponseDto,
  InstallmentPlanResponseDto,
  InstallmentResponseDto,
  UpcomingPaymentDto,
  BNPLDetectionResultDto,
  LiabilitiesSummaryDto,
  PaginatedLiabilitiesResponseDto,
} from './dto/liability-response.dto';
import { FindLiabilitiesOptions } from './dto/find-liabilities-options.dto';

/**
 * BNPL provider detection patterns
 */
const BNPL_PATTERNS: Record<string, RegExp> = {
  'PayPal Pay in 3': /pay\s*in\s*3/i,
  'PayPal Pay in 4': /pay\s*in\s*4/i,
  Klarna: /klarna/i,
  Afterpay: /afterpay|after\s*pay/i,
  Affirm: /affirm/i,
  Clearpay: /clearpay|clear\s*pay/i,
  Zip: /\bzip\s*(pay|money)?\b/i,
  Sezzle: /sezzle/i,
  Quadpay: /quadpay|quad\s*pay/i,
  Laybuy: /laybuy|lay\s*buy/i,
};

type LiabilityWithPlans = Liability & {
  installmentPlans: (InstallmentPlan & {
    installments: Installment[];
  })[];
};

@Injectable()
export class LiabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all liabilities for a user's family
   *
   * @overload Without options - returns array (backward compatible)
   * @overload With options - returns paginated response
   */
  async findAll(userId: string): Promise<LiabilityResponseDto[]>;
  async findAll(
    userId: string,
    options: FindLiabilitiesOptions
  ): Promise<PaginatedLiabilitiesResponseDto>;
  async findAll(
    userId: string,
    options?: FindLiabilitiesOptions
  ): Promise<LiabilityResponseDto[] | PaginatedLiabilitiesResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    // Build where clause with optional filters
    const where: Prisma.LiabilityWhereInput = {
      familyId: user.familyId,
    };

    if (options?.status) {
      where.status = options.status as LiabilityStatus;
    }

    if (options?.type) {
      where.type = options.type as LiabilityType;
    }

    // If no options provided, return simple array (backward compatible)
    if (!options) {
      const liabilities = await this.prisma.liability.findMany({
        where,
        include: {
          installmentPlans: {
            include: { installments: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return liabilities.map((l) => this.toResponseDto(l));
    }

    // Get total count for pagination
    const total = await this.prisma.liability.count({ where });

    // Get paginated results
    const liabilities = await this.prisma.liability.findMany({
      where,
      include: {
        installmentPlans: {
          include: { installments: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
    });

    const data = liabilities.map((l) => this.toResponseDto(l));
    const skip = options.skip ?? 0;
    const take = options.take ?? data.length;

    return {
      data,
      total,
      hasMore: skip + data.length < total,
      skip,
      take,
    };
  }

  /**
   * Find a single liability by ID
   */
  async findOne(id: string, userId: string): Promise<LiabilityResponseDto> {
    const liability = await this.verifyOwnership(id, userId);
    return this.toResponseDto(liability);
  }

  /**
   * Create a new liability
   */
  async create(
    userId: string,
    dto: CreateLiabilityDto,
  ): Promise<LiabilityResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    // Validate accountId if provided
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: {
          id: dto.accountId,
          OR: [{ userId }, { familyId: user.familyId }],
        },
      });

      if (!account) {
        throw new NotFoundException('Linked account not found');
      }
    }

    const liability = await this.prisma.liability.create({
      data: {
        familyId: user.familyId,
        type: dto.type,
        name: dto.name,
        status: dto.status || LiabilityStatus.ACTIVE,
        currentBalance: dto.currentBalance
          ? new Prisma.Decimal(dto.currentBalance)
          : new Prisma.Decimal(0),
        creditLimit: dto.creditLimit
          ? new Prisma.Decimal(dto.creditLimit)
          : null,
        originalAmount: dto.originalAmount
          ? new Prisma.Decimal(dto.originalAmount)
          : null,
        currency: dto.currency || 'USD',
        interestRate: dto.interestRate
          ? new Prisma.Decimal(dto.interestRate)
          : null,
        minimumPayment: dto.minimumPayment
          ? new Prisma.Decimal(dto.minimumPayment)
          : null,
        billingCycleDay: dto.billingCycleDay ?? null,
        paymentDueDay: dto.paymentDueDay ?? null,
        statementCloseDay: dto.statementCloseDay ?? null,
        accountId: dto.accountId ?? null,
        provider: dto.provider ?? null,
        externalId: dto.externalId ?? null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        metadata: dto.metadata as Prisma.JsonValue,
      },
      include: {
        installmentPlans: {
          include: { installments: true },
        },
      },
    });

    return this.toResponseDto(liability);
  }

  /**
   * Update an existing liability
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateLiabilityDto,
  ): Promise<LiabilityResponseDto> {
    await this.verifyOwnership(id, userId);

    const data: Prisma.LiabilityUpdateInput = {};

    if (dto.type !== undefined) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.currentBalance !== undefined) {
      data.currentBalance = new Prisma.Decimal(dto.currentBalance);
    }
    if (dto.creditLimit !== undefined) {
      data.creditLimit = dto.creditLimit
        ? new Prisma.Decimal(dto.creditLimit)
        : null;
    }
    if (dto.originalAmount !== undefined) {
      data.originalAmount = dto.originalAmount
        ? new Prisma.Decimal(dto.originalAmount)
        : null;
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.interestRate !== undefined) {
      data.interestRate = dto.interestRate
        ? new Prisma.Decimal(dto.interestRate)
        : null;
    }
    if (dto.minimumPayment !== undefined) {
      data.minimumPayment = dto.minimumPayment
        ? new Prisma.Decimal(dto.minimumPayment)
        : null;
    }
    if (dto.billingCycleDay !== undefined) {
      data.billingCycleDay = dto.billingCycleDay;
    }
    if (dto.paymentDueDay !== undefined) {
      data.paymentDueDay = dto.paymentDueDay;
    }
    if (dto.statementCloseDay !== undefined) {
      data.statementCloseDay = dto.statementCloseDay;
    }
    if (dto.provider !== undefined) data.provider = dto.provider;
    if (dto.externalId !== undefined) data.externalId = dto.externalId;
    if (dto.purchaseDate !== undefined) {
      data.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
    }
    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata as Prisma.JsonValue;
    }

    // Handle accountId update
    if (dto.accountId !== undefined) {
      if (dto.accountId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { familyId: true },
        });

        const account = await this.prisma.account.findFirst({
          where: {
            id: dto.accountId,
            OR: [{ userId }, { familyId: user?.familyId }],
          },
        });

        if (!account) {
          throw new NotFoundException('Linked account not found');
        }
      }
      data.account = dto.accountId
        ? { connect: { id: dto.accountId } }
        : { disconnect: true };
    }

    const updated = await this.prisma.liability.update({
      where: { id },
      data,
      include: {
        installmentPlans: {
          include: { installments: true },
        },
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Delete a liability
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.verifyOwnership(id, userId);

    await this.prisma.liability.delete({
      where: { id },
    });
  }

  /**
   * Get upcoming payments within specified days (default 30)
   */
  async getUpcomingPayments(
    userId: string,
    days: number = 30,
  ): Promise<UpcomingPaymentDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const upcomingPayments: UpcomingPaymentDto[] = [];

    // Get unpaid installments due within the period
    const installments = await this.prisma.installment.findMany({
      where: {
        isPaid: false,
        dueDate: {
          gte: now,
          lte: endDate,
        },
        plan: {
          liability: {
            familyId: user.familyId,
            status: LiabilityStatus.ACTIVE,
          },
        },
      },
      include: {
        plan: {
          include: {
            liability: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Add installment payments
    for (const inst of installments) {
      const dueDate = new Date(inst.dueDate);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      upcomingPayments.push({
        liabilityId: inst.plan.liability.id,
        liabilityName: inst.plan.liability.name,
        liabilityType: inst.plan.liability.type,
        dueDate: inst.dueDate,
        amount: inst.amount.toNumber(),
        currency: inst.plan.currency,
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        totalInstallments: inst.plan.numberOfInstallments,
        isInstallment: true,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
      });
    }

    // Get credit card minimum payments
    const creditCards = await this.prisma.liability.findMany({
      where: {
        familyId: user.familyId,
        type: LiabilityType.CREDIT_CARD,
        status: LiabilityStatus.ACTIVE,
        paymentDueDay: { not: null },
        currentBalance: { gt: 0 },
      },
    });

    for (const card of creditCards) {
      if (card.paymentDueDay && card.minimumPayment) {
        const nextDueDate = this.getNextPaymentDate(card.paymentDueDay, now);

        if (nextDueDate <= endDate) {
          const daysUntilDue = Math.ceil(
            (nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          upcomingPayments.push({
            liabilityId: card.id,
            liabilityName: card.name,
            liabilityType: card.type,
            dueDate: nextDueDate,
            amount: card.minimumPayment.toNumber(),
            currency: card.currency,
            isInstallment: false,
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          });
        }
      }
    }

    // Sort all by due date
    return upcomingPayments.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }

  /**
   * Create an installment plan for a liability
   */
  async createInstallmentPlan(
    liabilityId: string,
    userId: string,
    dto: CreateInstallmentPlanDto,
  ): Promise<InstallmentPlanResponseDto> {
    const liability = await this.verifyOwnership(liabilityId, userId);

    // Calculate end date based on installments
    const startDate = new Date(dto.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + dto.numberOfInstallments - 1);

    // Create the plan with installments in a transaction
    const plan = await this.prisma.$transaction(async (tx) => {
      // Create the installment plan
      const createdPlan = await tx.installmentPlan.create({
        data: {
          liabilityId,
          totalAmount: new Prisma.Decimal(dto.totalAmount),
          installmentAmount: new Prisma.Decimal(dto.installmentAmount),
          numberOfInstallments: dto.numberOfInstallments,
          remainingInstallments: dto.numberOfInstallments,
          currency: dto.currency || liability.currency,
          startDate,
          endDate,
        },
      });

      // Create individual installments
      const installmentData: Prisma.InstallmentCreateManyInput[] = [];
      const installmentDate = new Date(startDate);

      for (let i = 1; i <= dto.numberOfInstallments; i++) {
        installmentData.push({
          planId: createdPlan.id,
          amount: new Prisma.Decimal(dto.installmentAmount),
          dueDate: new Date(installmentDate),
          installmentNumber: i,
        });
        installmentDate.setMonth(installmentDate.getMonth() + 1);
      }

      await tx.installment.createMany({
        data: installmentData,
      });

      // Fetch the complete plan with installments
      return tx.installmentPlan.findUnique({
        where: { id: createdPlan.id },
        include: { installments: true },
      });
    });

    if (!plan) {
      throw new BadRequestException('Failed to create installment plan');
    }

    return this.toInstallmentPlanDto(plan);
  }

  /**
   * Mark an installment as paid
   */
  async markInstallmentPaid(
    liabilityId: string,
    installmentId: string,
    userId: string,
    transactionId?: string,
  ): Promise<InstallmentResponseDto> {
    // Verify liability ownership
    await this.verifyOwnership(liabilityId, userId);

    // Find the installment and verify it belongs to this liability
    const installment = await this.prisma.installment.findFirst({
      where: {
        id: installmentId,
        plan: { liabilityId },
      },
      include: { plan: true },
    });

    if (!installment) {
      throw new NotFoundException('Installment not found');
    }

    if (installment.isPaid) {
      throw new BadRequestException('Installment is already paid');
    }

    // Update in a transaction with optimistic locking
    const updated = await this.prisma.$transaction(async (tx) => {
      // Use updateMany with isPaid: false condition for optimistic locking
      // This atomically checks and updates, preventing double-payment race conditions
      const updateResult = await tx.installment.updateMany({
        where: {
          id: installmentId,
          isPaid: false, // Only update if not yet paid (optimistic lock)
        },
        data: {
          isPaid: true,
          paidAt: new Date(),
          transactionId: transactionId || null,
        },
      });

      // If no rows were updated, the installment was already paid (race condition)
      if (updateResult.count === 0) {
        throw new BadRequestException('Installment is already paid');
      }

      // Fetch the updated installment for return value
      const updatedInstallment = await tx.installment.findUnique({
        where: { id: installmentId },
      });

      if (!updatedInstallment) {
        throw new NotFoundException('Installment not found after update');
      }

      // Update remaining installments count
      await tx.installmentPlan.update({
        where: { id: installment.planId },
        data: {
          remainingInstallments: { decrement: 1 },
        },
      });

      // Check if plan is now paid off
      const plan = await tx.installmentPlan.findUnique({
        where: { id: installment.planId },
      });

      if (plan && plan.remainingInstallments <= 0) {
        await tx.installmentPlan.update({
          where: { id: installment.planId },
          data: { isPaidOff: true },
        });
      }

      // Update liability balance (subtract installment amount)
      await tx.liability.update({
        where: { id: liabilityId },
        data: {
          currentBalance: {
            decrement: installment.amount,
          },
        },
      });

      return updatedInstallment;
    });

    return this.toInstallmentDto(updated);
  }

  /**
   * Detect BNPL provider from transaction description
   */
  detectBNPLFromTransaction(
    description: string,
    merchantName?: string,
  ): BNPLDetectionResultDto | null {
    const searchText = `${description} ${merchantName || ''}`.toLowerCase();

    for (const [provider, pattern] of Object.entries(BNPL_PATTERNS)) {
      if (pattern.test(searchText)) {
        return {
          provider,
          confidence: 0.9,
          matchedPattern: pattern.source,
          suggestedName: `${provider} Purchase`,
        };
      }
    }

    return null;
  }

  /**
   * Get summary statistics for user's liabilities
   */
  async getSummary(userId: string): Promise<LiabilitiesSummaryDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    const liabilities = await this.prisma.liability.findMany({
      where: {
        familyId: user.familyId,
        status: LiabilityStatus.ACTIVE,
      },
    });

    const upcomingPayments = await this.getUpcomingPayments(userId, 30);

    let totalOwed = 0;
    let totalCreditLimit = 0;
    const byType: LiabilitiesSummaryDto['byType'] = {};

    for (const liability of liabilities) {
      const balance = liability.currentBalance.toNumber();
      totalOwed += balance;

      if (liability.creditLimit) {
        totalCreditLimit += liability.creditLimit.toNumber();
      }

      if (!byType[liability.type]) {
        byType[liability.type] = { count: 0, totalOwed: 0 };
      }
      byType[liability.type]!.count++;
      byType[liability.type]!.totalOwed += balance;
    }

    const overallUtilization =
      totalCreditLimit > 0 ? (totalOwed / totalCreditLimit) * 100 : 0;

    const upcomingPaymentTotal = upcomingPayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    return {
      totalLiabilities: liabilities.length,
      totalOwed,
      totalCreditLimit,
      overallUtilization: Math.round(overallUtilization * 100) / 100,
      upcomingPaymentCount: upcomingPayments.length,
      upcomingPaymentTotal,
      byType,
    };
  }

  /**
   * Verify user has access to a liability (via family)
   */
  private async verifyOwnership(
    liabilityId: string,
    userId: string,
  ): Promise<LiabilityWithPlans> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    const liability = await this.prisma.liability.findFirst({
      where: {
        id: liabilityId,
        familyId: user.familyId,
      },
      include: {
        installmentPlans: {
          include: { installments: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!liability) {
      throw new NotFoundException('Liability not found');
    }

    return liability;
  }

  /**
   * Calculate next payment date from day of month
   */
  private getNextPaymentDate(dayOfMonth: number, fromDate: Date): Date {
    const result = new Date(fromDate);
    result.setDate(dayOfMonth);
    result.setHours(0, 0, 0, 0);

    // If the date has already passed this month, move to next month
    if (result <= fromDate) {
      result.setMonth(result.getMonth() + 1);
    }

    // Handle months with fewer days
    const targetDay = Math.min(
      dayOfMonth,
      new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate(),
    );
    result.setDate(targetDay);

    return result;
  }

  /**
   * Convert Prisma model to response DTO
   */
  private toResponseDto(liability: LiabilityWithPlans): LiabilityResponseDto {
    const currentBalance = liability.currentBalance.toNumber();
    const creditLimit = liability.creditLimit?.toNumber();

    // Compute available credit for credit cards
    let availableCredit: number | undefined;
    let utilizationPercent: number | undefined;

    if (
      liability.type === LiabilityType.CREDIT_CARD &&
      creditLimit !== undefined
    ) {
      availableCredit = Math.max(0, creditLimit - currentBalance);
      utilizationPercent =
        creditLimit > 0
          ? Math.round((currentBalance / creditLimit) * 10000) / 100
          : 0;
    }

    // Compute next payment date for credit cards
    let nextPaymentDate: Date | undefined;
    if (
      liability.paymentDueDay &&
      liability.type === LiabilityType.CREDIT_CARD
    ) {
      nextPaymentDate = this.getNextPaymentDate(
        liability.paymentDueDay,
        new Date(),
      );
    }

    return {
      id: liability.id,
      familyId: liability.familyId,
      type: liability.type,
      status: liability.status,
      name: liability.name,
      currentBalance,
      creditLimit,
      originalAmount: liability.originalAmount?.toNumber(),
      currency: liability.currency,
      interestRate: liability.interestRate?.toNumber(),
      minimumPayment: liability.minimumPayment?.toNumber(),
      billingCycleDay: liability.billingCycleDay ?? undefined,
      paymentDueDay: liability.paymentDueDay ?? undefined,
      statementCloseDay: liability.statementCloseDay ?? undefined,
      lastStatementDate: liability.lastStatementDate ?? undefined,
      accountId: liability.accountId ?? undefined,
      provider: liability.provider ?? undefined,
      externalId: liability.externalId ?? undefined,
      purchaseDate: liability.purchaseDate ?? undefined,
      metadata: liability.metadata as Record<string, unknown> | undefined,
      installmentPlans: liability.installmentPlans?.map((plan) =>
        this.toInstallmentPlanDto(plan),
      ),
      availableCredit,
      utilizationPercent,
      nextPaymentDate,
      isBNPL: liability.type === LiabilityType.BNPL,
      isCreditCard: liability.type === LiabilityType.CREDIT_CARD,
      createdAt: liability.createdAt,
      updatedAt: liability.updatedAt,
    };
  }

  /**
   * Convert InstallmentPlan to DTO
   */
  private toInstallmentPlanDto(
    plan: InstallmentPlan & { installments: Installment[] },
  ): InstallmentPlanResponseDto {
    return {
      id: plan.id,
      liabilityId: plan.liabilityId,
      totalAmount: plan.totalAmount.toNumber(),
      installmentAmount: plan.installmentAmount.toNumber(),
      numberOfInstallments: plan.numberOfInstallments,
      remainingInstallments: plan.remainingInstallments,
      currency: plan.currency,
      startDate: plan.startDate,
      endDate: plan.endDate,
      isPaidOff: plan.isPaidOff,
      installments: plan.installments.map((inst) => this.toInstallmentDto(inst)),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /**
   * Convert Installment to DTO
   */
  private toInstallmentDto(installment: Installment): InstallmentResponseDto {
    return {
      id: installment.id,
      planId: installment.planId,
      amount: installment.amount.toNumber(),
      dueDate: installment.dueDate,
      installmentNumber: installment.installmentNumber,
      isPaid: installment.isPaid,
      paidAt: installment.paidAt ?? undefined,
      transactionId: installment.transactionId ?? undefined,
      createdAt: installment.createdAt,
      updatedAt: installment.updatedAt,
    };
  }
}
