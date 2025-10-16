/**
 * TypeORM CLI DataSource Configuration
 *
 * IMPORTANT: This file is used by TypeORM CLI for migrations and is NOT part of
 * the NestJS application runtime. It MUST use process.env directly because:
 * 1. TypeORM CLI runs outside NestJS context (no dependency injection)
 * 2. Used by migration commands: `pnpm migration:generate`, `pnpm migration:run`
 * 3. ConfigService is not available in this context
 *
 * This is a DOCUMENTED EXCEPTION to the "no process.env" rule.
 *
 * @see apps/backend/src/core/config/database.config.ts - Runtime database config using ConfigService
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables FIRST (required for CLI context)
config();

// Parse DATABASE_URL if provided (CI/CD), otherwise use individual vars (local dev)
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    // CI/CD uses DATABASE_URL format: postgresql://user:pass@host:port/dbname
    return { url: process.env.DATABASE_URL };
  }
  // Local dev uses individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'notemesh',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'money_wise_dev',
    schema: process.env.DB_SCHEMA || 'public',
  };
};

const AppDataSource = new DataSource({
  type: 'postgres',
  ...getDatabaseConfig(),
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