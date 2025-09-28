-- TimescaleDB Database Initialization Script
-- Created as part of TASK-001-024: Create Database Service Configuration

-- Create test database for isolated testing (main db is created by POSTGRES_DB env var)
CREATE DATABASE moneywise_test;

-- Connect to main database and enable TimescaleDB extension
\c moneywise;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Connect to test database and enable TimescaleDB extension
\c moneywise_test;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Switch back to main database
\c moneywise;

-- Verify TimescaleDB installation
SELECT default_version, installed_version FROM pg_available_extensions WHERE name = 'timescaledb';

-- Create performance optimization settings for TimescaleDB
-- Tune shared memory settings for time-series workloads
ALTER SYSTEM SET shared_preload_libraries = 'timescaledb';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- TimescaleDB specific settings
ALTER SYSTEM SET timescaledb.max_background_workers = 8;
ALTER SYSTEM SET timescaledb.telemetry_level = 'off';

-- Create helper function for checking hypertable status
CREATE OR REPLACE FUNCTION check_hypertable_status()
RETURNS TABLE (
    hypertable_name TEXT,
    is_hypertable BOOLEAN,
    compression_enabled BOOLEAN,
    retention_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        EXISTS(SELECT 1 FROM timescaledb_information.hypertables h WHERE h.hypertable_name = t.table_name)::BOOLEAN as is_hypertable,
        EXISTS(SELECT 1 FROM timescaledb_information.compression_settings c WHERE c.hypertable_name = t.table_name)::BOOLEAN as compression_enabled,
        EXISTS(SELECT 1 FROM timescaledb_information.policy_stats p WHERE p.hypertable = t.table_name AND p.policy_name LIKE '%retention%')::BOOLEAN as retention_enabled
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'transactions';
END;
$$ LANGUAGE plpgsql;

-- Log current configuration
\echo 'TimescaleDB initialization completed successfully'
\echo 'Available extensions:'
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE name IN ('timescaledb', 'uuid-ossp')
ORDER BY name;