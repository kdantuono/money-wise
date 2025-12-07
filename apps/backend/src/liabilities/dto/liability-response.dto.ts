import { ApiProperty } from '@nestjs/swagger';
import { LiabilityType, LiabilityStatus } from '../../../generated/prisma';

/**
 * Individual installment in a plan
 */
export class InstallmentResponseDto {
  @ApiProperty({ description: 'Installment ID' })
  id: string;

  @ApiProperty({ description: 'Installment plan ID' })
  planId: string;

  @ApiProperty({ description: 'Payment amount', example: 100.0 })
  amount: number;

  @ApiProperty({ description: 'Due date' })
  dueDate: Date;

  @ApiProperty({ description: 'Installment number (1, 2, 3...)', example: 1 })
  installmentNumber: number;

  @ApiProperty({ description: 'Whether this installment has been paid' })
  isPaid: boolean;

  @ApiProperty({ description: 'When the installment was paid', required: false })
  paidAt?: Date;

  @ApiProperty({ description: 'Linked transaction ID', required: false })
  transactionId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Installment plan with all installments
 */
export class InstallmentPlanResponseDto {
  @ApiProperty({ description: 'Plan ID' })
  id: string;

  @ApiProperty({ description: 'Liability ID' })
  liabilityId: string;

  @ApiProperty({ description: 'Total amount', example: 300.0 })
  totalAmount: number;

  @ApiProperty({ description: 'Amount per installment', example: 100.0 })
  installmentAmount: number;

  @ApiProperty({ description: 'Total number of installments', example: 3 })
  numberOfInstallments: number;

  @ApiProperty({ description: 'Remaining installments', example: 2 })
  remainingInstallments: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Plan start date' })
  startDate: Date;

  @ApiProperty({ description: 'Plan end date' })
  endDate: Date;

  @ApiProperty({ description: 'Whether the plan is fully paid off' })
  isPaidOff: boolean;

  @ApiProperty({
    description: 'Individual installments',
    type: [InstallmentResponseDto],
  })
  installments: InstallmentResponseDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Full liability response with installment plans
 */
export class LiabilityResponseDto {
  @ApiProperty({ description: 'Liability ID' })
  id: string;

  @ApiProperty({ description: 'Family ID' })
  familyId: string;

  @ApiProperty({ description: 'Liability type', enum: LiabilityType })
  type: LiabilityType;

  @ApiProperty({ description: 'Liability status', enum: LiabilityStatus })
  status: LiabilityStatus;

  @ApiProperty({ description: 'Liability name', example: 'Chase Sapphire' })
  name: string;

  @ApiProperty({ description: 'Current balance (amount owed)', example: 1500.0 })
  currentBalance: number;

  @ApiProperty({ description: 'Credit limit', example: 10000.0, required: false })
  creditLimit?: number;

  @ApiProperty({
    description: 'Original amount (for loans/BNPL)',
    example: 5000.0,
    required: false,
  })
  originalAmount?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({
    description: 'Annual interest rate (APR)',
    example: 19.99,
    required: false,
  })
  interestRate?: number;

  @ApiProperty({
    description: 'Minimum payment amount',
    example: 35.0,
    required: false,
  })
  minimumPayment?: number;

  @ApiProperty({
    description: 'Billing cycle day (1-31)',
    example: 15,
    required: false,
  })
  billingCycleDay?: number;

  @ApiProperty({
    description: 'Payment due day (1-31)',
    example: 20,
    required: false,
  })
  paymentDueDay?: number;

  @ApiProperty({
    description: 'Statement close day (1-31)',
    example: 12,
    required: false,
  })
  statementCloseDay?: number;

  @ApiProperty({ description: 'Last statement date', required: false })
  lastStatementDate?: Date;

  @ApiProperty({ description: 'Linked account ID', required: false })
  accountId?: string;

  @ApiProperty({
    description: 'BNPL provider',
    example: 'Klarna',
    required: false,
  })
  provider?: string;

  @ApiProperty({ description: 'External provider ID', required: false })
  externalId?: string;

  @ApiProperty({ description: 'Purchase date (for BNPL)', required: false })
  purchaseDate?: Date;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Installment plans',
    type: [InstallmentPlanResponseDto],
    required: false,
  })
  installmentPlans?: InstallmentPlanResponseDto[];

  // Computed fields
  @ApiProperty({
    description: 'Available credit (creditLimit - currentBalance)',
    example: 8500.0,
    required: false,
  })
  availableCredit?: number;

  @ApiProperty({
    description: 'Credit utilization percentage',
    example: 15.0,
    required: false,
  })
  utilizationPercent?: number;

  @ApiProperty({
    description: 'Next payment due date (computed)',
    required: false,
  })
  nextPaymentDate?: Date;

  @ApiProperty({
    description: 'Is this a BNPL type liability',
  })
  isBNPL: boolean;

  @ApiProperty({
    description: 'Is this a credit card',
  })
  isCreditCard: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Upcoming payment summary
 */
export class UpcomingPaymentDto {
  @ApiProperty({ description: 'Liability ID' })
  liabilityId: string;

  @ApiProperty({ description: 'Liability name' })
  liabilityName: string;

  @ApiProperty({ description: 'Liability type', enum: LiabilityType })
  liabilityType: LiabilityType;

  @ApiProperty({ description: 'Payment due date' })
  dueDate: Date;

  @ApiProperty({ description: 'Payment amount', example: 100.0 })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({
    description: 'Installment ID if this is an installment payment',
    required: false,
  })
  installmentId?: string;

  @ApiProperty({
    description: 'Installment number (e.g., 2 of 3)',
    required: false,
  })
  installmentNumber?: number;

  @ApiProperty({
    description: 'Total installments in plan',
    required: false,
  })
  totalInstallments?: number;

  @ApiProperty({
    description: 'Is this an installment payment',
  })
  isInstallment: boolean;

  @ApiProperty({
    description: 'Days until due (negative if overdue)',
    example: 5,
  })
  daysUntilDue: number;

  @ApiProperty({
    description: 'Is the payment overdue',
  })
  isOverdue: boolean;
}

/**
 * BNPL detection result
 */
export class BNPLDetectionResultDto {
  @ApiProperty({ description: 'Detected BNPL provider' })
  provider: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.95,
  })
  confidence: number;

  @ApiProperty({
    description: 'Pattern that matched',
    example: 'klarna',
  })
  matchedPattern: string;

  @ApiProperty({
    description: 'Suggested liability name',
    example: 'Klarna Purchase',
  })
  suggestedName: string;
}

/**
 * Paginated liabilities response
 */
export class PaginatedLiabilitiesResponseDto {
  @ApiProperty({
    description: 'Array of liabilities',
    type: [LiabilityResponseDto],
  })
  data: LiabilityResponseDto[];

  @ApiProperty({ description: 'Total number of liabilities matching the query' })
  total: number;

  @ApiProperty({ description: 'Whether there are more items after this page' })
  hasMore: boolean;

  @ApiProperty({ description: 'Number of items skipped', required: false })
  skip?: number;

  @ApiProperty({ description: 'Number of items returned', required: false })
  take?: number;
}

/**
 * Liabilities summary statistics
 */
export class LiabilitiesSummaryDto {
  @ApiProperty({ description: 'Total number of liabilities' })
  totalLiabilities: number;

  @ApiProperty({ description: 'Total amount owed across all liabilities' })
  totalOwed: number;

  @ApiProperty({ description: 'Total credit limit across all credit cards' })
  totalCreditLimit: number;

  @ApiProperty({ description: 'Overall credit utilization percentage' })
  overallUtilization: number;

  @ApiProperty({ description: 'Number of upcoming payments in next 30 days' })
  upcomingPaymentCount: number;

  @ApiProperty({ description: 'Total amount due in next 30 days' })
  upcomingPaymentTotal: number;

  @ApiProperty({ description: 'Breakdown by liability type' })
  byType: {
    [key in LiabilityType]?: {
      count: number;
      totalOwed: number;
    };
  };
}
