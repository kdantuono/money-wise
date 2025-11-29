import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * Valid time periods for analytics queries
 */
export enum TimePeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/**
 * Query parameters for analytics endpoints
 */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: TimePeriod,
    default: TimePeriod.MONTHLY,
    description: 'Time period for analytics data',
  })
  @IsEnum(TimePeriod)
  @IsOptional()
  period?: TimePeriod = TimePeriod.MONTHLY;
}

/**
 * Query parameters for recent transactions endpoint
 */
export class RecentTransactionsQueryDto {
  @ApiPropertyOptional({
    type: Number,
    default: 10,
    minimum: 1,
    maximum: 50,
    description: 'Number of transactions to return',
  })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;
}

/**
 * Dashboard statistics response DTO
 */
export class DashboardStatsDto {
  @ApiProperty({
    type: Number,
    example: 12450.0,
    description: 'Total balance across all accounts',
  })
  totalBalance: number;

  @ApiProperty({
    type: Number,
    example: 5200.0,
    description: 'Total income for the selected period',
  })
  monthlyIncome: number;

  @ApiProperty({
    type: Number,
    example: 3150.0,
    description: 'Total expenses for the selected period',
  })
  monthlyExpenses: number;

  @ApiProperty({
    type: Number,
    example: 39.42,
    description: 'Savings rate as percentage ((income - expenses) / income * 100)',
  })
  savingsRate: number;

  @ApiPropertyOptional({
    type: Number,
    example: 8.2,
    description: 'Balance trend compared to previous period',
  })
  balanceTrend?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 12.5,
    description: 'Income trend compared to previous period',
  })
  incomeTrend?: number;

  @ApiPropertyOptional({
    type: Number,
    example: -5.3,
    description: 'Expenses trend compared to previous period',
  })
  expensesTrend?: number;
}

/**
 * Category spending breakdown DTO
 */
export class CategorySpendingDto {
  @ApiProperty({
    type: String,
    example: 'cat-123',
    description: 'Category ID',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'Food & Groceries',
    description: 'Category name',
  })
  name: string;

  @ApiProperty({
    type: Number,
    example: 425.0,
    description: 'Total amount spent in this category',
  })
  amount: number;

  @ApiProperty({
    type: String,
    example: '#22c55e',
    description: 'Category color for visualization',
  })
  color: string;

  @ApiProperty({
    type: Number,
    example: 34,
    description: 'Percentage of total spending',
  })
  percentage: number;

  @ApiProperty({
    type: Number,
    example: 15,
    description: 'Number of transactions in this category',
  })
  count: number;
}

/**
 * Recent transaction DTO
 */
export class RecentTransactionDto {
  @ApiProperty({
    type: String,
    example: 'txn-123',
    description: 'Transaction ID',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'Grocery Store',
    description: 'Transaction description',
  })
  description: string;

  @ApiProperty({
    type: Number,
    example: -85.5,
    description: 'Transaction amount (negative for expenses)',
  })
  amount: number;

  @ApiProperty({
    type: String,
    example: '2024-01-15',
    description: 'Transaction date',
  })
  date: string;

  @ApiProperty({
    type: String,
    example: 'Food & Groceries',
    description: 'Transaction category name',
  })
  category: string;

  @ApiProperty({
    type: String,
    enum: ['income', 'expense'],
    example: 'expense',
    description: 'Transaction type',
  })
  type: 'income' | 'expense';

  @ApiPropertyOptional({
    type: String,
    example: 'Checking Account',
    description: 'Account name',
  })
  accountName?: string;
}

/**
 * Trend data point DTO
 */
export class TrendDataDto {
  @ApiProperty({
    type: String,
    example: '2024-01-15',
    description: 'Date for this data point',
  })
  date: string;

  @ApiProperty({
    type: Number,
    example: 500.0,
    description: 'Income for this period',
  })
  income: number;

  @ApiProperty({
    type: Number,
    example: 350.0,
    description: 'Expenses for this period',
  })
  expenses: number;
}
