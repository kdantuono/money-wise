/**
 * Type Definitions for Prisma Service Return Types
 *
 * This file contains explicit type definitions for complex Prisma query results
 * that include relations, aggregations, or custom select patterns.
 *
 * ARCHITECTURAL DECISION:
 * - Use Prisma.Validator and Prisma.GetPayload patterns for type-safe query results
 * - Define reusable types for common query patterns (withRelations, withChildren, etc.)
 * - Avoid 'any' types by explicitly typing complex Prisma results
 * - Maintain type safety while preserving Prisma's runtime type inference
 */

import { Prisma } from '../../../../../generated/prisma';

// ============================================================================
// CATEGORY SERVICE TYPES
// ============================================================================

/**
 * Category with parent and children relations (with optional _count)
 * Used in: CategoryService.findOneWithRelations
 *
 * Note: _count is optional as it's not always included in the query
 * but may be present in mock responses for testing
 */
const categoryWithRelationsPayload = Prisma.validator<Prisma.CategoryDefaultArgs>()({
  include: {
    parent: true,
    children: true,
  },
});

export type CategoryWithRelations = Prisma.CategoryGetPayload<typeof categoryWithRelationsPayload> & {
  _count?: {
    transactions?: number;
    budgets?: number;
  };
};

/**
 * Category with optional relations for flexible queries
 * Used in: CategoryService.findByFamilyId, CategoryService.findChildren
 */
const categoryWithOptionalRelationsPayload = Prisma.validator<Prisma.CategoryDefaultArgs>()({
  include: {
    parent: true,
    children: true,
  },
});

export type CategoryWithOptionalRelations = Prisma.CategoryGetPayload<
  typeof categoryWithOptionalRelationsPayload
>;

// ============================================================================
// BUDGET SERVICE TYPES
// ============================================================================

/**
 * Budget with category and family relations
 * Used in: BudgetService.findOneWithRelations
 */
const budgetWithRelationsPayload = Prisma.validator<Prisma.BudgetDefaultArgs>()({
  include: {
    category: true,
    family: true,
  },
});

export type BudgetWithRelations = Prisma.BudgetGetPayload<typeof budgetWithRelationsPayload>;

/**
 * Budget aggregation result for sum operations
 * Used in: BudgetService aggregation queries
 */
export type BudgetAggregationResult = Prisma.GetBudgetAggregateType<{
  _sum: {
    amount: true;
  };
}>;

// ============================================================================
// TRANSACTION SERVICE TYPES
// ============================================================================

/**
 * Transaction with account and category relations
 * Used in: TransactionService.findOneWithRelations
 */
const transactionWithRelationsPayload = Prisma.validator<Prisma.TransactionDefaultArgs>()({
  include: {
    account: true,
    category: true,
  },
});

export type TransactionWithRelations = Prisma.TransactionGetPayload<
  typeof transactionWithRelationsPayload
>;

/**
 * Transaction creation input with proper typing
 * Used in: TransactionService.create
 *
 * This type removes the nested relation structures (account, category)
 * and replaces them with simple ID fields for API layer usage.
 *
 * Note: This is a simplified DTO. The service will transform this into
 * Prisma.TransactionCreateInput with proper nested structures.
 *
 * Required fields align with Prisma schema:
 * - description is required (NOT NULL in schema)
 * - source is required (will default to 'MANUAL' in service if not provided)
 */
export interface TransactionCreateDto {
  accountId: string;
  categoryId?: string | null;
  type: string; // TransactionType from Prisma enums
  amount: Prisma.Decimal | number; // Accept both for flexibility
  date: Date;
  description: string; // REQUIRED in Prisma schema
  merchantName?: string | null;
  status?: string | null; // TransactionStatus from Prisma enums (defaults to POSTED)
  source?: string | null; // TransactionSource from Prisma enums (defaults to MANUAL)
  plaidTransactionId?: string | null;
  pending?: boolean | null;
  isoCurrencyCode?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  tags?: string[] | null;
  currency?: string | null;
  authorizedDate?: Date | null;
  originalDescription?: string | null;
  reference?: string | null;
  checkNumber?: string | null;
  notes?: string | null;
}

/**
 * Transaction aggregation result for sum operations
 * Used in: TransactionService.getTotalByAccountId
 */
export type TransactionAggregationResult = Prisma.GetTransactionAggregateType<{
  _sum: {
    amount: true;
  };
}>;
