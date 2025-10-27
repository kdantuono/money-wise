import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * UpdateFamilyDto - Validation DTO for updating an existing Family
 *
 * VALIDATION RULES:
 * - name: Optional, string, 1-255 characters (after trimming)
 * - Empty DTO is valid (no-op update)
 * - Cannot set name to empty string or whitespace-only
 * - Whitespace automatically trimmed by service layer
 *
 * USAGE:
 * ```typescript
 * const dto: UpdateFamilyDto = {
 *   name: 'Updated Family Name'
 * };
 * const family = await familyService.update(familyId, dto);
 * ```
 */
export class UpdateFamilyDto {
  /**
   * Family name (optional for updates)
   * @example "Updated Family Name"
   * @minLength 1 (if provided)
   * @maxLength 255
   */
  @ApiProperty({
    description: 'Family name (optional)',
    example: 'Updated Family Name',
    required: false,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}
