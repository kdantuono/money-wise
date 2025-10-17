#!/bin/bash
# Database Reset Script
# TASK-001-026: Setup Development Scripts

set -e  # Exit on any error

echo "🗄️ MoneyWise Database Reset"
echo "=========================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Warning prompt
print_warning "This will completely reset the database and all data will be lost!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Database reset cancelled"
    exit 0
fi

# Stop database container
print_status "Stopping database container..."
docker compose -f docker-compose.dev.yml stop postgres

# Remove database volume
print_status "Removing database volume..."
docker compose -f docker-compose.dev.yml down -v postgres

# Start database with fresh volume
print_status "Starting fresh database..."
docker compose -f docker-compose.dev.yml up -d postgres

# Wait for database to be ready
print_status "Waiting for database to initialize..."
sleep 15

# Run migrations
print_status "Running database migrations..."
cd apps/backend
pnpm migration:run || print_warning "No migrations found"
cd ../..

# Run seeders if available
if [ -f "scripts/seed-data.sh" ]; then
    print_status "Running database seeders..."
    ./scripts/seed-data.sh
fi

print_success "✅ Database reset complete!"
print_status "Database is ready for development"