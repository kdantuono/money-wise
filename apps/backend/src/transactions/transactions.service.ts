import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Transaction as PrismaTransaction, TransactionType, UserRole, FlowType, TransferRole } from '../../generated/prisma';
import { v4 as uuidv4 } from 'uuid';
import { LinkTransferDto, LinkTransferResponseDto } from './dto/link-transfer.dto';
import { BulkOperationDto, BulkOperationResponseDto, BulkOperation } from './dto/bulk-operation.dto';
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

  // ============================================
  // Transfer Linking Methods
  // ============================================

  /**
   * Link two transactions as a transfer pair
   */
  async linkAsTransfer(
    dto: LinkTransferDto,
    userId: string,
    userRole?: UserRole,
  ): Promise<LinkTransferResponseDto> {
    const [txId1, txId2] = dto.transactionIds;

    // Fetch both transactions
    const [tx1, tx2] = await Promise.all([
      this.prisma.transaction.findUnique({
        where: { id: txId1 },
        include: { account: true },
      }),
      this.prisma.transaction.findUnique({
        where: { id: txId2 },
        include: { account: true },
      }),
    ]);

    if (!tx1 || !tx2) {
      throw new NotFoundException('One or both transactions not found');
    }

    // Verify ownership of both accounts
    await this.verifyAccountOwnership(tx1.accountId, userId, userRole);
    await this.verifyAccountOwnership(tx2.accountId, userId, userRole);

    // Validate: transactions must have opposite flow types or DEBIT/CREDIT
    const isOpposite =
      (tx1.type === 'DEBIT' && tx2.type === 'CREDIT') ||
      (tx1.type === 'CREDIT' && tx2.type === 'DEBIT');

    if (!isOpposite) {
      throw new BadRequestException(
        'Transfer requires one DEBIT and one CREDIT transaction',
      );
    }

    // Use provided transferGroupId or generate new one
    const transferGroupId = dto.transferGroupId || uuidv4();

    // Determine roles based on type
    const tx1Role = tx1.type === 'DEBIT' ? TransferRole.SOURCE : TransferRole.DESTINATION;
    const tx2Role = tx2.type === 'DEBIT' ? TransferRole.SOURCE : TransferRole.DESTINATION;

    // Update both transactions in a transaction
    await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: txId1 },
        data: {
          transferGroupId,
          transferRole: tx1Role,
          flowType: FlowType.TRANSFER,
        },
      }),
      this.prisma.transaction.update({
        where: { id: txId2 },
        data: {
          transferGroupId,
          transferRole: tx2Role,
          flowType: FlowType.TRANSFER,
        },
      }),
    ]);

    return {
      transferGroupId,
      linkedCount: 2,
    };
  }

  /**
   * Unlink a transaction from its transfer group
   */
  async unlinkTransfer(
    transactionId: string,
    userId: string,
    userRole?: UserRole,
  ): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.transferGroupId) {
      throw new BadRequestException('Transaction is not part of a transfer');
    }

    // Verify ownership
    await this.verifyAccountOwnership(transaction.accountId, userId, userRole);

    // Get all transactions in the transfer group
    const groupTransactions = await this.prisma.transaction.findMany({
      where: { transferGroupId: transaction.transferGroupId },
    });

    // If only 2 transactions in group, unlink both (transfer is dissolved)
    if (groupTransactions.length <= 2) {
      await this.prisma.transaction.updateMany({
        where: { transferGroupId: transaction.transferGroupId },
        data: {
          transferGroupId: null,
          transferRole: null,
          flowType: null,
        },
      });
    } else {
      // Just unlink this one transaction
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          transferGroupId: null,
          transferRole: null,
          flowType: null,
        },
      });
    }
  }

  /**
   * Get user's family ID from their accounts
   */
  async getUserFamilyId(userId: string): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { userId },
      select: { familyId: true },
    });
    return account?.familyId ?? null;
  }

  // ============================================
  // Bulk Operations Methods
  // ============================================

  /**
   * Perform bulk operation on multiple transactions
   */
  async bulkOperation(
    dto: BulkOperationDto,
    userId: string,
    userRole?: UserRole,
  ): Promise<BulkOperationResponseDto> {
    // Verify all transactions exist and user owns them
    const transactions = await this.prisma.transaction.findMany({
      where: { id: { in: dto.transactionIds } },
      include: { account: true },
    });

    if (transactions.length !== dto.transactionIds.length) {
      throw new NotFoundException('One or more transactions not found');
    }

    // Verify ownership of all transactions
    for (const tx of transactions) {
      await this.verifyAccountOwnership(tx.accountId, userId, userRole);
    }

    let affectedCount = 0;

    switch (dto.operation) {
      case BulkOperation.CATEGORIZE:
        if (!dto.data?.categoryId) {
          throw new BadRequestException('categoryId is required for categorize operation');
        }
        const result = await this.prisma.transaction.updateMany({
          where: { id: { in: dto.transactionIds } },
          data: { categoryId: dto.data.categoryId },
        });
        affectedCount = result.count;
        break;

      case BulkOperation.DELETE:
        const deleteResult = await this.prisma.transaction.deleteMany({
          where: { id: { in: dto.transactionIds } },
        });
        affectedCount = deleteResult.count;
        break;

      case BulkOperation.MARK_TRANSFER:
        const transferGroupId = dto.data?.transferGroupId || uuidv4();
        const markResult = await this.prisma.transaction.updateMany({
          where: { id: { in: dto.transactionIds } },
          data: {
            transferGroupId,
            flowType: FlowType.TRANSFER,
          },
        });
        affectedCount = markResult.count;
        break;

      default:
        throw new BadRequestException(`Unknown operation: ${dto.operation}`);
    }

    return {
      affectedCount,
      operation: dto.operation,
      success: true,
    };
  }
}
