import { IsEnum, IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType, AccountStatus } from '../../../generated/prisma';

export class UpdateAccountDto {
  @ApiProperty({ description: 'Account name', example: 'Chase Checking', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Account type', enum: AccountType, required: false })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiProperty({ description: 'Account status', enum: AccountStatus, required: false })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiProperty({ description: 'Current balance', example: 1000.00, required: false })
  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @ApiProperty({ description: 'Available balance', example: 950.00, required: false })
  @IsOptional()
  @IsNumber()
  availableBalance?: number;

  @ApiProperty({ description: 'Credit limit', example: 5000.00, required: false })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Institution name', example: 'Chase Bank', required: false })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiProperty({ description: 'Enable automatic sync', required: false })
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
