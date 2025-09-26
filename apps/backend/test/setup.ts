/**
 * Jest setup file for MoneyWise Backend
 * Global test configuration and utilities
 */

import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_NAME = 'moneywise_test';
process.env.DB_SYNCHRONIZE = 'true';
process.env.DB_LOGGING = 'false';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-super-long-for-security';
process.env.JWT_EXPIRES_IN = '1h';

// Mock bcrypt for faster tests
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('$2a$10$salt'),
}));

// Mock Redis for unit tests
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushdb: jest.fn(),
  }),
}));

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashedpassword',
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestAccount = (overrides = {}) => ({
  id: 1,
  name: 'Test Account',
  type: 'checking',
  balance: 1000.00,
  currency: 'USD',
  userId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestTransaction = (overrides = {}) => ({
  id: 1,
  amount: 100.00,
  description: 'Test Transaction',
  category: 'food',
  date: new Date(),
  accountId: 1,
  userId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Test utilities for mocking
export const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  })),
};

export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      'database.host': 'localhost',
      'database.port': 5432,
      'database.username': 'postgres',
      'database.password': 'postgres',
      'database.name': 'moneywise_test',
      'jwt.secret': 'test-jwt-secret',
      'jwt.expiresIn': '1h',
    };
    return config[key];
  }),
};

export const mockJwtService = {
  sign: jest.fn().mockReturnValue('test-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@example.com' }),
  decode: jest.fn().mockReturnValue({ sub: 1, email: 'test@example.com' }),
};

// Request mocking utilities
export const createMockRequest = (overrides = {}) => ({
  user: createTestUser(),
  headers: {},
  body: {},
  params: {},
  query: {},
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Test database utilities
export const clearTestDatabase = async (dataSource: DataSource) => {
  if (!dataSource.isInitialized) return;

  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
};

// Global test utilities
global.testUtils = {
  createTestUser,
  createTestAccount,
  createTestTransaction,
  mockRepository,
  mockConfigService,
  mockJwtService,
  createMockRequest,
  createMockResponse,
  clearTestDatabase,
};