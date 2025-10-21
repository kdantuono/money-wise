#!/bin/bash

################################################################################
# Environment Verification Script for MoneyWise
################################################################################
# Validates that all required environment variables and services are properly
# configured for development, staging, or production.
#
# Usage:
#   ./.claude/scripts/verify-environment.sh [environment]
#   ./.claude/scripts/verify-environment.sh development
#   ./.claude/scripts/verify-environment.sh production
#
# Environment defaults to reading from NODE_ENV or .env files.
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Environment
ENV=${1:-${NODE_ENV:-development}}

################################################################################
# Helper Functions
################################################################################

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_file_exists() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo_success "$description exists: $file"
        return 0
    else
        echo_error "$description NOT FOUND: $file"
        return 1
    fi
}

check_env_variable() {
    local var=$1
    local description=$2
    local required=${3:-true}

    if [ -z "${!var}" ]; then
        if [ "$required" = true ]; then
            echo_error "Required environment variable NOT SET: $var ($description)"
            return 1
        else
            echo_warning "Optional environment variable NOT SET: $var ($description)"
            return 0
        fi
    else
        echo_success "Environment variable SET: $var"
        return 0
    fi
}

check_command_exists() {
    local cmd=$1
    local description=$2

    if command -v "$cmd" &> /dev/null; then
        echo_success "$description is installed"
        return 0
    else
        echo_error "$description is NOT installed (need command: $cmd)"
        return 1
    fi
}

check_service_running() {
    local port=$1
    local service=$2

    if lsof -i ":$port" &> /dev/null; then
        echo_success "$service is running on port $port"
        return 0
    else
        echo_warning "$service is NOT running on port $port"
        echo "  Tip: Start with docker-compose -f docker-compose.dev.yml up"
        return 1
    fi
}

check_docker_service() {
    local service=$1

    if docker-compose ps "$service" 2>/dev/null | grep -q "running"; then
        echo_success "Docker service '$service' is running"
        return 0
    else
        echo_error "Docker service '$service' is NOT running"
        return 1
    fi
}

check_env_file_readable() {
    local file=$1
    local env_name=$2

    if [ -r "$file" ]; then
        echo_success ".env file readable: $file"
        return 0
    else
        echo_error ".env file NOT readable: $file"
        return 1
    fi
}

################################################################################
# Main Verification
################################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         MoneyWise Environment Verification Script              ║"
echo "║                    Environment: $ENV"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Check Required Commands
echo_info "1️⃣  Checking required commands..."
check_command_exists "node" "Node.js"
check_command_exists "pnpm" "pnpm package manager"
check_command_exists "docker" "Docker"
check_command_exists "docker-compose" "Docker Compose"
echo ""

# 2. Check Environment Files
echo_info "2️⃣  Checking environment files..."
check_file_exists ".env.example" "Root .env.example template"
check_file_exists "apps/backend/.env.example" "Backend .env.example"
check_file_exists "apps/web/.env.example" "Web .env.example"

# Check for actual env files (required to run)
if [ "$ENV" = "development" ]; then
    if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
        echo_error "No .env file found. Run: cp .env.example .env.local"
    else
        check_file_exists ".env" ".env file" || check_file_exists ".env.local" ".env.local file"
    fi
fi

if [ ! -f "apps/backend/.env" ] && [ ! -f "apps/backend/.env.development" ]; then
    echo_error "No backend .env file found. Run: cp apps/backend/.env.example apps/backend/.env"
else
    echo_success "Backend .env file exists"
fi

if [ ! -f "apps/web/.env.local" ] && [ ! -f "apps/web/.env" ]; then
    echo_error "No web .env file found. Run: cp apps/web/.env.example apps/web/.env.local"
else
    echo_success "Web .env file exists"
fi
echo ""

# 3. Load environment variables
echo_info "3️⃣  Loading environment variables..."
if [ -f ".env.local" ]; then
    set -a
    source ".env.local"
    set +a
    echo_success "Loaded .env.local"
elif [ -f ".env" ]; then
    set -a
    source ".env"
    set +a
    echo_success "Loaded .env"
fi

# Load backend env
if [ -f "apps/backend/.env" ]; then
    set -a
    source "apps/backend/.env"
    set +a
    echo_success "Loaded apps/backend/.env"
elif [ -f "apps/backend/.env.development" ]; then
    set -a
    source "apps/backend/.env.development"
    set +a
    echo_success "Loaded apps/backend/.env.development"
fi
echo ""

# 4. Check Required Environment Variables
echo_info "4️⃣  Checking required environment variables..."
check_env_variable "DB_HOST" "Database Host" true
check_env_variable "DB_PORT" "Database Port" true
check_env_variable "DB_USERNAME" "Database Username" true
check_env_variable "DB_PASSWORD" "Database Password" true
check_env_variable "DB_NAME" "Database Name" true
check_env_variable "REDIS_HOST" "Redis Host" true
check_env_variable "REDIS_PORT" "Redis Port" true
check_env_variable "JWT_ACCESS_SECRET" "JWT Access Secret" true
check_env_variable "JWT_REFRESH_SECRET" "JWT Refresh Secret" true
check_env_variable "NEXT_PUBLIC_API_URL" "Frontend API URL" true
echo ""

# 5. Check Optional Environment Variables
echo_info "5️⃣  Checking optional environment variables..."
check_env_variable "SENTRY_DSN" "Sentry DSN" false
check_env_variable "PLAID_CLIENT_ID" "Plaid Client ID" false
check_env_variable "PLAID_SECRET" "Plaid Secret" false
echo ""

# 6. Check Services (for development)
if [ "$ENV" = "development" ]; then
    echo_info "6️⃣  Checking Docker services..."
    if docker-compose ps &> /dev/null; then
        check_docker_service "postgres"
        check_docker_service "redis"
    else
        echo_warning "Docker Compose not running. Start with:"
        echo "  docker-compose -f docker-compose.dev.yml up"
    fi
    echo ""
fi

# 7. Check Node Modules
echo_info "7️⃣  Checking Node modules..."
if [ -d "node_modules" ]; then
    echo_success "Root node_modules directory exists"
else
    echo_error "Root node_modules NOT FOUND. Run: pnpm install"
fi

if [ -d "apps/backend/node_modules" ]; then
    echo_success "Backend node_modules directory exists"
else
    echo_warning "Backend node_modules NOT FOUND. Run: pnpm install"
fi

if [ -d "apps/web/node_modules" ]; then
    echo_success "Web node_modules directory exists"
else
    echo_warning "Web node_modules NOT FOUND. Run: pnpm install"
fi
echo ""

# 8. Check JWT Secret Strength
echo_info "8️⃣  Checking JWT secret strength..."
if [ -n "$JWT_ACCESS_SECRET" ]; then
    if [ ${#JWT_ACCESS_SECRET} -ge 32 ]; then
        echo_success "JWT_ACCESS_SECRET is at least 32 characters (${#JWT_ACCESS_SECRET} chars)"
    else
        echo_error "JWT_ACCESS_SECRET is too short (${#JWT_ACCESS_SECRET} chars, need ≥32)"
    fi
fi

if [ -n "$JWT_REFRESH_SECRET" ]; then
    if [ ${#JWT_REFRESH_SECRET} -ge 32 ]; then
        echo_success "JWT_REFRESH_SECRET is at least 32 characters (${#JWT_REFRESH_SECRET} chars)"
    else
        echo_error "JWT_REFRESH_SECRET is too short (${#JWT_REFRESH_SECRET} chars, need ≥32)"
    fi
fi

if [ "$JWT_ACCESS_SECRET" = "$JWT_REFRESH_SECRET" ]; then
    echo_error "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be DIFFERENT!"
else
    echo_success "JWT secrets are different (good)"
fi
echo ""

################################################################################
# Summary
################################################################################

TOTAL=$((PASSED + FAILED + WARNINGS))

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION SUMMARY                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ PASSED:  $PASSED${NC}"
echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS${NC}"
echo -e "${RED}❌ FAILED:  $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo_success "Environment verification PASSED ✨"
    echo ""
    echo "Next steps:"
    echo "  1. Start development server: pnpm dev"
    echo "  2. Open browser: http://localhost:3000"
    echo "  3. API docs: http://localhost:3001/api/docs"
    echo ""
    exit 0
else
    echo_error "Environment verification FAILED - $FAILED issue(s) to fix"
    echo ""
    echo "Next steps:"
    echo "  1. Review errors above"
    echo "  2. Run: docker-compose -f docker-compose.dev.yml up"
    echo "  3. Copy env files: cp .env.example .env.local && cp apps/backend/.env.example apps/backend/.env"
    echo "  4. Re-run this script: ./.claude/scripts/verify-environment.sh"
    echo ""
    exit 1
fi
