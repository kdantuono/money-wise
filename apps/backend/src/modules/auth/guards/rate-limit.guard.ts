import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { SecurityService } from '../../security/security.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);
    const endpoint = this.getEndpointKey(request);
    
    // Check rate limit
    const rateLimitResult = await this.securityService.checkRateLimit(ip, endpoint);
    
    if (!rateLimitResult.allowed) {
      // Set rate limit headers
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', '100');
      response.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      response.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);
      
      if (rateLimitResult.retryAfter) {
        response.setHeader('Retry-After', rateLimitResult.retryAfter);
      }
      
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    
    // Set rate limit headers for successful requests
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', '100');
    response.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    response.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);
    
    return true;
  }

  private getClientIp(request: Request): string {
    return (
      request.get('X-Forwarded-For')?.split(',')[0] ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      ''
    ).trim();
  }

  private getEndpointKey(request: Request): string {
    const path = request.path;
    
    // Map specific endpoints to rate limit categories
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return 'auth';
    }
    
    if (path.includes('/auth/password/reset')) {
      return 'password_reset';
    }
    
    if (path.includes('/auth/mfa')) {
      return 'mfa';
    }
    
    return 'api';
  }
}