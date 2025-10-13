import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}