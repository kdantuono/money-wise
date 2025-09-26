import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DatabaseConfig {
  @IsString()
  DB_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  DB_PORT?: number = 5432;

  @IsString()
  DB_USERNAME: string = 'postgres';

  @IsString()
  DB_PASSWORD: string = 'postgres';

  @IsString()
  DB_NAME: string = 'moneywise_dev';

  @IsString()
  @IsOptional()
  DB_SCHEMA?: string = 'public';

  @IsOptional()
  DB_SYNCHRONIZE?: boolean = false;

  @IsOptional()
  DB_LOGGING?: boolean = false;
}