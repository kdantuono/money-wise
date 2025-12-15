import { BadRequestException } from '@nestjs/common';

/**
 * UUID Validation Utility
 *
 * Provides UUID format validation that accepts both strict RFC 4122 UUIDs
 * and test-friendly alphanumeric formats. Centralizes validation logic
 * previously duplicated across 8+ services.
 *
 * @module common/validators/uuid
 */

// Accept both strict RFC 4122 (hex only) and test-friendly (alphanumeric) formats
const UUID_REGEX = /^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/i;

/**
 * Validates that a string is a valid UUID format.
 *
 * @param uuid - The string to validate
 * @returns true if valid UUID format
 */
export function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Validates UUID format and throws BadRequestException if invalid.
 *
 * @param uuid - The UUID string to validate
 * @param fieldName - Optional field name for clearer error messages
 * @throws BadRequestException if format is invalid
 */
export function validateUuid(uuid: string, fieldName?: string): void {
  if (!isValidUuid(uuid)) {
    const field = fieldName ? ` for ${fieldName}` : '';
    throw new BadRequestException(`Invalid UUID format${field}: ${uuid}`);
  }
}

/**
 * Validates multiple UUIDs at once.
 *
 * @param uuids - Record of field names to UUID values
 * @throws BadRequestException with details of first invalid UUID
 */
export function validateUuids(uuids: Record<string, string | undefined | null>): void {
  for (const [fieldName, uuid] of Object.entries(uuids)) {
    if (uuid !== undefined && uuid !== null) {
      validateUuid(uuid, fieldName);
    }
  }
}
