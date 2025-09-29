import { describe, it, expect } from 'vitest';
import { server } from '../../__mocks__/api/server';
import { http, HttpResponse } from 'msw';

describe('Authentication API', () => {
  it('should login with valid credentials', async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(data.token).toBe('mock-jwt-token');
  });

  it('should reject invalid credentials', async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
  });

  it('should register a new user', async () => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'newpassword',
        name: 'New User',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toEqual({
      id: 2,
      email: 'newuser@example.com',
      name: 'New User',
    });
    expect(data.token).toBe('mock-jwt-token-new-user');
  });

  it('should handle server errors', async () => {
    // Override the default handler for this test
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});
