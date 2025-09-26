import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DatabaseConfig {
  @IsString()
  DB_HOST: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  @IsOptional()
  DB_SCHEMA?: string;

  @IsOptional()
  DB_SYNCHRONIZE?: boolean;

  @IsOptional()
  DB_LOGGING?: boolean;
}