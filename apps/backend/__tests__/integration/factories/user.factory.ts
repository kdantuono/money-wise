// User Factory for Testing
// TASK-003-003: Setup Test Factories

import { User, UserStatus, UserRole } from '../../src/core/database/entities/user.entity';

export class UserFactory {
  static create(overrides: Partial<User> = {}): Partial<User> {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      currency: 'USD',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      accounts: [],
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}): Partial<User>[] {
    return Array.from({ length: count }, (_, index) => this.create({
      ...overrides,
      id: `test-user-id-${index}`,
      email: `test${index}@example.com`,
    }));
  }

  static build(overrides: Partial<User> = {}): User {
    const userData = this.create(overrides);
    const user = new User();
    Object.assign(user, userData);
    return user;
  }

  static buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, (_, index) => this.build({
      ...overrides,
      id: `test-user-id-${index}`,
      email: `test${index}@example.com`,
    }));
  }
}