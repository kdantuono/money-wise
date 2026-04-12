import { IsArray, IsUUID, IsEnum, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum BulkOperation {
  CATEGORIZE = 'categorize',
  DELETE = 'delete',
  MARK_TRANSFER = 'mark_transfer',
}

class BulkOperationData {
  @ApiProperty({ description: 'Category ID for categorize operation', required: false })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiProperty({ description: 'Transfer group ID for mark_transfer operation', required: false })
  @IsOptional()
  @IsUUID('4')
  transferGroupId?: string;
}

export class BulkOperationDto {
  @ApiProperty({
    description: 'Transaction IDs to perform operation on',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  transactionIds: string[];

  @ApiProperty({
    description: 'Operation to perform',
    enum: BulkOperation,
    example: BulkOperation.CATEGORIZE,
  })
  @IsEnum(BulkOperation)
  operation: BulkOperation;

  @ApiProperty({ description: 'Additional data for the operation', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkOperationData)
  data?: BulkOperationData;
}

export class BulkOperationResponseDto {
  @ApiProperty({ description: 'Number of transactions affected' })
  affectedCount: number;

  @ApiProperty({ description: 'Operation performed' })
  operation: BulkOperation;

  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;
}
