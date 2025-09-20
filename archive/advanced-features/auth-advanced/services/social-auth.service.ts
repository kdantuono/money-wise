import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { AuthService } from '../auth.service';
import { SessionService, DeviceInfo } from './session.service';
import { SecurityService } from '../../security/security.service';
import * as crypto from 'crypto';

export interface SocialAuthResult {
  user: User;
  isNewUser: boolean;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  };
  linkedAccounts: string[];
}

export interface GoogleTokenInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface AppleTokenInfo {
  sub: string;
  email: string;
  name?: {
    firstName: string;
    lastName: string;
  };
  email_verified: boolean;
}

export interface MicrosoftTokenInfo {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
}

@Injectable()
export class SocialAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private authService: AuthService,
    private sessionService: SessionService,
    private securityService: SecurityService
  ) {}

  /**
   * Authenticate with Google OAuth
   */
  async authenticateWithGoogle(
    authCode: string,
    deviceInfo: DeviceInfo
  ): Promise<SocialAuthResult> {
    try {
      // Exchange auth code for token
      const tokenInfo = await this.exchangeGoogleAuthCode(authCode);

      if (!tokenInfo.email_verified) {
        throw new BadRequestException('Email not verified with Google');
      }

      // Find or create user
      const result = await this.findOrCreateSocialUser({
        provider: 'google',
        providerId: tokenInfo.sub,
        email: tokenInfo.email,
        name: tokenInfo.name,
        picture: tokenInfo.picture,
      });

      // Generate tokens
      const tokens = await this.sessionService.generateTokenPair(
        result.user.id,
        deviceInfo
      );

      // Log social auth event
      await this.securityService.logSecurityEvent('social_auth_google', 'low', {
        userId: result.user.id,
        email: result.user.email,
        isNewUser: result.isNewUser,
        ip: deviceInfo.ipAddress,
      });

      return {
        user: result.user,
        isNewUser: result.isNewUser,
        tokens,
        linkedAccounts: ['google'],
      };
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'social_auth_failed',
        'medium',
        {
          provider: 'google',
          error: error.message,
          ip: deviceInfo.ipAddress,
        }
      );
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  /**
   * Authenticate with Apple Sign-In
   */
  async authenticateWithApple(
    identityToken: string,
    deviceInfo: DeviceInfo
  ): Promise<SocialAuthResult> {
    try {
      // Verify Apple identity token
      const tokenInfo = await this.verifyAppleIdentityToken(identityToken);

      if (!tokenInfo.email_verified) {
        throw new BadRequestException('Email not verified with Apple');
      }

      const displayName = tokenInfo.name
        ? `${tokenInfo.name.firstName} ${tokenInfo.name.lastName}`.trim()
        : tokenInfo.email.split('@')[0];

      // Find or create user
      const result = await this.findOrCreateSocialUser({
        provider: 'apple',
        providerId: tokenInfo.sub,
        email: tokenInfo.email,
        name: displayName,
      });

      // Generate tokens
      const tokens = await this.sessionService.generateTokenPair(
        result.user.id,
        deviceInfo
      );

      // Log social auth event
      await this.securityService.logSecurityEvent('social_auth_apple', 'low', {
        userId: result.user.id,
        email: result.user.email,
        isNewUser: result.isNewUser,
        ip: deviceInfo.ipAddress,
      });

      return {
        user: result.user,
        isNewUser: result.isNewUser,
        tokens,
        linkedAccounts: ['apple'],
      };
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'social_auth_failed',
        'medium',
        {
          provider: 'apple',
          error: error.message,
          ip: deviceInfo.ipAddress,
        }
      );
      throw new UnauthorizedException('Apple authentication failed');
    }
  }

  /**
   * Authenticate with Microsoft OAuth
   */
  async authenticateWithMicrosoft(
    authCode: string,
    deviceInfo: DeviceInfo
  ): Promise<SocialAuthResult> {
    try {
      // Exchange auth code for token
      const tokenInfo = await this.exchangeMicrosoftAuthCode(authCode);

      // Find or create user
      const result = await this.findOrCreateSocialUser({
        provider: 'microsoft',
        providerId: tokenInfo.sub,
        email: tokenInfo.email,
        name: tokenInfo.name,
      });

      // Generate tokens
      const tokens = await this.sessionService.generateTokenPair(
        result.user.id,
        deviceInfo
      );

      // Log social auth event
      await this.securityService.logSecurityEvent(
        'social_auth_microsoft',
        'low',
        {
          userId: result.user.id,
          email: result.user.email,
          isNewUser: result.isNewUser,
          ip: deviceInfo.ipAddress,
        }
      );

      return {
        user: result.user,
        isNewUser: result.isNewUser,
        tokens,
        linkedAccounts: ['microsoft'],
      };
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'social_auth_failed',
        'medium',
        {
          provider: 'microsoft',
          error: error.message,
          ip: deviceInfo.ipAddress,
        }
      );
      throw new UnauthorizedException('Microsoft authentication failed');
    }
  }

  /**
   * Link social account to existing user
   */
  async linkSocialAccount(
    userId: string,
    provider: string,
    providerUserId: string
  ): Promise<void> {
    // In production, store social account linkages in separate entity
    // For now, this is a placeholder implementation

    await this.securityService.logSecurityEvent(
      'social_account_linked',
      'low',
      {
        userId,
        provider,
        providerUserId,
      }
    );
  }

  /**
   * Find or create user from social provider information
   */
  private async findOrCreateSocialUser(socialInfo: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<{ user: User; isNewUser: boolean }> {
    // Try to find existing user by email
    let user = await this.userRepository.findOne({
      where: { email: socialInfo.email },
    });

    if (user) {
      // User exists, return it
      return { user, isNewUser: false };
    }

    // Create new user
    const tempPassword = crypto.randomBytes(32).toString('hex');

    user = this.userRepository.create({
      email: socialInfo.email,
      name: socialInfo.name,
      password: tempPassword, // Will be hashed by AuthService
      isActive: true,
    });

    user = await this.userRepository.save(user);

    return { user, isNewUser: true };
  }

  /**
   * Exchange Google auth code for user info
   */
  private async exchangeGoogleAuthCode(
    authCode: string
  ): Promise<GoogleTokenInfo> {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    // Exchange auth code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Google auth code');
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );

    if (!userResponse.ok) {
      throw new Error('Failed to get Google user info');
    }

    return await userResponse.json();
  }

  /**
   * Verify Apple identity token
   */
  private async verifyAppleIdentityToken(
    identityToken: string
  ): Promise<AppleTokenInfo> {
    // In production, verify the JWT signature against Apple's public keys
    // For now, decode without verification (SECURITY RISK - implement proper verification)

    try {
      const payload = JSON.parse(
        Buffer.from(identityToken.split('.')[1], 'base64').toString()
      );

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        email_verified: payload.email_verified === 'true',
      };
    } catch {
      throw new Error('Invalid Apple identity token');
    }
  }

  /**
   * Exchange Microsoft auth code for user info
   */
  private async exchangeMicrosoftAuthCode(
    authCode: string
  ): Promise<MicrosoftTokenInfo> {
    const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth not configured');
    }

    // Exchange auth code for access token
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: authCode,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email',
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Microsoft auth code');
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get Microsoft user info');
    }

    const userData = await userResponse.json();

    return {
      sub: userData.id,
      email: userData.mail || userData.userPrincipalName,
      name: userData.displayName,
      preferred_username: userData.userPrincipalName,
    };
  }
}
