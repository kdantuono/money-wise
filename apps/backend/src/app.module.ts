import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './core/health/health.module';

@Module({
  imports: [
    // Core modules
    ConfigModule,
    DatabaseModule,
    HealthModule,

    // Feature modules will be added here as development progresses
    // Example: UsersModule, TransactionsModule, etc.
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}