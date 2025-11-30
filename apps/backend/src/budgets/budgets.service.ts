import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../core/database/prisma/prisma.service';
import {
  Budget,
  BudgetStatus,
  TransactionType,
  Prisma,
} from '../../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetResponseDto, BudgetListResponseDto } from './dto/budget-response.dto';

/**
 * BudgetsService - High-level budget management service
 *
 * Provides business logic for budget operations including:
 * - CRUD operations with family-based authorization
 * - Spent amount calculation from transactions
 * - Progress tracking and status calculation
 *
 * Uses the existing Prisma BudgetService for database operations
 * and adds authorization, spent calculations, and response formatting.
 */
@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that a category belongs to the specified family
   *
   * @param categoryId - Category ID to validate
   * @param familyId - Family ID that should own the category
   * @throws NotFoundException - Category not found
   * @throws ForbiddenException - Category doesn't belong to family
   */
  private async validateCategoryOwnership(
    categoryId: string,
    familyId: string,
  ): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { familyId: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.familyId !== familyId) {
      throw new ForbiddenException('Category does not belong to your family');
    }
  }

  /**
   * Create a new budget
   *
   * @param familyId - Family ID from authenticated user
   * @param dto - Budget creation data
   * @returns Created budget with calculated fields
   */
  async create(familyId: string, dto: CreateBudgetDto): Promise<BudgetResponseDto> {
    this.logger.log(`Creating budget for family ${familyId}: ${dto.name}`);

    // SECURITY: Validate category belongs to this family
    await this.validateCategoryOwnership(dto.categoryId, familyId);

    const budget = await this.prisma.budget.create({
      data: {
        name: dto.name,
        amount: new Decimal(dto.amount),
        period: dto.period,
        status: BudgetStatus.ACTIVE,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        alertThresholds: dto.alertThresholds || [50, 75, 90],
        notes: dto.notes || null,
        category: {
          connect: { id: dto.categoryId },
        },
        family: {
          connect: { id: familyId },
        },
      },
      include: {
        category: true,
      },
    });

    return this.toBudgetResponse(budget, 0);
  }

  /**
   * Get all budgets for a family with spent amounts
   *
   * Uses batch query optimization to avoid N+1 problem.
   *
   * @param familyId - Family ID from authenticated user
   * @returns List of budgets with progress information
   */
  async findAll(familyId: string): Promise<BudgetListResponseDto> {
    this.logger.log(`Fetching budgets for family ${familyId}`);

    // Step 1: Get all budgets
    const budgets = await this.prisma.budget.findMany({
      where: { familyId },
      include: {
        category: true,
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { startDate: 'desc' },
      ],
    });

    if (budgets.length === 0) {
      return { budgets: [], total: 0, overBudgetCount: 0 };
    }

    // Step 2: Get all family accounts (single query)
    const familyAccounts = await this.prisma.account.findMany({
      where: { familyId },
      select: { id: true },
    });
    const accountIds = familyAccounts.map((a) => a.id);

    // Step 3: Batch calculate spent amounts (optimized - minimal queries)
    const spentByBudget = await this.calculateSpentBatch(budgets, accountIds);

    // Step 4: Map to response DTOs
    const budgetResponses = budgets.map((budget) => {
      const spent = spentByBudget.get(budget.id) || 0;
      return this.toBudgetResponse(budget, spent);
    });

    const overBudgetCount = budgetResponses.filter((b) => b.isOverBudget).length;

    return {
      budgets: budgetResponses,
      total: budgetResponses.length,
      overBudgetCount,
    };
  }

  /**
   * Get a single budget by ID
   *
   * @param familyId - Family ID from authenticated user
   * @param budgetId - Budget ID to retrieve
   * @returns Budget with progress information
   * @throws NotFoundException - Budget not found
   * @throws ForbiddenException - Budget belongs to different family
   */
  async findOne(familyId: string, budgetId: string): Promise<BudgetResponseDto> {
    this.logger.log(`Fetching budget ${budgetId} for family ${familyId}`);

    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      include: {
        category: true,
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.familyId !== familyId) {
      throw new ForbiddenException('You do not have access to this budget');
    }

    const spent = await this.calculateSpent(budget);
    return this.toBudgetResponse(budget, spent);
  }

  /**
   * Update a budget
   *
   * @param familyId - Family ID from authenticated user
   * @param budgetId - Budget ID to update
   * @param dto - Update data
   * @returns Updated budget with progress information
   * @throws NotFoundException - Budget not found
   * @throws ForbiddenException - Budget belongs to different family
   */
  async update(
    familyId: string,
    budgetId: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`Updating budget ${budgetId} for family ${familyId}`);

    // Verify budget exists and belongs to family
    const existing = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!existing) {
      throw new NotFoundException('Budget not found');
    }

    if (existing.familyId !== familyId) {
      throw new ForbiddenException('You do not have access to this budget');
    }

    // Build update data
    const updateData: Prisma.BudgetUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.amount !== undefined) {
      updateData.amount = new Decimal(dto.amount);
    }
    if (dto.period !== undefined) {
      updateData.period = dto.period;
    }
    if (dto.startDate !== undefined) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate !== undefined) {
      updateData.endDate = new Date(dto.endDate);
    }
    if (dto.alertThresholds !== undefined) {
      updateData.alertThresholds = dto.alertThresholds;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }
    if (dto.categoryId !== undefined) {
      // SECURITY: Validate new category belongs to this family
      await this.validateCategoryOwnership(dto.categoryId, familyId);

      updateData.category = {
        connect: { id: dto.categoryId },
      };
    }

    const budget = await this.prisma.budget.update({
      where: { id: budgetId },
      data: updateData,
      include: {
        category: true,
      },
    });

    const spent = await this.calculateSpent(budget);
    return this.toBudgetResponse(budget, spent);
  }

  /**
   * Delete a budget
   *
   * @param familyId - Family ID from authenticated user
   * @param budgetId - Budget ID to delete
   * @throws NotFoundException - Budget not found
   * @throws ForbiddenException - Budget belongs to different family
   */
  async remove(familyId: string, budgetId: string): Promise<void> {
    this.logger.log(`Deleting budget ${budgetId} for family ${familyId}`);

    // Verify budget exists and belongs to family
    const existing = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!existing) {
      throw new NotFoundException('Budget not found');
    }

    if (existing.familyId !== familyId) {
      throw new ForbiddenException('You do not have access to this budget');
    }

    await this.prisma.budget.delete({
      where: { id: budgetId },
    });
  }

  /**
   * Calculate spent amounts for multiple budgets efficiently
   *
   * Groups budgets by category and uses minimal queries to calculate
   * spending for each budget's date range. This avoids the N+1 query
   * problem when fetching multiple budgets.
   *
   * @param budgets - Array of budgets to calculate spent for
   * @param accountIds - Array of account IDs in the family
   * @returns Map of budget ID to spent amount
   */
  private async calculateSpentBatch(
    budgets: (Budget & { category?: { id: string } | null })[],
    accountIds: string[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (accountIds.length === 0) {
      return result;
    }

    // Group budgets by category to minimize queries
    const budgetsByCategory = new Map<string, Budget[]>();
    for (const budget of budgets) {
      if (!budget.categoryId) continue;
      const list = budgetsByCategory.get(budget.categoryId) || [];
      list.push(budget);
      budgetsByCategory.set(budget.categoryId, list);
    }

    // One query per unique category (much better than per budget)
    for (const [categoryId, categoryBudgets] of budgetsByCategory) {
      // Find overall date range for this category's budgets
      const minDate = new Date(
        Math.min(...categoryBudgets.map((b) => b.startDate.getTime())),
      );
      const maxDate = new Date(
        Math.max(...categoryBudgets.map((b) => b.endDate.getTime())),
      );

      // Single query for all transactions in this category's date range
      // Using minimal select to reduce memory footprint
      const transactions = await this.prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          categoryId,
          type: TransactionType.DEBIT,
          date: { gte: minDate, lte: maxDate },
          includeInBudget: true,
        },
        select: { amount: true, date: true },
      });

      // Assign transactions to each budget's specific date range
      // Process in a single pass to minimize iterations
      for (const budget of categoryBudgets) {
        result.set(budget.id, 0);
      }

      // Single pass through transactions, assigning to relevant budgets
      for (const transaction of transactions) {
        for (const budget of categoryBudgets) {
          if (
            transaction.date >= budget.startDate &&
            transaction.date <= budget.endDate
          ) {
            const current = result.get(budget.id) || 0;
            result.set(
              budget.id,
              current + (transaction.amount?.toNumber() || 0),
            );
          }
        }
      }
    }

    return result;
  }

  /**
   * Calculate the total spent amount for a budget
   *
   * Sums all DEBIT transactions within the budget's category
   * and date range.
   *
   * @param budget - Budget to calculate spent for
   * @returns Total spent amount as number
   */
  private async calculateSpent(
    budget: Budget & { category?: { id: string } | null },
  ): Promise<number> {
    if (!budget.category) {
      return 0;
    }

    // Get all accounts for the family to sum transactions across
    const familyAccounts = await this.prisma.account.findMany({
      where: { familyId: budget.familyId },
      select: { id: true },
    });

    const accountIds = familyAccounts.map((a) => a.id);

    if (accountIds.length === 0) {
      return 0;
    }

    // Sum DEBIT transactions for this category within the budget period
    const result = await this.prisma.transaction.aggregate({
      where: {
        accountId: { in: accountIds },
        categoryId: budget.categoryId,
        type: TransactionType.DEBIT,
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
        includeInBudget: true,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount?.toNumber() || 0;
  }

  /**
   * Convert a Budget entity to BudgetResponseDto
   *
   * @param budget - Budget entity with category relation
   * @param spent - Calculated spent amount
   * @returns Formatted response DTO
   */
  private toBudgetResponse(
    budget: Budget & { category: { id: string; name: string; icon: string | null; color: string | null } },
    spent: number,
  ): BudgetResponseDto {
    const amount = budget.amount.toNumber();
    const remaining = amount - spent;
    const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;

    /**
     * Over-budget flag: Only true when spending EXCEEDS budget (>100%)
     * At exactly 100%, user is at budget limit but not over
     */
    const isOverBudget = spent > amount;

    /**
     * Budget expiration: Active THROUGH end date (inclusive)
     * Budget expires at START of day AFTER end date
     * Example: endDate = Nov 30 → active all of Nov 30, expires Dec 1
     *
     * Uses date-level comparison to avoid time-of-day issues
     */
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const budgetEndDate = new Date(budget.endDate);
    budgetEndDate.setHours(0, 0, 0, 0);

    const isExpired = today > budgetEndDate;

    /**
     * Progress status for UI color coding:
     * - safe: 0-79% (green)
     * - warning: 80-99% (orange)
     * - maxed: exactly 100% (yellow) - at budget limit
     * - over: 100%+ (red) - exceeded budget
     */
    let progressStatus: 'safe' | 'warning' | 'maxed' | 'over' = 'safe';
    if (spent > amount) {
      progressStatus = 'over';
    } else if (percentage === 100) {
      progressStatus = 'maxed';
    } else if (percentage >= 80) {
      progressStatus = 'warning';
    }

    return {
      id: budget.id,
      name: budget.name,
      amount,
      spent,
      remaining,
      percentage,
      status: budget.status,
      period: budget.period,
      startDate: budget.startDate.toISOString().split('T')[0],
      endDate: budget.endDate.toISOString().split('T')[0],
      category: {
        id: budget.category.id,
        name: budget.category.name,
        icon: budget.category.icon,
        color: budget.category.color,
      },
      alertThresholds: budget.alertThresholds,
      notes: budget.notes,
      isOverBudget,
      progressStatus,
      isExpired,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

  /**
   * Mark expired budgets as COMPLETED
   *
   * This method finds all ACTIVE budgets with end dates in the past
   * and transitions them to COMPLETED status. This is typically called
   * by a scheduled job or can be triggered manually.
   *
   * @param familyId - Optional family ID to limit the scope
   * @returns Number of budgets marked as completed
   */
  async markExpiredBudgetsAsCompleted(familyId?: string): Promise<number> {
    /**
     * Mark budgets completed AFTER end date (not ON end date)
     * Uses date-level comparison for consistency with toBudgetResponse
     */
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: {
      status: typeof BudgetStatus.ACTIVE;
      endDate: { lt: Date };
      familyId?: string;
    } = {
      status: BudgetStatus.ACTIVE,
      endDate: { lt: today }, // Budgets with endDate BEFORE today
    };

    if (familyId) {
      whereClause.familyId = familyId;
    }

    const result = await this.prisma.budget.updateMany({
      where: whereClause,
      data: {
        status: BudgetStatus.COMPLETED,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Marked ${result.count} expired budget(s) as COMPLETED${familyId ? ` for family ${familyId}` : ''}`,
      );
    }

    return result.count;
  }
}
