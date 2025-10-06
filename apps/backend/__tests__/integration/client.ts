// API Test Client
// TASK-003-004: Create API Test Client

import { Global, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthModule } from '@/core/health/health.module';
import { RedisModule } from '@/core/redis/redis.module';
import request from 'supertest';
import { SuperTest, Test as SuperTestType } from 'supertest';
import { createMockRedis } from '../mocks/redis.mock';

export class TestClient {
  private _app: INestApplication;
  private agent: SuperTest<SuperTestType>;
  private mockRedis: any;

  async initialize(): Promise<void> {
    // Create mock Redis to avoid real Redis connections in integration tests
    this.mockRedis = createMockRedis();

    // Create a mock DataSource for testing
    const mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ health: 1 }]),
      driver: {
        master: {
          pool: {
            totalCount: 10,
            idleCount: 5,
            waitingCount: 0,
          },
        },
      },
    } as unknown as DataSource;

    // Create a global test module that provides DataSource
    @Global()
    @Module({
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
      exports: [DataSource],
    })
    class MockDataSourceModule {}

    // Build test module with required modules but using MockRedis and MockDataSource
    // Integration tests use mocked dependencies, not real database connections
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MockDataSourceModule,  // Provide DataSource globally
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        RedisModule.forTest(this.mockRedis),  // Use forTest() to avoid real connection
        HealthModule,  // Required for /health endpoint
      ],
    })
    .compile();

    this._app = moduleFixture.createNestApplication();
    await this._app.init();

    this.agent = request(this._app.getHttpServer());
  }

  async close(): Promise<void> {
    if (this.mockRedis && typeof this.mockRedis.disconnect === 'function') {
      await this.mockRedis.disconnect();
    }
    if (this._app) {
      await this._app.close();
    }
  }

  get request(): SuperTest<SuperTestType> {
    return this.agent;
  }

  get app(): INestApplication {
    return this._app;
  }

  // Convenience methods for common HTTP operations
  async get(url: string, token?: string): Promise<any> {
    const req = this.agent.get(url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  async post(url: string, data?: any, token?: string): Promise<any> {
    const req = this.agent.post(url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    if (data) {
      req.send(data);
    }
    return req;
  }

  async put(url: string, data?: any, token?: string): Promise<any> {
    const req = this.agent.put(url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    if (data) {
      req.send(data);
    }
    return req;
  }

  async delete(url: string, token?: string): Promise<any> {
    const req = this.agent.delete(url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Helper for authenticated requests
  async createTestUser(): Promise<{ user: any; token: string }> {
    // This will be implemented when auth module is ready
    return {
      user: { id: 'test-user-id', email: 'test@example.com' },
      token: 'test-jwt-token'
    };
  }
}

// Global test client instance
let testClient: TestClient;

export async function getTestClient(): Promise<TestClient> {
  if (!testClient) {
    testClient = new TestClient();
    await testClient.initialize();
  }
  return testClient;
}

export async function closeTestClient(): Promise<void> {
  if (testClient) {
    await testClient.close();
    testClient = null;
  }
}