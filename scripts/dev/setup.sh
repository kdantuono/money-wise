#!/bin/bash
# Development Environment Setup Script
# TASK-001-026: Setup Development Scripts

set -e  # Exit on any error

echo "🚀 MoneyWise Development Environment Setup"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check prerequisites
print_status "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

print_success "All prerequisites are installed"

# Install dependencies
print_status "Installing dependencies..."
pnpm install

# Start infrastructure services
print_status "Starting infrastructure services (PostgreSQL + Redis)..."
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
if docker compose -f docker-compose.dev.yml ps | grep -q "healthy"; then
    print_success "Infrastructure services are running"
else
    print_warning "Some services may not be fully ready yet"
fi

# Run database migrations
print_status "Running database migrations..."
cd apps/backend
pnpm migration:run || print_warning "No migrations to run"
cd ../..

print_success "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'pnpm dev' to start the development servers"
echo "2. Visit http://localhost:3000 for the frontend"
echo "3. Visit http://localhost:3001 for the backend API"
echo ""
echo "Useful commands:"
echo "- ./scripts/reset-db.sh    Reset database"
echo "- ./scripts/health-check.sh Check service health"
echo "- docker compose -f docker-compose.dev.yml logs  View service logs"