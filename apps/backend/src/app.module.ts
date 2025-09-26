import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './core/health/health.module';
import { MonitoringModule } from './core/monitoring/monitoring.module';
import { LoggingModule } from './core/logging/logging.module';

@Module({
  imports: [
    // Core modules
    ConfigModule,
    DatabaseModule,
    HealthModule,
    MonitoringModule,
    LoggingModule,

    // Feature modules will be added here as development progresses
    // Example: UsersModule, TransactionsModule, etc.
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}