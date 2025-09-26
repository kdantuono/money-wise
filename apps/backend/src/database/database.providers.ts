import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, Account, Category, Transaction } from '../entities';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async (configService: ConfigService): Promise<DataSource> => {
      const dataSource = new DataSource({
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
        migrations: ['dist/database/migrations/*.js'],
        migrationsTableName: 'migrations',
      });

      return dataSource.initialize();
    },
    inject: [ConfigService],
  },
];