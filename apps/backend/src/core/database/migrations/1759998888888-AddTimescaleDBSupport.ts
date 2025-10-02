import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimescaleDBSupport1759998888888 implements MigrationInterface {
    name = 'AddTimescaleDBSupport1759998888888'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable TimescaleDB extension (skip if not available - e.g. local dev without TimescaleDB)
        try {
            await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);
        } catch (error) {
            if (error.message?.includes('is not available') || error.message?.includes('could not open extension')) {
                console.log('⚠️  TimescaleDB extension not available - skipping TimescaleDB features');
                return; // Skip entire migration if TimescaleDB not available
            }
            throw error; // Re-throw other errors
        }

        // Convert transactions table to hypertable for time-series optimization
        // Check if already a hypertable to avoid "table not empty" errors
        await queryRunner.query(`
            DO $$
            BEGIN
                -- Check if transactions is already a hypertable
                IF NOT EXISTS (
                    SELECT 1 FROM timescaledb_information.hypertables
                    WHERE hypertable_name = 'transactions'
                ) THEN
                    -- Only create hypertable if table is empty (safe for tests)
                    IF (SELECT COUNT(*) FROM transactions) = 0 THEN
                        PERFORM create_hypertable('transactions', 'date', if_not_exists => TRUE);
                    ELSE
                        -- Table has data, skip hypertable creation (log warning)
                        RAISE NOTICE 'Skipping hypertable creation: transactions table is not empty';
                    END IF;
                END IF;
            END $$;
        `);

        // Create additional indexes optimized for time-series queries
        // Only if transactions is a hypertable
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM timescaledb_information.hypertables
                    WHERE hypertable_name = 'transactions'
                ) THEN
                    CREATE INDEX IF NOT EXISTS idx_transactions_time_bucket
                        ON transactions (time_bucket('1 day', date), "accountId");

                    CREATE INDEX IF NOT EXISTS idx_transactions_time_bucket_category
                        ON transactions (time_bucket('1 day', date), "categoryId");
                END IF;
            END $$;
        `);

        // Add compression policy for transactions older than 7 days (only if hypertable)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM timescaledb_information.hypertables
                    WHERE hypertable_name = 'transactions'
                ) THEN
                    PERFORM add_compression_policy('transactions', INTERVAL '7 days', if_not_exists => TRUE);
                END IF;
            END $$;
        `);

        // Add retention policy for transactions older than 7 years (only if hypertable)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM timescaledb_information.hypertables
                    WHERE hypertable_name = 'transactions'
                ) THEN
                    PERFORM add_retention_policy('transactions', INTERVAL '7 years', if_not_exists => TRUE);
                END IF;
            END $$;
        `);

        // Create continuous aggregates for daily summaries (only if hypertable)
        await queryRunner.query(`
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
                        "accountId",
                        SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) AS daily_change,
                        COUNT(*) AS transaction_count
                    FROM transactions
                    GROUP BY bucket, "accountId"
                    WITH NO DATA;

                    CREATE MATERIALIZED VIEW IF NOT EXISTS daily_category_spending
                    WITH (timescaledb.continuous) AS
                    SELECT
                        time_bucket('1 day', date) AS bucket,
                        "categoryId",
                        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS daily_spending,
                        COUNT(*) AS transaction_count
                    FROM transactions
                    WHERE "categoryId" IS NOT NULL
                    GROUP BY bucket, "categoryId"
                    WITH NO DATA;
                END IF;
            END $$;
        `);

        // Add refresh policies for continuous aggregates (only if views exist)
        await queryRunner.query(`
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
                END IF;

                IF EXISTS (
                    SELECT 1 FROM pg_matviews
                    WHERE matviewname = 'daily_category_spending'
                ) THEN
                    PERFORM add_continuous_aggregate_policy('daily_category_spending',
                        start_offset => INTERVAL '3 days',
                        end_offset => INTERVAL '1 hour',
                        schedule_interval => INTERVAL '1 hour',
                        if_not_exists => TRUE);
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove continuous aggregate policies
        await queryRunner.query(`SELECT remove_continuous_aggregate_policy('daily_account_balances', if_exists => TRUE);`);
        await queryRunner.query(`SELECT remove_continuous_aggregate_policy('daily_category_spending', if_exists => TRUE);`);

        // Drop continuous aggregates
        await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS daily_account_balances;`);
        await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS daily_category_spending;`);

        // Remove policies
        await queryRunner.query(`SELECT remove_retention_policy('transactions', if_exists => TRUE);`);
        await queryRunner.query(`SELECT remove_compression_policy('transactions', if_exists => TRUE);`);

        // Drop TimescaleDB-specific indexes
        await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_time_bucket;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_time_bucket_category;`);

        // Note: We don't drop the hypertable or disable TimescaleDB extension
        // as this could cause data loss and affect other parts of the system
        // These should be manually handled if truly needed
    }
}