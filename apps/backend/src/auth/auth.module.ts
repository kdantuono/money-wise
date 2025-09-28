import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../core/database/entities/user.entity';
import { PasswordHistory } from '../core/database/entities/password-history.entity';
import { AuditLog } from '../core/database/entities/audit-log.entity';
import { PasswordController } from './controllers/password.controller';
import { PasswordSecurityService } from './services/password-security.service';
import { PasswordStrengthService } from './services/password-strength.service';
import { PasswordResetService } from './services/password-reset.service';
import { RateLimitService } from './services/rate-limit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordHistory, AuditLog]),
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
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        config: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, PasswordController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    PasswordSecurityService,
    PasswordStrengthService,
    PasswordResetService,
    RateLimitService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    PasswordSecurityService,
    PasswordStrengthService,
    RateLimitService,
  ],
})
export class AuthModule {}