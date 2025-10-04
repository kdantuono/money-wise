#!/bin/bash

# MoneyWise Database Test Runner
# Comprehensive testing script for database functionality

set -e

echo "🎯 MoneyWise Database Test Suite"
echo "================================="

# Change to backend directory
cd "$(dirname "$0")/../../../.."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in backend directory"
    exit 1
fi

echo "📁 Working directory: $(pwd)"

# Check database connection
echo "🔍 Checking database prerequisites..."

# Check if Docker is available for TestContainers
if command -v docker &> /dev/null; then
    echo "✅ Docker is available"
    export USE_TEST_CONTAINERS=true

    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        echo "✅ Docker daemon is running"
    else
        echo "⚠️ Docker daemon not running, will use local PostgreSQL"
        export USE_TEST_CONTAINERS=false
    fi
else
    echo "⚠️ Docker not available, will use local PostgreSQL"
    export USE_TEST_CONTAINERS=false
fi

# Set test environment
export NODE_ENV=test
export DB_SYNCHRONIZE=true
export DB_LOGGING=false

# If using local PostgreSQL, set default connection parameters
if [ "$USE_TEST_CONTAINERS" = "false" ]; then
    export DB_HOST=${DB_HOST:-localhost}
    export DB_PORT=${DB_PORT:-5432}
    export DB_USERNAME=${DB_USERNAME:-postgres}
    export DB_PASSWORD=${DB_PASSWORD:-postgres}
    export DB_NAME=${DB_NAME:-moneywise_test}
    export DB_SCHEMA=${DB_SCHEMA:-public}

    echo "🐘 Using local PostgreSQL:"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USERNAME"
fi

# Run different test suites based on argument
case "${1:-all}" in
    "all")
        echo "🚀 Running all database tests..."
        npm run test:db
        ;;
    "coverage")
        echo "📊 Running database tests with coverage..."
        npm run test:db:coverage
        ;;
    "performance")
        echo "⚡ Running performance tests only..."
        npm run test:db:performance
        ;;
    "suite")
        echo "🎯 Running complete test suite with report..."
        npm run test:db:suite
        ;;
    "watch")
        echo "👀 Running database tests in watch mode..."
        npm run test:db:watch
        ;;
    *)
        echo "❌ Unknown test type: $1"
        echo "Usage: $0 [all|coverage|performance|suite|watch]"
        exit 1
        ;;
esac

echo "✅ Database tests completed successfully!"