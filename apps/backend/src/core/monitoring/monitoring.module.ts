import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonitoringService } from './monitoring.service';
import { CloudWatchService } from './cloudwatch.service';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [CloudWatchService, MonitoringService],
  exports: [MonitoringService, CloudWatchService],
})
export class MonitoringModule {}