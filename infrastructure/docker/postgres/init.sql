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