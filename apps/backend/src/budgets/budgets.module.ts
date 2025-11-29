import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

/**
 * BudgetsModule - Handles budget management operations
 *
 * Provides:
 * - CRUD endpoints for family budgets
 * - Spent amount calculation from transactions
 * - Progress tracking and alerts
 *
 * Dependencies:
 * - PrismaModule (global) - Database access
 * - AuthModule (guards) - JWT authentication
 *
 * Endpoints:
 * - POST /api/budgets - Create budget
 * - GET /api/budgets - List budgets with progress
 * - GET /api/budgets/:id - Get budget details
 * - PUT /api/budgets/:id - Update budget
 * - DELETE /api/budgets/:id - Delete budget
 *
 * @example
 * ```typescript
 * import { BudgetsModule } from './budgets/budgets.module';
 *
 * @Module({
 *   imports: [BudgetsModule],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
