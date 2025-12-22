import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  TransactionType,
  FlowType,
  RecurrenceFrequency,
  ScheduledTransactionStatus,
} from '../../../generated/prisma';

export class CreateRecurrenceRuleDto {
  @ApiProperty({
    description: 'Recurrence frequency',
    enum: RecurrenceFrequency,
    example: RecurrenceFrequency.MONTHLY,
  })
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @ApiPropertyOptional({
    description: 'Interval between occurrences (e.g., every 2 weeks)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Day of week for weekly recurrence (0=Sunday, 6=Saturday)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Day of month for monthly recurrence (1-31, -1 for last day)',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'End date for recurrence',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of occurrences before ending',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  endCount?: number;
}

export class CreateScheduledTransactionDto {
  @ApiProperty({
    description: 'Account ID for the transaction',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  accountId: string;

  @ApiProperty({
    description: 'Transaction amount (positive value, absolute). Use type field (DEBIT/CREDIT) to indicate direction.',
    example: 150.0,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: TransactionType.DEBIT,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({
    description: 'Flow type for categorization',
    enum: FlowType,
    example: FlowType.EXPENSE,
  })
  @IsOptional()
  @IsEnum(FlowType)
  flowType?: FlowType;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Monthly Netflix subscription',
  })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    description: 'Merchant name',
    example: 'Netflix',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  merchantName?: string;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    description: 'Next due date',
    example: '2024-01-15',
  })
  @IsDateString()
  nextDueDate: string;

  @ApiPropertyOptional({
    description: 'Automatically create transaction on due date',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoCreate?: boolean;

  @ApiPropertyOptional({
    description: 'Days before due date to send reminder',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  reminderDaysBefore?: number;

  @ApiPropertyOptional({
    description: 'Status',
    enum: ScheduledTransactionStatus,
    default: ScheduledTransactionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ScheduledTransactionStatus)
  status?: ScheduledTransactionStatus;

  @ApiPropertyOptional({
    description: 'Recurrence rule for repeating transactions',
    type: CreateRecurrenceRuleDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateRecurrenceRuleDto)
  recurrenceRule?: CreateRecurrenceRuleDto;

  @ApiPropertyOptional({
    description: 'Additional metadata (notes, tags, etc.)',
    example: { notes: 'Shared family account', tags: ['streaming'] },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
