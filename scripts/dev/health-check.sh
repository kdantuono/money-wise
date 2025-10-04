#!/bin/bash
# Service Health Check Script
# TASK-001-026: Setup Development Scripts

echo "🏥 MoneyWise Service Health Check"
echo "================================"

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
    echo -e "${GREEN}[✅ HEALTHY]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠️  WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[❌ ERROR]${NC} $1"
}

# Check Docker services
print_status "Checking Docker services..."

if docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}" | grep -q "Up"; then
    print_success "Docker services are running"
    echo "$(docker compose -f docker-compose.dev.yml ps)"
    echo ""
else
    print_error "Docker services are not running"
    echo "Run: docker compose -f docker-compose.dev.yml up -d"
    echo ""
fi

# Check PostgreSQL/TimescaleDB
print_status "Checking TimescaleDB connection..."
if docker exec postgres-dev pg_isready -U postgres -d moneywise &> /dev/null; then
    print_success "TimescaleDB is accessible"

    # Check TimescaleDB extension
    extension_check=$(docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT count(*) FROM pg_extension WHERE extname = 'timescaledb';" -t | xargs)
    if [ "$extension_check" = "1" ]; then
        print_success "TimescaleDB extension is enabled"
    else
        print_warning "TimescaleDB extension is not enabled"
    fi
else
    print_error "Cannot connect to TimescaleDB"
fi

# Check Redis
print_status "Checking Redis connection..."
if docker exec redis-dev redis-cli ping | grep -q "PONG"; then
    print_success "Redis is accessible"
else
    print_error "Cannot connect to Redis"
fi

# Check Node.js backend (if running)
print_status "Checking Node.js backend..."
if curl -s http://localhost:3001/health &> /dev/null; then
    print_success "Backend API is accessible at http://localhost:3001"
else
    print_warning "Backend API is not running at http://localhost:3001"
    echo "Start with: cd apps/backend && pnpm dev"
fi

# Check Next.js frontend (if running)
print_status "Checking Next.js frontend..."
if curl -s http://localhost:3000 &> /dev/null; then
    print_success "Frontend is accessible at http://localhost:3000"
else
    print_warning "Frontend is not running at http://localhost:3000"
    echo "Start with: cd apps/web && pnpm dev"
fi

echo ""
print_status "Health check complete"