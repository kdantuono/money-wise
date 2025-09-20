import * as crypto from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';

import { UserSession } from '../entities/user-session.entity';
import { User } from '../user.entity';


export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  ipAddress: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

export interface SecurityCheck {
  isValid: boolean;
  suspiciousActivity: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  /**
   * Generate secure token pair with device tracking
   */
  async generateTokenPair(
    userId: string,
    deviceInfo: DeviceInfo
  ): Promise<TokenPair> {
    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Create session record
    const session = this.sessionRepository.create({
      userId,
      sessionToken,
      deviceFingerprint: deviceInfo.fingerprint,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      location: deviceInfo.location,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      lastActivityAt: new Date(),
      isActive: true,
    });

    await this.sessionRepository.save(session);

    // Generate JWT tokens
    const accessTokenPayload = {
      sub: userId,
      sessionId: session.id,
      type: 'access',
    };

    const refreshTokenPayload = {
      sub: userId,
      sessionId: session.id,
      sessionToken,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: '15m', // Short-lived access tokens
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: '7d', // Longer-lived refresh tokens
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    deviceInfo: DeviceInfo
  ): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session exists and is active
      const session = await this.sessionRepository.findOne({
        where: {
          id: payload.sessionId,
          sessionToken: payload.sessionToken,
          isActive: true,
        },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Perform security checks
      const securityCheck = await this.validateTokenSecurity(
        session,
        deviceInfo
      );
      if (!securityCheck.isValid) {
        // Revoke session for security reasons
        await this.revokeSession(session.id);
        throw new UnauthorizedException('Security validation failed');
      }

      // Update session activity
      session.lastActivityAt = new Date();
      await this.sessionRepository.save(session);

      // Generate new token pair (token rotation)
      return this.generateTokenPair(payload.sub, deviceInfo);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate token security and detect suspicious activity
   */
  async validateTokenSecurity(
    session: UserSession,
    currentDevice: DeviceInfo
  ): Promise<SecurityCheck> {
    const reasons: string[] = [];
    let suspiciousActivity = false;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check device fingerprint
    if (session.deviceFingerprint !== currentDevice.fingerprint) {
      reasons.push('Device fingerprint mismatch');
      suspiciousActivity = true;
      riskLevel = 'high';
    }

    // Check IP address for significant changes
    if (session.ipAddress !== currentDevice.ipAddress) {
      reasons.push('IP address change detected');
      if (riskLevel !== 'high') riskLevel = 'medium';
    }

    // Check user agent for significant changes
    if (session.userAgent && currentDevice.userAgent) {
      const agentSimilarity = this.calculateSimilarity(
        session.userAgent,
        currentDevice.userAgent
      );
      if (agentSimilarity < 0.8) {
        reasons.push('User agent change detected');
        if (riskLevel === 'low') riskLevel = 'medium';
      }
    }

    // Check for multiple active sessions from different locations
    const activeSessions = await this.sessionRepository.count({
      where: {
        userId: session.userId,
        isActive: true,
      },
    });

    if (activeSessions > 5) {
      reasons.push('Too many active sessions');
      suspiciousActivity = true;
      riskLevel = 'high';
    }

    return {
      isValid: !suspiciousActivity || riskLevel !== 'high',
      suspiciousActivity,
      riskLevel,
      reasons,
    };
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update({ id: sessionId }, { isActive: false });
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false }
    );
  }

  /**
   * Get active sessions for user
   */
  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      order: {
        lastActivityAt: 'DESC',
      },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionRepository.update(
      {
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      { isActive: false }
    );
  }

  /**
   * Calculate string similarity for user agent comparison
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
