import {
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  Validate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriod } from '../../../generated/prisma';
import { IsEndDateAfterStart } from '../validators/is-end-date-after-start.validator';

/**
 * Request DTO for creating a new budget
 *
 * Budgets are tied to a specific category and family.
 * The familyId is extracted from the authenticated user's JWT token.
 *
 * @example
 * {
 *   "name": "Groceries Budget",
 *   "categoryId": "550e8400-e29b-41d4-a716-446655440000",
 *   "amount": 500.00,
 *   "period": "MONTHLY",
 *   "startDate": "2025-01-01",
 *   "endDate": "2025-01-31",
 *   "alertThresholds": [50, 75, 90],
 *   "notes": "Monthly grocery spending limit"
 * }
 */
export class CreateBudgetDto {
  @ApiProperty({
    description: 'Budget name/description',
    example: 'Groceries Budget',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Category ID for this budget (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Budget amount (must be greater than 0)',
    example: 500.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Budget period type',
    enum: BudgetPeriod,
    example: 'MONTHLY',
  })
  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @ApiProperty({
    description: 'Budget start date (ISO 8601 date string)',
    example: '2025-01-01',
    format: 'date',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Budget end date (ISO 8601 date string). Must be after startDate.',
    example: '2025-01-31',
    format: 'date',
  })
  @IsDateString()
  @Validate(IsEndDateAfterStart, ['startDate'])
  endDate: string;

  @ApiPropertyOptional({
    description:
      'Alert thresholds as percentages (0-100). Defaults to [50, 75, 90]',
    example: [50, 75, 90],
    type: [Number],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  alertThresholds?: number[];

  @ApiPropertyOptional({
    description: 'Optional notes about this budget',
    example: 'Monthly grocery spending limit for family of 4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
