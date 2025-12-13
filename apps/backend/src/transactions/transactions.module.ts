import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionService as CoreTransactionService } from '../core/database/prisma/services/transaction.service';
import { PrismaModule } from '../core/database/prisma/prisma.module';
import { CategoryValidationService } from './services/category-validation.service';

/**
 * Transactions Module
 *
 * Provides transaction management functionality with:
 * - REST API endpoints (TransactionsController)
 * - Authorization wrapper (TransactionsService)
 * - Core data access (CoreTransactionService)
 * - Category validation (CategoryValidationService) using Specification Pattern
 *
 * @phase STORY-1.5.7 - TDD Transaction API Implementation (GREEN phase)
 */
@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    CoreTransactionService,
    CategoryValidationService,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
