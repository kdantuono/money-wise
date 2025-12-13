import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LiabilityType, LiabilityStatus } from '../../../generated/prisma';

/**
 * Options for findAll query with pagination and filtering
 */
export class FindLiabilitiesOptionsDto {
  @ApiProperty({
    description: 'Number of items to skip (offset pagination)',
    required: false,
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiProperty({
    description: 'Number of items to return (page size)',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @ApiProperty({
    description: 'Filter by liability status',
    required: false,
    enum: LiabilityStatus,
  })
  @IsOptional()
  @IsEnum(LiabilityStatus)
  status?: LiabilityStatus;

  @ApiProperty({
    description: 'Filter by liability type',
    required: false,
    enum: LiabilityType,
  })
  @IsOptional()
  @IsEnum(LiabilityType)
  type?: LiabilityType;
}

/**
 * Internal options interface for service layer
 */
export interface FindLiabilitiesOptions {
  skip?: number;
  take?: number;
  status?: LiabilityStatus | string;
  type?: LiabilityType | string;
}
