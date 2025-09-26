import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from '../config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');

        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }

        return {
          type: 'postgres',
          host: dbConfig.DB_HOST,
          port: dbConfig.DB_PORT,
          username: dbConfig.DB_USERNAME,
          password: dbConfig.DB_PASSWORD,
          database: dbConfig.DB_NAME,
          schema: dbConfig.DB_SCHEMA,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: dbConfig.DB_SYNCHRONIZE,
          logging: dbConfig.DB_LOGGING,
          retryAttempts: 3,
          retryDelay: 3000,
          autoLoadEntities: true,
          extra: {
            // Connection pool settings
            max: 20,
            min: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}