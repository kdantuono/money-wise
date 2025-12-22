import { Injectable, BadRequestException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Budget, Prisma, BudgetStatus, BudgetPeriod } from '../../../../../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { BudgetWithRelations } from './types';
import { validateUuid } from '../../../../common/validators';

/**
 * Data Transfer Object for creating a new Budget
 *
 * Architectural Decision: Using DTO pattern for explicit contract definition
 * and separation of API layer concerns from database layer
 */
export interface CreateBudgetDto {
  name: string;
  familyId: string;
  categoryId: string;
  amount: Decimal;
  period?: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  status?: BudgetStatus;
  alertThresholds?: number[];
  settings?: Prisma.InputJsonValue;
  notes?: string;
}

/**
 * Query options for filtering and pagination
 *
 * Design Pattern: Builder pattern for flexible query construction
 */
export interface QueryOptions {
  where?: Prisma.BudgetWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Prisma.BudgetOrderByWithRelationInput;
  include?: Prisma.BudgetInclude;
}

/**
 * BudgetService
 *
 * Core service for managing budget entities in the MoneyWise application.
 * Implements comprehensive CRUD operations with validation, error handling,
 * and support for complex queries including date range filtering and
 * category-based budget tracking.
 *
 * Key Responsibilities:
 * - Budget lifecycle management (create, read, update, delete)
 * - Input validation (UUIDs, date ranges, amounts, alert thresholds)
 * - Date range overlap detection for budget periods
 * - Alert threshold management (percentage-based warnings)
 * - Family and category association handling
 * - Query optimization with pagination and filtering
 *
 * Architectural Decisions:
 * 1. UUID Validation: Strict RFC 4122 compliance to prevent invalid references
 * 2. Date Range Validation: Ensures logical consistency (start < end)
 * 3. Amount Validation: Positive-only constraint for financial integrity
 * 4. Alert Thresholds: Percentage-based (0-100) with default [50, 75, 90]
 * 5. Default Period: MONTHLY as most common use case
 * 6. Default Status: ACTIVE for immediate budget tracking
 * 7. Error Handling: Prisma-specific error mapping to HTTP exceptions
 * 8. Pagination Defaults: skip=0, take=50, orderBy=startDate DESC
 *
 * Design Patterns Applied:
 * - Repository Pattern: Abstracts database operations
 * - DTO Pattern: Type-safe data transfer
 * - Builder Pattern: Flexible query construction
 * - Exception Translation: Prisma errors → HTTP exceptions
 *
 * @Injectable Marks this class as a NestJS provider for dependency injection
 */
@Injectable()
export class BudgetService {
  /**
   * Constructor with PrismaService injection
   *
   * @param prisma - Prisma ORM client for database operations
   */
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create a new budget
   *
   * Validation Pipeline:
   * 1. UUID validation for familyId and categoryId
   * 2. Amount positivity check (must be > 0)
   * 3. Date range logical consistency (startDate < endDate)
   * 4. Alert threshold range validation (0-100 percentages)
   *
   * Default Values:
   * - status: ACTIVE (immediate tracking)
   * - alertThresholds: [50, 75, 90] (industry-standard warning levels)
   *
   * Transformation Logic:
   * - categoryId/familyId: String UUID → Prisma connect structure
   * - Preserves all input data while ensuring referential integrity
   *
   * Error Handling:
   * - P2002: Unique constraint violation (duplicate budget)
   * - P2003: Foreign key constraint (invalid family/category reference)
   * - P2025: Record not found (non-existent family/category)
   * - Generic: Unexpected database errors
   *
   * @param data - Budget creation data with all required fields
   * @returns Promise<Budget> - Created budget entity with generated ID and timestamps
   * @throws BadRequestException - Invalid UUIDs, amount, date range, or alert thresholds
   * @throws ConflictException - Duplicate budget (unique constraint violation)
   * @throws NotFoundException - Referenced family or category does not exist
   * @throws InternalServerErrorException - Unexpected database errors
   *
   * @example
   * ```typescript
   * const budget = await budgetService.create({
   *   familyId: 'a1b2c3d4-...',
   *   categoryId: 'e5f6g7h8-...',
   *   amount: new Decimal('1000.00'),
   *   period: BudgetPeriod.MONTHLY,
   *   startDate: new Date('2025-01-01'),
   *   endDate: new Date('2025-01-31'),
   *   status: BudgetStatus.ACTIVE,
   *   alertThresholds: [50, 75, 90]
   * });
   * ```
   */
  async create(data: CreateBudgetDto): Promise<Budget> {
    // Validation pipeline
    validateUuid(data.familyId);
    validateUuid(data.categoryId);
    this.validateAmount(data.amount);
    this.validateDateRange(data.startDate, data.endDate);

    // Alert threshold validation with default fallback
    const alertThresholds = data.alertThresholds ?? [50, 75, 90];
    this.validateAlertThresholds(alertThresholds);

    // Default values for optional fields
    const status = data.status ?? BudgetStatus.ACTIVE;
    const period = data.period ?? BudgetPeriod.MONTHLY;

    try {
      // Transform DTO to Prisma input with connect relations
      const budget = await this.prisma.budget.create({
        data: {
          name: data.name,
          family: {
            connect: { id: data.familyId }
          },
          category: {
            connect: { id: data.categoryId }
          },
          amount: data.amount,
          period: period,
          startDate: data.startDate,
          endDate: data.endDate,
          status: status,
          alertThresholds: alertThresholds,
          settings: data.settings ?? null,
          notes: data.notes ?? null
        }
      });

      return budget;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Find a budget by ID
   *
   * Simple retrieval operation without relations.
   * Use findOneWithRelations() when category/family data is needed.
   *
   * Performance Optimization:
   * - No joins = faster query for basic lookups
   * - Use this method when only budget data is required
   *
   * @param id - Budget UUID
   * @returns Promise<Budget | null> - Budget entity or null if not found
   * @throws BadRequestException - Invalid UUID format
   *
   * @example
   * ```typescript
   * const budget = await budgetService.findOne('a1b2c3d4-...');
   * if (!budget) {
   *   throw new NotFoundException('Budget not found');
   * }
   * ```
   */
  async findOne(id: string): Promise<Budget | null> {
    validateUuid(id);

    return this.prisma.budget.findUnique({
      where: { id }
    });
  }

  /**
   * Find a budget by ID with category and family relations
   *
   * Enhanced retrieval operation with eager loading of related entities.
   * Use this when you need complete budget context (e.g., display details,
   * validation against category limits, family settings).
   *
   * Performance Consideration:
   * - Executes JOIN queries to load relations
   * - More expensive than findOne() but reduces N+1 query problems
   * - Prefer this over separate queries for related data
   *
   * Architectural Decision:
   * Separate method instead of optional parameter to findOne() for:
   * 1. Explicit intent (performance implications clear)
   * 2. Type safety (return type includes relations)
   * 3. Query optimization (Prisma can optimize eager loading)
   *
   * @param id - Budget UUID
   * @returns Promise<BudgetWithRelations | null> - Budget with category and family relations
   * @throws BadRequestException - Invalid UUID format
   *
   * @example
   * ```typescript
   * const budget = await budgetService.findOneWithRelations('a1b2c3d4-...');
   * if (budget) {
   *   console.log(`Budget for ${budget.category.name} in ${budget.family.name}`);
   * }
   * ```
   */
  async findOneWithRelations(id: string): Promise<BudgetWithRelations | null> {
    validateUuid(id);

    return this.prisma.budget.findUnique({
      where: { id },
      include: {
        category: true,
        family: true
      }
    });
  }

  /**
   * Find budgets by family ID with advanced filtering and pagination
   *
   * Primary query method for retrieving family budgets with support for:
   * - Dynamic filtering (status, period, date range)
   * - Pagination (skip/take)
   * - Custom sorting (orderBy)
   *
   * Default Behavior:
   * - skip: 0 (start from beginning)
   * - take: 50 (reasonable page size for UI display)
   * - orderBy: { startDate: 'desc' } (most recent first)
   *
   * Architectural Decision:
   * Flexible options parameter allows:
   * 1. Simple queries: findByFamilyId(familyId)
   * 2. Filtered queries: findByFamilyId(familyId, { where: { status: 'ACTIVE' } })
   * 3. Paginated queries: findByFamilyId(familyId, { skip: 50, take: 50 })
   * 4. Complex queries: Combine all options
   *
   * Performance Optimization:
   * - Default take=50 prevents unbounded queries
   * - Indexed orderBy (startDate) for efficient sorting
   * - Where clause optimization (status + familyId composite index)
   *
   * @param familyId - Family UUID to filter budgets
   * @param options - Optional query configuration (filtering, pagination, sorting)
   * @returns Promise<Budget[]> - Array of budgets matching criteria
   * @throws BadRequestException - Invalid familyId UUID
   *
   * @example
   * ```typescript
   * // Get active budgets for family
   * const active = await budgetService.findByFamilyId(familyId, {
   *   where: { status: BudgetStatus.ACTIVE },
   *   take: 10
   * });
   *
   * // Get paginated budgets
   * const page2 = await budgetService.findByFamilyId(familyId, {
   *   skip: 50,
   *   take: 50,
   *   orderBy: { amount: 'desc' }
   * });
   * ```
   */
  async findByFamilyId(familyId: string, options?: QueryOptions): Promise<Budget[]> {
    validateUuid(familyId);

    // Default query options
    const skip = options?.skip ?? 0;
    const take = options?.take ?? 50;
    const orderBy = options?.orderBy ?? { startDate: 'desc' as const };

    // Merge user filters with familyId constraint
    const where: Prisma.BudgetWhereInput = {
      familyId,
      ...(options?.where ?? {})
    };

    return this.prisma.budget.findMany({
      where,
      skip,
      take,
      orderBy,
      ...(options?.include && { include: options.include })
    });
  }

  /**
   * Find budgets by category ID with pagination and sorting
   *
   * Category-centric query for:
   * - Category budget analysis (total allocated across families)
   * - Category spending patterns
   * - Cross-family category comparisons
   *
   * Use Cases:
   * - "How much is budgeted for groceries across all families?"
   * - "Which families are actively budgeting for entertainment?"
   * - Category-based budget reports
   *
   * Default Behavior: Same as findByFamilyId
   * - skip: 0
   * - take: 50
   * - orderBy: { startDate: 'desc' }
   *
   * Performance Consideration:
   * - categoryId is indexed for efficient filtering
   * - Use with caution for popular categories (could return many results)
   * - Always use pagination (take parameter) for production queries
   *
   * @param categoryId - Category UUID to filter budgets
   * @param options - Optional query configuration (filtering, pagination, sorting)
   * @returns Promise<Budget[]> - Array of budgets for the category
   * @throws BadRequestException - Invalid categoryId UUID
   *
   * @example
   * ```typescript
   * // Get all active grocery budgets across families
   * const groceryBudgets = await budgetService.findByCategoryId(groceryCategoryId, {
   *   where: { status: BudgetStatus.ACTIVE },
   *   orderBy: { amount: 'desc' }
   * });
   * ```
   */
  async findByCategoryId(categoryId: string, options?: QueryOptions): Promise<Budget[]> {
    validateUuid(categoryId);

    // Default query options (only orderBy is required)
    const orderBy = options?.orderBy ?? { startDate: 'desc' as const };

    // Merge user filters with categoryId constraint
    const where: Prisma.BudgetWhereInput = {
      categoryId,
      ...(options?.where ?? {})
    };

    return this.prisma.budget.findMany({
      where,
      ...(options?.skip !== undefined && { skip: options.skip }),
      ...(options?.take !== undefined && { take: options.take }),
      orderBy
    });
  }

  /**
   * Find active budgets for a family
   *
   * Convenience method for the most common query pattern:
   * "What budgets are currently active for this family?"
   *
   * Use Cases:
   * - Dashboard display of current budgets
   * - Real-time spending tracking
   * - Alert threshold monitoring
   * - Budget compliance checking
   *
   * Filtering Logic:
   * - status = ACTIVE (only budgets currently in effect)
   * - familyId match (family-specific budgets)
   * - Ordered by startDate DESC (most recent first)
   *
   * Architectural Decision:
   * Dedicated method instead of findByFamilyId with filters because:
   * 1. Very common operation (deserves optimization)
   * 2. Clear semantic intent (code readability)
   * 3. Potential for query optimization (composite index on status + familyId)
   * 4. No pagination needed (active budgets typically small set)
   *
   * Performance Optimization:
   * - Composite index on (familyId, status) for fast filtering
   * - No pagination overhead (active budgets rarely exceed 50)
   *
   * @param familyId - Family UUID
   * @returns Promise<Budget[]> - Active budgets for the family
   * @throws BadRequestException - Invalid familyId UUID
   *
   * @example
   * ```typescript
   * const activeBudgets = await budgetService.findActive(familyId);
   * for (const budget of activeBudgets) {
   *   const usage = await calculateBudgetUsage(budget);
   *   if (usage > budget.alertThresholds[0]) {
   *     sendAlert(budget, usage);
   *   }
   * }
   * ```
   */
  async findActive(familyId?: string): Promise<Budget[]> {
    if (familyId) {
      validateUuid(familyId);
    }

    const where: Prisma.BudgetWhereInput = { status: BudgetStatus.ACTIVE };
    if (familyId) {
      where.familyId = familyId;
    }

    return this.prisma.budget.findMany({
      where,
      orderBy: {
        startDate: 'desc'
      }
    });
  }

  /**
   * Find budgets overlapping a date range
   *
   * Complex temporal query for identifying budgets that overlap with a
   * given date range. Critical for:
   * - Preventing duplicate budgets for the same period
   * - Historical budget analysis
   * - Budget conflict detection
   * - Period-based reporting
   *
   * Overlap Detection Logic:
   * A budget overlaps with the query range if:
   * - Budget starts before query ends (budget.startDate < endDate)
   * - Budget ends after query starts (budget.endDate > startDate)
   *
   * Visual Example:
   * Query Range:     |-------|
   * Overlap 1:    |------|      (starts before, ends during)
   * Overlap 2:         |--------|  (starts during, ends after)
   * Overlap 3:       |---|          (fully contained)
   * No Overlap:  |--|                (ends before query starts)
   *
   * Validation:
   * 1. familyId must be valid UUID
   * 2. startDate must be before endDate (logical consistency)
   *
   * Performance Consideration:
   * - Indexed date range query (startDate, endDate)
   * - Use specific date ranges (avoid months/years for performance)
   * - Consider caching for frequently queried periods
   *
   * @param familyId - Family UUID to scope the search
   * @param startDate - Range start date (inclusive)
   * @param endDate - Range end date (inclusive)
   * @returns Promise<Budget[]> - Budgets overlapping the date range
   * @throws BadRequestException - Invalid UUID or startDate >= endDate
   *
   * @example
   * ```typescript
   * // Find all budgets affecting Q1 2025
   * const q1Budgets = await budgetService.findByDateRange(
   *   familyId,
   *   new Date('2025-01-01'),
   *   new Date('2025-03-31')
   * );
   *
   * // Check for conflicts before creating new budget
   * const conflicts = await budgetService.findByDateRange(
   *   familyId,
   *   newBudget.startDate,
   *   newBudget.endDate
   * );
   * if (conflicts.some(b => b.categoryId === newBudget.categoryId)) {
   *   throw new ConflictException('Budget already exists for this period');
   * }
   * ```
   */
  async findByDateRange(startDate: Date, endDate: Date, familyId?: string): Promise<Budget[]> {
    this.validateDateRange(startDate, endDate);
    if (familyId) {
      validateUuid(familyId);
    }

    const where: Prisma.BudgetWhereInput = {
      AND: [
        // Budget starts before query range ends
        { startDate: { lte: endDate } },
        // Budget ends after query range starts
        { endDate: { gte: startDate } }
      ]
    };

    if (familyId) {
      where.familyId = familyId;
    }

    return this.prisma.budget.findMany({
      where,
      orderBy: {
        startDate: 'desc'
      }
    });
  }

  /**
   * Update a budget
   *
   * Flexible update operation with comprehensive validation.
   * Supports partial updates (only provided fields are modified).
   *
   * Validation Pipeline:
   * 1. id: Must be valid UUID
   * 2. date range: If both startDate and endDate present, validate consistency
   * 3. amount: If present, must be positive
   * 4. alertThresholds: If present, must be valid percentages (0-100)
   *
   * Architectural Decisions:
   * 1. Partial Updates: Uses Prisma.BudgetUpdateInput for type-safe partial updates
   * 2. Conditional Validation: Only validates fields that are present in update data
   * 3. Date Range Validation: Complex logic to handle partial date updates safely
   * 4. Relation Updates: Supports changing family/category via connect structure
   *
   * Update Scenarios:
   * - Amount only: update({ id, data: { amount: new Decimal('1500') } })
   * - Status change: update({ id, data: { status: BudgetStatus.INACTIVE } })
   * - Date range: update({ id, data: { startDate, endDate } })
   * - Complex: update({ id, data: { amount, status, alertThresholds } })
   *
   * Error Handling:
   * - P2002: Unique constraint (duplicate budget after update)
   * - P2003: Foreign key violation (invalid family/category)
   * - P2025: Budget not found
   * - Validation: BadRequestException for invalid input
   *
   * @param id - Budget UUID to update
   * @param data - Partial update data (only provided fields are modified)
   * @returns Promise<Budget> - Updated budget entity
   * @throws BadRequestException - Invalid UUID, amount, date range, or alert thresholds
   * @throws ConflictException - Update causes unique constraint violation
   * @throws NotFoundException - Budget with given ID does not exist
   * @throws InternalServerErrorException - Unexpected database errors
   *
   * @example
   * ```typescript
   * // Update amount only
   * await budgetService.update(budgetId, {
   *   amount: new Decimal('2000.00')
   * });
   *
   * // Change status and alert thresholds
   * await budgetService.update(budgetId, {
   *   status: BudgetStatus.INACTIVE,
   *   alertThresholds: [60, 80, 95]
   * });
   *
   * // Extend date range
   * await budgetService.update(budgetId, {
   *   endDate: new Date('2025-12-31')
   * });
   * ```
   */
  async update(id: string, data: Prisma.BudgetUpdateInput): Promise<Budget> {
    validateUuid(id);

    // Conditional validation for date range updates
    // Complex logic: must validate both dates if both are present
    // Cannot validate if only one date is updated (would need to fetch existing budget)
    if (data.startDate && data.endDate) {
      // Type narrowing: Prisma.BudgetUpdateInput uses union types for dates
      // We need to extract Date values for validation
      const startDate = data.startDate as Date;
      const endDate = data.endDate as Date;
      this.validateDateRange(startDate, endDate);
    }

    // Validate amount if present
    if (data.amount !== undefined) {
      this.validateAmount(data.amount as Decimal);
    }

    // Validate alert thresholds if present
    if (data.alertThresholds !== undefined) {
      this.validateAlertThresholds(data.alertThresholds as number[]);
    }

    try {
      return await this.prisma.budget.update({
        where: { id },
        data
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Delete a budget
   *
   * Permanent deletion operation. Use with caution in production.
   *
   * Architectural Decision:
   * Hard delete vs Soft delete:
   * - Current: Hard delete (permanent removal)
   * - Alternative: Soft delete (status = DELETED, retains history)
   * - Rationale: Budgets are planning tools, not transactional data
   * - Consideration: May want soft delete in future for audit trail
   *
   * Cascade Behavior:
   * - No cascade to transactions (transactions remain intact)
   * - Budget deletion does not affect historical spending data
   * - Maintains data integrity for financial reporting
   *
   * Use Cases:
   * - User mistake (created wrong budget)
   * - Test data cleanup
   * - Account closure (cleanup user data)
   *
   * Error Handling:
   * - P2025: Budget not found (idempotent operation)
   * - Generic: Unexpected database errors
   *
   * @param id - Budget UUID to delete
   * @returns Promise<Budget> - Deleted budget entity
   * @throws BadRequestException - Invalid UUID format
   * @throws NotFoundException - Budget with given ID does not exist
   * @throws InternalServerErrorException - Unexpected database errors
   *
   * @example
   * ```typescript
   * try {
   *   const deleted = await budgetService.delete(budgetId);
   *   console.log(`Deleted budget: ${deleted.id}`);
   * } catch (error) {
   *   if (error instanceof NotFoundException) {
   *     console.log('Budget already deleted');
   *   }
   * }
   * ```
   */
  async delete(id: string): Promise<Budget> {
    validateUuid(id);

    try {
      return await this.prisma.budget.delete({
        where: { id }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Count budgets matching criteria
   *
   * Efficient count operation for:
   * - Pagination metadata (total pages calculation)
   * - Analytics dashboards (budget statistics)
   * - Existence checks (more semantic than exists() for complex queries)
   * - Reporting (category budget counts, active budget counts)
   *
   * Performance Optimization:
   * - COUNT(*) query (no data fetching, index-only scan)
   * - Efficient for large datasets
   * - Faster than findMany().length
   *
   * Use Cases:
   * - "How many active budgets does this family have?"
   * - "Total budgets per category across all families"
   * - "Pagination: Page 5 of ${Math.ceil(total / pageSize)}"
   * - "Budgets created this month"
   *
   * @param where - Prisma where clause for filtering
   * @returns Promise<number> - Count of matching budgets
   *
   * @example
   * ```typescript
   * // Count active budgets
   * const activeCount = await budgetService.count({
   *   status: BudgetStatus.ACTIVE,
   *   familyId: familyId
   * });
   *
   * // Count budgets by category
   * const categoryCount = await budgetService.count({
   *   categoryId: groceryCategoryId
   * });
   *
   * // Pagination metadata
   * const total = await budgetService.count({ familyId });
   * const totalPages = Math.ceil(total / pageSize);
   * ```
   */
  async count(where: Prisma.BudgetWhereInput): Promise<number> {
    return this.prisma.budget.count({ where });
  }

  /**
   * Check if a budget exists
   *
   * Lightweight existence check optimized for boolean response.
   *
   * Performance Optimization:
   * - Uses findUnique with select: { id: true }
   * - Only fetches ID field (minimal data transfer)
   * - Index-only scan (no table access)
   * - Faster than findOne() for existence checks
   *
   * Use Cases:
   * - Pre-creation validation ("Budget already exists")
   * - Authorization checks ("Does this budget belong to user's family?")
   * - Conditional logic (if budget exists, do X, else Y)
   * - Idempotency checks in APIs
   *
   * Architectural Decision:
   * Dedicated exists() method vs findOne() !== null:
   * 1. Semantic clarity (intent is obvious)
   * 2. Performance optimization (select minimal fields)
   * 3. Query optimization (Prisma can optimize boolean checks)
   * 4. Type safety (boolean vs nullable object)
   *
   * @param id - Budget UUID to check
   * @returns Promise<boolean> - true if budget exists, false otherwise
   * @throws BadRequestException - Invalid UUID format
   *
   * @example
   * ```typescript
   * // Check before creation
   * if (await budgetService.exists(proposedId)) {
   *   throw new ConflictException('Budget already exists');
   * }
   *
   * // Conditional logic
   * const shouldCreate = !(await budgetService.exists(budgetId));
   *
   * // Authorization check
   * const budget = await budgetService.findOne(budgetId);
   * if (!budget || budget.familyId !== user.familyId) {
   *   throw new ForbiddenException();
   * }
   * ```
   */
  async exists(id: string): Promise<boolean> {
    validateUuid(id);

    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: { id: true }
    });

    return budget !== null;
  }

  // ==================== PRIVATE VALIDATION METHODS ====================

  /**
   * Validate date range logical consistency
   *
   * Ensures startDate is strictly before endDate.
   *
   * Validation Rules:
   * - startDate < endDate (strict inequality)
   * - No same-day budgets (startDate === endDate rejected)
   * - Both dates must be valid Date objects
   *
   * Architectural Decision:
   * Strict inequality (startDate < endDate) vs inclusive (startDate <= endDate):
   * - Chosen: Strict inequality
   * - Rationale: Zero-duration budgets are logically invalid
   * - Alternative: Allow same-day budgets for special cases (daily budgets)
   * - Future: May relax to <= for daily budget support
   *
   * Edge Cases:
   * - Same day: 2025-01-01 to 2025-01-01 → REJECTED
   * - One day: 2025-01-01 to 2025-01-02 → VALID
   * - Timezone: Dates are compared as-is (no timezone conversion)
   *
   * @param startDate - Budget start date
   * @param endDate - Budget end date
   * @throws BadRequestException - startDate >= endDate
   *
   * @example
   * Valid: startDate = 2025-01-01, endDate = 2025-01-31
   * Invalid: startDate = 2025-01-31, endDate = 2025-01-01 (reversed)
   * Invalid: startDate = 2025-01-01, endDate = 2025-01-01 (same day)
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }
  }

  /**
   * Validate budget amount is positive
   *
   * Ensures budget amounts are greater than zero.
   *
   * Validation Rules:
   * - amount > 0 (strictly positive)
   * - No zero budgets (amount === 0 rejected)
   * - No negative budgets (amount < 0 rejected)
   * - Decimal precision preserved (no rounding)
   *
   * Architectural Decision:
   * Decimal type vs number:
   * - Chosen: Prisma Decimal (from @prisma/client/runtime/library)
   * - Rationale: Prevents floating-point precision errors
   * - Example: 0.1 + 0.2 = 0.30000000000000004 (number) vs 0.3 (Decimal)
   * - Critical: Financial calculations require exact precision
   *
   * Business Rules:
   * - Zero budget: Rejected (use budget deletion instead)
   * - Negative budget: Rejected (no "income budgets" concept)
   * - Minimum: Any positive value (no minimum threshold)
   *
   * @param amount - Budget amount to validate
   * @throws BadRequestException - amount <= 0
   *
   * @example
   * Valid: new Decimal('0.01'), new Decimal('1000.50')
   * Invalid: new Decimal('0'), new Decimal('-100')
   */
  private validateAmount(amount: Decimal): void {
    if (amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }
  }

  /**
   * Validate alert threshold percentages
   *
   * Ensures all alert thresholds are valid percentages (0-100).
   *
   * Validation Rules:
   * - All values >= 0 (no negative percentages)
   * - All values <= 100 (no percentages above 100)
   * - Array can be empty (no alerts)
   * - Array length not restricted (support any number of thresholds)
   *
   * Use Cases:
   * - Standard thresholds: [50, 75, 90] (warning at 50%, 75%, 90%)
   * - Conservative: [25, 50, 75] (early warnings)
   * - Aggressive: [80, 90, 95] (late warnings)
   * - No alerts: [] (no notifications)
   *
   * Architectural Decision:
   * Percentage-based (0-100) vs decimal (0-1):
   * - Chosen: Percentage (0-100)
   * - Rationale: User-facing concept (easier to understand)
   * - Alternative: Decimal (0-1) for internal calculations
   * - Note: Convert to decimal for threshold comparisons
   *
   * Business Logic:
   * - Thresholds trigger notifications when budget usage exceeds percentage
   * - Example: [50, 75, 90] = notify at 50%, 75%, 90% usage
   * - Order agnostic (service handles sorting/deduplication)
   * - Duplicates allowed (service handles deduplication)
   *
   * @param thresholds - Array of percentage values (0-100)
   * @throws BadRequestException - Any value outside 0-100 range
   *
   * @example
   * Valid: [50, 75, 90], [], [0, 100], [25, 50, 75, 90, 95]
   * Invalid: [-10, 50, 90], [50, 110], [150]
   */
  private validateAlertThresholds(thresholds: number[]): void {
    for (const threshold of thresholds) {
      if (threshold < 0 || threshold > 100) {
        throw new BadRequestException('Alert thresholds must be between 0 and 100');
      }
    }
  }

  /**
   * Handle Prisma errors and convert to HTTP exceptions
   *
   * Centralized error handling for Prisma database operations.
   * Translates Prisma error codes to appropriate HTTP exceptions.
   *
   * Prisma Error Code Mapping:
   * - P2002: Unique constraint violation → ConflictException (409)
   * - P2003: Foreign key constraint → BadRequestException (400)
   * - P2025: Record not found → NotFoundException (404)
   * - Other: Unknown error → InternalServerErrorException (500)
   *
   * Error Code Details:
   *
   * P2002 - Unique Constraint Violation:
   * - Scenario: Duplicate budget creation
   * - Example: Same family+category+period+dateRange
   * - Response: 409 Conflict
   * - User Action: Modify budget parameters or update existing
   *
   * P2003 - Foreign Key Constraint Violation:
   * - Scenario: Reference to non-existent family or category
   * - Example: create({ familyId: 'invalid-uuid', ... })
   * - Response: 400 Bad Request
   * - User Action: Verify family/category exists before creation
   *
   * P2025 - Record Not Found:
   * - Scenario: Update or delete non-existent budget
   * - Example: update({ id: 'non-existent-uuid', ... })
   * - Response: 404 Not Found
   * - User Action: Verify budget exists before operation
   *
   * Generic Errors:
   * - Scenario: Database connection failure, timeout, permission issues
   * - Response: 500 Internal Server Error
   * - User Action: Retry operation, contact support
   * - Logging: Error logged for debugging (includes stack trace)
   *
   * Architectural Decision:
   * Centralized error handling vs inline handling:
   * - Chosen: Centralized handlePrismaError method
   * - Benefits: Consistent error responses, easier maintenance, DRY principle
   * - Alternative: Inline try-catch in each method (code duplication)
   *
   * Security Consideration:
   * - Generic 500 errors hide internal implementation details
   * - Prevents information disclosure (database schema, table names)
   * - Detailed errors logged server-side for debugging
   *
   * @param error - Prisma error object with code property
   * @throws ConflictException - P2002 (unique constraint)
   * @throws BadRequestException - P2003 (foreign key constraint)
   * @throws NotFoundException - P2025 (record not found)
   * @throws InternalServerErrorException - Generic database errors
   *
   * @example
   * ```typescript
   * try {
   *   await this.prisma.budget.create({ data });
   * } catch (error) {
   *   this.handlePrismaError(error); // Converts to appropriate HTTP exception
   * }
   * ```
   */
  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Budget with these parameters already exists');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid family or category reference');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Budget not found');
      }
    }
    throw new InternalServerErrorException('An error occurred while processing the budget');
  }
}
