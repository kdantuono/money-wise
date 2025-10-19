import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, TransactionType } from '../../../../../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionCreateDto } from './types';

/**
 * Transaction Service - Prisma Implementation
 *
 * Manages financial transactions with support for:
 * - CRUD operations for transactions
 * - Account-level transaction queries with pagination
 * - Category-based transaction filtering
 * - Date range queries and aggregations
 * - Plaid integration support
 * - Transaction metadata (tags, attachments, split details)
 *
 * @architectural-decision
 * - Amounts stored as absolute Decimal values
 * - Transaction type (DEBIT/CREDIT) determines flow direction
 * - Application layer computes display amounts (negative for expenses)
 * - Simplifies aggregation: SUM(amount) WHERE type = 'DEBIT'
 *
 * @performance
 * - Indexed queries on (accountId, date) for pagination
 * - Indexed queries on (categoryId, date) for reports
 * - Batch operations supported for imports
 * - P95 target: < 100ms for transaction queries
 */
@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new transaction
   *
   * @param data - Transaction creation data with proper typing
   * @returns Created transaction
   * @throws BadRequestException - Invalid UUID or negative amount
   * @throws ConflictException - Duplicate plaidTransactionId
   *
   * @architectural-decision
   * TransactionCreateDto uses simple ID fields (accountId, categoryId) instead of
   * Prisma's nested connect structures for cleaner API layer interface
   */
  async create(data: TransactionCreateDto) {
    // Validate UUIDs
    this.validateUuid(data.accountId);
    if (data.categoryId) {
      this.validateUuid(data.categoryId);
    }

    // Convert amount to Decimal if it's a number
    const amount = typeof data.amount === 'number'
      ? new Decimal(data.amount)
      : data.amount;

    // Validate amount is positive (architectural decision: store absolute values)
    if (amount && new Decimal(amount.toString()).lessThan(0)) {
      throw new BadRequestException('Amount must be a positive value');
    }

    // Transform accountId/categoryId to Prisma nested structure
    const { accountId, categoryId, type, status, source, ...rest } = data;
    const prismaData: Prisma.TransactionCreateInput = {
      ...rest,
      amount,
      type: type as any, // Cast from string to enum
      status: status as any, // Cast from string to enum (if provided)
      source: (source || 'MANUAL') as any, // Default to MANUAL if not provided, cast to enum
      account: {
        connect: { id: accountId },
      },
    };

    if (categoryId) {
      prismaData.category = {
        connect: { id: categoryId },
      };
    }

    try {
      return await this.prisma.transaction.create({
        data: prismaData,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Find a transaction by ID
   *
   * @param id - Transaction UUID
   * @returns Transaction or null if not found
   * @throws BadRequestException - Invalid UUID format
   */
  async findOne(id: string) {
    this.validateUuid(id);

    return await this.prisma.transaction.findUnique({
      where: { id },
    });
  }

  /**
   * Find a transaction with account and category relations
   *
   * @param id - Transaction UUID
   * @returns Transaction with relations or null
   * @throws BadRequestException - Invalid UUID format
   */
  async findOneWithRelations(id: string) {
    this.validateUuid(id);

    return await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        category: true,
      },
    });
  }

  /**
   * Find all transactions for an account with filtering and pagination
   *
   * @param accountId - Account UUID
   * @param options - Query options (where, skip, take, orderBy)
   * @returns Array of transactions
   * @throws BadRequestException - Invalid UUID format
   *
   * @example
   * // Get recent transactions with pagination
   * const transactions = await service.findByAccountId(accountId, {
   *   skip: 0,
   *   take: 50,
   *   orderBy: { date: 'desc' }
   * });
   *
   * @example
   * // Filter by date range and category
   * const filtered = await service.findByAccountId(accountId, {
   *   where: {
   *     date: { gte: startDate, lte: endDate },
   *     categoryId: categoryId
   *   }
   * });
   */
  async findByAccountId(
    accountId: string,
    options?: {
      where?: Partial<Prisma.TransactionWhereInput>;
      skip?: number;
      take?: number;
      orderBy?: Prisma.TransactionOrderByWithRelationInput;
    },
  ) {
    this.validateUuid(accountId);

    const { where = {}, skip = 0, take = 50, orderBy = { date: 'desc' } } = options || {};

    return await this.prisma.transaction.findMany({
      where: {
        accountId,
        ...where,
      },
      skip,
      take,
      orderBy,
    });
  }

  /**
   * Find all transactions for a category
   *
   * @param categoryId - Category UUID
   * @param options - Query options
   * @returns Array of transactions
   * @throws BadRequestException - Invalid UUID format
   */
  async findByCategoryId(
    categoryId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.TransactionOrderByWithRelationInput;
    },
  ) {
    this.validateUuid(categoryId);

    const { skip = 0, take = 50, orderBy = { date: 'desc' } } = options || {};

    return await this.prisma.transaction.findMany({
      where: { categoryId },
      skip,
      take,
      orderBy,
    });
  }

  /**
   * Find all transactions with pagination and filtering
   *
   * @param options - Query options
   * @returns Array of transactions
   *
   * @performance
   * - Default limit: 50 transactions
   * - Ordered by date descending
   * - Use skip/take for pagination
   */
  async findAll(options?: {
    where?: Prisma.TransactionWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.TransactionOrderByWithRelationInput;
  }) {
    const { where = {}, skip = 0, take = 50, orderBy = { date: 'desc' } } = options || {};

    return await this.prisma.transaction.findMany({
      where,
      skip,
      take,
      orderBy,
    });
  }

  /**
   * Update a transaction
   *
   * @param id - Transaction UUID
   * @param data - Update data
   * @returns Updated transaction
   * @throws BadRequestException - Invalid UUID format
   * @throws NotFoundException - Transaction not found
   */
  async update(id: string, data: Prisma.TransactionUpdateInput) {
    this.validateUuid(id);

    try {
      return await this.prisma.transaction.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Delete a transaction
   *
   * @param id - Transaction UUID
   * @returns Deleted transaction
   * @throws BadRequestException - Invalid UUID format
   * @throws NotFoundException - Transaction not found
   */
  async delete(id: string) {
    this.validateUuid(id);

    try {
      return await this.prisma.transaction.delete({
        where: { id },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Calculate total transaction amount for an account
   *
   * @param accountId - Account UUID
   * @param type - Optional transaction type filter (DEBIT or CREDIT)
   * @returns Total amount as Decimal
   * @throws BadRequestException - Invalid UUID format
   *
   * @example
   * // Get total debits (expenses)
   * const totalDebits = await service.getTotalByAccountId(accountId, TransactionType.DEBIT);
   *
   * // Get total credits (income)
   * const totalCredits = await service.getTotalByAccountId(accountId, TransactionType.CREDIT);
   */
  async getTotalByAccountId(accountId: string, type?: TransactionType): Promise<Decimal> {
    this.validateUuid(accountId);

    const where: Prisma.TransactionWhereInput = { accountId };
    if (type) {
      where.type = type;
    }

    const result = await this.prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || new Decimal(0);
  }

  /**
   * Count transactions matching criteria
   *
   * @param where - Filter criteria
   * @returns Count of matching transactions
   *
   * @example
   * // Count pending transactions
   * const pendingCount = await service.count({
   *   accountId,
   *   status: TransactionStatus.PENDING
   * });
   */
  async count(where: Prisma.TransactionWhereInput): Promise<number> {
    return await this.prisma.transaction.count({
      where,
    });
  }

  /**
   * Check if a transaction exists
   *
   * @param id - Transaction UUID
   * @returns True if exists, false otherwise
   * @throws BadRequestException - Invalid UUID format
   */
  async exists(id: string): Promise<boolean> {
    this.validateUuid(id);

    const count = await this.prisma.transaction.count({
      where: { id },
    });

    return count > 0;
  }

  /**
   * Validate UUID format (RFC 4122)
   *
   * @param uuid - UUID string to validate
   * @throws BadRequestException - Invalid UUID format
   * @private
   */
  private validateUuid(uuid: string): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(uuid)) {
      throw new BadRequestException(`Invalid UUID format: ${uuid}`);
    }
  }

  /**
   * Handle Prisma errors and convert to appropriate HTTP exceptions
   *
   * @param error - Prisma error object
   * @throws BadRequestException - Invalid data
   * @throws NotFoundException - Record not found
   * @throws ConflictException - Unique constraint violation
   * @throws InternalServerErrorException - Unexpected errors
   * @private
   */
  private handlePrismaError(error: any): never {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target || 'field';
      throw new ConflictException(`Transaction with this ${target} already exists`);
    }

    if (error.code === 'P2025') {
      // Record not found
      throw new NotFoundException('Transaction not found');
    }

    if (error.code === 'P2003') {
      // Foreign key constraint failed
      throw new BadRequestException('Invalid account or category ID');
    }

    // Unexpected error
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
