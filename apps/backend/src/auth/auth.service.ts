import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../core/database/entities/user.entity';
import { AuditLog, AuditEventType } from '../core/database/entities/audit-log.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PasswordSecurityService, HashingAlgorithm } from './services/password-security.service';
import { RateLimitService } from './services/rate-limit.service';
import { AuthConfig } from '../core/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
    private passwordSecurityService: PasswordSecurityService,
    private rateLimitService: RateLimitService,
    private configService: ConfigService,
  ) {}

  async register(
    registerDto: RegisterDto,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

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

    // Create user
    const user = this.userRepository.create({
      email,
      firstName,
      lastName,
      passwordHash,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    // Log account creation
    await this.logAuthEvent(
      savedUser.id,
      AuditEventType.ACCOUNT_CREATED,
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
        AuditEventType.LOGIN_LOCKED,
        `Login rate limit exceeded for email: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { rateLimited: true, email }
      );

      throw new UnauthorizedException(message);
    }

    // Find user with password
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'passwordHash', 'role', 'status', 'updatedAt'],
    });

    if (!user) {
      // Record failed attempt
      await this.rateLimitService.recordAttempt(identifier, 'login', false);

      await this.logAuthEvent(
        null,
        AuditEventType.LOGIN_FAILED,
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
        AuditEventType.LOGIN_FAILED,
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
        AuditEventType.LOGIN_FAILED,
        'Login attempt with expired password',
        metadata?.ipAddress,
        metadata?.userAgent,
        { reason: 'password_expired' }
      );

      throw new UnauthorizedException('Password has expired. Please reset your password.');
    }

    // Verify password
    const isPasswordValid = await this.passwordSecurityService.verifyPassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      // Record failed attempt
      await this.rateLimitService.recordAttempt(identifier, 'login', false);

      await this.logAuthEvent(
        user.id,
        AuditEventType.LOGIN_FAILED,
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
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Log successful login
    await this.logAuthEvent(
      user.id,
      AuditEventType.LOGIN_SUCCESS,
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
      const authConfig = this.configService.get<AuthConfig>('auth');
      const payload = this.jwtService.verify(refreshToken, {
        secret: authConfig.JWT_REFRESH_SECRET,
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

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

    const authConfig = this.configService.get<AuthConfig>('auth');

    const accessToken = this.jwtService.sign(payload, {
      secret: authConfig.JWT_ACCESS_SECRET,
      expiresIn: authConfig.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: authConfig.JWT_REFRESH_SECRET,
      expiresIn: authConfig.JWT_REFRESH_EXPIRES_IN,
    });

    // Create user object without password and include virtual properties
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      timezone: user.timezone,
      currency: user.currency,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      accounts: user.accounts,
      // Virtual properties
      fullName: user.fullName,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
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
    const auditLog = this.auditLogRepository.create({
      userId,
      eventType,
      description,
      ipAddress,
      userAgent,
      metadata,
      isSecurityEvent: true,
    });

    await this.auditLogRepository.save(auditLog);
  }
}