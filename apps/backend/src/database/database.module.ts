import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, Account, Category, Transaction } from '../core/database/entities';
import { TimescaleDBService } from './timescaledb.service';
import { timescaledbConfig } from '../config/timescaledb.config';

@Module({
  imports: [
    ConfigModule.forFeature(timescaledbConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.getOrThrow('DATABASE_USER'),
        password: configService.getOrThrow('DATABASE_PASSWORD'),
        database: configService.getOrThrow('DATABASE_NAME'),
        entities: [User, Account, Category, Transaction],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
        // TimescaleDB optimizations
        extra: {
          max: 20, // Maximum connections in pool
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          query_timeout: 30000,
          statement_timeout: 30000,
          // TimescaleDB-specific settings
          application_name: 'moneywise-backend',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TimescaleDBService],
  exports: [TimescaleDBService],
})
export class DatabaseModule {}