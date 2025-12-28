/**
 * User Factory
 * Generates realistic user test data using faker
 */

import { faker } from '@faker-js/faker';

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
}

/**
 * Creates a user with realistic data
 * @param overrides - Partial user data to override defaults
 * @returns UserData object with sensible defaults
 */
export function createUser(overrides: Partial<UserData> = {}): UserData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    firstName,
    lastName,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    password: generateTestPassword(),
    phone: faker.phone.number(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0],
    ...overrides,
  };
}

/**
 * Creates multiple users
 * @param count - Number of users to create
 * @param overrides - Partial user data to override defaults for all users
 * @returns Array of UserData objects
 */
export function createUsers(count: number, overrides: Partial<UserData> = {}): UserData[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

/**
 * Creates a user with specific characteristics
 */
export const UserFactory = {
  /**
   * Standard valid user
   */
  validUser: (overrides: Partial<UserData> = {}): UserData => {
    return createUser(overrides);
  },

  /**
   * Admin user
   */
  adminUser: (overrides: Partial<UserData> = {}): UserData => {
    return createUser({
      firstName: 'Admin',
      lastName: 'User',
      email: `admin.${faker.string.uuid()}@moneywise.com`,
      ...overrides,
    });
  },

  /**
   * User with invalid email
   */
  invalidEmail: (overrides: Partial<UserData> = {}): UserData => {
    return createUser({
      email: 'invalid-email-format',
      ...overrides,
    });
  },

  /**
   * User with weak password
   */
  weakPassword: (overrides: Partial<UserData> = {}): UserData => {
    return createUser({
      password: '12345',
      ...overrides,
    });
  },

  /**
   * User with missing required fields (for validation testing)
   */
  incompleteUser: (): Partial<UserData> => {
    return {
      email: faker.internet.email(),
      // Missing password, firstName, lastName
    };
  },

  /**
   * User with very long values (edge case testing)
   */
  longValues: (overrides: Partial<UserData> = {}): UserData => {
    return createUser({
      firstName: faker.string.alpha({ length: 100 }),
      lastName: faker.string.alpha({ length: 100 }),
      email: `${faker.string.alpha({ length: 50 })}@${faker.string.alpha({ length: 50 })}.com`,
      ...overrides,
    });
  },

  /**
   * User with special characters
   */
  specialCharacters: (overrides: Partial<UserData> = {}): UserData => {
    return createUser({
      firstName: "John-Paul",
      lastName: "O'Brien",
      email: `test+special${faker.number.int({ min: 1000, max: 9999 })}@example.com`,
      ...overrides,
    });
  },
};

/**
 * Counter for generating unique test passwords
 * Uses a simple incrementing counter instead of random values
 * to avoid CodeQL insecure-randomness warnings in test code.
 */
let passwordCounter = 0;

/**
 * Generates a test password that meets backend requirements
 * - At least 12 characters (backend minimum)
 * - Contains uppercase, lowercase, number, and special character
 * - Avoids sequential characters (abc, 123)
 * - Avoids common password patterns
 *
 * Uses deterministic generation with a counter for uniqueness.
 * This avoids security scanner false positives about insecure randomness
 * while still providing unique passwords per test user.
 */
function generateTestPassword(): string {
  const count = ++passwordCounter;
  // Format: Secure#Finance + unique suffix
  // Uses varied digits to avoid sequential detection (e.g., 2, 5, 7, 9)
  // Example: Secure#Finance2579! (18 characters, meets all requirements)
  const suffix = `${(count * 2) % 10}${(count * 5) % 10}${(count * 7) % 10}${(count * 9) % 10}`;
  return `Secure#Finance${suffix}!`;
}

/**
 * Default test user credentials for consistent testing
 */
export const DEFAULT_TEST_USER = {
  email: 'test.user@moneywise.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};
