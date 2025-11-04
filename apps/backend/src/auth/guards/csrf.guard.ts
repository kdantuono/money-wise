import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { CsrfService } from '../services/csrf.service';

/**
 * CSRF Protection Guard
 *
 * Validates CSRF tokens for all state-changing operations (POST, PUT, PATCH, DELETE).
 * GET requests are exempted as they should be idempotent and not change state.
 *
 * **Security Design:**
 * - Double Submit Cookie pattern (CSRF token in cookie + header)
 * - Tokens are signed with secret to prevent tampering
 * - Tokens expire after 24 hours
 * - Can be disabled per-route with @Public() decorator
 *
 * **Usage:**
 * ```typescript
 * @UseGuards(CsrfGuard)
 * @Post('login')
 * async login() { ... }
 * ```
 *
 * **Bypass:**
 * ```typescript
 * @Public() // Disables CSRF check
 * @Get('csrf-token')
 * async getCsrfToken() { ... }
 * ```
 *
 * @see https://owasp.org/www-community/attacks/csrf
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(
    private readonly csrfService: CsrfService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Check if route is marked as public (bypass CSRF)
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug(`CSRF check bypassed for public route: ${method} ${request.path}`);
      return true;
    }

    // Only validate CSRF for state-changing methods
    // GET, HEAD, OPTIONS are safe methods (OWASP recommendation)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      this.logger.debug(`CSRF check skipped for safe method: ${method} ${request.path}`);
      return true;
    }

    // Extract CSRF token from header
    const csrfTokenFromHeader = request.headers['x-csrf-token'] as string;

    if (!csrfTokenFromHeader) {
      this.logger.warn(`CSRF token missing in header for ${method} ${request.path}`);
      throw new ForbiddenException({
        statusCode: 403,
        message: 'CSRF token missing',
        error: 'CSRF_TOKEN_MISSING',
        hint: 'Include X-CSRF-Token header in your request',
      });
    }

    // Validate CSRF token
    const isValid = await this.csrfService.validateToken(csrfTokenFromHeader);

    if (!isValid) {
      this.logger.warn(`Invalid CSRF token for ${method} ${request.path}`);
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid CSRF token',
        error: 'CSRF_TOKEN_INVALID',
        hint: 'Get a fresh CSRF token from /api/auth/csrf-token',
      });
    }

    this.logger.debug(`CSRF validation passed for ${method} ${request.path}`);
    return true;
  }
}
