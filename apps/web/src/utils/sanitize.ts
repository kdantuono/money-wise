/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize and validate user data from API responses
 * to prevent XSS attacks and ensure data integrity.
 *
 * @module utils/sanitize
 */

import type { User } from '../../lib/auth';

// DOMPurify instance - initialized on first use
// Using isomorphic-dompurify for SSR compatibility
import DOMPurify from 'isomorphic-dompurify';

/**
 * Check if we're in a browser environment with proper DOM support
 */
function hasDomSupport(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Sanitize HTML content by removing all tags using DOMPurify
 *
 * Uses DOMPurify for robust XSS protection. Removes ALL HTML tags,
 * keeping only text content.
 *
 * @param input - String to sanitize
 * @returns Sanitized string with all HTML removed
 *
 * @example
 * sanitizeHtml('<script>alert("xss")</script>'); // Returns: ''
 * sanitizeHtml('Hello <b>World</b>'); // Returns: 'Hello World'
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Use DOMPurify when DOM is available (browser or jsdom in isomorphic-dompurify)
  if (hasDomSupport() || typeof DOMPurify.sanitize === 'function') {
    try {
      // Use DOMPurify with no allowed tags - strips all HTML
      return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
    } catch {
      // Fallback if DOMPurify fails (rare edge case)
    }
  }

  // Fallback: basic HTML entity encoding for pure SSR/static generation
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Encode HTML entities to prevent XSS when displaying user input
 *
 * Use this when you need to preserve the original text but make it safe
 * for HTML display. Converts < > " ' & to HTML entities.
 *
 * @param input - String to encode
 * @returns String with HTML entities encoded
 *
 * @example
 * encodeHtmlEntities('<script>'); // Returns: '&lt;script&gt;'
 * encodeHtmlEntities('Hello "World"'); // Returns: 'Hello &quot;World&quot;'
 */
export function encodeHtmlEntities(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Sanitize a string by removing HTML tags and dangerous characters
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 *
 * @example
 * sanitizeString('<script>alert("xss")</script>'); // Returns: ''
 * sanitizeString('Hello <b>World</b>'); // Returns: 'Hello World'
 */
export function sanitizeString(input: unknown): string {
  // Delegate to DOMPurify-based sanitization
  return sanitizeHtml(input);
}

/**
 * Validate and sanitize email address
 *
 * @param email - Email to validate
 * @returns Sanitized email or null if invalid
 *
 * @example
 * sanitizeEmail('user@example.com'); // Returns: 'user@example.com'
 * sanitizeEmail('invalid-email'); // Returns: null
 */
export function sanitizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(email).toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  return emailRegex.test(sanitized) ? sanitized : null;
}

/**
 * Validate and sanitize UUID
 *
 * @param id - UUID to validate
 * @returns Sanitized UUID or null if invalid
 *
 * @example
 * sanitizeUuid('123e4567-e89b-12d3-a456-426614174000'); // Returns: '123e4567-e89b-12d3-a456-426614174000'
 * sanitizeUuid('not-a-uuid'); // Returns: null
 */
export function sanitizeUuid(id: unknown): string | null {
  if (typeof id !== 'string') {
    return null;
  }

  // UUID v4 regex
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(id) ? id.toLowerCase() : null;
}

/**
 * Validate and sanitize ISO 8601 date string
 *
 * @param date - Date string to validate
 * @returns Sanitized date string or null if invalid
 *
 * @example
 * sanitizeIsoDate('2025-10-29T12:00:00.000Z'); // Returns: '2025-10-29T12:00:00.000Z'
 * sanitizeIsoDate('invalid-date'); // Returns: null
 */
export function sanitizeIsoDate(date: unknown): string | null {
  if (typeof date !== 'string') {
    return null;
  }

  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  } catch {
    return null;
  }
}

/**
 * Sanitize user role
 *
 * @param role - Role string to validate
 * @returns Sanitized role or 'USER' as default
 *
 * @example
 * sanitizeRole('ADMIN'); // Returns: 'ADMIN'
 * sanitizeRole('invalid'); // Returns: 'USER'
 */
export function sanitizeRole(role: unknown): string {
  if (typeof role !== 'string') {
    return 'USER';
  }

  const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
  const upperRole = role.toUpperCase();

  return validRoles.includes(upperRole) ? upperRole : 'USER';
}

/**
 * Sanitize user status
 *
 * @param status - Status string to validate
 * @returns Sanitized status or 'ACTIVE' as default
 *
 * @example
 * sanitizeStatus('ACTIVE'); // Returns: 'ACTIVE'
 * sanitizeStatus('invalid'); // Returns: 'ACTIVE'
 */
export function sanitizeStatus(status: unknown): string {
  if (typeof status !== 'string') {
    return 'ACTIVE';
  }

  const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'];
  const upperStatus = status.toUpperCase();

  return validStatuses.includes(upperStatus) ? upperStatus : 'ACTIVE';
}

/**
 * Validate and sanitize User object from API response
 *
 * This function ensures the User object matches the expected interface
 * and sanitizes all fields to prevent XSS and injection attacks.
 *
 * @param data - Raw user data from API
 * @returns Sanitized User object
 * @throws Error if required fields are missing or invalid
 *
 * @example
 * const rawUser = await fetch('/api/auth/profile').then(r => r.json());
 * const user = sanitizeUser(rawUser);
 */
export function sanitizeUser(data: unknown): User {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user data: must be an object');
  }

  const userData = data as Record<string, unknown>;

  // Validate required fields
  const id = sanitizeUuid(userData.id);
  if (!id) {
    throw new Error('Invalid user data: id must be a valid UUID');
  }

  const email = sanitizeEmail(userData.email);
  if (!email) {
    throw new Error('Invalid user data: email must be valid');
  }

  const firstName = sanitizeString(userData.firstName);
  if (!firstName) {
    throw new Error('Invalid user data: firstName is required');
  }

  const lastName = sanitizeString(userData.lastName);
  if (!lastName) {
    throw new Error('Invalid user data: lastName is required');
  }

  const createdAt = sanitizeIsoDate(userData.createdAt);
  if (!createdAt) {
    throw new Error('Invalid user data: createdAt must be a valid date');
  }

  const updatedAt = sanitizeIsoDate(userData.updatedAt);
  if (!updatedAt) {
    throw new Error('Invalid user data: updatedAt must be a valid date');
  }

  // Build sanitized user object
  const sanitizedUser: User = {
    id,
    email,
    firstName,
    lastName,
    role: sanitizeRole(userData.role),
    status: sanitizeStatus(userData.status),
    createdAt,
    updatedAt,
    fullName: `${firstName} ${lastName}`,
    isEmailVerified: userData.emailVerifiedAt ? true : false,
    isActive: userData.status === 'ACTIVE',
  };

  // Optional fields
  if (userData.avatar && typeof userData.avatar === 'string') {
    sanitizedUser.avatar = sanitizeString(userData.avatar);
  }

  if (userData.timezone && typeof userData.timezone === 'string') {
    sanitizedUser.timezone = sanitizeString(userData.timezone);
  }

  if (userData.currency && typeof userData.currency === 'string') {
    sanitizedUser.currency = sanitizeString(userData.currency);
  }

  if (userData.preferences) {
    // Preferences are dynamic, just ensure it's an object
    if (typeof userData.preferences === 'object') {
      sanitizedUser.preferences = userData.preferences;
    }
  }

  if (userData.lastLoginAt) {
    const lastLoginAt = sanitizeIsoDate(userData.lastLoginAt);
    if (lastLoginAt) {
      sanitizedUser.lastLoginAt = lastLoginAt;
    }
  }

  if (userData.emailVerifiedAt) {
    const emailVerifiedAt = sanitizeIsoDate(userData.emailVerifiedAt);
    if (emailVerifiedAt) {
      sanitizedUser.emailVerifiedAt = emailVerifiedAt;
    }
  }

  return sanitizedUser;
}

/**
 * Sanitize a list of User objects
 *
 * @param data - Array of raw user data from API
 * @returns Array of sanitized User objects
 *
 * @example
 * const rawUsers = await fetch('/api/users').then(r => r.json());
 * const users = sanitizeUserList(rawUsers);
 */
export function sanitizeUserList(data: unknown): User[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid user list: must be an array');
  }

  return data.map((item) => sanitizeUser(item));
}
