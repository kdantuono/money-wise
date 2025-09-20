-- MoneyWise MVP v0.1.0 Database Initialization
-- Basic database setup for PostgreSQL

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Basic database health check
SELECT 'MoneyWise Database Initialized' as status;