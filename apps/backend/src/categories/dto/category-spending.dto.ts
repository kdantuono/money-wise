import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Category Spending DTO
 * Returned by spending analytics endpoint
 */
export class CategorySpendingDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Category ID',
  })
  categoryId: string;

  @ApiProperty({ example: 'Food & Dining', description: 'Category name' })
  categoryName: string;

  @ApiPropertyOptional({ example: 'Utensils', description: 'Icon identifier' })
  icon: string | null;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Hex color code',
  })
  color: string | null;

  @ApiProperty({
    example: 1234.56,
    description: 'Total spending amount in the date range',
  })
  totalAmount: number;

  @ApiProperty({
    example: 42,
    description: 'Number of transactions in the date range',
  })
  transactionCount: number;
}

/**
 * Category Spending Summary DTO
 * Contains the list of spending by category and totals
 */
export class CategorySpendingSummaryDto {
  @ApiProperty({ type: [CategorySpendingDto] })
  categories: CategorySpendingDto[];

  @ApiProperty({ example: 5678.90, description: 'Total spending across all categories' })
  totalSpending: number;

  @ApiProperty({ example: '2025-01-01', description: 'Start date of the range' })
  startDate: string;

  @ApiProperty({ example: '2025-01-31', description: 'End date of the range' })
  endDate: string;
}
