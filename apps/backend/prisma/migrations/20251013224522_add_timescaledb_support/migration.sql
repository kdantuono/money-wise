-- Add TimescaleDB Support for Time-Series Optimization
-- Ported from TypeORM migration: 1760000000002-AddTimescaleDBSupport

-- Enable TimescaleDB extension (idempotent - safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert transactions table to hypertable for time-series optimization
-- Only if:
-- 1. Not already a hypertable
-- 2. Table is empty (to avoid data migration complexities)
DO $$
BEGIN
    -- Check if transactions is already a hypertable
    IF NOT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
    ) THEN
        -- Only create hypertable if table is empty (safe for tests and fresh installs)
        IF (SELECT COUNT(*) FROM transactions) = 0 THEN
            BEGIN
                -- Create hypertable partitioned by 'date' column
                PERFORM create_hypertable('transactions', 'date', if_not_exists => TRUE);
                RAISE NOTICE 'Created hypertable: transactions (partitioned by date)';
            EXCEPTION
                WHEN OTHERS THEN
                    -- Skip hypertable creation if it fails (e.g., constraint violations)
                    RAISE WARNING 'Skipping hypertable creation: %', SQLERRM;
            END;
        ELSE
            -- Table has data, skip hypertable creation
            -- NOTE: Converting a table with data to hypertable requires careful planning
            -- See: https://docs.timescale.com/migrate/latest/migrate-to-timescale/
            RAISE NOTICE 'Skipping hypertable creation: transactions table contains data (% rows)', (SELECT COUNT(*) FROM transactions);
        END IF;
    ELSE
        RAISE NOTICE 'Hypertable already exists: transactions';
    END IF;
END $$;

-- Create time-series optimized indexes
-- Only if transactions is a hypertable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
    ) THEN
        -- Time-bucket index for account-based queries
        CREATE INDEX IF NOT EXISTS idx_transactions_time_bucket_account
            ON transactions (time_bucket('1 day', date), account_id);

        -- Time-bucket index for category-based queries
        CREATE INDEX IF NOT EXISTS idx_transactions_time_bucket_category
            ON transactions (time_bucket('1 day', date), category_id);

        RAISE NOTICE 'Created time-series indexes for transactions hypertable';
    END IF;
END $$;

-- Add compression policy: Compress data older than 7 days
-- Reduces storage by ~10x for historical data
-- Only if hypertable exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
    ) THEN
        PERFORM add_compression_policy('transactions', INTERVAL '7 days', if_not_exists => TRUE);
        RAISE NOTICE 'Added compression policy: compress data older than 7 days';
    END IF;
END $$;

-- Add retention policy: Drop data older than 7 years
-- Automatically removes old transaction data to save storage
-- Only if hypertable exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
    ) THEN
        PERFORM add_retention_policy('transactions', INTERVAL '7 years', if_not_exists => TRUE);
        RAISE NOTICE 'Added retention policy: drop data older than 7 years';
    END IF;
END $$;

-- Create continuous aggregate: daily_account_balances
-- Pre-aggregates transaction data by day and account for faster queries
-- Only if hypertable exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
    ) THEN
        CREATE MATERIALIZED VIEW IF NOT EXISTS daily_account_balances
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 day', date) AS bucket,
            account_id,
            SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END) AS daily_change,
            COUNT(*) AS transaction_count
        FROM transactions
        GROUP BY bucket, account_id
        WITH NO DATA;

        RAISE NOTICE 'Created continuous aggregate: daily_account_balances';
    END IF;
END $$;

-- Create continuous aggregate: daily_category_spending
-- Pre-aggregates spending by category per day
-- Only if hypertable exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
    ) THEN
        CREATE MATERIALIZED VIEW IF NOT EXISTS daily_category_spending
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 day', date) AS bucket,
            category_id,
            SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) AS daily_spending,
            COUNT(*) AS transaction_count
        FROM transactions
        WHERE category_id IS NOT NULL
        GROUP BY bucket, category_id
        WITH NO DATA;

        RAISE NOTICE 'Created continuous aggregate: daily_category_spending';
    END IF;
END $$;

-- Add refresh policy for daily_account_balances
-- Automatically refreshes materialized view every hour
-- Only if view exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE matviewname = 'daily_account_balances'
    ) THEN
        PERFORM add_continuous_aggregate_policy('daily_account_balances',
            start_offset => INTERVAL '3 days',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour',
            if_not_exists => TRUE);

        RAISE NOTICE 'Added refresh policy for daily_account_balances (every 1 hour)';
    END IF;
END $$;

-- Add refresh policy for daily_category_spending
-- Automatically refreshes materialized view every hour
-- Only if view exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE matviewname = 'daily_category_spending'
    ) THEN
        PERFORM add_continuous_aggregate_policy('daily_category_spending',
            start_offset => INTERVAL '3 days',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour',
            if_not_exists => TRUE);

        RAISE NOTICE 'Added refresh policy for daily_category_spending (every 1 hour)';
    END IF;
END $$;
