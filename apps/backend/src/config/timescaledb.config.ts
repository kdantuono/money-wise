/**
 * TimescaleDB Configuration
 *
 * TimescaleDB-specific settings for time-series data optimization.
 * Controls hypertable chunking, compression, and data retention policies.
 */
import { registerAs } from '@nestjs/config';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TimescaleDbConfig {
  @IsBoolean()
  @IsOptional()
  TIMESCALEDB_ENABLED?: boolean = true;

  @IsBoolean()
  @IsOptional()
  TIMESCALEDB_COMPRESSION_ENABLED?: boolean = true;

  @IsBoolean()
  @IsOptional()
  TIMESCALEDB_RETENTION_ENABLED?: boolean = true;

  @IsString()
  @IsOptional()
  TIMESCALEDB_CHUNK_TIME_INTERVAL?: string = '1 day';

  @IsString()
  @IsOptional()
  TIMESCALEDB_COMPRESSION_AFTER?: string = '7 days';

  @IsString()
  @IsOptional()
  TIMESCALEDB_RETENTION_AFTER?: string = '7 years';
}

export default registerAs('timescaledb', () => ({
  TIMESCALEDB_ENABLED: process.env.TIMESCALEDB_ENABLED === 'true',
  TIMESCALEDB_COMPRESSION_ENABLED:
    process.env.TIMESCALEDB_COMPRESSION_ENABLED === 'true',
  TIMESCALEDB_RETENTION_ENABLED:
    process.env.TIMESCALEDB_RETENTION_ENABLED === 'true',
  TIMESCALEDB_CHUNK_TIME_INTERVAL:
    process.env.TIMESCALEDB_CHUNK_TIME_INTERVAL || '1 day',
  TIMESCALEDB_COMPRESSION_AFTER:
    process.env.TIMESCALEDB_COMPRESSION_AFTER || '7 days',
  TIMESCALEDB_RETENTION_AFTER:
    process.env.TIMESCALEDB_RETENTION_AFTER || '7 years',
}));