// User Factory for Testing
// TASK-003-003: Setup Test Factories

import { faker } from '@faker-js/faker';
import { User } from '../../src/core/database/entities/user.entity';

export class UserFactory {
  static create(overrides: Partial<User> = {}): Partial<User> {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}): Partial<User>[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static build(overrides: Partial<User> = {}): User {
    const userData = this.create(overrides);
    const user = new User();
    Object.assign(user, userData);
    return user;
  }

  static buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}