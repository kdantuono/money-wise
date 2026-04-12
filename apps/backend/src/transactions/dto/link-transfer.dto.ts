import { IsArray, IsUUID, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkTransferDto {
  @ApiProperty({
    description: 'Two transaction IDs to link as a transfer pair',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsUUID('4', { each: true })
  transactionIds: string[];

  @ApiProperty({
    description: 'Optional existing transfer group ID to join',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  transferGroupId?: string;
}

export class LinkTransferResponseDto {
  @ApiProperty({ description: 'The transfer group ID' })
  transferGroupId: string;

  @ApiProperty({ description: 'Number of transactions linked' })
  linkedCount: number;
}

export class UnlinkTransferDto {
  @ApiProperty({ description: 'Transaction ID to unlink' })
  @IsUUID('4')
  transactionId: string;
}
