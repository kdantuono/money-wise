import { faker } from '@faker-js/faker';
import { User, UserRole, UserStatus } from '@/core/database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { DeepPartial } from 'typeorm';

/**
 * User Factory
 *
 * Factory pattern for generating test users with realistic data.
 * Provides multiple build methods for different test scenarios.
 */
export class UserFactory {
  /**
   * Build a basic user entity
   */
  static build(overrides: DeepPartial<User> = {}): User {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    const user = new User();
    user.id = faker.string.uuid();
    user.email = email;
    user.firstName = firstName;
    user.lastName = lastName;
    user.passwordHash = bcrypt.hashSync('Password123!', 10);
    user.role = UserRole.USER;
    user.status = UserStatus.ACTIVE;
    user.currency = faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'JPY']);
    user.timezone = faker.location.timeZone();
    user.isEmailVerified = faker.datatype.boolean(0.8); // 80% chance of verified
    user.createdAt = faker.date.past();
    user.updatedAt = faker.date.recent();

    // Apply overrides
    Object.assign(user, overrides);

    return user;
  }

  /**
   * Build an admin user
   */
  static buildAdmin(overrides: DeepPartial<User> = {}): User {
    return UserFactory.build({
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      ...overrides,
    });
  }

  /**
   * Build an unverified user
   */
  static buildUnverified(overrides: DeepPartial<User> = {}): User {
    return UserFactory.build({
      status: UserStatus.INACTIVE,
      isEmailVerified: false,
      emailVerifiedAt: null,
      ...overrides,
    });
  }

  /**
   * Build a user with 2FA enabled
   */
  static buildWith2FA(overrides: DeepPartial<User> = {}): User {
    return UserFactory.build({
      twoFactorEnabled: true,
      twoFactorSecret: faker.string.alphanumeric(32),
      backupCodes: Array.from({ length: 10 }, () =>
        faker.string.alphanumeric(8).toUpperCase()
      ),
      ...overrides,
    });
  }

  /**
   * Build a suspended user
   */
  static buildSuspended(overrides: DeepPartial<User> = {}): User {
    return UserFactory.build({
      status: UserStatus.SUSPENDED,
      suspendedAt: faker.date.recent(),
      suspensionReason: faker.lorem.sentence(),
      ...overrides,
    });
  }

  /**
   * Build a user with password reset token
   */
  static buildWithPasswordReset(overrides: DeepPartial<User> = {}): User {
    return UserFactory.build({
      passwordResetToken: faker.string.alphanumeric(64),
      passwordResetExpires: faker.date.future(),
      ...overrides,
    });
  }

  /**
   * Build a user with complete profile
   */
  static buildComplete(overrides: DeepPartial<User> = {}): User {
    const user = UserFactory.build({
      avatar: faker.image.avatar(),
      bio: faker.person.bio(),
      phoneNumber: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
      },
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
        language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
        notifications: {
          email: faker.datatype.boolean(),
          push: faker.datatype.boolean(),
          sms: faker.datatype.boolean(),
        },
        privacy: {
          profileVisibility: faker.helpers.arrayElement(['public', 'private', 'friends']),
          showEmail: faker.datatype.boolean(),
        },
      },
      lastLoginAt: faker.date.recent(),
      lastLoginIp: faker.internet.ip(),
      loginCount: faker.number.int({ min: 1, max: 1000 }),
      ...overrides,
    });

    return user;
  }

  /**
   * Build multiple users
   */
  static buildMany(count: number, overrides: DeepPartial<User> = {}): User[] {
    return Array.from({ length: count }, () => UserFactory.build(overrides));
  }

  /**
   * Build raw user data (for API requests)
   */
  static buildRaw(overrides: Partial<any> = {}) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      firstName,
      lastName,
      password: 'Password123!',
      ...overrides,
    };
  }

  /**
   * Build login credentials
   */
  static buildCredentials(overrides: Partial<any> = {}) {
    const email = faker.internet.email().toLowerCase();

    return {
      email,
      password: 'Password123!',
      ...overrides,
    };
  }

  /**
   * Build user with specific email domain
   */
  static buildWithDomain(domain: string, overrides: DeepPartial<User> = {}): User {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;

    return UserFactory.build({
      email,
      firstName,
      lastName,
      ...overrides,
    });
  }

  /**
   * Build user with age
   */
  static buildWithAge(age: number, overrides: DeepPartial<User> = {}): User {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - age);

    return UserFactory.build({
      dateOfBirth: birthDate,
      ...overrides,
    });
  }

  /**
   * Build user with specific locale
   */
  static buildWithLocale(locale: string, overrides: DeepPartial<User> = {}): User {
    faker.locale = locale;
    const user = UserFactory.build({
      preferences: {
        language: locale.split('_')[0], // Extract language code
        locale,
      },
      ...overrides,
    });
    faker.locale = 'en'; // Reset to default
    return user;
  }

  /**
   * Build test user (for testing purposes with predictable data)
   */
  static buildTest(index: number = 1): User {
    return UserFactory.build({
      email: `test${index}@example.com`,
      firstName: `Test${index}`,
      lastName: 'User',
      passwordHash: bcrypt.hashSync('TestPassword123!', 10),
    });
  }

  /**
   * Build user for specific test scenario
   */
  static buildForScenario(scenario: 'login' | 'register' | 'profile' | 'settings') {
    switch (scenario) {
      case 'login':
        return UserFactory.build({
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          lastLoginAt: null,
        });

      case 'register':
        return UserFactory.buildUnverified({
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      case 'profile':
        return UserFactory.buildComplete();

      case 'settings':
        return UserFactory.build({
          twoFactorEnabled: false,
          preferences: {},
        });

      default:
        return UserFactory.build();
    }
  }
}