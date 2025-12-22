import { BadRequestException } from '@nestjs/common';
import { validateUuid, isValidUuid, validateUuids } from '../../../../src/common/validators';

describe('UUID Validator', () => {
  describe('isValidUuid', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
      expect(isValidUuid('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true);
    });

    it('should return true for test-friendly alphanumeric UUIDs', () => {
      expect(isValidUuid('test1234-test-test-test-test12345678')).toBe(true);
      expect(isValidUuid('abcdefgh-ijkl-mnop-qrst-uvwxyz123456')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUuid('invalid')).toBe(false);
      expect(isValidUuid('123')).toBe(false);
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('not-a-uuid-at-all')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456')).toBe(false); // Too short
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(false); // Too long
    });

    it('should be case-insensitive', () => {
      expect(isValidUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
      expect(isValidUuid('123e4567-E89B-12d3-A456-426614174000')).toBe(true);
    });
  });

  describe('validateUuid', () => {
    it('should not throw for valid UUIDs', () => {
      expect(() => validateUuid('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
      expect(() => validateUuid('test1234-test-test-test-test12345678')).not.toThrow();
    });

    it('should throw BadRequestException for invalid UUIDs', () => {
      expect(() => validateUuid('invalid')).toThrow(BadRequestException);
      expect(() => validateUuid('123')).toThrow(BadRequestException);
      expect(() => validateUuid('')).toThrow(BadRequestException);
      expect(() => validateUuid('not-a-uuid-at-all')).toThrow(BadRequestException);
    });

    it('should include the invalid UUID in error message', () => {
      expect(() => validateUuid('invalid-uuid')).toThrow(/invalid-uuid/);
    });

    it('should include field name in error message when provided', () => {
      expect(() => validateUuid('invalid', 'userId')).toThrow(/userId/);
    });
  });

  describe('validateUuids', () => {
    it('should not throw for valid UUIDs', () => {
      expect(() =>
        validateUuids({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          familyId: 'test1234-test-test-test-test12345678',
        }),
      ).not.toThrow();
    });

    it('should skip undefined and null values', () => {
      expect(() =>
        validateUuids({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          familyId: undefined,
          categoryId: null,
        }),
      ).not.toThrow();
    });

    it('should throw for first invalid UUID found', () => {
      expect(() =>
        validateUuids({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          familyId: 'invalid',
        }),
      ).toThrow(BadRequestException);
    });
  });
});
