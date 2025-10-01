import { UserRole, UserStatus } from '@/core/database/entities/user.entity';
import { TestApp } from './helpers/test-app';
import { TestDataBuilder } from '../utils/test-data-builder';

/**
 * Auth E2E Tests
 *
 * Full application E2E tests using PostgreSQL test container.
 * Tests the complete authentication flow from HTTP request to database.
 *
 * Improvements from previous version:
 * - Uses PostgreSQL instead of SQLite (production parity)
 * - Shared container infrastructure (12x faster)
 * - TestApp helper (cleaner test code)
 * - TestDataBuilder (consistent test data)
 */
describe('Auth E2E Tests', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await TestApp.create();
  });

  afterEach(async () => {
    await testApp.cleanup();
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('User Registration Flow', () => {
    const validUser = {
      email: 'e2e@example.com',
      firstName: 'E2E',
      lastName: 'Test',
      password: 'Password123!',
    };

    it('should register a new user and return tokens', async () => {
      const response = await testApp
        .request()
        .post('/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          email: validUser.email,
          firstName: validUser.firstName,
          lastName: validUser.lastName,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          currency: 'USD',
          fullName: 'E2E Test',
          isActive: true,
        },
      });

      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify user was created in database
      const userRepo = testApp.getDataSource().getRepository('User');
      const savedUser = await userRepo.findOne({
        where: { email: validUser.email },
      });

      expect(savedUser).toBeDefined();
      expect(savedUser?.email).toBe(validUser.email);
      expect(savedUser?.passwordHash).toBeDefined();
      expect(savedUser?.passwordHash).not.toBe(validUser.password); // Should be hashed
    });

    it('should prevent duplicate registration', async () => {
      // First registration
      await testApp
        .request()
        .post('/auth/register')
        .send(validUser)
        .expect(201);

      // Second registration with same email
      const response = await testApp
        .request()
        .post('/auth/register')
        .send(validUser)
        .expect(409);

      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'PASSWORD',
        'Password',
        'Pass123',
        'Password123',
      ];

      for (const password of weakPasswords) {
        await testApp
          .request()
          .post('/auth/register')
          .send({
            ...validUser,
            email: `test-${password}@example.com`,
            password,
          })
          .expect(400);
      }
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid.com',
        'inv@lid@email.com',
      ];

      for (const email of invalidEmails) {
        await testApp.request()
          .post('/auth/register')
          .send({
            ...validUser,
            email,
          })
          .expect(400);
      }
    });

    it('should validate name length', async () => {
      const invalidNames = [
        { firstName: 'A', lastName: 'Valid' },
        { firstName: 'Valid', lastName: 'B' },
        { firstName: '', lastName: 'Valid' },
        { firstName: 'Valid', lastName: '' },
      ];

      for (const nameData of invalidNames) {
        await testApp.request()
          .post('/auth/register')
          .send({
            ...validUser,
            ...nameData,
            email: `test-${Math.random()}@example.com`,
          })
          .expect(400);
      }
    });
  });

  describe('User Login Flow', () => {
    const testUser = {
      email: 'login@example.com',
      firstName: 'Login',
      lastName: 'Test',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // Register a user for login tests
      await testApp
        .request()
        .post('/auth/register')
        .send(testUser)
        .expect(201);
    });

    it('should login with valid credentials', async () => {
      const response = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        },
      });

      // Verify lastLoginAt was updated
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.lastLoginAt).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const response = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const response = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject login for inactive user', async () => {
      // Manually set user status to inactive
      const userRepo = testApp.getDataSource().getRepository('User');
      await userRepo.update(
        { email: testUser.email },
        { status: UserStatus.INACTIVE }
      );

      const response = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.message).toBe('Account is not active');
    });
  });

  describe('Token Refresh Flow', () => {
    let refreshToken: string;
    const testUser = {
      email: 'refresh@example.com',
      firstName: 'Refresh',
      lastName: 'Test',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // Register and login to get refresh token
      await testApp.request()
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await testApp.request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await testApp.request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          email: testUser.email,
        },
      });

      // New tokens should be different from the original
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await testApp.request()
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should reject refresh token for inactive user', async () => {
      // Deactivate user
      await testApp.getDataSource().getRepository('User').update(
        { email: testUser.email },
        { status: UserStatus.INACTIVE }
      );

      const response = await testApp.request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('Protected Route Access', () => {
    let accessToken: string;
    const testUser = {
      email: 'protected@example.com',
      firstName: 'Protected',
      lastName: 'Test',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // Register and login to get access token
      await testApp.request()
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await testApp.request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken;
    });

    it('should access profile with valid token', async () => {
      const response = await testApp.request()
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        fullName: 'Protected Test',
      });

      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject access without token', async () => {
      await testApp.request().get('/auth/profile').expect(401);
    });

    it('should reject access with invalid token', async () => {
      await testApp.request()
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject access with malformed authorization header', async () => {
      const malformedHeaders = [
        'invalid-token',
        'Bearer',
        'Basic ' + Buffer.from('user:pass').toString('base64'),
        'Bearer ' + accessToken + '.extra',
      ];

      for (const header of malformedHeaders) {
        await testApp.request()
          .get('/auth/profile')
          .set('Authorization', header)
          .expect(401);
      }
    });

    it('should logout successfully', async () => {
      await testApp.request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });

  describe('Complete Authentication Workflow', () => {
    it('should handle complete user journey', async () => {
      const user = {
        email: 'journey@example.com',
        firstName: 'Journey',
        lastName: 'Test',
        password: 'Password123!',
      };

      // 1. Register
      const registerResponse = await testApp.request()
        .post('/auth/register')
        .send(user)
        .expect(201);

      const { accessToken: registerAccessToken, refreshToken } =
        registerResponse.body;

      // 2. Access profile with registration token
      await testApp.request()
        .get('/auth/profile')
        .set('Authorization', `Bearer ${registerAccessToken}`)
        .expect(200);

      // 3. Login again
      const loginResponse = await testApp.request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      const { accessToken: loginAccessToken } = loginResponse.body;

      // 4. Access profile with login token
      await testApp.request()
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginAccessToken}`)
        .expect(200);

      // 5. Refresh token
      const refreshResponse = await testApp.request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const { accessToken: refreshedAccessToken } = refreshResponse.body;

      // 6. Access profile with refreshed token
      await testApp.request()
        .get('/auth/profile')
        .set('Authorization', `Bearer ${refreshedAccessToken}`)
        .expect(200);

      // 7. Logout
      await testApp.request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshedAccessToken}`)
        .expect(204);

      // 8. Verify token is still technically valid (logout is client-side only)
      await testApp.request()
        .get('/auth/profile')
        .set('Authorization', `Bearer ${refreshedAccessToken}`)
        .expect(200);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle concurrent registrations with same email', async () => {
      const user = {
        email: 'concurrent@example.com',
        firstName: 'Concurrent',
        lastName: 'Test',
        password: 'Password123!',
      };

      // Simulate concurrent registration attempts
      const promises = Array(5)
        .fill(null)
        .map(() =>
          testApp.request().post('/auth/register').send(user)
        );

      const responses = await Promise.allSettled(promises);

      // Only one should succeed (201), others should fail (409)
      const successes = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 201
      );
      const conflicts = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 409
      );

      expect(successes).toHaveLength(1);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should handle malicious payloads', async () => {
      const maliciousPayloads = [
        {
          email: 'test@example.com',
          password: 'Password123!',
          extraField: 'malicious',
        } as any,
        {
          email: 'test@example.com',
          password: 'Password123!',
          __proto__: { isAdmin: true },
        } as any,
        {
          email: 'test@example.com',
          password: 'Password123!',
          constructor: { name: 'hack' },
        },
      ];

      for (const payload of maliciousPayloads) {
        await testApp.request()
          .post('/auth/register')
          .send(payload)
          .expect(400); // Should be rejected by validation pipe
      }
    });
  });
});
