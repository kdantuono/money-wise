import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { PasswordController } from './controllers/password.controller';
import { AuthService } from './auth.service';
import { AuthSecurityService } from './auth-security.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitService } from './services/rate-limit.service';
import { PasswordSecurityService } from './services/password-security.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { AuditLogService } from './services/audit-log.service';
import { CsrfService } from './services/csrf.service';
import { CsrfGuard } from './guards/csrf.guard';
import { PrismaModule } from '../core/database/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // Prisma module provides all Prisma services
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as `${number}m`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, PasswordController],
  providers: [
    AuthService,
    AuthSecurityService,
    JwtStrategy,
    JwtAuthGuard,
    RateLimitGuard,
    CsrfGuard,
    RateLimitService,
    PasswordSecurityService,
    AccountLockoutService,
    EmailVerificationService,
    PasswordResetService,
    AuditLogService,
    CsrfService,
  ],
  exports: [
    AuthService,
    AuthSecurityService,
    JwtAuthGuard,
    RateLimitGuard,
    CsrfGuard,
    PasswordSecurityService,
    AccountLockoutService,
    EmailVerificationService,
    PasswordResetService,
    AuditLogService,
    CsrfService,
  ],
})
export class AuthModule {}