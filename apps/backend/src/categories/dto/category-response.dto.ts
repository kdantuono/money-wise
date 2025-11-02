import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType, CategoryStatus } from '../../../generated/prisma';

/**
 * Category Response DTO
 * Returned by all category endpoints
 */
export class CategoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Groceries' })
  name: string;

  @ApiProperty({ example: 'groceries' })
  slug: string;

  @ApiPropertyOptional({ example: 'Food and grocery shopping' })
  description: string | null;

  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE })
  type: CategoryType;

  @ApiProperty({ enum: CategoryStatus, example: CategoryStatus.ACTIVE })
  status: CategoryStatus;

  @ApiPropertyOptional({ example: '#FF5733' })
  color: string | null;

  @ApiPropertyOptional({ example: 'shopping-cart' })
  icon: string | null;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ example: false })
  isSystem: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  parentId: string | null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  familyId: string;

  @ApiPropertyOptional({
    example: {
      keywords: ['walmart', 'grocery store'],
      merchantPatterns: ['walmart', 'whole foods'],
      autoAssign: true,
      confidence: 85,
    },
  })
  rules: any;

  @ApiPropertyOptional({
    example: {
      budgetEnabled: true,
      monthlyLimit: 500,
    },
  })
  metadata: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Optional hierarchical data
  @ApiPropertyOptional({ type: [CategoryResponseDto] })
  children?: CategoryResponseDto[];

  @ApiPropertyOptional({ type: () => CategoryResponseDto })
  parent?: CategoryResponseDto | null;
}
