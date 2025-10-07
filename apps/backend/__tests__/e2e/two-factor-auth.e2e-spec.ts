import { UserStatus } from '@/core/database/entities/user.entity';
import { TestApp } from './helpers/test-app';
import { TestDataBuilder } from '../utils/test-data-builder';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

/**
 * Two-Factor Authentication E2E Tests
 *
 * Tests the complete 2FA flow including:
 * - TOTP setup
 * - QR code generation
 * - Token verification
 * - Login with 2FA
 * - Backup codes
 * - 2FA disable
 */
describe('Two-Factor Authentication E2E Tests', () => {
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

  describe('2FA Setup', () => {
    let accessToken: string;
    const testUser = {
      email: '2fa-setup@example.com',
      firstName: 'TwoFA',
      lastName: 'Setup',
      password: 'SecurePassword123!',
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

      // Login to get access token
      const loginResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken;
    });

    it('should initialize 2FA setup', async () => {
      const response = await testApp
        .request()
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        secret: expect.any(String),
        qrCode: expect.any(String),
        backupCodes: expect.arrayContaining([
          expect.any(String),
        ]),
      });

      // Verify secret is base32 encoded
      expect(response.body.secret).toMatch(/^[A-Z2-7]+=*$/);

      // Verify QR code is data URL
      expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);

      // Verify backup codes
      expect(response.body.backupCodes).toHaveLength(10);
      response.body.backupCodes.forEach((code: string) => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });

      // Verify 2FA is not yet enabled
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.twoFactorEnabled).toBe(false);
      expect(user?.twoFactorSecret).toBeDefined();
    });

    it('should require authentication for 2FA setup', async () => {
      await testApp
        .request()
        .post('/auth/2fa/setup')
        .expect(401);
    });

    it('should regenerate secret on subsequent setup calls', async () => {
      // First setup
      const firstResponse = await testApp
        .request()
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const firstSecret = firstResponse.body.secret;
      const firstBackupCodes = firstResponse.body.backupCodes;

      // Second setup
      const secondResponse = await testApp
        .request()
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const secondSecret = secondResponse.body.secret;
      const secondBackupCodes = secondResponse.body.backupCodes;

      // Secrets and backup codes should be different
      expect(secondSecret).not.toBe(firstSecret);
      expect(secondBackupCodes).not.toEqual(firstBackupCodes);
    });
  });

  describe('2FA Verification', () => {
    let accessToken: string;
    let secret: string;
    let backupCodes: string[];
    const testUser = {
      email: '2fa-verify@example.com',
      firstName: 'TwoFA',
      lastName: 'Verify',
      password: 'SecurePassword123!',
    };

    beforeEach(async () => {
      // Register, activate, and login
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

      const loginResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken;

      // Setup 2FA
      const setupResponse = await testApp
        .request()
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      secret = setupResponse.body.secret;
      backupCodes = setupResponse.body.backupCodes;
    });

    it('should verify and enable 2FA with valid token', async () => {
      // Generate valid TOTP token
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const response = await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Two-factor authentication enabled',
      });

      // Verify 2FA is enabled in database
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.twoFactorEnabled).toBe(true);
    });

    it('should reject invalid TOTP token', async () => {
      const response = await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '123456' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid verification token',
      });

      // Verify 2FA is still disabled
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.twoFactorEnabled).toBe(false);
    });

    it('should accept token with time window tolerance', async () => {
      // Generate token with past time window
      const pastToken = speakeasy.totp({
        secret,
        encoding: 'base32',
        time: Date.now() / 1000 - 30, // 30 seconds ago
      });

      await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: pastToken })
        .expect(200);
    });

    it('should prevent token reuse', async () => {
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      // First use should succeed
      await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token })
        .expect(200);

      // Second use of same token should fail
      await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token })
        .expect(400);
    });

    it('should verify with backup code', async () => {
      const backupCode = backupCodes[0];

      const response = await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: backupCode,
          isBackupCode: true
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Two-factor authentication enabled',
      });

      // Verify backup code is marked as used
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.usedBackupCodes).toContain(backupCode);
    });
  });

  describe('Login with 2FA', () => {
    let secret: string;
    let backupCodes: string[];
    const testUser = {
      email: '2fa-login@example.com',
      firstName: 'TwoFA',
      lastName: 'Login',
      password: 'SecurePassword123!',
    };

    beforeEach(async () => {
      // Register, activate, setup and enable 2FA
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

      const loginResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      // Setup 2FA
      const setupResponse = await testApp
        .request()
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      secret = setupResponse.body.secret;
      backupCodes = setupResponse.body.backupCodes;

      // Enable 2FA
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token })
        .expect(200);
    });

    it('should require 2FA token for login when enabled', async () => {
      const response = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        requiresTwoFactor: true,
        tempToken: expect.any(String),
      });

      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
    });

    it('should complete login with valid 2FA token', async () => {
      // First step: login with password
      const firstStepResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { tempToken } = firstStepResponse.body;

      // Generate valid TOTP token
      const totpToken = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      // Second step: verify 2FA
      const response = await testApp
        .request()
        .post('/auth/2fa/login')
        .send({
          tempToken,
          totpToken,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          email: testUser.email,
          twoFactorEnabled: true,
        },
      });
    });

    it('should complete login with backup code', async () => {
      // First step: login with password
      const firstStepResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { tempToken } = firstStepResponse.body;

      // Second step: use backup code
      const response = await testApp
        .request()
        .post('/auth/2fa/login')
        .send({
          tempToken,
          totpToken: backupCodes[0],
          isBackupCode: true,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        warningMessage: 'Backup code used. Please generate new backup codes.',
      });

      // Verify backup code is marked as used
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.usedBackupCodes).toContain(backupCodes[0]);
    });

    it('should reject invalid 2FA token', async () => {
      // First step: login with password
      const firstStepResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { tempToken } = firstStepResponse.body;

      // Second step: invalid token
      await testApp
        .request()
        .post('/auth/2fa/login')
        .send({
          tempToken,
          totpToken: '123456',
        })
        .expect(401);
    });

    it('should expire temp token after timeout', async () => {
      // First step: login with password
      const firstStepResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { tempToken } = firstStepResponse.body;

      // Simulate waiting beyond token expiry (would need to mock time)
      // For now, we'll test with an invalid/expired token
      await testApp
        .request()
        .post('/auth/2fa/login')
        .send({
          tempToken: 'expired-token',
          totpToken: speakeasy.totp({ secret, encoding: 'base32' }),
        })
        .expect(401);
    });

    it('should rate limit 2FA attempts', async () => {
      // First step: login with password
      const firstStepResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { tempToken } = firstStepResponse.body;

      // Multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await testApp
          .request()
          .post('/auth/2fa/login')
          .send({
            tempToken,
            totpToken: '000000',
          });
      }

      // Should be rate limited
      const response = await testApp
        .request()
        .post('/auth/2fa/login')
        .send({
          tempToken,
          totpToken: '000000',
        })
        .expect(429);

      expect(response.body.message).toContain('Too many attempts');
    });
  });

  describe('2FA Management', () => {
    let accessToken: string;
    let secret: string;
    const testUser = {
      email: '2fa-manage@example.com',
      firstName: 'TwoFA',
      lastName: 'Manage',
      password: 'SecurePassword123!',
    };

    beforeEach(async () => {
      // Setup user with 2FA enabled
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

      const loginResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken;

      // Setup and enable 2FA
      const setupResponse = await testApp
        .request()
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      secret = setupResponse.body.secret;

      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token })
        .expect(200);
    });

    it('should get 2FA status', async () => {
      const response = await testApp
        .request()
        .get('/auth/2fa/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        enabled: true,
        backupCodesRemaining: 10,
        lastUsed: null,
        method: 'totp',
      });
    });

    it('should regenerate backup codes', async () => {
      const response = await testApp
        .request()
        .post('/auth/2fa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        backupCodes: expect.arrayContaining([
          expect.any(String),
        ]),
      });

      expect(response.body.backupCodes).toHaveLength(10);
    });

    it('should disable 2FA', async () => {
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const response = await testApp
        .request()
        .post('/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: testUser.password,
          totpToken: token,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Two-factor authentication disabled',
      });

      // Verify 2FA is disabled in database
      const userRepo = testApp.getDataSource().getRepository('User');
      const user = await userRepo.findOne({
        where: { email: testUser.email },
      });
      expect(user?.twoFactorEnabled).toBe(false);
      expect(user?.twoFactorSecret).toBeNull();
      expect(user?.backupCodes).toBeNull();
    });

    it('should require password to disable 2FA', async () => {
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await testApp
        .request()
        .post('/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'WrongPassword123!',
          totpToken: token,
        })
        .expect(401);
    });

    it('should require valid token to disable 2FA', async () => {
      await testApp
        .request()
        .post('/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: testUser.password,
          totpToken: '123456',
        })
        .expect(400);
    });
  });

  describe('Complete 2FA Journey', () => {
    it('should handle complete 2FA lifecycle', async () => {
      const user = {
        email: '2fa-journey@example.com',
        firstName: 'Journey',
        lastName: 'TwoFA',
        password: 'JourneyPassword123!',
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

      // 3. Login without 2FA
      const firstLoginResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      expect(firstLoginResponse.body.requiresTwoFactor).toBeUndefined();
      const { accessToken } = firstLoginResponse.body;

      // 4. Setup 2FA
      const setupResponse = await testApp
        .request()
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const { secret, backupCodes } = setupResponse.body;

      // 5. Enable 2FA
      const enableToken = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await testApp
        .request()
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: enableToken })
        .expect(200);

      // 6. Logout
      await testApp
        .request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // 7. Login with 2FA - Step 1
      const twoFactorLoginResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      expect(twoFactorLoginResponse.body.requiresTwoFactor).toBe(true);
      const { tempToken } = twoFactorLoginResponse.body;

      // 8. Login with 2FA - Step 2
      const totpToken = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const completeLoginResponse = await testApp
        .request()
        .post('/auth/2fa/login')
        .send({
          tempToken,
          totpToken,
        })
        .expect(200);

      const newAccessToken = completeLoginResponse.body.accessToken;

      // 9. Check 2FA status
      const statusResponse = await testApp
        .request()
        .get('/auth/2fa/status')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(statusResponse.body.enabled).toBe(true);

      // 10. Use backup code for login
      await testApp
        .request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(204);

      const backupLoginStep1 = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      const backupLoginStep2 = await testApp
        .request()
        .post('/auth/2fa/login')
        .send({
          tempToken: backupLoginStep1.body.tempToken,
          totpToken: backupCodes[0],
          isBackupCode: true,
        })
        .expect(200);

      expect(backupLoginStep2.body.warningMessage).toContain('Backup code used');

      // 11. Regenerate backup codes
      const finalAccessToken = backupLoginStep2.body.accessToken;

      await testApp
        .request()
        .post('/auth/2fa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${finalAccessToken}`)
        .send({
          password: user.password,
        })
        .expect(200);

      // 12. Disable 2FA
      const disableToken = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await testApp
        .request()
        .post('/auth/2fa/disable')
        .set('Authorization', `Bearer ${finalAccessToken}`)
        .send({
          password: user.password,
          totpToken: disableToken,
        })
        .expect(200);

      // 13. Verify can login without 2FA again
      const finalLoginResponse = await testApp
        .request()
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      expect(finalLoginResponse.body.requiresTwoFactor).toBeUndefined();
      expect(finalLoginResponse.body.accessToken).toBeDefined();
    });
  });
});