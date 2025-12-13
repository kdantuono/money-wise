import { Module } from '@nestjs/common';
import { LiabilitiesController } from './liabilities.controller';
import { LiabilitiesService } from './liabilities.service';
import { PrismaModule } from '../core/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LiabilitiesController],
  providers: [LiabilitiesService],
  exports: [LiabilitiesService],
})
export class LiabilitiesModule {}
