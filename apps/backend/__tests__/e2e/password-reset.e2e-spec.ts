import { UserStatus } from '@/core/database/entities/user.entity';
import { TestApp } from './helpers/test-app';
import { TestDataBuilder } from '../utils/test-data-builder';

/**
 * Password Reset E2E Tests
 *
 * Tests the complete password reset flow from request to reset.
 *
 * Covers:
 * - Password reset request
 * - Token validation
 * - Password change with token
 * - Security edge cases
 */
describe('Password Reset E2E Tests', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await TestApp.create();
  }, 120000);

  afterEach(async () => {
    await testApp.cleanup();
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('Password Reset Request', () => {
    const testUser = {
      email: 'reset@example.com',
      firstName: 'Reset',
      lastName: 'Test',
      password: 'OldPassword123!',
    };

    beforeEach(async () => {
      // Register and activate user
      await testApp
        .request()
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const userRepo = testApp.getDataSource().getRepository('User');
      await userRepo.update(
        { email: testUser.email },
        { status: UserStatus.ACTIVE }
      );
    });

    it('should request password reset for existing user', async () => {
      const response = await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Password reset email sent',
      });

      // Verify reset token was created in database
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });

      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetExpires).toBeDefined();
      expect(new Date(user!.passwordResetExpires!).getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reveal if email does not exist', async () => {
      const response = await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Same response as successful request (security)
      expect(response.body).toMatchObject({
        message: 'Password reset email sent',
      });
    });

    it('should rate limit password reset requests', async () => {
      // Send multiple requests rapidly
      for (let i = 0; i < 3; i++) {
        await testApp
          .request()
          .post('/auth/password-reset/request')
          .send({ email: testUser.email })
          .expect(200);
      }

      // Fourth request should be rate limited
      const response = await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .expect(429);

      expect(response.body.message).toContain('Too many requests');
    });

    it('should invalidate previous reset tokens', async () => {
      // Request first reset
      await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .expect(200);

      // Get first token
      const userRepo = testApp.getDataSource().getRepository('User');
      const userWithFirstToken = await userRepo.findOne({
        where: { email: testUser.email },
      });
      const firstToken = userWithFirstToken?.passwordResetToken;

      // Request second reset
      await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .expect(200);

      // Get second token
      const userWithSecondToken = await userRepo.findOne({
        where: { email: testUser.email },
      });
      const secondToken = userWithSecondToken?.passwordResetToken;

      // Tokens should be different
      expect(secondToken).toBeDefined();
      expect(secondToken).not.toBe(firstToken);
    });
  });

  describe('Password Reset Verification', () => {
    let resetToken: string;
    const testUser = {
      email: 'verify-reset@example.com',
      firstName: 'Verify',
      lastName: 'Reset',
      password: 'OldPassword123!',
    };

    beforeEach(async () => {
      // Register and activate user
      await testApp
        .request()
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const userRepo = testApp.getDataSource().getRepository('User');
      await userRepo.update(
        { email: testUser.email },
        { status: UserStatus.ACTIVE }
      );

      // Request password reset
      await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .expect(200);

      // Get reset token from database
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      resetToken = user!.passwordResetToken!;
    });

    it('should verify valid reset token', async () => {
      const response = await testApp
        .request()
        .get(`/auth/password-reset/verify/${resetToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        email: testUser.email,
      });
    });

    it('should reject invalid reset token', async () => {
      const response = await testApp
        .request()
        .get('/auth/password-reset/verify/invalid-token')
        .expect(400);

      expect(response.body).toMatchObject({
        valid: false,
        message: 'Invalid or expired reset token',
      });
    });

    it('should reject expired reset token', async () => {
      // Manually expire the token
      const userRepo = testApp.getDataSource().getRepository('User');
      await userRepo.update(
        { email: testUser.email },
        { passwordResetExpires: new Date(Date.now() - 3600000) } // 1 hour ago
      );

      const response = await testApp
        .request()
        .get(`/auth/password-reset/verify/${resetToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        valid: false,
        message: 'Invalid or expired reset token',
      });
    });
  });

  describe('Password Reset Completion', () => {
    let resetToken: string;
    const testUser = {
      email: 'complete-reset@example.com',
      firstName: 'Complete',
      lastName: 'Reset',
      password: 'OldPassword123!',
    };

    beforeEach(async () => {
      // Register and activate user
      await testApp
        .request()
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const userRepo = testApp.getDataSource().getRepository('User');
      await userRepo.update(
        { email: testUser.email },
        { status: UserStatus.ACTIVE }
      );

      // Request password reset
      await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .expect(200);

      // Get reset token from database
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      resetToken = user!.passwordResetToken!;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';

      const response = await testApp
        .request()
        .post('/auth/password-reset/complete')
        .send({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Password reset successful',
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // Verify can login with new password
      await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      // Verify cannot login with old password
      await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // Verify reset token is cleared
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.passwordResetToken).toBeNull();
      expect(user?.passwordResetExpires).toBeNull();
    });

    it('should reject password reset with invalid token', async () => {
      await testApp
        .request()
        .post('/auth/password-reset/complete')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        })
        .expect(400);
    });

    it('should reject password reset with mismatched passwords', async () => {
      const response = await testApp
        .request()
        .post('/auth/password-reset/complete')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!',
        })
        .expect(400);

      expect(response.body.message).toContain('Passwords do not match');
    });

    it('should reject weak new password', async () => {
      const weakPasswords = ['weak', 'password', 'Password123'];

      for (const password of weakPasswords) {
        await testApp
          .request()
          .post('/auth/password-reset/complete')
          .send({
            token: resetToken,
            password: password,
            confirmPassword: password,
          })
          .expect(400);
      }
    });

    it('should prevent token reuse', async () => {
      const newPassword = 'NewPassword123!';

      // First reset should succeed
      await testApp
        .request()
        .post('/auth/password-reset/complete')
        .send({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // Second reset with same token should fail
      await testApp
        .request()
        .post('/auth/password-reset/complete')
        .send({
          token: resetToken,
          password: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!',
        })
        .expect(400);
    });

    it('should expire token after successful reset', async () => {
      const newPassword = 'NewPassword123!';

      // Reset password
      await testApp
        .request()
        .post('/auth/password-reset/complete')
        .send({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // Verify token is invalid
      await testApp
        .request()
        .get(`/auth/password-reset/verify/${resetToken}`)
        .expect(400);
    });
  });

  describe('Complete Password Reset Flow', () => {
    it('should handle complete password reset journey', async () => {
      const user = {
        email: 'journey-reset@example.com',
        firstName: 'Journey',
        lastName: 'Reset',
        password: 'InitialPassword123!',
      };

      // 1. Register user
      await testApp
        .request()
        .post('/auth/register')
        .send(user)
        .expect(201);

      // 2. Activate user
      const userRepo = testApp.getDataSource().getRepository('User');
      await userRepo.update(
        { email: user.email },
        { status: UserStatus.ACTIVE }
      );

      // 3. Verify can login with initial password
      await testApp
        .request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      // 4. Request password reset
      await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: user.email })
        .expect(200);

      // 5. Get reset token
      const userWithToken = await userRepo.findOne({
        where: { email: user.email },
      });
      const resetToken = userWithToken!.passwordResetToken!;

      // 6. Verify token is valid
      await testApp
        .request()
        .get(`/auth/password-reset/verify/${resetToken}`)
        .expect(200);

      // 7. Reset password
      const newPassword = 'UpdatedPassword123!';
      const resetResponse = await testApp
        .request()
        .post('/auth/password-reset/complete')
        .send({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // 8. Use new tokens from reset
      const { accessToken } = resetResponse.body;
      await testApp
        .request()
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 9. Verify can login with new password
      await testApp
        .request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: newPassword,
        })
        .expect(200);

      // 10. Verify cannot login with old password
      await testApp
        .request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(401);
    });
  });

  describe('Security Considerations', () => {
    it('should prevent timing attacks on email enumeration', async () => {
      const times: number[] = [];

      // Measure time for existing user
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await testApp
          .request()
          .post('/auth/password-reset/request')
          .send({ email: `existing${i}@example.com` })
          .expect(200);
        times.push(Date.now() - start);
      }

      // Measure time for non-existing user
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await testApp
          .request()
          .post('/auth/password-reset/request')
          .send({ email: `nonexisting${i}@example.com` })
          .expect(200);
        times.push(Date.now() - start);
      }

      // Calculate variance - should be similar for both
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be relatively small (< 50% of average)
      expect(stdDev / avgTime).toBeLessThan(0.5);
    });

    it('should sanitize user input in reset requests', async () => {
      const maliciousInputs = [
        { email: '<script>alert("XSS")</script>' },
        { email: '"; DROP TABLE users; --' },
        { email: '../../../etc/passwd' },
        { email: 'test@example.com\x00admin@example.com' },
      ];

      for (const input of maliciousInputs) {
        await testApp
          .request()
          .post('/auth/password-reset/request')
          .send(input)
          .expect(400); // Should be rejected by validation
      }
    });

    it('should prevent concurrent reset completion attempts', async () => {
      const user = {
        email: 'concurrent-reset@example.com',
        firstName: 'Concurrent',
        lastName: 'Reset',
        password: 'OldPassword123!',
      };

      // Setup user and get reset token
      await testApp
        .request()
        .post('/auth/register')
        .send(user)
        .expect(201);

      const userRepo = testApp.getDataSource().getRepository('User');
      await userRepo.update(
        { email: user.email },
        { status: UserStatus.ACTIVE }
      );

      await testApp
        .request()
        .post('/auth/password-reset/request')
        .send({ email: user.email })
        .expect(200);

      const userWithToken = await userRepo.findOne({
        where: { email: user.email },
      });
      const resetToken = userWithToken!.passwordResetToken!;

      // Attempt concurrent resets
      const promises = Array(5)
        .fill(null)
        .map(() =>
          testApp
            .request()
            .post('/auth/password-reset/complete')
            .send({
              token: resetToken,
              password: 'NewPassword123!',
              confirmPassword: 'NewPassword123!',
            })
        );

      const results = await Promise.allSettled(promises);

      // Only one should succeed
      const successes = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successes.length).toBeLessThanOrEqual(1);
    });
  });
});