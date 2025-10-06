/**
 * Application Configuration
 *
 * Core application settings including environment, port, CORS, and API configuration.
 */
import { registerAs } from '@nestjs/config';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
  Min,
  Max,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

export class AppConfig {
  @IsEnum(Environment, {
    message: 'NODE_ENV must be one of: development, staging, production, test',
  })
  NODE_ENV: Environment;

  @IsNumber()
  @Min(1024, { message: 'PORT must be at least 1024' })
  @Max(65535, { message: 'PORT must not exceed 65535' })
  PORT: number;

  @IsString()
  @IsOptional()
  APP_NAME?: string = 'MoneyWise Backend';

  @IsString()
  @IsOptional()
  APP_VERSION?: string;

  @IsString()
  @IsOptional()
  API_PREFIX?: string = 'api';

  @IsString()
  @IsUrl({}, { message: 'CORS_ORIGIN must be a valid URL' })
  CORS_ORIGIN: string;
}

export default registerAs('app', () => ({
  NODE_ENV: process.env.NODE_ENV as Environment,
  PORT: parseInt(process.env.PORT, 10) || 3001,
  APP_NAME: process.env.APP_NAME,
  APP_VERSION: process.env.APP_VERSION || process.env.npm_package_version,
  API_PREFIX: process.env.API_PREFIX,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));