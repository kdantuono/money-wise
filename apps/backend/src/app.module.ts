import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './core/config/config.module';
import { PrismaModule } from './core/database/prisma/prisma.module';
import { RedisModule } from './core/redis/redis.module';
import { HealthModule } from './core/health/health.module';
import { MonitoringModule } from './core/monitoring/monitoring.module';
import { LoggingModule } from './core/logging/logging.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BankingModule } from './banking/banking.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Core modules
    ConfigModule,
    PrismaModule,
    RedisModule.forRoot({ isGlobal: true }),
    HealthModule,
    MonitoringModule,
    LoggingModule,

    // Feature modules
    AuthModule,
    AccountsModule,
    TransactionsModule,
    BankingModule,
    CategoriesModule,
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