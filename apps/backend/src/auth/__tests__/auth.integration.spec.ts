import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { AuthModule } from '../auth.module';
import {
  User,
  UserStatus,
  UserRole,
} from '../../core/database/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashedPassword123',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    lastLoginAt: null,
    emailVerifiedAt: null,
    accounts: [],
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    get isEmailVerified() {
      return this.emailVerifiedAt !== null;
    },
    get isActive() {
      return this.status === UserStatus.ACTIVE;
    },
  } as User;

  beforeEach(async () => {
    // Set environment variables
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue({
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true })
    );

    userRepository = moduleFixture.get(getRepositoryToken(User));
    jwtService = moduleFixture.get(JwtService);

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('POST /auth/register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null); // User doesn't exist
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user.email).toBe(mockUser.email);
      expect(response.body.user.fullName).toBe('John Doe');
    });

    it('should return 409 when user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser); // User exists

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(409);

      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidDto = {
        ...validRegisterDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'weak',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordDto)
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteDto = {
        email: 'test@example.com',
        // missing firstName, lastName, password
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(incompleteDto)
        .expect(400);
    });

    it('should return 400 for names that are too short', async () => {
      const shortNameDto = {
        ...validRegisterDto,
        firstName: 'A',
        lastName: 'B',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(shortNameDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const validLoginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({} as UpdateResult);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for incorrect password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for inactive user', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      } as User;

      userRepository.findOne.mockResolvedValue(inactiveUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(401);

      expect(response.body.message).toBe('Account is not active');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidDto = {
        ...validLoginDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for empty password', async () => {
      const emptyPasswordDto = {
        ...validLoginDto,
        password: '',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(emptyPasswordDto)
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const validPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      userRepository.findOne.mockResolvedValue(mockUser);

      // Mock JWT service to return valid payload
      jest.spyOn(jwtService, 'verify').mockReturnValue(validPayload);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 401 for invalid refresh token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 401 when user not found', async () => {
      const validPayload = {
        sub: 'non-existent-id',
        email: 'test@example.com',
        role: 'user',
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(validPayload);
      userRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 400 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const accessToken = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
      );

      // Mock the validateUser method that gets called by JWT strategy
      userRepository.findOne.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockUser.id);
      expect(response.body).toHaveProperty('email', mockUser.email);
      expect(response.body).toHaveProperty('fullName', 'John Doe');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '-1h' } // expired
      );

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const accessToken = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
      );

      userRepository.findOne.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('authentication flow integration', () => {
    it('should complete full registration -> login -> profile -> logout flow', async () => {
      // 1. Register
      userRepository.findOne.mockResolvedValue(null); // User doesn't exist
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'flow@example.com',
          firstName: 'Flow',
          lastName: 'Test',
          password: 'Password123!',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('accessToken');

      // 2. Use token to access profile
      userRepository.findOne.mockResolvedValue(mockUser);

      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(mockUser.email);

      // 3. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .expect(204);
    });

    it('should handle token refresh flow', async () => {
      // 1. Login to get tokens
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({} as UpdateResult);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      // 2. Refresh token
      const validPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(validPayload);
      userRepository.findOne.mockResolvedValue(mockUser);

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body.accessToken).not.toBe(
        loginResponse.body.accessToken
      );

      // 3. Use new token to access profile
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(mockUser.email);
    });
  });
});
