import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService, JwtPayload } from '../auth.service';
import type { User } from '../../../generated/prisma';
import { AuthConfig } from '../../core/config/auth.config';

/**
 * Custom JWT extractor that prioritizes HttpOnly cookies over Authorization header
 *
 * **Extraction Priority:**
 * 1. First tries to extract from 'accessToken' cookie (secure, HttpOnly)
 * 2. Falls back to Authorization header (for backward compatibility during migration)
 *
 * This dual-extraction approach allows for gradual migration from header-based
 * to cookie-based authentication without breaking existing clients.
 *
 * @param req - Express request object
 * @returns JWT token string or null
 */
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    // Primary: Extract from HttpOnly cookie (secure)
    const tokenFromCookie = req.cookies.accessToken;
    if (tokenFromCookie) {
      return tokenFromCookie;
    }
  }

  // Fallback: Extract from Authorization header (backward compatibility)
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const authConfig = configService.get<AuthConfig>('auth');

    if (!authConfig?.JWT_ACCESS_SECRET) {
      throw new Error('JWT access secret not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Explicit fallback
      ]),
      ignoreExpiration: false,
      secretOrKey: authConfig.JWT_ACCESS_SECRET,
      passReqToCallback: false, // We don't need req in validate()
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    try {
      return await this.authService.validateUser(payload);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}