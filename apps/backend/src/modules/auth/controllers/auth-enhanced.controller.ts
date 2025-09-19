import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  Request,
  Get,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { SecurityGuard } from '../guards/security.guard';
import { AuthService } from '../auth.service';
import { MfaService } from '../services/mfa.service';
import { SessionService, DeviceInfo } from '../services/session.service';
import { SecurityService } from '../../security/security.service';
import {
  CreateUserDto,
  LoginDto,
  MfaSetupDto,
  MfaVerifyDto,
  RefreshTokenDto,
  EnhancedAuthResponseDto,
} from '../dto/auth-enhanced.dto';
import * as crypto from 'crypto';

@ApiTags('auth-enhanced')
@Controller('auth')
@UseGuards(SecurityGuard)
export class AuthEnhancedController {
  constructor(
    private authService: AuthService,
    private mfaService: MfaService,
    private sessionService: SessionService,
    private securityService: SecurityService,
  ) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Register a new user with enhanced security' })
  @ApiResponse({ status: 201, description: 'User successfully created', type: EnhancedAuthResponseDto })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Request() req
  ): Promise<EnhancedAuthResponseDto> {
    // Check rate limiting
    const clientIp = this.getClientIp(req);
    const rateLimitCheck = await this.securityService.checkRateLimit(
      clientIp,
      'auth',
      { requests: 3, window: 3600 }
    );

    if (!rateLimitCheck.allowed) {
      throw new BadRequestException('Too many registration attempts. Please try again later.');
    }

    // Create user
    const user = await this.authService.register(createUserDto);

    // Generate device info
    const deviceInfo: DeviceInfo = {
      fingerprint: this.generateDeviceFingerprint(req),
      userAgent: req.get('User-Agent') || '',
      ipAddress: clientIp,
      location: await this.getLocationFromIP(clientIp),
    };

    // Generate secure token pair
    const tokens = await this.sessionService.generateTokenPair(user.id, deviceInfo);

    // Log security event
    await this.securityService.logSecurityEvent('user_registered', 'low', {
      userId: user.id,
      email: user.email,
      ip: clientIp,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      mfaRequired: false,
      mfaEnabled: false,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Login user with enhanced security and MFA support' })
  @ApiResponse({ status: 200, description: 'User successfully logged in', type: EnhancedAuthResponseDto })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req
  ): Promise<EnhancedAuthResponseDto> {
    const clientIp = this.getClientIp(req);
    
    // Check rate limiting
    const rateLimitCheck = await this.securityService.checkRateLimit(
      `${clientIp}:${loginDto.email}`,
      'auth'
    );

    if (!rateLimitCheck.allowed) {
      throw new UnauthorizedException('Too many login attempts. Please try again later.');
    }

    // Validate user credentials
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      await this.securityService.logSecurityEvent('login_failed', 'medium', {
        email: loginDto.email,
        ip: clientIp,
        reason: 'invalid_credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if MFA is enabled
    const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);
    
    if (mfaEnabled && !loginDto.mfaCode) {
      // Return partial response requiring MFA
      return {
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        mfaRequired: true,
        mfaEnabled: true,
        temporaryToken: this.generateTemporaryToken(user.id),
      };
    }

    if (mfaEnabled && loginDto.mfaCode) {
      // Verify MFA code
      const mfaVerification = await this.mfaService.verifyTotpCode(user.id, loginDto.mfaCode);
      
      if (!mfaVerification.isValid) {
        await this.securityService.logSecurityEvent('mfa_failed', 'high', {
          userId: user.id,
          ip: clientIp,
          reason: mfaVerification.error,
        });
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Generate device info
    const deviceInfo: DeviceInfo = {
      fingerprint: this.generateDeviceFingerprint(req),
      userAgent: req.get('User-Agent') || '',
      ipAddress: clientIp,
      location: await this.getLocationFromIP(clientIp),
    };

    // Generate secure token pair
    const tokens = await this.sessionService.generateTokenPair(user.id, deviceInfo);

    // Log successful login
    await this.securityService.logSecurityEvent('login_success', 'low', {
      userId: user.id,
      email: user.email,
      ip: clientIp,
      mfaUsed: mfaEnabled,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      mfaRequired: false,
      mfaEnabled,
    };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup MFA for user account' })
  async setupMfa(@Request() req): Promise<{ secret: string; qrCodeUrl: string; manualEntryCode: string }> {
    const userId = req.user.id;
    const email = req.user.email;
    
    const mfaSecret = await this.mfaService.generateTotpSecret(userId, email);
    
    await this.securityService.logSecurityEvent('mfa_setup_initiated', 'low', {
      userId,
      email,
    });
    
    return mfaSecret;
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and enable MFA' })
  async verifyMfa(
    @Body() mfaVerifyDto: MfaVerifyDto,
    @Request() req
  ): Promise<{ success: boolean; backupCodes: string[] }> {
    const userId = req.user.id;
    
    const verification = await this.mfaService.verifyTotpCode(userId, mfaVerifyDto.code);
    
    if (!verification.isValid) {
      throw new BadRequestException(verification.error);
    }

    // Generate backup codes
    const backupCodes = await this.mfaService.generateBackupCodes(userId);
    
    await this.securityService.logSecurityEvent('mfa_enabled', 'low', {
      userId,
      email: req.user.email,
    });
    
    return {
      success: true,
      backupCodes,
    };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA for user account' })
  async disableMfa(@Request() req): Promise<{ success: boolean }> {
    const userId = req.user.id;
    
    await this.mfaService.disableMfa(userId);
    
    await this.securityService.logSecurityEvent('mfa_disabled', 'medium', {
      userId,
      email: req.user.email,
    });
    
    return { success: true };
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req
  ): Promise<Omit<EnhancedAuthResponseDto, 'user' | 'mfaRequired' | 'mfaEnabled'>> {
    const deviceInfo: DeviceInfo = {
      fingerprint: this.generateDeviceFingerprint(req),
      userAgent: req.get('User-Agent') || '',
      ipAddress: this.getClientIp(req),
    };

    const tokens = await this.sessionService.refreshAccessToken(
      refreshTokenDto.refreshToken,
      deviceInfo
    );

    return tokens;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and revoke session' })
  async logout(@Request() req): Promise<{ success: boolean }> {
    const sessionId = req.user.sessionId;
    
    if (sessionId) {
      await this.sessionService.revokeSession(sessionId);
    }
    
    await this.securityService.logSecurityEvent('logout', 'low', {
      userId: req.user.id,
    });
    
    return { success: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@Request() req): Promise<{ success: boolean }> {
    const userId = req.user.id;
    
    await this.sessionService.revokeAllUserSessions(userId);
    
    await this.securityService.logSecurityEvent('logout_all', 'medium', {
      userId,
    });
    
    return { success: true };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions for user' })
  async getActiveSessions(@Request() req) {
    const userId = req.user.id;
    const sessions = await this.sessionService.getUserActiveSessions(userId);
    
    return sessions.map(session => ({
      id: session.id,
      deviceFingerprint: session.deviceFingerprint,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      userAgent: session.userAgent?.substring(0, 100), // Truncate for display
    }));
  }

  /**
   * Generate device fingerprint based on request headers
   */
  private generateDeviceFingerprint(req: any): string {
    const components = [
      req.get('User-Agent') || '',
      req.get('Accept-Language') || '',
      req.get('Accept-Encoding') || '',
      this.getClientIp(req),
    ];
    
    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: any): string {
    return (
      req.get('X-Forwarded-For')?.split(',')[0] ||
      req.get('X-Real-IP') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      ''
    ).trim();
  }

  /**
   * Generate temporary token for MFA verification
   */
  private generateTemporaryToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'mfa_temp',
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Get location information from IP address
   */
  private async getLocationFromIP(ip: string): Promise<any> {
    // In production, use a geolocation service like MaxMind or IP2Location
    // For now, return null or mock data
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC',
    };
  }
}