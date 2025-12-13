#!/bin/bash
# MoneyWise Dev-Ready Script
# Interactive development environment setup with tmux split view
#
# Usage: pnpm dev:ready
#
# This script:
# 1. Verifies .env files are present and configured
# 2. Verifies Docker services (PostgreSQL + Redis) are running
# 3. Applies pending Prisma migrations
# 4. Seeds the database if empty
# 5. Starts backend + frontend in a split tmux session

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the script's directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
BACKEND_ENV="$PROJECT_ROOT/apps/backend/.env"
BACKEND_ENV_TEST="$PROJECT_ROOT/apps/backend/.env.test"
TMUX_SESSION="moneywise-dev"

# Utility functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    echo -e "${YELLOW}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

prompt_continue() {
    local prompt_msg="$1"
    local default="${2:-Y}"

    if [[ "$default" == "Y" ]]; then
        read -p "$(echo -e "${CYAN}?${NC} $prompt_msg [Y/n]: ")" response
        response=${response:-Y}
    else
        read -p "$(echo -e "${CYAN}?${NC} $prompt_msg [y/N]: ")" response
        response=${response:-N}
    fi

    [[ "$response" =~ ^[Yy]$ ]]
}

# Change to project root
cd "$PROJECT_ROOT"

print_header "MoneyWise Dev-Ready Script"

# ============================================================================
# STEP 1: Check .env files
# ============================================================================
print_step "Checking environment files..."

env_errors=0

if [[ -f "$BACKEND_ENV" ]]; then
    print_success "Found: apps/backend/.env"

    # Validate DATABASE_URL
    if grep -q "DATABASE_URL=postgresql://" "$BACKEND_ENV"; then
        db_url=$(grep "DATABASE_URL=" "$BACKEND_ENV" | cut -d'=' -f2-)
        print_success "DATABASE_URL configured: ${db_url:0:40}..."
    else
        print_error "DATABASE_URL not properly configured in .env"
        env_errors=$((env_errors + 1))
    fi
else
    print_error "Missing: apps/backend/.env"
    echo -e "         ${YELLOW}Copy from .env.example or create manually${NC}"
    env_errors=$((env_errors + 1))
fi

if [[ -f "$BACKEND_ENV_TEST" ]]; then
    print_success "Found: apps/backend/.env.test"
else
    print_warning "Missing: apps/backend/.env.test (optional for dev)"
fi

if [[ $env_errors -gt 0 ]]; then
    print_error "Environment check failed. Please fix the issues above."
    exit 1
fi

echo ""

# ============================================================================
# STEP 2: Check Docker services
# ============================================================================
print_step "Checking Docker services..."

docker_running=true

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check PostgreSQL
if docker ps --filter "name=postgres-dev" --format "{{.Names}}" 2>/dev/null | grep -q "postgres-dev"; then
    print_success "PostgreSQL (postgres-dev) is running"
else
    print_warning "PostgreSQL (postgres-dev) is not running"
    docker_running=false
fi

# Check Redis
if docker ps --filter "name=redis-dev" --format "{{.Names}}" 2>/dev/null | grep -q "redis-dev"; then
    print_success "Redis (redis-dev) is running"
else
    print_warning "Redis (redis-dev) is not running"
    docker_running=false
fi

if [[ "$docker_running" == "false" ]]; then
    echo ""
    if prompt_continue "Start Docker services with 'docker compose up -d'?"; then
        print_step "Starting Docker services..."
        docker compose -f docker-compose.dev.yml up -d

        # Wait for services to be healthy
        print_step "Waiting for services to be ready..."
        sleep 3

        # Verify they started
        if docker ps --filter "name=postgres-dev" --format "{{.Names}}" | grep -q "postgres-dev"; then
            print_success "PostgreSQL started successfully"
        else
            print_error "PostgreSQL failed to start"
            exit 1
        fi

        if docker ps --filter "name=redis-dev" --format "{{.Names}}" | grep -q "redis-dev"; then
            print_success "Redis started successfully"
        else
            print_error "Redis failed to start"
            exit 1
        fi
    else
        print_error "Docker services are required. Exiting."
        exit 1
    fi
fi

echo ""

# ============================================================================
# STEP 3: Check Prisma migrations
# ============================================================================
print_step "Checking database migrations..."

cd "$PROJECT_ROOT/apps/backend"

# Check migration status
migration_output=$(npx prisma migrate status 2>&1) || true

if echo "$migration_output" | grep -q "Database schema is up to date"; then
    print_success "All migrations are applied"
    migrations_pending=false
elif echo "$migration_output" | grep -q "Following migration"; then
    pending_count=$(echo "$migration_output" | grep -c "migration" || echo "0")
    print_warning "Found pending migrations"
    echo "$migration_output" | grep "migration" | head -5
    migrations_pending=true
else
    print_warning "Could not determine migration status"
    echo "$migration_output" | head -5
    migrations_pending=true
fi

if [[ "$migrations_pending" == "true" ]]; then
    echo ""
    if prompt_continue "Apply pending migrations with 'prisma migrate deploy'?"; then
        print_step "Applying migrations..."
        npx prisma migrate deploy
        print_success "Migrations applied successfully"
    else
        print_warning "Skipping migrations. Database may not be ready."
    fi
fi

cd "$PROJECT_ROOT"
echo ""

# ============================================================================
# STEP 4: Check database seeding
# ============================================================================
print_step "Checking database seed status..."

cd "$PROJECT_ROOT/apps/backend"

# Check if users table has data (simple check)
user_count=$(docker exec postgres-dev psql -U postgres -d moneywise -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")

if [[ "$user_count" -gt 0 ]]; then
    print_success "Database has $user_count user(s)"
else
    print_warning "Database appears empty (no users found)"
    echo ""
    if prompt_continue "Seed database with test data?"; then
        print_step "Seeding database..."
        npx prisma db seed
        print_success "Database seeded successfully"
        echo -e "         ${GREEN}Test user: test@example.com / SecurePass123!${NC}"
    else
        print_warning "Skipping seed. You may need to create users manually."
    fi
fi

cd "$PROJECT_ROOT"
echo ""

# ============================================================================
# STEP 5: Start tmux session
# ============================================================================
print_step "Preparing development servers..."

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    print_error "tmux is not installed"
    echo -e "         ${YELLOW}Install with: sudo apt install tmux${NC}"
    echo ""
    if prompt_continue "Start servers without tmux (in current terminal)?"; then
        print_step "Starting backend and frontend with concurrently..."
        pnpm dev
    fi
    exit 0
fi

# Check if session already exists
if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    print_warning "tmux session '$TMUX_SESSION' already exists"
    if prompt_continue "Kill existing session and create new one?"; then
        tmux kill-session -t "$TMUX_SESSION"
    else
        echo ""
        if prompt_continue "Attach to existing session?"; then
            exec tmux attach-session -t "$TMUX_SESSION"
        else
            print_success "Exiting. Run 'tmux attach -t $TMUX_SESSION' to connect later."
            exit 0
        fi
    fi
fi

echo ""
if prompt_continue "Start development servers in tmux split view?"; then
    print_step "Creating tmux session..."

    # Create new detached session
    tmux new-session -d -s "$TMUX_SESSION" -n main -c "$PROJECT_ROOT"

    # Top pane: Backend with debug logging
    tmux send-keys -t "$TMUX_SESSION:main" "cd $PROJECT_ROOT && echo '🚀 Starting Backend (DEBUG mode)...' && DEBUG=nestjs:* pnpm dev:backend" C-m

    # Split horizontally
    tmux split-window -v -t "$TMUX_SESSION:main" -c "$PROJECT_ROOT"

    # Bottom pane: Frontend
    tmux send-keys -t "$TMUX_SESSION:main.1" "cd $PROJECT_ROOT && echo '🌐 Starting Frontend...' && pnpm dev:web" C-m

    # Select top pane
    tmux select-pane -t "$TMUX_SESSION:main.0"

    print_success "tmux session '$TMUX_SESSION' created"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  Development Environment Ready!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}Backend:${NC}  http://localhost:3001  (top pane)"
    echo -e "  ${BLUE}Frontend:${NC} http://localhost:3000  (bottom pane)"
    echo ""
    echo -e "  ${YELLOW}tmux controls:${NC}"
    echo -e "    Ctrl+B, ↑/↓  - Switch panes"
    echo -e "    Ctrl+B, d    - Detach (keeps running)"
    echo -e "    Ctrl+B, z    - Zoom current pane"
    echo -e "    Ctrl+B, x    - Kill current pane"
    echo ""

    # Attach to the session
    exec tmux attach-session -t "$TMUX_SESSION"
else
    print_success "Environment is ready. Run 'pnpm dev' to start manually."
fi
