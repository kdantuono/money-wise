import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Transaction as PrismaTransaction, TransactionType, UserRole } from '../../generated/prisma';
import { PrismaService } from '../core/database/prisma/prisma.service';
import { TransactionService as CoreTransactionService } from '../core/database/prisma/services/transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { CategoryValidationService } from './services/category-validation.service';

/**
 * Transactions Service (Authorization Wrapper)
 *
 * Wraps CoreTransactionService with authorization logic.
 * Ensures users can only access transactions for accounts they own.
 *
 * Authorization Rules:
 * - Users can only create/read/update/delete transactions for their own accounts
 * - Admin role bypasses all ownership checks
 * - Family members can access family account transactions (future feature)
 *
 * @phase STORY-1.5.7 - TDD Transaction API Implementation (GREEN phase)
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coreTransactionService: CoreTransactionService,
    private readonly categoryValidationService: CategoryValidationService,
  ) { }

  /**
   * Create transaction with authorization check
   */
  async create(
    createDto: CreateTransactionDto,
    userId: string,
    userRole?: UserRole,
  ): Promise<TransactionResponseDto> {
    // Verify user owns the account and get account details
    const account = await this.verifyAccountOwnership(createDto.accountId, userId, userRole);

    // Validate category assignment using Specification Pattern
    if (createDto.categoryId) {
      await this.categoryValidationService.validateCategory({
        categoryId: createDto.categoryId,
        familyId: account.familyId!,
        flowType: (createDto as any).flowType || undefined,
      });
    }

    // Convert DTO to Prisma format
    const { accountId, categoryId, date, authorizedDate, ...rest } = createDto;

    const transactionData = {
      ...rest,
      accountId,
      categoryId: categoryId || undefined,
      date: new Date(date),
      authorizedDate: authorizedDate ? new Date(authorizedDate) : undefined,
    };

    const transaction = await this.coreTransactionService.create(transactionData);
    return this.toResponseDto(transaction);
  }

  /**
   * Find all transactions for user's accounts with optional filtering
   */
  async findAll(
    userId: string,
    userRole?: UserRole,
    filters?: {
      accountId?: string;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ): Promise<TransactionResponseDto[]> {
    // Build where clause
    const where: Prisma.TransactionWhereInput = {};

    // Admin can see all transactions
    if (userRole === UserRole.ADMIN) {
      // No account filter for admin
    } else {
      // Regular users: filter by accounts they own
      where.account = {
        userId,
      };
    }

    // Apply filters
    if (filters?.accountId) {
      // Verify ownership of specific account
      if (userRole !== UserRole.ADMIN) {
        await this.verifyAccountOwnership(filters.accountId, userId, userRole);
      }
      where.accountId = filters.accountId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    if (filters?.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { merchantName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const transactions = await this.coreTransactionService.findAll({
      where,
      orderBy: { date: 'desc' },
    });

    return transactions.map(t => this.toResponseDto(t));
  }

  /**
   * Find one transaction by ID with authorization check
   */
  async findOne(
    id: string,
    userId: string,
    userRole?: UserRole,
  ): Promise<TransactionResponseDto> {
    // CoreService validates UUID and throws BadRequestException for invalid format
    // We convert this to NotFoundException for consistency with REST conventions
    let transaction;
    try {
      transaction = await this.coreTransactionService.findOne(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }
      throw error;
    }

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Verify user owns the account
    await this.verifyAccountOwnership(transaction.accountId, userId, userRole);

    return this.toResponseDto(transaction);
  }

  /**
   * Update transaction with authorization check
   */
  async update(
    id: string,
    updateDto: UpdateTransactionDto,
    userId: string,
    userRole?: UserRole,
  ): Promise<TransactionResponseDto> {
    // Get existing transaction
    const existingTransaction = await this.coreTransactionService.findOne(id);

    if (!existingTransaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Verify user owns the account and get account details
    const account = await this.verifyAccountOwnership(existingTransaction.accountId, userId, userRole);

    // Validate category assignment if categoryId is being updated
    if (updateDto.categoryId !== undefined && updateDto.categoryId !== null) {
      await this.categoryValidationService.validateCategory({
        categoryId: updateDto.categoryId,
        familyId: account.familyId!,
        flowType: existingTransaction.flowType || undefined,
      });
    }

    // Convert DTO to Prisma format - build updateData dynamically
    const updateData = this.buildUpdateData(updateDto);

    const updated = await this.coreTransactionService.update(id, updateData);
    return this.toResponseDto(updated);
  }

  /**
   * Delete transaction with authorization check
   */
  async remove(
    id: string,
    userId: string,
    userRole?: UserRole,
  ): Promise<void> {
    // Get existing transaction
    // CoreService validates UUID and throws BadRequestException for invalid format
    let existingTransaction;
    try {
      existingTransaction = await this.coreTransactionService.findOne(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }
      throw error;
    }

    if (!existingTransaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Verify user owns the account
    await this.verifyAccountOwnership(existingTransaction.accountId, userId, userRole);

    await this.coreTransactionService.delete(id);
  }

  /**
   * Build Prisma update data from DTO
   * Maps UpdateTransactionDto fields to Prisma format with proper handling for:
   * - Optional category (connect/disconnect pattern)
   * - Date string to Date object conversion
   * - JSONB metadata type casting
   * @private
   */
  private buildUpdateData(updateDto: UpdateTransactionDto): Prisma.TransactionUpdateInput {
    const updateData: Prisma.TransactionUpdateInput = {};

    // Category handling (connect/disconnect pattern)
    if (updateDto.categoryId !== undefined) {
      updateData.category = updateDto.categoryId
        ? { connect: { id: updateDto.categoryId } }
        : { disconnect: true };
    }

    // Direct field mappings
    const directFields = [
      'amount', 'type', 'status', 'source', 'description',
      'merchantName', 'originalDescription', 'currency', 'reference',
      'checkNumber', 'notes', 'isPending', 'isRecurring', 'isHidden', 'includeInBudget'
    ] as const;

    directFields.forEach(field => {
      if (updateDto[field] !== undefined) {
        updateData[field] = updateDto[field];
      }
    });

    // Date conversions
    if (updateDto.date !== undefined) updateData.date = new Date(updateDto.date);
    if (updateDto.authorizedDate !== undefined) updateData.authorizedDate = new Date(updateDto.authorizedDate);

    // JSONB metadata
    if (updateDto.plaidMetadata !== undefined) {
      updateData.plaidMetadata = updateDto.plaidMetadata as Prisma.JsonValue;
    }

    return updateData;
  }

  /**
   * Verify user owns the account and return account details
   * @private
   * @returns Account with userId and familyId
   */
  private async verifyAccountOwnership(
    accountId: string,
    userId: string,
    userRole?: UserRole,
  ): Promise<{ userId: string | null; familyId: string | null }> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { userId: true, familyId: true },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    // Admin bypasses ownership check but still returns account
    if (userRole === UserRole.ADMIN) {
      return account;
    }

    // Check personal account ownership
    if (account.userId === userId) {
      return account;
    }

    // TODO: Check family membership when family feature is implemented
    // For now, deny access to family accounts
    throw new ForbiddenException('Access denied to this account');
  }

  /**
   * Convert Prisma Transaction to Response DTO
   * @private
   */
  private toResponseDto(transaction: PrismaTransaction): TransactionResponseDto {
    const isDebit = transaction.type === 'DEBIT';
    const isCredit = transaction.type === 'CREDIT';
    const displayAmount = isDebit ? -transaction.amount.toNumber() : transaction.amount.toNumber();

    return {
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      amount: transaction.amount.toNumber(),
      displayAmount,
      type: transaction.type,
      status: transaction.status,
      source: transaction.source,
      date: transaction.date,
      authorizedDate: transaction.authorizedDate,
      description: transaction.description,
      merchantName: transaction.merchantName,
      originalDescription: transaction.originalDescription,
      currency: transaction.currency,
      reference: transaction.reference,
      checkNumber: transaction.checkNumber,
      notes: transaction.notes,
      isPending: transaction.isPending,
      isRecurring: transaction.isRecurring,
      isHidden: transaction.isHidden,
      includeInBudget: transaction.includeInBudget,
      plaidTransactionId: transaction.plaidTransactionId,
      plaidAccountId: transaction.plaidAccountId,
      plaidMetadata: transaction.plaidMetadata as Record<string, unknown> | null,
      locationMetadata: null, // Not in current schema
      paymentChannelMetadata: null, // Not in current schema
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      // Computed fields
      isDebit,
      isCredit,
      isPlaidTransaction: transaction.source === 'PLAID',
      isManualTransaction: transaction.source === 'MANUAL',
    };
  }
}
