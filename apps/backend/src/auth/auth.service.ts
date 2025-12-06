import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import type { User, AuditEventType } from '../../generated/prisma';
import { UserStatus } from '../../generated/prisma';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PasswordSecurityService, HashingAlgorithm } from './services/password-security.service';
import { RateLimitService } from './services/rate-limit.service';
import { AuthConfig } from '../core/config/auth.config';
import { PrismaUserService } from '../core/database/prisma/services/user.service';
import { PrismaAuditLogService } from '../core/database/prisma/services/audit-log.service';
import { enrichUserWithVirtuals } from '../core/database/prisma/utils/user-virtuals';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

// Type for JWT expiresIn compatible with @nestjs/jwt v11+ (uses ms package StringValue)
type JwtExpiresIn = JwtSignOptions['expiresIn'];

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtAccessExpiresIn: JwtExpiresIn;
  private readonly jwtRefreshSecret: string;
  private readonly jwtRefreshExpiresIn: JwtExpiresIn;

  constructor(
    private readonly prismaUserService: PrismaUserService,
    private readonly prismaAuditLogService: PrismaAuditLogService,
    private readonly jwtService: JwtService,
    private readonly passwordSecurityService: PasswordSecurityService,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService,
  ) {
    // Cache JWT configuration for performance and fail fast if missing
    const authConfig = this.configService.get<AuthConfig>('auth');

    if (!authConfig?.JWT_ACCESS_SECRET || !authConfig?.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    this.jwtAccessSecret = authConfig.JWT_ACCESS_SECRET;
    this.jwtAccessExpiresIn = (authConfig.JWT_ACCESS_EXPIRES_IN || '15m') as JwtExpiresIn;
    this.jwtRefreshSecret = authConfig.JWT_REFRESH_SECRET;
    this.jwtRefreshExpiresIn = (authConfig.JWT_REFRESH_EXPIRES_IN || '7d') as JwtExpiresIn;
  }

  async register(
    registerDto: RegisterDto,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prismaUserService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    const validation = await this.passwordSecurityService.validatePassword(password, {
      firstName,
      lastName,
      email,
    });

    if (!validation.isValid) {
      throw new BadRequestException(validation.violations.join('; '));
    }

    // Hash password with Argon2
    const passwordHash = await this.passwordSecurityService.hashPassword(
      password,
      HashingAlgorithm.ARGON2
    );

    // Create user with pre-hashed password
    // Note: familyId is optional for auth flows (will be set to null, updated later)
    const savedUser = await this.prismaUserService.createWithHash({
      email,
      passwordHash,
      firstName,
      lastName,
      status: UserStatus.ACTIVE,
    });

    // Log account creation
    await this.logAuthEvent(
      savedUser.id,
      'ACCOUNT_CREATED',
      'User account created successfully',
      metadata?.ipAddress,
      metadata?.userAgent,
      { passwordStrength: validation.strengthResult.score }
    );

    // Generate tokens
    return this.generateAuthResponse(savedUser);
  }

  async login(
    loginDto: LoginDto,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Check rate limit for login attempts
    const identifier = metadata?.ipAddress || email;
    const rateLimitResult = await this.rateLimitService.checkRateLimit(identifier, 'login');

    if (!rateLimitResult.allowed) {
      await this.rateLimitService.recordAttempt(identifier, 'login', false);

      const message = rateLimitResult.isLocked
        ? `Account temporarily locked due to too many failed attempts. Try again after ${rateLimitResult.lockoutExpiry?.toISOString()}`
        : `Too many login attempts. Try again in ${Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 60000)} minutes`;

      // Log the rate limit event
      await this.logAuthEvent(
        null,
        'LOGIN_LOCKED',
        `Login rate limit exceeded for email: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { rateLimited: true, email }
      );

      throw new UnauthorizedException(message);
    }

    // Find user by email
    const user = await this.prismaUserService.findByEmail(email);

    if (!user) {
      // Record failed attempt
      await this.rateLimitService.recordAttempt(identifier, 'login', false);

      await this.logAuthEvent(
        null,
        'LOGIN_FAILED',
        `Login attempt with non-existent email: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { reason: 'user_not_found', email }
      );

      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      await this.rateLimitService.recordAttempt(identifier, 'login', false);

      await this.logAuthEvent(
        user.id,
        'LOGIN_FAILED',
        `Login attempt for inactive user: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { reason: 'user_inactive', userStatus: user.status }
      );

      throw new UnauthorizedException('Account is not active');
    }

    // Check if password is expired
    const isPasswordExpired = await this.passwordSecurityService.isPasswordExpired(user.id);
    if (isPasswordExpired) {
      await this.logAuthEvent(
        user.id,
        'LOGIN_FAILED',
        'Login attempt with expired password',
        metadata?.ipAddress,
        metadata?.userAgent,
        { reason: 'password_expired' }
      );

      throw new UnauthorizedException('Password has expired. Please reset your password.');
    }

    // Verify password (using PrismaUserService which handles hash internally)
    const isPasswordValid = await this.passwordSecurityService.verifyPassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      // Record failed attempt
      await this.rateLimitService.recordAttempt(identifier, 'login', false);

      await this.logAuthEvent(
        user.id,
        'LOGIN_FAILED',
        'Login attempt with invalid password',
        metadata?.ipAddress,
        metadata?.userAgent,
        { reason: 'invalid_password' }
      );

      throw new UnauthorizedException('Invalid email or password');
    }

    // Clear rate limit on successful login
    await this.rateLimitService.recordAttempt(identifier, 'login', true);

    // Update last login
    await this.prismaUserService.updateLastLogin(user.id);

    // Log successful login
    await this.logAuthEvent(
      user.id,
      'LOGIN_SUCCESS',
      'User logged in successfully',
      metadata?.ipAddress,
      metadata?.userAgent,
      {}
    );

    // Generate tokens
    const authResponse = await this.generateAuthResponse(user);

    // Check if password expiry warning is needed
    const shouldWarn = await this.passwordSecurityService.shouldWarnPasswordExpiry(user.id);
    if (shouldWarn) {
      const daysUntilExpiration = await this.passwordSecurityService.getDaysUntilExpiration(user.id);
      // Add warning to response (could be done via custom property)
      (authResponse as AuthResponseDto & { passwordExpiryWarning?: { daysRemaining: number; message: string } }).passwordExpiryWarning = {
        daysRemaining: daysUntilExpiration,
        message: `Your password will expire in ${daysUntilExpiration} day(s). Please consider changing it.`,
      };
    }

    return authResponse;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      const user = await this.prismaUserService.findOne(payload.sub);

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateAuthResponse(user);
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.prismaUserService.findOne(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtAccessSecret,
      expiresIn: this.jwtAccessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpiresIn,
    });

    // Enrich user with virtual properties (fullName, isEmailVerified, isActive)
    const enrichedUser = enrichUserWithVirtuals(user);

    // Create user object without password and include virtual properties
    // Note: We exclude passwordHash and include computed virtual properties
    const { passwordHash: _, ...userWithoutPassword } = {
      ...enrichedUser,
      // Virtual properties are already part of enrichedUser from enrichUserWithVirtuals
    };

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private async logAuthEvent(
    userId: string | null,
    eventType: AuditEventType,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prismaAuditLogService.create({
      userId,
      eventType,
      description,
      ipAddress,
      userAgent,
      metadata,
      isSecurityEvent: true,
    });
  }
}