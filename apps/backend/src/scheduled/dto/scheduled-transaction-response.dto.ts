import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionType,
  FlowType,
  RecurrenceFrequency,
  ScheduledTransactionStatus,
} from '../../../generated/prisma';

export class RecurrenceRuleResponseDto {
  @ApiProperty({ description: 'Recurrence rule ID' })
  id: string;

  @ApiProperty({
    description: 'Recurrence frequency',
    enum: RecurrenceFrequency,
  })
  frequency: RecurrenceFrequency;

  @ApiProperty({ description: 'Interval between occurrences' })
  interval: number;

  @ApiPropertyOptional({ description: 'Day of week (0-6)' })
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month (1-31, -1 for last day)' })
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'End date' })
  endDate?: Date;

  @ApiPropertyOptional({ description: 'End after N occurrences' })
  endCount?: number;

  @ApiProperty({ description: 'Number of occurrences so far' })
  occurrenceCount: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}

export class ScheduledTransactionResponseDto {
  @ApiProperty({ description: 'Scheduled transaction ID' })
  id: string;

  @ApiProperty({ description: 'Family ID' })
  familyId: string;

  @ApiProperty({ description: 'Account ID' })
  accountId: string;

  @ApiProperty({
    description: 'Status',
    enum: ScheduledTransactionStatus,
  })
  status: ScheduledTransactionStatus;

  @ApiProperty({ description: 'Transaction amount (positive value, absolute)' })
  amount: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
  })
  type: TransactionType;

  @ApiPropertyOptional({
    description: 'Flow type',
    enum: FlowType,
  })
  flowType?: FlowType;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiPropertyOptional({ description: 'Merchant name' })
  merchantName?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  categoryId?: string;

  @ApiProperty({ description: 'Next due date' })
  nextDueDate: Date;

  @ApiPropertyOptional({ description: 'Last executed timestamp' })
  lastExecutedAt?: Date;

  @ApiProperty({ description: 'Auto-create transaction on due date' })
  autoCreate: boolean;

  @ApiProperty({ description: 'Reminder days before due date' })
  reminderDaysBefore: number;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Recurrence rule',
    type: RecurrenceRuleResponseDto,
  })
  recurrenceRule?: RecurrenceRuleResponseDto;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  // Computed fields
  @ApiProperty({ description: 'Is this transaction overdue' })
  isOverdue: boolean;

  @ApiProperty({ description: 'Days until due (negative if overdue)' })
  daysUntilDue: number;

  @ApiPropertyOptional({ description: 'Human-readable recurrence pattern' })
  recurrenceDescription?: string;
}

export class UpcomingScheduledDto {
  @ApiProperty({ description: 'Scheduled transaction ID' })
  scheduledTransactionId: string;

  @ApiProperty({ description: 'Due date for this occurrence' })
  dueDate: Date;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Amount (positive value, absolute)' })
  amount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Transaction type (DEBIT/CREDIT indicates direction)', enum: TransactionType })
  type: TransactionType;

  @ApiPropertyOptional({ description: 'Flow type', enum: FlowType })
  flowType?: FlowType;

  @ApiPropertyOptional({ description: 'Merchant name' })
  merchantName?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  categoryId?: string;

  @ApiProperty({ description: 'Account ID' })
  accountId: string;

  @ApiProperty({ description: 'Days until due' })
  daysUntilDue: number;

  @ApiProperty({ description: 'Is overdue' })
  isOverdue: boolean;
}

export class CalendarEventDto {
  @ApiProperty({ description: 'Unique event ID' })
  id: string;

  @ApiProperty({ description: 'Scheduled transaction ID' })
  scheduledTransactionId: string;

  @ApiProperty({ description: 'Event date' })
  date: Date;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Amount (positive value, absolute)' })
  amount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Transaction type (DEBIT/CREDIT indicates direction)', enum: TransactionType })
  type: TransactionType;

  @ApiPropertyOptional({ description: 'Flow type', enum: FlowType })
  flowType?: FlowType;

  @ApiPropertyOptional({ description: 'Category info' })
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };

  @ApiPropertyOptional({ description: 'Account info' })
  account?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Is overdue' })
  isOverdue: boolean;

  @ApiProperty({ description: 'Status', enum: ScheduledTransactionStatus })
  status: ScheduledTransactionStatus;
}

export class FindScheduledOptionsDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ScheduledTransactionStatus,
  })
  status?: ScheduledTransactionStatus;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: TransactionType,
  })
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Filter by flow type',
    enum: FlowType,
  })
  flowType?: FlowType;

  @ApiPropertyOptional({ description: 'Filter by account ID' })
  accountId?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by next due date from',
  })
  dueDateFrom?: Date;

  @ApiPropertyOptional({
    description: 'Filter by next due date to',
  })
  dueDateTo?: Date;

  @ApiPropertyOptional({ description: 'Number of records to skip' })
  skip?: number;

  @ApiPropertyOptional({ description: 'Number of records to take' })
  take?: number;
}

export class PaginatedScheduledResponseDto {
  @ApiProperty({
    description: 'List of scheduled transactions',
    type: [ScheduledTransactionResponseDto],
  })
  data: ScheduledTransactionResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Has more records' })
  hasMore: boolean;

  @ApiProperty({ description: 'Records skipped' })
  skip: number;

  @ApiProperty({ description: 'Records taken' })
  take: number;
}
