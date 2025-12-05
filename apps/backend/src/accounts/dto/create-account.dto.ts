import { IsEnum, IsString, IsNumber, IsOptional, IsBoolean, ValidatorConstraint, ValidatorConstraintInterface, Validate, ValidationArguments } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType, AccountSource, AccountStatus } from '../../../generated/prisma';

/**
 * Custom validator for account balance that enforces type-aware constraints.
 *
 * Business Rules:
 * - Credit accounts (CREDIT_CARD) can have negative balances (representing debt)
 * - Loan accounts (LOAN) can have negative balances (representing debt)
 * - All other account types must have non-negative balances
 *
 * @example
 * // Valid: Credit card with negative balance (owe $500)
 * { type: 'CREDIT_CARD', currentBalance: -500 }
 *
 * // Invalid: Checking account with negative balance
 * { type: 'CHECKING', currentBalance: -100 } // ❌ Fails validation
 */
@ValidatorConstraint({ name: 'isValidAccountBalance', async: false })
export class IsValidAccountBalanceConstraint implements ValidatorConstraintInterface {
  validate(currentBalance: number, args: ValidationArguments): boolean {
    const dto = args.object as CreateAccountDto;
    const accountType = dto.type;

    // Allow negative balances for credit and loan accounts
    const allowsNegativeBalance = accountType === AccountType.CREDIT_CARD || accountType === AccountType.LOAN;

    if (allowsNegativeBalance) {
      return true; // No balance restriction
    }

    // For all other account types, balance must be non-negative
    return currentBalance >= 0;
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as CreateAccountDto;
    return `Balance must be non-negative for ${dto.type} accounts. Only CREDIT_CARD and LOAN accounts can have negative balances.`;
  }
}

export class CreateAccountDto {
  @ApiProperty({ description: 'Account name', example: 'Chase Checking' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({ description: 'Account status', enum: AccountStatus, required: false })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiProperty({ description: 'Account source', enum: AccountSource })
  @IsEnum(AccountSource)
  source: AccountSource;

  @ApiProperty({ description: 'Initial balance', example: 1000.00 })
  @IsNumber()
  @Validate(IsValidAccountBalanceConstraint)
  currentBalance: number;

  @ApiProperty({ description: 'Available balance', example: 950.00, required: false })
  @IsOptional()
  @IsNumber()
  availableBalance?: number;

  @ApiProperty({ description: 'Credit limit', example: 5000.00, required: false })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Institution name', example: 'Chase Bank', required: false })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiProperty({ description: 'Account number (last 4 digits)', example: '1234', required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ description: 'Routing number', required: false })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiProperty({ description: 'Plaid account ID', required: false })
  @IsOptional()
  @IsString()
  plaidAccountId?: string;

  @ApiProperty({ description: 'Plaid item ID', required: false })
  @IsOptional()
  @IsString()
  plaidItemId?: string;

  @ApiProperty({ description: 'Plaid access token', required: false })
  @IsOptional()
  @IsString()
  plaidAccessToken?: string;

  @ApiProperty({ description: 'Plaid metadata', required: false })
  @IsOptional()
  plaidMetadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Enable automatic sync', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @ApiProperty({ description: 'Account settings', required: false })
  @IsOptional()
  settings?: {
    autoSync?: boolean;
    syncFrequency?: 'daily' | 'hourly' | 'manual';
    notifications?: boolean;
    budgetIncluded?: boolean;
    /** Account display icon identifier */
    icon?: string;
    /** Account display color identifier */
    color?: string;
  };
}
