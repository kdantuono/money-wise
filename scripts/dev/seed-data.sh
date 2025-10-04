#!/bin/bash
# Database Seed Data Script
# TASK-001-026: Setup Development Scripts

echo "🌱 MoneyWise Database Seeder"
echo "==========================="

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

# Check if database is accessible
if ! docker exec postgres-dev pg_isready -U postgres -d moneywise &> /dev/null; then
    print_error "Cannot connect to database. Is it running?"
    exit 1
fi

print_status "Seeding development data..."

# Check if backend has seed command
if [ -f "apps/backend/package.json" ] && grep -q "seed" apps/backend/package.json; then
    print_status "Running backend seed command..."
    cd apps/backend
    pnpm seed
    cd ../..
else
    print_warning "No backend seed command found"

    # Fallback: create basic seed data via SQL
    print_status "Creating basic seed data via SQL..."

    docker exec postgres-dev psql -U postgres -d moneywise -c "
    -- Insert sample categories
    INSERT INTO categories (id, name, type, color, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Groceries', 'expense', '#FF6B6B', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'Salary', 'income', '#4ECDC4', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'Utilities', 'expense', '#45B7D1', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440004', 'Entertainment', 'expense', '#96CEB4', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Insert sample user (will be replaced with proper auth later)
    INSERT INTO users (id, email, first_name, last_name, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'dev@moneywise.app', 'Dev', 'User', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    " 2>/dev/null || print_warning "Could not insert seed data (tables may not exist yet)"
fi

print_success "✅ Database seeding complete!"
print_status "Development data is ready for use"