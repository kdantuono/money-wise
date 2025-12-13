import {
  IsNumber,
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInstallmentPlanDto {
  @ApiProperty({
    description: 'Total amount of the installment plan',
    example: 300.0,
  })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({
    description: 'Amount per installment',
    example: 100.0,
  })
  @IsNumber()
  @Min(0)
  installmentAmount: number;

  @ApiProperty({
    description: 'Number of installments',
    example: 3,
  })
  @IsInt()
  @Min(1)
  numberOfInstallments: number;

  @ApiProperty({
    description: 'Start date of the plan',
    example: '2024-01-15',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}
