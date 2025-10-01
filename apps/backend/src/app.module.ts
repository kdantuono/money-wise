import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { RedisModule } from './core/redis/redis.module';
import { HealthModule } from './core/health/health.module';
import { MonitoringModule } from './core/monitoring/monitoring.module';
import { LoggingModule } from './core/logging/logging.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Core modules
    ConfigModule,
    DatabaseModule,
    RedisModule.forRoot({ isGlobal: true }),
    HealthModule,
    MonitoringModule,
    LoggingModule,

    // Feature modules
    AuthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}