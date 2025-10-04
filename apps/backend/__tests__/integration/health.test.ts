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

    // Health endpoint returns status:ok if database is connected
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok'  // Database must be working for health check to return 'ok'
      })
    );
  });
});