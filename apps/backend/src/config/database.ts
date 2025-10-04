import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'notemesh', // CI uses DB_USERNAME (postgres), local uses notemesh
  password: process.env.DB_PASSWORD || 'password', // Match test config
  database: process.env.DB_NAME || 'money_wise_dev',
  schema: process.env.DB_SCHEMA || 'public',
  entities: ['src/core/database/entities/*.entity{.ts,.js}'],
  migrations: ['src/core/database/migrations/*{.ts,.js}'],
  synchronize: false, // Always false for migrations
  logging: process.env.DB_LOGGING === 'true',
  extra: {
    // Connection pool settings
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});

export default AppDataSource;