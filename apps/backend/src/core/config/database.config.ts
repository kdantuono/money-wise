/**
 * Database Configuration
 *
 * PostgreSQL/TimescaleDB connection settings with environment-aware defaults.
 */
import { registerAs } from '@nestjs/config';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class DatabaseConfig {
  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Min(1, { message: 'DB_PORT must be at least 1' })
  @Max(65535, { message: 'DB_PORT must not exceed 65535' })
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  @MinLength(8, {
    message: 'DB_PASSWORD must be at least 8 characters',
  })
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  @IsOptional()
  DB_SCHEMA?: string = 'public';

  @IsBoolean()
  @IsOptional()
  DB_SYNCHRONIZE?: boolean;

  @IsBoolean()
  @IsOptional()
  DB_LOGGING?: boolean;
}

export default registerAs('database', () => ({
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_USERNAME: process.env.DB_USERNAME || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || 'moneywise',
  DB_SCHEMA: process.env.DB_SCHEMA || 'public',
  DB_SYNCHRONIZE: process.env.DB_SYNCHRONIZE === 'true',
  DB_LOGGING: process.env.DB_LOGGING === 'true',
}));