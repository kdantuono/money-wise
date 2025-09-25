#!/bin/bash

# MoneyWise Development Environment Validation Script
# Ensures all required tools and services are properly configured

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track validation results
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((VALIDATION_WARNINGS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((VALIDATION_ERRORS++))
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 is installed"
        if [ -n "${2:-}" ]; then
            local version=$($1 $2)
            echo "    Version: $version"
        fi
        return 0
    else
        log_error "$1 is not installed"
        return 1
    fi
}

check_node_version() {
    if command -v node &> /dev/null; then
        local version=$(node --version | sed 's/v//')
        local major_version=$(echo $version | cut -d. -f1)

        if [ "$major_version" -ge 18 ]; then
            log_success "Node.js version is compatible ($version)"
        else
            log_error "Node.js version is too old ($version). Required: >=18.0.0"
        fi
    else
        log_error "Node.js is not installed"
    fi
}

check_pnpm_version() {
    if command -v pnpm &> /dev/null; then
        local version=$(pnpm --version)
        local major_version=$(echo $version | cut -d. -f1)

        if [ "$major_version" -ge 8 ]; then
            log_success "pnpm version is compatible ($version)"
        else
            log_error "pnpm version is too old ($version). Required: >=8.0.0"
        fi
    else
        log_error "pnpm is not installed"
        echo "  Install with: npm install -g pnpm@latest"
    fi
}

check_docker_services() {
    log_info "Checking Docker services..."

    if ! docker compose -f docker-compose.dev.yml ps --services --filter "status=running" | grep -q "postgres"; then
        log_error "PostgreSQL service is not running"
        echo "  Start with: docker compose -f docker-compose.dev.yml up -d postgres"
    else
        log_success "PostgreSQL service is running"
    fi

    if ! docker compose -f docker-compose.dev.yml ps --services --filter "status=running" | grep -q "redis"; then
        log_error "Redis service is not running"
        echo "  Start with: docker compose -f docker-compose.dev.yml up -d redis"
    else
        log_success "Redis service is running"
    fi
}

check_git_configuration() {
    log_info "Checking Git configuration..."

    if git config user.name &> /dev/null && git config user.email &> /dev/null; then
        local name=$(git config user.name)
        local email=$(git config user.email)
        log_success "Git is configured (Name: $name, Email: $email)"
    else
        log_warning "Git user configuration is incomplete"
        echo "  Configure with: git config --global user.name 'Your Name'"
        echo "  Configure with: git config --global user.email 'your.email@example.com'"
    fi

    local current_branch=$(git branch --show-current)
    if [ "$current_branch" = "main" ]; then
        log_warning "Currently on main branch. Switch to a feature branch for development."
        echo "  Create feature branch: git checkout -b feature/your-feature-name"
    else
        log_success "Working on feature branch: $current_branch"
    fi
}

check_project_structure() {
    log_info "Checking project structure..."

    local required_dirs=("apps/backend" "apps/web" "apps/mobile" "packages/types" "packages/utils" "packages/ui" "packages/config")
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Directory exists: $dir"
        else
            log_error "Directory missing: $dir"
        fi
    done

    local required_files=("package.json" "docker-compose.dev.yml" ".gitignore" "CLAUDE.md")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "File exists: $file"
        else
            log_error "File missing: $file"
        fi
    done
}

check_database_connectivity() {
    log_info "Checking database connectivity..."

    if docker exec postgres-dev pg_isready -U app_user -d app_dev &> /dev/null; then
        log_success "PostgreSQL is accessible"
    else
        log_error "Cannot connect to PostgreSQL"
        echo "  Check if container is running: docker ps"
        echo "  Check logs: docker logs postgres-dev"
    fi

    if docker exec redis-dev redis-cli ping &> /dev/null; then
        log_success "Redis is accessible"
    else
        log_error "Cannot connect to Redis"
        echo "  Check if container is running: docker ps"
        echo "  Check logs: docker logs redis-dev"
    fi
}

check_environment_variables() {
    log_info "Checking environment configuration..."

    if [ -f ".env.local" ] || [ -f ".env" ]; then
        log_success "Environment file found"
    else
        log_warning "No environment file found (.env.local or .env)"
        echo "  Create .env.local with required variables"
    fi
}

validate_claude_orchestration() {
    log_info "Checking Claude orchestration system..."

    local claude_dirs=(".claude/agents" ".claude/commands" ".claude/config" ".claude/orchestration" ".claude/workflows")
    for dir in "${claude_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Claude directory exists: $dir"
        else
            log_error "Claude directory missing: $dir"
        fi
    done

    if [ -f ".claude/config/agent-matrix.yaml" ]; then
        log_success "Agent matrix configuration found"
    else
        log_error "Agent matrix configuration missing"
    fi
}

print_summary() {
    echo
    echo "=================================="
    echo "VALIDATION SUMMARY"
    echo "=================================="

    if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ Environment is fully configured!${NC}"
        echo "You're ready to start development."
    elif [ $VALIDATION_ERRORS -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Environment is mostly configured${NC}"
        echo "Warnings: $VALIDATION_WARNINGS"
        echo "Consider addressing warnings for optimal development experience."
    else
        echo -e "${RED}❌ Environment configuration incomplete${NC}"
        echo "Errors: $VALIDATION_ERRORS"
        echo "Warnings: $VALIDATION_WARNINGS"
        echo "Fix errors before starting development."
        exit 1
    fi
}

main() {
    echo "🔍 MoneyWise Development Environment Validation"
    echo "=============================================="
    echo

    # Core tools
    log_info "Checking core development tools..."
    check_command "git" "--version"
    check_node_version
    check_pnpm_version
    check_command "docker" "--version"
    check_command "docker-compose" "--version"

    echo

    # Project structure
    check_project_structure
    echo

    # Git configuration
    check_git_configuration
    echo

    # Docker services
    check_docker_services
    echo

    # Database connectivity
    check_database_connectivity
    echo

    # Environment variables
    check_environment_variables
    echo

    # Claude orchestration
    validate_claude_orchestration
    echo

    print_summary
}

# Run validation
main "$@"