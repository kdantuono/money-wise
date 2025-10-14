import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * CreateFamilyDto - Validation DTO for creating a new Family
 *
 * VALIDATION RULES:
 * - name: Required, string, 1-255 characters (after trimming)
 * - No empty strings or whitespace-only names
 * - Whitespace automatically trimmed by service layer
 *
 * USAGE:
 * ```typescript
 * const dto: CreateFamilyDto = {
 *   name: 'Smith Family'
 * };
 * const family = await familyService.create(dto);
 * ```
 */
export class CreateFamilyDto {
  /**
   * Family name
   * @example "Smith Family"
   * @minLength 1
   * @maxLength 255
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
