import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MonitoringService } from './monitoring.service';
import { CloudWatchService } from './cloudwatch.service';
import { HealthController } from './health.controller';
import { PerformanceInterceptor } from './performance.interceptor';
import { MetricsService } from './metrics.service';
import { LoggerModule } from '../logging/logger.module';
import { TestSentryController } from './test-sentry.controller';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [
    HealthController,
    // Only include test controller in non-production
    ...(process.env.NODE_ENV !== 'production' ? [TestSentryController] : []),
  ],
  providers: [
    CloudWatchService,
    MonitoringService,
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [MonitoringService, CloudWatchService, MetricsService],
})
export class MonitoringModule {}