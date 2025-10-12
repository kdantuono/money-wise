import {
  enrichUserWithVirtuals,
  enrichUsersWithVirtuals,
  UserWithVirtuals,
} from '../../../../../../src/core/database/prisma/utils/user-virtuals';
import type { User } from '../../../../../../generated/prisma';
import { UserRole, UserStatus } from '../../../../../../generated/prisma';

describe('user-virtuals utilities', () => {
  const baseUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghij',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    familyId: 'family-uuid',
    avatar: null,
    timezone: null,
    currency: 'USD',
    preferences: null,
    emailVerifiedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-10T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  describe('enrichUserWithVirtuals', () => {
    it('should add virtual properties to user', () => {
      const enriched = enrichUserWithVirtuals(baseUser);

      expect(enriched).toHaveProperty('fullName');
      expect(enriched).toHaveProperty('isEmailVerified');
      expect(enriched).toHaveProperty('isActive');
    });

    it('should preserve all original user properties', () => {
      const enriched = enrichUserWithVirtuals(baseUser);

      expect(enriched.id).toBe(baseUser.id);
      expect(enriched.email).toBe(baseUser.email);
      expect(enriched.firstName).toBe(baseUser.firstName);
      expect(enriched.lastName).toBe(baseUser.lastName);
      expect(enriched.passwordHash).toBe(baseUser.passwordHash);
      expect(enriched.role).toBe(baseUser.role);
      expect(enriched.status).toBe(baseUser.status);
      expect(enriched.familyId).toBe(baseUser.familyId);
      expect(enriched.emailVerifiedAt).toBe(baseUser.emailVerifiedAt);
      expect(enriched.lastLoginAt).toBe(baseUser.lastLoginAt);
      expect(enriched.createdAt).toBe(baseUser.createdAt);
      expect(enriched.updatedAt).toBe(baseUser.updatedAt);
    });

    describe('fullName virtual property', () => {
      it('should concatenate firstName and lastName', () => {
        const enriched = enrichUserWithVirtuals(baseUser);
        expect(enriched.fullName).toBe('John Doe');
      });

      it('should handle firstName only', () => {
        const user = { ...baseUser, lastName: null };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.fullName).toBe('John');
      });

      it('should handle lastName only', () => {
        const user = { ...baseUser, firstName: null };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.fullName).toBe('Doe');
      });

      it('should return empty string when both names are null', () => {
        const user = { ...baseUser, firstName: null, lastName: null };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.fullName).toBe('');
      });

      it('should handle names with extra spaces correctly', () => {
        const user = { ...baseUser, firstName: 'John', lastName: 'Doe' };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.fullName).toBe('John Doe');
        expect(enriched.fullName).not.toContain('  '); // No double spaces
      });
    });

    describe('isEmailVerified virtual property', () => {
      it('should return true when emailVerifiedAt is set', () => {
        const user = { ...baseUser, emailVerifiedAt: new Date() };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.isEmailVerified).toBe(true);
      });

      it('should return false when emailVerifiedAt is null', () => {
        const user = { ...baseUser, emailVerifiedAt: null };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.isEmailVerified).toBe(false);
      });

      it('should handle past verification dates', () => {
        const user = { ...baseUser, emailVerifiedAt: new Date('2020-01-01') };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.isEmailVerified).toBe(true);
      });

      it('should handle future verification dates (edge case)', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const user = { ...baseUser, emailVerifiedAt: futureDate };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.isEmailVerified).toBe(true);
      });
    });

    describe('isActive virtual property', () => {
      it('should return true for ACTIVE status', () => {
        const user = { ...baseUser, status: UserStatus.ACTIVE };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.isActive).toBe(true);
      });

      it('should return false for INACTIVE status', () => {
        const user = { ...baseUser, status: UserStatus.INACTIVE };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.isActive).toBe(false);
      });

      it('should return false for SUSPENDED status', () => {
        const user = { ...baseUser, status: UserStatus.SUSPENDED };
        const enriched = enrichUserWithVirtuals(user);
        expect(enriched.isActive).toBe(false);
      });
    });

    describe('type safety', () => {
      it('should return UserWithVirtuals type', () => {
        const enriched: UserWithVirtuals = enrichUserWithVirtuals(baseUser);

        // Type check: should have all User properties
        expect(enriched.id).toBeDefined();
        expect(enriched.email).toBeDefined();

        // Type check: should have all virtual properties
        expect(enriched.fullName).toBeDefined();
        expect(enriched.isEmailVerified).toBeDefined();
        expect(enriched.isActive).toBeDefined();
      });
    });
  });

  describe('enrichUsersWithVirtuals', () => {
    it('should enrich empty array', () => {
      const enriched = enrichUsersWithVirtuals([]);
      expect(enriched).toEqual([]);
    });

    it('should enrich single user in array', () => {
      const enriched = enrichUsersWithVirtuals([baseUser]);

      expect(enriched).toHaveLength(1);
      expect(enriched[0].fullName).toBe('John Doe');
      expect(enriched[0].isEmailVerified).toBe(true);
      expect(enriched[0].isActive).toBe(true);
    });

    it('should enrich multiple users in array', () => {
      const user1 = baseUser;
      const user2: User = {
        ...baseUser,
        id: 'different-uuid',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        status: UserStatus.INACTIVE,
        emailVerifiedAt: null,
      };

      const enriched = enrichUsersWithVirtuals([user1, user2]);

      expect(enriched).toHaveLength(2);

      // First user
      expect(enriched[0].fullName).toBe('John Doe');
      expect(enriched[0].isEmailVerified).toBe(true);
      expect(enriched[0].isActive).toBe(true);

      // Second user
      expect(enriched[1].fullName).toBe('Jane Smith');
      expect(enriched[1].isEmailVerified).toBe(false);
      expect(enriched[1].isActive).toBe(false);
    });

    it('should handle array of users with various null fields', () => {
      const users: User[] = [
        { ...baseUser, firstName: null, lastName: null },
        { ...baseUser, firstName: 'John', lastName: null },
        { ...baseUser, firstName: null, lastName: 'Doe' },
        { ...baseUser, firstName: 'John', lastName: 'Doe' },
      ];

      const enriched = enrichUsersWithVirtuals(users);

      expect(enriched[0].fullName).toBe('');
      expect(enriched[1].fullName).toBe('John');
      expect(enriched[2].fullName).toBe('Doe');
      expect(enriched[3].fullName).toBe('John Doe');
    });

    it('should not mutate original users array', () => {
      const users = [baseUser];
      const originalEmail = users[0].email;

      enrichUsersWithVirtuals(users);

      // Original array should remain unchanged
      expect(users[0].email).toBe(originalEmail);
      expect('fullName' in users[0]).toBe(false);
    });

    it('should preserve all original properties for each user', () => {
      const users = [baseUser, { ...baseUser, id: 'different-uuid' }];
      const enriched = enrichUsersWithVirtuals(users);

      enriched.forEach((enrichedUser, index) => {
        expect(enrichedUser.id).toBe(users[index].id);
        expect(enrichedUser.email).toBe(users[index].email);
        expect(enrichedUser.firstName).toBe(users[index].firstName);
        expect(enrichedUser.lastName).toBe(users[index].lastName);
      });
    });
  });

  describe('edge cases and performance', () => {
    it('should handle user with minimal required fields', () => {
      const minimalUser: User = {
        id: 'uuid',
        email: 'minimal@example.com',
        firstName: null,
        lastName: null,
        passwordHash: '$2b$10$hash',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        familyId: 'family-uuid',
        avatar: null,
        timezone: null,
        currency: 'USD',
        preferences: null,
        emailVerifiedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const enriched = enrichUserWithVirtuals(minimalUser);

      expect(enriched.fullName).toBe('');
      expect(enriched.isEmailVerified).toBe(false);
      expect(enriched.isActive).toBe(true);
    });

    it('should be performant with large arrays', () => {
      const users: User[] = Array.from({ length: 1000 }, (_, i) => ({
        ...baseUser,
        id: `user-${i}`,
        email: `user${i}@example.com`,
      }));

      const startTime = Date.now();
      const enriched = enrichUsersWithVirtuals(users);
      const endTime = Date.now();

      expect(enriched).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast (< 100ms)
    });

    it('should handle special characters in names', () => {
      const user: User = {
        ...baseUser,
        firstName: "O'Brien",
        lastName: 'José-María',
      };

      const enriched = enrichUserWithVirtuals(user);
      expect(enriched.fullName).toBe("O'Brien José-María");
    });
  });
});
