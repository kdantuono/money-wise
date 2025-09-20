import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { SecurityService } from '../../security/security.service';

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger(SecurityGuard.name);

  constructor(private readonly securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Detect suspicious activity
      const threat =
        await this.securityService.detectSuspiciousActivity(request);

      if (threat) {
        // Log the security threat
        await this.securityService.logSecurityEvent(
          `security_threat_${threat.type}`,
          threat.severity,
          threat.metadata
        );

        // Block high severity threats
        if (threat.severity === 'critical' || threat.severity === 'high') {
          this.logger.warn(
            `Blocking request due to security threat: ${threat.description}`,
            threat.metadata
          );

          throw new HttpException(
            {
              statusCode: HttpStatus.FORBIDDEN,
              message: 'Request blocked for security reasons',
              error: 'Security violation detected',
            },
            HttpStatus.FORBIDDEN
          );
        }

        // Log medium/low severity threats but allow the request
        if (threat.severity === 'medium' || threat.severity === 'low') {
          this.logger.warn(
            `Security warning: ${threat.description}`,
            threat.metadata
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error('Security guard error:', error);

      // Allow request to proceed if security check fails
      // In production, you might want to be more strict
      return true;
    }
  }
}
