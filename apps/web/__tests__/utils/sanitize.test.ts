/**
 * Tests for Input Sanitization Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeUuid,
  sanitizeIsoDate,
  sanitizeRole,
  sanitizeStatus,
  sanitizeUser,
  sanitizeUserList,
} from '../../src/utils/sanitize';
import type { User } from '../../lib/auth';

describe('Input Sanitization Utilities', () => {
  describe('sanitizeString', () => {
    it('removes HTML tags from string', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert(xss)');
      expect(sanitizeString('Hello <b>World</b>')).toBe('Hello World');
      expect(sanitizeString('<p>Text</p>')).toBe('Text');
    });

    it('removes potentially dangerous characters', () => {
      expect(sanitizeString('Hello<>World')).toBe('HelloWorld');
      expect(sanitizeString('Test"quote"')).toBe('Testquote');
      expect(sanitizeString("Test'apostrophe'")).toBe('Testapostrophe');
    });

    it('trims whitespace', () => {
      expect(sanitizeString('  spaces  ')).toBe('spaces');
      expect(sanitizeString('\t\ntabs\n\t')).toBe('tabs');
    });

    it('returns empty string for non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
    });

    it('handles empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('preserves safe characters', () => {
      expect(sanitizeString('Hello World 123')).toBe('Hello World 123');
      expect(sanitizeString('test@example.com')).toBe('test@example.com');
    });
  });

  describe('sanitizeEmail', () => {
    it('validates and sanitizes valid email addresses', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail('test.user@domain.co.uk')).toBe(
        'test.user@domain.co.uk'
      );
      expect(sanitizeEmail('name+tag@example.com')).toBe(
        'name+tag@example.com'
      );
    });

    it('converts email to lowercase', () => {
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('returns null for invalid email formats', () => {
      expect(sanitizeEmail('invalid-email')).toBeNull();
      expect(sanitizeEmail('no-at-sign.com')).toBeNull();
      expect(sanitizeEmail('@no-local-part.com')).toBeNull();
      expect(sanitizeEmail('no-domain@')).toBeNull();
      expect(sanitizeEmail('spaces in@email.com')).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(sanitizeEmail(null)).toBeNull();
      expect(sanitizeEmail(undefined)).toBeNull();
      expect(sanitizeEmail(123)).toBeNull();
      expect(sanitizeEmail({})).toBeNull();
    });

    it('removes HTML tags before validation', () => {
      expect(sanitizeEmail('<script>user@example.com</script>')).toBe('user@example.com');
    });

    it('returns null for empty string', () => {
      expect(sanitizeEmail('')).toBeNull();
    });
  });

  describe('sanitizeUuid', () => {
    it('validates and returns valid UUIDs', () => {
      const validUuid = '123e4567-e89b-42d3-a456-426614174000';
      expect(sanitizeUuid(validUuid)).toBe(validUuid.toLowerCase());
    });

    it('converts UUID to lowercase', () => {
      const upperUuid = '123E4567-E89B-42D3-A456-426614174000';
      expect(sanitizeUuid(upperUuid)).toBe(upperUuid.toLowerCase());
    });

    it('validates UUID v4 format', () => {
      // Valid v4 UUID (4 in third group, 8/9/a/b in fourth group)
      expect(sanitizeUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('returns null for invalid UUIDs', () => {
      expect(sanitizeUuid('not-a-uuid')).toBeNull();
      expect(sanitizeUuid('123-456-789')).toBeNull();
      expect(sanitizeUuid('123e4567-e89b-12d3-a456')).toBeNull(); // Too short
      expect(sanitizeUuid('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(sanitizeUuid(null)).toBeNull();
      expect(sanitizeUuid(undefined)).toBeNull();
      expect(sanitizeUuid(123)).toBeNull();
      expect(sanitizeUuid({})).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(sanitizeUuid('')).toBeNull();
    });
  });

  describe('sanitizeIsoDate', () => {
    it('validates and returns valid ISO date strings', () => {
      const date = '2025-10-29T12:00:00.000Z';
      const result = sanitizeIsoDate(date);
      expect(result).toBe(date);
    });

    it('converts valid date strings to ISO format', () => {
      const result = sanitizeIsoDate('2025-10-29');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('returns null for invalid date strings', () => {
      expect(sanitizeIsoDate('invalid-date')).toBeNull();
      expect(sanitizeIsoDate('not a date')).toBeNull();
      expect(sanitizeIsoDate('2025-13-45')).toBeNull(); // Invalid month/day
    });

    it('returns null for non-string input', () => {
      expect(sanitizeIsoDate(null)).toBeNull();
      expect(sanitizeIsoDate(undefined)).toBeNull();
      expect(sanitizeIsoDate(123)).toBeNull();
      expect(sanitizeIsoDate({})).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(sanitizeIsoDate('')).toBeNull();
    });

    it('handles various valid date formats', () => {
      expect(sanitizeIsoDate('2025-01-15T10:30:00Z')).toBeTruthy();
      expect(sanitizeIsoDate('2025-01-15')).toBeTruthy();
      expect(sanitizeIsoDate('2025/01/15')).toBeTruthy();
    });
  });

  describe('sanitizeRole', () => {
    it('returns valid roles in uppercase', () => {
      expect(sanitizeRole('USER')).toBe('USER');
      expect(sanitizeRole('ADMIN')).toBe('ADMIN');
      expect(sanitizeRole('SUPER_ADMIN')).toBe('SUPER_ADMIN');
    });

    it('converts lowercase roles to uppercase', () => {
      expect(sanitizeRole('user')).toBe('USER');
      expect(sanitizeRole('admin')).toBe('ADMIN');
      expect(sanitizeRole('super_admin')).toBe('SUPER_ADMIN');
    });

    it('converts mixed case roles to uppercase', () => {
      expect(sanitizeRole('User')).toBe('USER');
      expect(sanitizeRole('Admin')).toBe('ADMIN');
    });

    it('returns USER as default for invalid roles', () => {
      expect(sanitizeRole('INVALID_ROLE')).toBe('USER');
      expect(sanitizeRole('MODERATOR')).toBe('USER');
      expect(sanitizeRole('unknown')).toBe('USER');
    });

    it('returns USER for non-string input', () => {
      expect(sanitizeRole(null)).toBe('USER');
      expect(sanitizeRole(undefined)).toBe('USER');
      expect(sanitizeRole(123)).toBe('USER');
      expect(sanitizeRole({})).toBe('USER');
    });

    it('returns USER for empty string', () => {
      expect(sanitizeRole('')).toBe('USER');
    });
  });

  describe('sanitizeStatus', () => {
    it('returns valid statuses in uppercase', () => {
      expect(sanitizeStatus('ACTIVE')).toBe('ACTIVE');
      expect(sanitizeStatus('INACTIVE')).toBe('INACTIVE');
      expect(sanitizeStatus('SUSPENDED')).toBe('SUSPENDED');
      expect(sanitizeStatus('DELETED')).toBe('DELETED');
    });

    it('converts lowercase statuses to uppercase', () => {
      expect(sanitizeStatus('active')).toBe('ACTIVE');
      expect(sanitizeStatus('inactive')).toBe('INACTIVE');
      expect(sanitizeStatus('suspended')).toBe('SUSPENDED');
      expect(sanitizeStatus('deleted')).toBe('DELETED');
    });

    it('converts mixed case statuses to uppercase', () => {
      expect(sanitizeStatus('Active')).toBe('ACTIVE');
      expect(sanitizeStatus('Suspended')).toBe('SUSPENDED');
    });

    it('returns ACTIVE as default for invalid statuses', () => {
      expect(sanitizeStatus('INVALID_STATUS')).toBe('ACTIVE');
      expect(sanitizeStatus('PENDING')).toBe('ACTIVE');
      expect(sanitizeStatus('unknown')).toBe('ACTIVE');
    });

    it('returns ACTIVE for non-string input', () => {
      expect(sanitizeStatus(null)).toBe('ACTIVE');
      expect(sanitizeStatus(undefined)).toBe('ACTIVE');
      expect(sanitizeStatus(123)).toBe('ACTIVE');
      expect(sanitizeStatus({})).toBe('ACTIVE');
    });

    it('returns ACTIVE for empty string', () => {
      expect(sanitizeStatus('')).toBe('ACTIVE');
    });
  });

  describe('sanitizeUser', () => {
    const validUserData = {
      id: '123e4567-e89b-42d3-a456-426614174000',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
    };

    it('sanitizes and returns valid user object', () => {
      const user = sanitizeUser(validUserData);

      expect(user).toMatchObject({
        id: validUserData.id,
        email: validUserData.email,
        firstName: validUserData.firstName,
        lastName: validUserData.lastName,
        role: validUserData.role,
        status: validUserData.status,
        createdAt: validUserData.createdAt,
        updatedAt: validUserData.updatedAt,
        fullName: 'John Doe',
        isEmailVerified: false,
        isActive: true,
      });
    });

    it('sets fullName from firstName and lastName', () => {
      const user = sanitizeUser(validUserData);
      expect(user.fullName).toBe('John Doe');
    });

    it('sets isEmailVerified to true when emailVerifiedAt exists', () => {
      const userData = {
        ...validUserData,
        emailVerifiedAt: '2025-01-02T00:00:00.000Z',
      };
      const user = sanitizeUser(userData);
      expect(user.isEmailVerified).toBe(true);
    });

    it('sets isActive based on status', () => {
      const activeUser = sanitizeUser({ ...validUserData, status: 'ACTIVE' });
      expect(activeUser.isActive).toBe(true);

      const inactiveUser = sanitizeUser({
        ...validUserData,
        status: 'INACTIVE',
      });
      expect(inactiveUser.isActive).toBe(false);
    });

    it('includes optional fields when present', () => {
      const userData = {
        ...validUserData,
        avatar: 'https://example.com/avatar.jpg',
        timezone: 'America/New_York',
        currency: 'USD',
        preferences: { theme: 'dark' },
        lastLoginAt: '2025-01-14T12:00:00.000Z',
        emailVerifiedAt: '2025-01-02T00:00:00.000Z',
      };

      const user = sanitizeUser(userData);

      expect(user.avatar).toBe('https://example.com/avatar.jpg');
      expect(user.timezone).toBe('America/New_York');
      expect(user.currency).toBe('USD');
      expect(user.preferences).toEqual({ theme: 'dark' });
      expect(user.lastLoginAt).toBe('2025-01-14T12:00:00.000Z');
      expect(user.emailVerifiedAt).toBe('2025-01-02T00:00:00.000Z');
    });

    it('sanitizes role and status to valid values', () => {
      const userData = {
        ...validUserData,
        role: 'admin',
        status: 'active',
      };

      const user = sanitizeUser(userData);

      expect(user.role).toBe('ADMIN');
      expect(user.status).toBe('ACTIVE');
    });

    it('throws error for invalid user data types', () => {
      expect(() => sanitizeUser(null)).toThrow(
        'Invalid user data: must be an object'
      );
      expect(() => sanitizeUser(undefined)).toThrow(
        'Invalid user data: must be an object'
      );
      expect(() => sanitizeUser('string')).toThrow(
        'Invalid user data: must be an object'
      );
      expect(() => sanitizeUser(123)).toThrow(
        'Invalid user data: must be an object'
      );
    });

    it('throws error for invalid id', () => {
      const userData = { ...validUserData, id: 'invalid-uuid' };
      expect(() => sanitizeUser(userData)).toThrow(
        'Invalid user data: id must be a valid UUID'
      );
    });

    it('throws error for invalid email', () => {
      const userData = { ...validUserData, email: 'invalid-email' };
      expect(() => sanitizeUser(userData)).toThrow(
        'Invalid user data: email must be valid'
      );
    });

    it('throws error for missing firstName', () => {
      const userData = { ...validUserData, firstName: '' };
      expect(() => sanitizeUser(userData)).toThrow(
        'Invalid user data: firstName is required'
      );
    });

    it('throws error for missing lastName', () => {
      const userData = { ...validUserData, lastName: '' };
      expect(() => sanitizeUser(userData)).toThrow(
        'Invalid user data: lastName is required'
      );
    });

    it('throws error for invalid createdAt', () => {
      const userData = {
        ...validUserData,
        id: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: 'invalid-date',
      };
      expect(() => sanitizeUser(userData)).toThrow(
        'Invalid user data: createdAt must be a valid date'
      );
    });

    it('throws error for invalid updatedAt', () => {
      const userData = {
        ...validUserData,
        id: '550e8400-e29b-41d4-a716-446655440002',
        updatedAt: 'invalid-date',
      };
      expect(() => sanitizeUser(userData)).toThrow(
        'Invalid user data: updatedAt must be a valid date'
      );
    });

    it('sanitizes HTML from string fields', () => {
      const userData = {
        ...validUserData,
        id: '550e8400-e29b-41d4-a716-446655440003',
        firstName: 'John<script>alert("xss")</script>',
        lastName: 'Doe<b>Bold</b>',
      };

      const user = sanitizeUser(userData);

      expect(user.firstName).toBe('Johnalert(xss)');
      expect(user.lastName).toBe('DoeBold');
      expect(user.fullName).toBe('Johnalert(xss) DoeBold');
    });

    it('skips invalid optional lastLoginAt', () => {
      const userData = {
        ...validUserData,
        id: '550e8400-e29b-41d4-a716-446655440004',
        lastLoginAt: 'invalid-date',
      };

      const user = sanitizeUser(userData);

      expect(user.lastLoginAt).toBeUndefined();
    });

    it('skips invalid optional emailVerifiedAt', () => {
      const userData = {
        ...validUserData,
        id: '550e8400-e29b-41d4-a716-446655440005',
        emailVerifiedAt: 'invalid-date',
      };

      const user = sanitizeUser(userData);

      expect(user.emailVerifiedAt).toBeUndefined();
    });

    it('skips non-string optional fields', () => {
      const userData = {
        ...validUserData,
        id: '550e8400-e29b-41d4-a716-446655440006',
        avatar: 123,
        timezone: {},
        currency: null,
      };

      const user = sanitizeUser(userData);

      expect(user.avatar).toBeUndefined();
      expect(user.timezone).toBeUndefined();
      expect(user.currency).toBeUndefined();
    });

    it('skips non-object preferences', () => {
      const userData = {
        ...validUserData,
        id: '550e8400-e29b-41d4-a716-446655440007',
        preferences: 'not an object',
      };

      const user = sanitizeUser(userData);

      expect(user.preferences).toBeUndefined();
    });
  });

  describe('sanitizeUserList', () => {
    const validUser1 = {
      id: '550e8400-e29b-41d4-a716-446655440101',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
    };

    const validUser2 = {
      id: '550e8400-e29b-41d4-a716-446655440102',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
    };

    it('sanitizes array of valid users', () => {
      const users = sanitizeUserList([validUser1, validUser2]);

      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('user1@example.com');
      expect(users[1].email).toBe('user2@example.com');
    });

    it('returns empty array for empty input', () => {
      const users = sanitizeUserList([]);
      expect(users).toEqual([]);
    });

    it('throws error for non-array input', () => {
      expect(() => sanitizeUserList(null)).toThrow(
        'Invalid user list: must be an array'
      );
      expect(() => sanitizeUserList(undefined)).toThrow(
        'Invalid user list: must be an array'
      );
      expect(() => sanitizeUserList('string')).toThrow(
        'Invalid user list: must be an array'
      );
      expect(() => sanitizeUserList({})).toThrow(
        'Invalid user list: must be an array'
      );
    });

    it('throws error if any user in array is invalid', () => {
      const invalidList = [validUser1, { invalid: 'user' }];
      expect(() => sanitizeUserList(invalidList)).toThrow();
    });

    it('sanitizes all users in the list', () => {
      const usersWithHtml = [
        { ...validUser1, firstName: 'John<script>xss</script>' },
        { ...validUser2, lastName: 'Smith<b>bold</b>' },
      ];

      const users = sanitizeUserList(usersWithHtml);

      expect(users[0].firstName).toBe('Johnxss');
      expect(users[1].lastName).toBe('Smithbold');
    });
  });
});
