// Basic Health Check Test
// First test to verify testing infrastructure

import { getTestClient, closeTestClient } from './client';

describe('Health Check', () => {
  afterAll(async () => {
    await closeTestClient();
  });

  it('should respond to health check', async () => {
    const client = await getTestClient();

    const response = await client.get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok'
      })
    );
  });

  it('should have database connection', async () => {
    const client = await getTestClient();

    // Verify database is working via health endpoint
    const response = await client.get('/health');

    // Health endpoint should return database status
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        database: expect.objectContaining({
          status: 'up'
        })
      })
    );
  });
});