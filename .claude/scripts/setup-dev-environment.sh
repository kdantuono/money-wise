#!/bin/bash

# MoneyWise Development Environment Setup Script
# Automatically configures the complete development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi

    log_success "All prerequisites are installed"
}

install_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        log_info "Installing pnpm..."
        npm install -g pnpm@latest
        log_success "pnpm installed successfully"
    else
        log_success "pnpm is already installed"
    fi
}

setup_git_hooks() {
    log_info "Setting up Git hooks..."

    # Install husky if dependencies are installed
    if [ -d "node_modules" ]; then
        pnpm exec husky install
        log_success "Git hooks configured with Husky"
    else
        log_info "Git hooks will be configured after dependency installation"
    fi
}

start_docker_services() {
    log_info "Starting Docker services..."

    if docker compose -f docker-compose.dev.yml up -d; then
        log_success "Docker services started successfully"

        # Wait for services to be healthy
        log_info "Waiting for services to be healthy..."
        local timeout=60
        local elapsed=0

        while [ $elapsed -lt $timeout ]; do
            if docker compose -f docker-compose.dev.yml ps --format "table {{.Service}}\t{{.Status}}" | grep -q "healthy"; then
                log_success "All services are healthy"
                break
            fi

            sleep 2
            elapsed=$((elapsed + 2))
            echo -n "."
        done

        if [ $elapsed -ge $timeout ]; then
            log_warning "Services may not be fully healthy. Check with: docker compose logs"
        fi
    else
        log_error "Failed to start Docker services"
        exit 1
    fi
}

install_dependencies() {
    log_info "Installing project dependencies..."

    if pnpm install; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

create_environment_files() {
    log_info "Creating environment configuration..."

    if [ ! -f ".env.local" ]; then
        cat > .env.local << 'EOF'
# Development Environment Variables
NODE_ENV=development

# Database
DATABASE_URL=postgresql://app_user:password@localhost:5432/app_dev
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=app_dev
DATABASE_USER=app_user
DATABASE_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API Configuration
API_PORT=3001
API_PREFIX=api/v1

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Development Tools
DEBUG=money-wise:*
LOG_LEVEL=debug
EOF
        log_success "Environment file created: .env.local"
        log_warning "Remember to update secrets before deploying to production!"
    else
        log_success "Environment file already exists: .env.local"
    fi
}

create_basic_config_files() {
    log_info "Creating basic configuration files..."

    # TypeScript config for packages
    if [ ! -f "packages/types/tsconfig.json" ]; then
        cat > packages/types/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
        log_success "TypeScript config created for types package"
    fi

    # Create basic index files for packages
    local packages=("types" "utils" "ui" "config")
    for package in "${packages[@]}"; do
        local src_dir="packages/$package/src"
        local index_file="$src_dir/index.ts"

        if [ ! -d "$src_dir" ]; then
            mkdir -p "$src_dir"
        fi

        if [ ! -f "$index_file" ]; then
            echo "// $package package exports" > "$index_file"
            echo "export * from './$package'" >> "$index_file"
            log_success "Created index file: $index_file"
        fi
    done
}

validate_setup() {
    log_info "Validating setup..."

    if ./.claude/scripts/validate-environment.sh; then
        log_success "Environment validation passed!"
        return 0
    else
        log_error "Environment validation failed. Please check the issues above."
        return 1
    fi
}

create_development_shortcuts() {
    log_info "Creating development shortcuts..."

    # Create a quick development start script
    cat > dev.sh << 'EOF'
#!/bin/bash
# Quick development environment startup

echo "🚀 Starting MoneyWise Development Environment"
echo "============================================="

# Start Docker services
echo "📦 Starting Docker services..."
docker compose -f docker-compose.dev.yml up -d

# Wait a moment for services to start
sleep 3

# Start development servers (when implemented)
echo "💻 Development servers will start here when implemented"
echo "   Backend: pnpm dev:backend"
echo "   Frontend: pnpm dev:web"

echo "✅ Development environment is ready!"
EOF

    chmod +x dev.sh
    log_success "Development shortcut created: ./dev.sh"
}

print_next_steps() {
    echo
    echo "🎉 Development Environment Setup Complete!"
    echo "=========================================="
    echo
    echo "Next steps:"
    echo "1. 🏗️  Initialize the NestJS backend application"
    echo "2. 🌐  Initialize the Next.js frontend application"
    echo "3. 🗄️  Create database schema and migrations"
    echo "4. 🔐  Implement authentication system"
    echo
    echo "Quick commands:"
    echo "• Start development: ./dev.sh"
    echo "• Run validation: ./.claude/scripts/validate-environment.sh"
    echo "• Check services: docker compose ps"
    echo "• View logs: docker compose logs -f"
    echo
    echo "Ready for EPIC-001 completion! 🚀"
}

main() {
    echo "🛠️  MoneyWise Development Environment Setup"
    echo "==========================================="
    echo

    check_prerequisites
    install_pnpm
    create_environment_files
    install_dependencies
    setup_git_hooks
    start_docker_services
    create_basic_config_files
    create_development_shortcuts

    echo

    if validate_setup; then
        print_next_steps
    else
        log_error "Setup completed with issues. Please address validation errors."
        exit 1
    fi
}

# Allow script to be sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi