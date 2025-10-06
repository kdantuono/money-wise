/**
 * Redis Configuration
 *
 * Redis connection settings for session storage and caching.
 */
import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class RedisConfig {
  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  @Min(1, { message: 'REDIS_PORT must be at least 1' })
  @Max(65535, { message: 'REDIS_PORT must not exceed 65535' })
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @Min(0, { message: 'REDIS_DB must be at least 0' })
  @Max(15, { message: 'REDIS_DB must not exceed 15' })
  @IsOptional()
  REDIS_DB?: number = 0;
}

export default registerAs('redis', () => ({
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseInt(process.env.REDIS_DB, 10) || 0,
}));
