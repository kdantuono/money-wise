import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class AppConfig {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT?: number = 3001;

  @IsString()
  @IsOptional()
  APP_NAME?: string = 'MoneyWise Backend';

  @IsString()
  @IsOptional()
  APP_VERSION?: string = '0.1.0';

  @IsString()
  @IsOptional()
  API_PREFIX?: string = 'api';

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = 'http://localhost:3000';
}