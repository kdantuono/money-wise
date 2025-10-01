// API Test Client
// TASK-003-004: Create API Test Client

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import request from 'supertest';
import { SuperTest, Test as SuperTestType } from 'supertest';
import { createTestModule } from './setup';

export class TestClient {
  private _app: INestApplication;
  private agent: SuperTest<SuperTestType>;

  async initialize(): Promise<void> {
    const moduleFixture: TestingModule = await createTestModule({
      imports: [AppModule]
    });

    this._app = moduleFixture.createNestApplication();
    await this._app.init();

    this.agent = request(this._app.getHttpServer());
  }

  async close(): Promise<void> {
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