/**
 * TimescaleDB Configuration
 *
 * Configures TimescaleDB-specific features like:
 * - Hypertable creation and management
 * - Compression policies
 * - Retention policies
 *
 * IMPORTANT: This is a static configuration file loaded at module initialization.
 * It uses process.env directly because it's imported before NestJS ConfigModule
 * is initialized. This is a DOCUMENTED EXCEPTION to the "no process.env" rule.
 *
 * For runtime configuration access, use ConfigService with DatabaseConfig class.
 *
 * @see https://docs.timescale.com/
 * @see apps/backend/src/core/config/database.config.ts - Runtime database config
 */

import { config } from 'dotenv';

// Load environment variables FIRST
config();

export const timescaledbConfig = {
  hypertables: [
    // Transaction metrics hypertable
    {
      tableName: 'transaction_metrics',
      timeColumnName: 'time',
      createIfNotExists: true,
      migrateData: false,
    },
  ],
  options: {
    enabled: process.env.TIMESCALEDB_ENABLED === 'true',
    compressionEnabled: process.env.TIMESCALEDB_COMPRESSION_ENABLED === 'true',
    retentionEnabled: process.env.TIMESCALEDB_RETENTION_ENABLED === 'true',
    chunkTimeInterval: process.env.TIMESCALEDB_CHUNK_TIME_INTERVAL || '1 day',
    compressionAfter: process.env.TIMESCALEDB_COMPRESSION_AFTER || '7 days',
    retentionAfter: process.env.TIMESCALEDB_RETENTION_AFTER || '7 years',
  },
};
