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
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LiabilityType, LiabilityStatus } from '../../../generated/prisma';

/**
 * Helper to check if type requires creditLimit
 */
function requiresCreditLimit(type: LiabilityType): boolean {
  return type === LiabilityType.CREDIT_CARD;
}

/**
 * Helper to check if type requires provider
 */
function requiresProvider(type: LiabilityType): boolean {
  return type === LiabilityType.BNPL;
}

/**
 * Helper to check if type requires originalAmount
 */
function requiresOriginalAmount(type: LiabilityType): boolean {
  const typesRequiringOriginalAmount: LiabilityType[] = [
    LiabilityType.BNPL,
    LiabilityType.LOAN,
    LiabilityType.MORTGAGE,
  ];
  return typesRequiringOriginalAmount.includes(type);
}

export class CreateLiabilityDto {
  @ApiProperty({
    description: 'Liability type',
    enum: LiabilityType,
    example: LiabilityType.CREDIT_CARD,
  })
  @IsEnum(LiabilityType)
  type: LiabilityType;

  @ApiProperty({
    description: 'Liability name',
    example: 'Chase Sapphire Preferred',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Current balance (amount owed)',
    example: 1500.0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @ApiProperty({
    description: 'Credit limit (required for credit cards)',
    example: 10000.0,
    required: false,
  })
  @ValidateIf((o) => requiresCreditLimit(o.type))
  @IsNotEmpty({ message: 'creditLimit is required for credit cards' })
  @IsNumber()
  @Min(0.01, { message: 'creditLimit must be greater than 0' })
  creditLimit?: number;

  @ApiProperty({
    description: 'Original loan/BNPL amount (required for BNPL, LOAN, MORTGAGE)',
    example: 5000.0,
    required: false,
  })
  @ValidateIf((o) => requiresOriginalAmount(o.type))
  @IsNotEmpty({ message: 'originalAmount is required for BNPL, loans, and mortgages' })
  @IsNumber()
  @Min(0.01, { message: 'originalAmount must be greater than 0' })
  originalAmount?: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Annual interest rate (APR as percentage)',
    example: 19.99,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @ApiProperty({
    description: 'Minimum payment amount',
    example: 35.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  minimumPayment?: number;

  @ApiProperty({
    description: 'Day of month billing cycle starts (1-31)',
    example: 15,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  billingCycleDay?: number;

  @ApiProperty({
    description: 'Day of month payment is due (1-31)',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDueDay?: number;

  @ApiProperty({
    description: 'Day of month statement closes (1-31)',
    example: 12,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  statementCloseDay?: number;

  @ApiProperty({
    description: 'Optional linked account ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiProperty({
    description: 'BNPL provider name (required for BNPL)',
    example: 'Klarna',
    required: false,
  })
  @ValidateIf((o) => requiresProvider(o.type))
  @IsNotEmpty({ message: 'provider is required for BNPL liabilities' })
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'External ID from provider',
    example: 'klarna_12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({
    description: 'Purchase date (for BNPL)',
    example: '2024-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({
    description: 'Status',
    enum: LiabilityStatus,
    default: LiabilityStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(LiabilityStatus)
  status?: LiabilityStatus;

  @ApiProperty({
    description: 'Additional metadata',
    example: { description: 'Main travel card', autoPayEnabled: true },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
