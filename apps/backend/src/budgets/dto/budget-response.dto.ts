import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriod, BudgetStatus } from '../../../generated/prisma';

/**
 * Category information embedded in budget response
 */
export class CategorySummaryDto {
  @ApiProperty({
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Groceries',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Category icon identifier',
    example: 'shopping-cart',
  })
  icon?: string | null;

  @ApiPropertyOptional({
    description: 'Category color (hex)',
    example: '#4CAF50',
  })
  color?: string | null;
}

/**
 * Response DTO for a single budget
 *
 * Includes the budget details along with calculated spent amount
 * and progress percentage for UI display.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "Groceries Budget",
 *   "amount": 500.00,
 *   "spent": 350.00,
 *   "remaining": 150.00,
 *   "percentage": 70,
 *   "status": "ACTIVE",
 *   "period": "MONTHLY",
 *   "startDate": "2025-01-01",
 *   "endDate": "2025-01-31",
 *   "category": { "id": "...", "name": "Groceries", "icon": "shopping-cart" },
 *   "isOverBudget": false
 * }
 */
export class BudgetResponseDto {
  @ApiProperty({
    description: 'Budget ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Budget name/description',
    example: 'Groceries Budget',
  })
  name: string;

  @ApiProperty({
    description: 'Budget amount limit',
    example: 500.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Amount spent in this budget period',
    example: 350.0,
  })
  spent: number;

  @ApiProperty({
    description: 'Remaining budget amount (can be negative if over budget)',
    example: 150.0,
  })
  remaining: number;

  @ApiProperty({
    description: 'Percentage of budget used (0-100+)',
    example: 70,
  })
  percentage: number;

  @ApiProperty({
    description: 'Budget status',
    enum: BudgetStatus,
    example: 'ACTIVE',
  })
  status: BudgetStatus;

  @ApiProperty({
    description: 'Budget period type',
    enum: BudgetPeriod,
    example: 'MONTHLY',
  })
  period: BudgetPeriod;

  @ApiProperty({
    description: 'Budget start date',
    example: '2025-01-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Budget end date',
    example: '2025-01-31',
  })
  endDate: string;

  @ApiProperty({
    description: 'Category information',
    type: CategorySummaryDto,
  })
  category: CategorySummaryDto;

  @ApiProperty({
    description: 'Alert thresholds as percentages',
    example: [50, 75, 90],
    type: [Number],
  })
  alertThresholds: number[];

  @ApiPropertyOptional({
    description: 'Optional notes',
    example: 'Monthly grocery spending limit',
  })
  notes?: string | null;

  @ApiProperty({
    description: 'Whether the budget has been exceeded',
    example: false,
  })
  isOverBudget: boolean;

  @ApiProperty({
    description: 'Progress status for UI color coding: safe (0-79%, green), warning (80-99%, orange), maxed (exactly 100%, yellow), over (100%+, red)',
    enum: ['safe', 'warning', 'maxed', 'over'],
    example: 'safe',
    examples: {
      safe: { value: 'safe', summary: '0-79% spent (green)' },
      warning: { value: 'warning', summary: '80-99% spent (orange)' },
      maxed: { value: 'maxed', summary: 'Exactly 100% spent (yellow)' },
      over: { value: 'over', summary: 'Over 100% spent (red)' },
    },
  })
  progressStatus: 'safe' | 'warning' | 'maxed' | 'over';

  @ApiProperty({
    description: 'Whether the budget period has expired. Budget is active THROUGH end date (inclusive). Expires at start of day AFTER end date.',
    example: false,
  })
  isExpired: boolean;

  @ApiProperty({
    description: 'Budget creation timestamp',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Budget last update timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}

/**
 * Response DTO for listing budgets
 */
export class BudgetListResponseDto {
  @ApiProperty({
    description: 'List of budgets',
    type: [BudgetResponseDto],
  })
  budgets: BudgetResponseDto[];

  @ApiProperty({
    description: 'Total number of budgets',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'Number of budgets that are over limit',
    example: 1,
  })
  overBudgetCount: number;
}
