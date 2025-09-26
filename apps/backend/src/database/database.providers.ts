import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, Account, Category, Transaction } from '../entities';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async (configService: ConfigService): Promise<DataSource> => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'password'),
        database: configService.get('DATABASE_NAME', 'moneywise'),
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