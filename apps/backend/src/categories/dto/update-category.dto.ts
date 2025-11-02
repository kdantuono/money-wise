import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { CategoryType, CategoryStatus } from '../../../generated/prisma';

/**
 * Update Category DTO
 * All fields are optional - only provided fields will be updated
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Groceries', description: 'Category name' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'groceries',
    description: 'URL-friendly slug (lowercase, hyphens only)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase with hyphens only (a-z0-9-)',
  })
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({
    example: 'Food and grocery shopping',
    description: 'Category description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: CategoryType,
    example: CategoryType.EXPENSE,
    description: 'Category type (EXPENSE or INCOME)',
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiPropertyOptional({
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
    description: 'Category status (ACTIVE or ARCHIVED)',
  })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Hex color code (#RRGGBB)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex code (#RRGGBB)',
  })
  color?: string;

  @ApiPropertyOptional({ example: 'shopping-cart', description: 'Icon identifier' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this is a default category',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Sort order for display' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Parent category ID for hierarchical categories',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    example: {
      keywords: ['walmart', 'grocery store', 'supermarket'],
      merchantPatterns: ['walmart', 'whole foods', 'trader joes'],
      amountRanges: [{ min: 10, max: 500 }],
      autoAssign: true,
      confidence: 85,
    },
    description: 'Categorization rules (JSONB)',
  })
  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      budgetEnabled: true,
      monthlyLimit: 500,
      taxDeductible: false,
    },
    description: 'Category metadata (JSONB)',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
