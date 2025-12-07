import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../core/database/prisma/prisma.service';
import {
  ScheduledTransaction,
  RecurrenceRule,
  ScheduledTransactionStatus,
  TransactionType,
  FlowType,
  LiabilityType,
  LiabilityStatus,
  Prisma,
} from '../../generated/prisma';
import { CreateScheduledTransactionDto } from './dto/create-scheduled-transaction.dto';
import { UpdateScheduledTransactionDto } from './dto/update-scheduled-transaction.dto';
import {
  ScheduledTransactionResponseDto,
  UpcomingScheduledDto,
  CalendarEventDto,
  FindScheduledOptionsDto,
  PaginatedScheduledResponseDto,
  RecurrenceRuleResponseDto,
} from './dto/scheduled-transaction-response.dto';
import { RecurrenceService } from './recurrence.service';

type ScheduledTransactionWithRule = ScheduledTransaction & {
  recurrenceRule: RecurrenceRule | null;
};

@Injectable()
export class ScheduledService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurrenceService: RecurrenceService,
  ) {}

  /**
   * Find all scheduled transactions for a user's family
   */
  async findAll(
    userId: string,
    options?: FindScheduledOptionsDto,
  ): Promise<ScheduledTransactionResponseDto[] | PaginatedScheduledResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    const where: Prisma.ScheduledTransactionWhereInput = {
      familyId: user.familyId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.flowType) {
      where.flowType = options.flowType;
    }

    if (options?.accountId) {
      where.accountId = options.accountId;
    }

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options?.dueDateFrom || options?.dueDateTo) {
      where.nextDueDate = {};
      if (options?.dueDateFrom) {
        where.nextDueDate.gte = options.dueDateFrom;
      }
      if (options?.dueDateTo) {
        where.nextDueDate.lte = options.dueDateTo;
      }
    }

    // Simple array response if no pagination
    if (!options?.skip && !options?.take) {
      const scheduled = await this.prisma.scheduledTransaction.findMany({
        where,
        include: { recurrenceRule: true },
        orderBy: { nextDueDate: 'asc' },
      });

      return scheduled.map((s) => this.toResponseDto(s));
    }

    // Paginated response
    const total = await this.prisma.scheduledTransaction.count({ where });

    const scheduled = await this.prisma.scheduledTransaction.findMany({
      where,
      include: { recurrenceRule: true },
      orderBy: { nextDueDate: 'asc' },
      skip: options.skip,
      take: options.take,
    });

    const data = scheduled.map((s) => this.toResponseDto(s));
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
   * Find a single scheduled transaction by ID
   */
  async findOne(id: string, userId: string): Promise<ScheduledTransactionResponseDto> {
    const scheduled = await this.verifyOwnership(id, userId);
    return this.toResponseDto(scheduled);
  }

  /**
   * Create a new scheduled transaction
   */
  async create(
    userId: string,
    dto: CreateScheduledTransactionDto,
  ): Promise<ScheduledTransactionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    // Validate account ownership
    const account = await this.prisma.account.findFirst({
      where: {
        id: dto.accountId,
        OR: [{ userId }, { familyId: user.familyId }],
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          familyId: user.familyId, // Categories are family-specific
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const scheduled = await this.prisma.scheduledTransaction.create({
      data: {
        familyId: user.familyId,
        accountId: dto.accountId,
        amount: new Prisma.Decimal(dto.amount),
        type: dto.type,
        flowType: dto.flowType,
        currency: dto.currency || 'USD',
        description: dto.description,
        merchantName: dto.merchantName,
        categoryId: dto.categoryId,
        nextDueDate: new Date(dto.nextDueDate),
        autoCreate: dto.autoCreate ?? false,
        reminderDaysBefore: dto.reminderDaysBefore ?? 3,
        status: dto.status || ScheduledTransactionStatus.ACTIVE,
        metadata: dto.metadata as Prisma.JsonValue,
        recurrenceRule: dto.recurrenceRule
          ? {
              create: {
                frequency: dto.recurrenceRule.frequency,
                interval: dto.recurrenceRule.interval ?? 1,
                dayOfWeek: dto.recurrenceRule.dayOfWeek,
                dayOfMonth: dto.recurrenceRule.dayOfMonth,
                endDate: dto.recurrenceRule.endDate
                  ? new Date(dto.recurrenceRule.endDate)
                  : null,
                endCount: dto.recurrenceRule.endCount,
              },
            }
          : undefined,
      },
      include: { recurrenceRule: true },
    });

    return this.toResponseDto(scheduled);
  }

  /**
   * Update an existing scheduled transaction
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateScheduledTransactionDto,
  ): Promise<ScheduledTransactionResponseDto> {
    const existing = await this.verifyOwnership(id, userId);

    const data: Prisma.ScheduledTransactionUpdateInput = {};

    if (dto.accountId !== undefined) {
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
        throw new NotFoundException('Account not found');
      }
      data.accountId = dto.accountId;
    }

    if (dto.amount !== undefined) {
      data.amount = new Prisma.Decimal(dto.amount);
    }
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.flowType !== undefined) data.flowType = dto.flowType;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.merchantName !== undefined) data.merchantName = dto.merchantName;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.nextDueDate !== undefined) {
      data.nextDueDate = new Date(dto.nextDueDate);
    }
    if (dto.autoCreate !== undefined) data.autoCreate = dto.autoCreate;
    if (dto.reminderDaysBefore !== undefined) {
      data.reminderDaysBefore = dto.reminderDaysBefore;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata as Prisma.JsonValue;
    }

    // Handle recurrence rule update
    if (dto.recurrenceRule !== undefined) {
      if (dto.recurrenceRule === null) {
        // Remove recurrence rule
        if (existing.recurrenceRule) {
          await this.prisma.recurrenceRule.delete({
            where: { id: existing.recurrenceRule.id },
          });
        }
      } else if (existing.recurrenceRule) {
        // Update existing rule
        await this.prisma.recurrenceRule.update({
          where: { id: existing.recurrenceRule.id },
          data: {
            frequency: dto.recurrenceRule.frequency,
            interval: dto.recurrenceRule.interval ?? 1,
            dayOfWeek: dto.recurrenceRule.dayOfWeek,
            dayOfMonth: dto.recurrenceRule.dayOfMonth,
            endDate: dto.recurrenceRule.endDate
              ? new Date(dto.recurrenceRule.endDate)
              : null,
            endCount: dto.recurrenceRule.endCount,
          },
        });
      } else {
        // Create new rule
        data.recurrenceRule = {
          create: {
            frequency: dto.recurrenceRule.frequency,
            interval: dto.recurrenceRule.interval ?? 1,
            dayOfWeek: dto.recurrenceRule.dayOfWeek,
            dayOfMonth: dto.recurrenceRule.dayOfMonth,
            endDate: dto.recurrenceRule.endDate
              ? new Date(dto.recurrenceRule.endDate)
              : null,
            endCount: dto.recurrenceRule.endCount,
          },
        };
      }
    }

    const updated = await this.prisma.scheduledTransaction.update({
      where: { id },
      data,
      include: { recurrenceRule: true },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Delete a scheduled transaction
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.verifyOwnership(id, userId);

    await this.prisma.scheduledTransaction.delete({
      where: { id },
    });
  }

  /**
   * Get upcoming scheduled transactions within specified days
   */
  async getUpcoming(userId: string, days: number = 30): Promise<UpcomingScheduledDto[]> {
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

    const scheduled = await this.prisma.scheduledTransaction.findMany({
      where: {
        familyId: user.familyId,
        status: ScheduledTransactionStatus.ACTIVE,
        nextDueDate: {
          lte: endDate,
        },
      },
      include: { recurrenceRule: true },
      orderBy: { nextDueDate: 'asc' },
    });

    const upcoming: UpcomingScheduledDto[] = [];

    for (const s of scheduled) {
      const dueDate = new Date(s.nextDueDate);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      upcoming.push({
        scheduledTransactionId: s.id,
        dueDate,
        description: s.description,
        amount: s.amount.toNumber(),
        currency: s.currency,
        type: s.type,
        flowType: s.flowType ?? undefined,
        merchantName: s.merchantName ?? undefined,
        categoryId: s.categoryId ?? undefined,
        accountId: s.accountId,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
      });

      // If recurring, also add future occurrences within the range
      if (s.recurrenceRule) {
        const occurrences = this.recurrenceService.getOccurrencesInRange(
          {
            frequency: s.recurrenceRule.frequency,
            interval: s.recurrenceRule.interval,
            dayOfWeek: s.recurrenceRule.dayOfWeek,
            dayOfMonth: s.recurrenceRule.dayOfMonth,
            endDate: s.recurrenceRule.endDate,
            endCount: s.recurrenceRule.endCount,
            occurrenceCount: s.recurrenceRule.occurrenceCount,
          },
          dueDate,
          now,
          endDate,
          10, // Limit future occurrences
        );

        // Skip the first occurrence (already added)
        for (let i = 1; i < occurrences.length; i++) {
          const occDate = occurrences[i];
          const occDaysUntil = Math.ceil(
            (occDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          upcoming.push({
            scheduledTransactionId: s.id,
            dueDate: occDate,
            description: s.description,
            amount: s.amount.toNumber(),
            currency: s.currency,
            type: s.type,
            flowType: s.flowType ?? undefined,
            merchantName: s.merchantName ?? undefined,
            categoryId: s.categoryId ?? undefined,
            accountId: s.accountId,
            daysUntilDue: occDaysUntil,
            isOverdue: occDaysUntil < 0,
          });
        }
      }
    }

    // Sort by due date
    return upcoming.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }

  /**
   * Get calendar events for a date range
   */
  async getCalendarEvents(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    const scheduled = await this.prisma.scheduledTransaction.findMany({
      where: {
        familyId: user.familyId,
        status: {
          in: [ScheduledTransactionStatus.ACTIVE, ScheduledTransactionStatus.PAUSED],
        },
      },
      include: {
        recurrenceRule: true,
      },
    });

    // Fetch categories and accounts for enrichment
    const categoryIds = [...new Set(scheduled.filter(s => s.categoryId).map(s => s.categoryId!))];
    const accountIds = [...new Set(scheduled.map(s => s.accountId))];

    const [categories, accounts] = await Promise.all([
      categoryIds.length > 0
        ? this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, icon: true, color: true },
          })
        : [],
      this.prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, name: true },
      }),
    ]);

    const categoryMap = new Map(
      categories.map((c) => [c.id, c] as const),
    );
    const accountMap = new Map(accounts.map((a) => [a.id, a] as const));

    const now = new Date();
    const events: CalendarEventDto[] = [];

    for (const s of scheduled) {
      let occurrences: Date[];

      if (s.recurrenceRule) {
        occurrences = this.recurrenceService.getOccurrencesInRange(
          {
            frequency: s.recurrenceRule.frequency,
            interval: s.recurrenceRule.interval,
            dayOfWeek: s.recurrenceRule.dayOfWeek,
            dayOfMonth: s.recurrenceRule.dayOfMonth,
            endDate: s.recurrenceRule.endDate,
            endCount: s.recurrenceRule.endCount,
            occurrenceCount: s.recurrenceRule.occurrenceCount,
          },
          s.nextDueDate,
          startDate,
          endDate,
          50,
        );
      } else {
        // Non-recurring - check if nextDueDate is within range
        const dueDate = new Date(s.nextDueDate);
        if (dueDate >= startDate && dueDate <= endDate) {
          occurrences = [dueDate];
        } else {
          occurrences = [];
        }
      }

      for (let i = 0; i < occurrences.length; i++) {
        const date = occurrences[i];
        const category = s.categoryId ? categoryMap.get(s.categoryId) : undefined;
        const account = accountMap.get(s.accountId);

        events.push({
          id: `${s.id}-${i}`,
          scheduledTransactionId: s.id,
          date,
          description: s.description,
          amount: s.amount.toNumber(),
          currency: s.currency,
          type: s.type,
          flowType: s.flowType ?? undefined,
          category: category
            ? {
                id: category.id,
                name: category.name,
                icon: category.icon ?? undefined,
                color: category.color ?? undefined,
              }
            : undefined,
          account: account
            ? { id: account.id, name: account.name }
            : undefined,
          isOverdue: date < now,
          status: s.status,
        });
      }
    }

    // Sort by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Skip the next occurrence of a scheduled transaction
   */
  async skipNextOccurrence(
    id: string,
    userId: string,
  ): Promise<ScheduledTransactionResponseDto> {
    const scheduled = await this.verifyOwnership(id, userId);

    if (scheduled.status !== ScheduledTransactionStatus.ACTIVE) {
      throw new BadRequestException('Can only skip active scheduled transactions');
    }

    if (!scheduled.recurrenceRule) {
      throw new BadRequestException('Cannot skip non-recurring transaction');
    }

    // Calculate next occurrence
    const nextDate = this.recurrenceService.calculateNextOccurrence(
      {
        frequency: scheduled.recurrenceRule.frequency,
        interval: scheduled.recurrenceRule.interval,
        dayOfWeek: scheduled.recurrenceRule.dayOfWeek,
        dayOfMonth: scheduled.recurrenceRule.dayOfMonth,
        endDate: scheduled.recurrenceRule.endDate,
        endCount: scheduled.recurrenceRule.endCount,
        occurrenceCount: scheduled.recurrenceRule.occurrenceCount + 1,
      },
      scheduled.nextDueDate,
    );

    if (!nextDate) {
      // No more occurrences - mark as completed
      const updated = await this.prisma.scheduledTransaction.update({
        where: { id },
        data: {
          status: ScheduledTransactionStatus.COMPLETED,
          lastExecutedAt: new Date(),
        },
        include: { recurrenceRule: true },
      });
      return this.toResponseDto(updated);
    }

    // Update to next occurrence
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.recurrenceRule.update({
        where: { id: scheduled.recurrenceRule!.id },
        data: { occurrenceCount: { increment: 1 } },
      });

      return tx.scheduledTransaction.update({
        where: { id },
        data: {
          nextDueDate: nextDate,
          lastExecutedAt: new Date(),
        },
        include: { recurrenceRule: true },
      });
    });

    return this.toResponseDto(updated);
  }

  /**
   * Mark a scheduled transaction as completed (matched to actual transaction)
   */
  async markCompleted(
    id: string,
    userId: string,
    transactionId?: string,
  ): Promise<ScheduledTransactionResponseDto> {
    const scheduled = await this.verifyOwnership(id, userId);

    if (scheduled.status !== ScheduledTransactionStatus.ACTIVE) {
      throw new BadRequestException('Can only complete active scheduled transactions');
    }

    // If recurring, advance to next occurrence
    if (scheduled.recurrenceRule) {
      const nextDate = this.recurrenceService.calculateNextOccurrence(
        {
          frequency: scheduled.recurrenceRule.frequency,
          interval: scheduled.recurrenceRule.interval,
          dayOfWeek: scheduled.recurrenceRule.dayOfWeek,
          dayOfMonth: scheduled.recurrenceRule.dayOfMonth,
          endDate: scheduled.recurrenceRule.endDate,
          endCount: scheduled.recurrenceRule.endCount,
          occurrenceCount: scheduled.recurrenceRule.occurrenceCount + 1,
        },
        scheduled.nextDueDate,
      );

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.recurrenceRule.update({
          where: { id: scheduled.recurrenceRule!.id },
          data: { occurrenceCount: { increment: 1 } },
        });

        return tx.scheduledTransaction.update({
          where: { id },
          data: {
            nextDueDate: nextDate ?? scheduled.nextDueDate,
            status: nextDate ? ScheduledTransactionStatus.ACTIVE : ScheduledTransactionStatus.COMPLETED,
            lastExecutedAt: new Date(),
            metadata: transactionId
              ? {
                  ...((scheduled.metadata as object) || {}),
                  lastTransactionId: transactionId,
                }
              : scheduled.metadata,
          },
          include: { recurrenceRule: true },
        });
      });

      return this.toResponseDto(updated);
    }

    // Non-recurring - mark as completed
    const updated = await this.prisma.scheduledTransaction.update({
      where: { id },
      data: {
        status: ScheduledTransactionStatus.COMPLETED,
        lastExecutedAt: new Date(),
        metadata: transactionId
          ? {
              ...((scheduled.metadata as object) || {}),
              lastTransactionId: transactionId,
            }
          : scheduled.metadata,
      },
      include: { recurrenceRule: true },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Generate scheduled transactions from active liabilities
   */
  async generateFromLiabilities(userId: string): Promise<ScheduledTransactionResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    // Get active liabilities with payment info
    const liabilities = await this.prisma.liability.findMany({
      where: {
        familyId: user.familyId,
        status: LiabilityStatus.ACTIVE,
        OR: [
          { type: LiabilityType.CREDIT_CARD, paymentDueDay: { not: null } },
          { type: LiabilityType.LOAN },
          { type: LiabilityType.MORTGAGE },
          {
            type: LiabilityType.BNPL,
            installmentPlans: {
              some: { isPaidOff: false },
            },
          },
        ],
      },
      include: {
        account: true,
        installmentPlans: {
          where: { isPaidOff: false },
          include: {
            installments: {
              where: { isPaid: false },
              orderBy: { dueDate: 'asc' },
            },
          },
        },
      },
    });

    const created: ScheduledTransactionResponseDto[] = [];

    for (const liability of liabilities) {
      // Skip if no linked account
      if (!liability.accountId) continue;

      if (liability.type === LiabilityType.CREDIT_CARD && liability.paymentDueDay) {
        // Create monthly credit card payment
        const nextDueDate = this.getNextPaymentDate(liability.paymentDueDay, new Date());

        // Check if already exists
        const existing = await this.prisma.scheduledTransaction.findFirst({
          where: {
            familyId: user.familyId,
            description: { contains: liability.name },
            type: TransactionType.DEBIT,
            accountId: liability.accountId,
          },
        });

        if (!existing) {
          const scheduled = await this.prisma.scheduledTransaction.create({
            data: {
              familyId: user.familyId,
              accountId: liability.accountId,
              amount: liability.minimumPayment || new Prisma.Decimal(0),
              type: TransactionType.DEBIT,
              flowType: FlowType.LIABILITY_PAYMENT,
              currency: liability.currency,
              description: `${liability.name} - Credit Card Payment`,
              nextDueDate,
              recurrenceRule: {
                create: {
                  frequency: 'MONTHLY',
                  interval: 1,
                  dayOfMonth: liability.paymentDueDay,
                },
              },
              metadata: {
                liabilityId: liability.id,
                liabilityType: liability.type,
                autoGenerated: true,
              },
            },
            include: { recurrenceRule: true },
          });
          created.push(this.toResponseDto(scheduled));
        }
      } else if (
        (liability.type === LiabilityType.LOAN || liability.type === LiabilityType.MORTGAGE) &&
        liability.minimumPayment
      ) {
        // Create monthly loan/mortgage payment
        const paymentDay = liability.paymentDueDay || 1;
        const nextDueDate = this.getNextPaymentDate(paymentDay, new Date());

        const existing = await this.prisma.scheduledTransaction.findFirst({
          where: {
            familyId: user.familyId,
            description: { contains: liability.name },
            type: TransactionType.DEBIT,
            accountId: liability.accountId,
          },
        });

        if (!existing) {
          const scheduled = await this.prisma.scheduledTransaction.create({
            data: {
              familyId: user.familyId,
              accountId: liability.accountId,
              amount: liability.minimumPayment,
              type: TransactionType.DEBIT,
              flowType: FlowType.LIABILITY_PAYMENT,
              currency: liability.currency,
              description: `${liability.name} - ${liability.type === LiabilityType.MORTGAGE ? 'Mortgage' : 'Loan'} Payment`,
              nextDueDate,
              recurrenceRule: {
                create: {
                  frequency: 'MONTHLY',
                  interval: 1,
                  dayOfMonth: paymentDay,
                },
              },
              metadata: {
                liabilityId: liability.id,
                liabilityType: liability.type,
                autoGenerated: true,
              },
            },
            include: { recurrenceRule: true },
          });
          created.push(this.toResponseDto(scheduled));
        }
      } else if (liability.type === LiabilityType.BNPL) {
        // Create scheduled transactions for each unpaid installment
        for (const plan of liability.installmentPlans) {
          for (const installment of plan.installments) {
            const existing = await this.prisma.scheduledTransaction.findFirst({
              where: {
                familyId: user.familyId,
                metadata: {
                  path: ['installmentId'],
                  equals: installment.id,
                },
              },
            });

            if (!existing && installment.dueDate >= new Date()) {
              const scheduled = await this.prisma.scheduledTransaction.create({
                data: {
                  familyId: user.familyId,
                  accountId: liability.accountId,
                  amount: installment.amount,
                  type: TransactionType.DEBIT,
                  flowType: FlowType.LIABILITY_PAYMENT,
                  currency: plan.currency,
                  description: `${liability.name} - BNPL Installment ${installment.installmentNumber}/${plan.numberOfInstallments}`,
                  nextDueDate: installment.dueDate,
                  // No recurrence - one-time payment
                  metadata: {
                    liabilityId: liability.id,
                    liabilityType: liability.type,
                    installmentPlanId: plan.id,
                    installmentId: installment.id,
                    installmentNumber: installment.installmentNumber,
                    totalInstallments: plan.numberOfInstallments,
                    autoGenerated: true,
                  },
                },
                include: { recurrenceRule: true },
              });
              created.push(this.toResponseDto(scheduled));
            }
          }
        }
      }
    }

    return created;
  }

  /**
   * Verify user has access to a scheduled transaction
   */
  private async verifyOwnership(
    id: string,
    userId: string,
  ): Promise<ScheduledTransactionWithRule> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('User must belong to a family');
    }

    const scheduled = await this.prisma.scheduledTransaction.findFirst({
      where: {
        id,
        familyId: user.familyId,
      },
      include: { recurrenceRule: true },
    });

    if (!scheduled) {
      throw new NotFoundException('Scheduled transaction not found');
    }

    return scheduled;
  }

  /**
   * Calculate next payment date from day of month
   */
  private getNextPaymentDate(dayOfMonth: number, fromDate: Date): Date {
    const result = new Date(fromDate);
    result.setDate(dayOfMonth);
    result.setHours(0, 0, 0, 0);

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
  private toResponseDto(
    scheduled: ScheduledTransactionWithRule,
  ): ScheduledTransactionResponseDto {
    const now = new Date();
    const dueDate = new Date(scheduled.nextDueDate);
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let recurrenceRule: RecurrenceRuleResponseDto | undefined;
    let recurrenceDescription: string | undefined;

    if (scheduled.recurrenceRule) {
      recurrenceRule = {
        id: scheduled.recurrenceRule.id,
        frequency: scheduled.recurrenceRule.frequency,
        interval: scheduled.recurrenceRule.interval,
        dayOfWeek: scheduled.recurrenceRule.dayOfWeek ?? undefined,
        dayOfMonth: scheduled.recurrenceRule.dayOfMonth ?? undefined,
        endDate: scheduled.recurrenceRule.endDate ?? undefined,
        endCount: scheduled.recurrenceRule.endCount ?? undefined,
        occurrenceCount: scheduled.recurrenceRule.occurrenceCount,
        createdAt: scheduled.recurrenceRule.createdAt,
        updatedAt: scheduled.recurrenceRule.updatedAt,
      };

      recurrenceDescription = this.recurrenceService.getRecurrenceDescription({
        frequency: scheduled.recurrenceRule.frequency,
        interval: scheduled.recurrenceRule.interval,
        dayOfWeek: scheduled.recurrenceRule.dayOfWeek,
        dayOfMonth: scheduled.recurrenceRule.dayOfMonth,
      });
    }

    return {
      id: scheduled.id,
      familyId: scheduled.familyId,
      accountId: scheduled.accountId,
      status: scheduled.status,
      amount: scheduled.amount.toNumber(),
      type: scheduled.type,
      flowType: scheduled.flowType ?? undefined,
      currency: scheduled.currency,
      description: scheduled.description,
      merchantName: scheduled.merchantName ?? undefined,
      categoryId: scheduled.categoryId ?? undefined,
      nextDueDate: dueDate,
      lastExecutedAt: scheduled.lastExecutedAt ?? undefined,
      autoCreate: scheduled.autoCreate,
      reminderDaysBefore: scheduled.reminderDaysBefore,
      metadata: scheduled.metadata as Record<string, unknown> | undefined,
      recurrenceRule,
      createdAt: scheduled.createdAt,
      updatedAt: scheduled.updatedAt,
      isOverdue: daysUntilDue < 0,
      daysUntilDue,
      recurrenceDescription,
    };
  }
}
