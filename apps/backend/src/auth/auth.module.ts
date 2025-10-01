import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSecurityService } from './auth-security.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { PasswordSecurityService } from './services/password-security.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { AuditLogService } from './services/audit-log.service';
import { User } from '../core/database/entities/user.entity';
import { AuditLog } from '../core/database/entities/audit-log.entity';
import { PasswordHistory } from '../core/database/entities/password-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuditLog, PasswordHistory]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSecurityService,
    JwtStrategy,
    JwtAuthGuard,
    RateLimitGuard,
    PasswordSecurityService,
    AccountLockoutService,
    EmailVerificationService,
    PasswordResetService,
    AuditLogService,
  ],
  exports: [
    AuthService,
    AuthSecurityService,
    JwtAuthGuard,
    RateLimitGuard,
    PasswordSecurityService,
    AccountLockoutService,
    EmailVerificationService,
    PasswordResetService,
    AuditLogService,
  ],
})
export class AuthModule {}