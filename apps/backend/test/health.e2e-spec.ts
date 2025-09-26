/**
 * Health Controller E2E Tests
 * Demonstrates comprehensive E2E testing patterns
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it('should include database status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        services: {
          database: expect.objectContaining({
            status: expect.stringMatching(/^(ok|error)$/),
          }),
          redis: expect.objectContaining({
            status: expect.stringMatching(/^(ok|error)$/),
          }),
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle 404 routes gracefully', async () => {
      await request(app.getHttpServer())
        .get('/nonexistent-route')
        .expect(404);
    });
  });
});