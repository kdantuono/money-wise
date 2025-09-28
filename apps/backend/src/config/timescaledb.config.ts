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

export const timescaleDbConfig = () => ({
  timescaledb: {
    enabled: process.env.TIMESCALEDB_ENABLED === 'true',
    compressionEnabled: process.env.TIMESCALEDB_COMPRESSION_ENABLED === 'true',
    retentionEnabled: process.env.TIMESCALEDB_RETENTION_ENABLED === 'true',
    chunkTimeInterval: process.env.TIMESCALEDB_CHUNK_TIME_INTERVAL || '1 day',
    compressionAfter: process.env.TIMESCALEDB_COMPRESSION_AFTER || '7 days',
    retentionAfter: process.env.TIMESCALEDB_RETENTION_AFTER || '7 years',
  },
});