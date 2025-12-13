import { Module } from '@nestjs/common';
import { ScheduledController } from './scheduled.controller';
import { ScheduledService } from './scheduled.service';
import { RecurrenceService } from './recurrence.service';
import { PrismaModule } from '../core/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduledController],
  providers: [ScheduledService, RecurrenceService],
  exports: [ScheduledService, RecurrenceService],
})
export class ScheduledModule {}
