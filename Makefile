# MoneyWise - Development Makefile
# Provides common development commands following Milestone 1 requirements

.PHONY: help install dev test build clean lint typecheck docker-up docker-down docker-logs db-reset db-migrate db-seed format

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)MoneyWise Development Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Setup & Installation:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(install|clean)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(dev|docker|db-)"
	@echo ""
	@echo "$(GREEN)Testing & Quality:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(test|lint|typecheck|format|build)"

install: ## Install all dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	pnpm install --frozen-lockfile
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

dev: ## Start development environment (Docker + Dev servers)
	@echo "$(GREEN)Starting development environment...$(NC)"
	@$(MAKE) docker-up
	@sleep 3
	pnpm dev

test: ## Run all tests with coverage
	@echo "$(GREEN)Running test suite...$(NC)"
	pnpm test:ci

test-unit: ## Run unit tests only
	@echo "$(GREEN)Running unit tests...$(NC)"
	pnpm test:unit

test-e2e: ## Run E2E tests
	@echo "$(GREEN)Running E2E tests...$(NC)"
	pnpm test:e2e

build: ## Build all packages
	@echo "$(GREEN)Building all packages...$(NC)"
	pnpm build
	@echo "$(GREEN)✅ Build completed$(NC)"

lint: ## Run linting
	@echo "$(GREEN)Running linters...$(NC)"
	pnpm lint

lint-fix: ## Fix linting issues
	@echo "$(GREEN)Fixing linting issues...$(NC)"
	pnpm lint:fix

typecheck: ## Run TypeScript type checking
	@echo "$(GREEN)Running type checks...$(NC)"
	pnpm typecheck

format: ## Format code with Prettier
	@echo "$(GREEN)Formatting code...$(NC)"
	pnpm format

# Docker commands
docker-up: ## Start Docker services
	@echo "$(GREEN)Starting Docker services...$(NC)"
	docker compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✅ Docker services started$(NC)"

docker-down: ## Stop Docker services
	@echo "$(YELLOW)Stopping Docker services...$(NC)"
	docker compose -f docker-compose.dev.yml down

docker-logs: ## View Docker logs
	docker compose -f docker-compose.dev.yml logs -f

# Database commands
db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	pnpm db:migrate

db-seed: ## Seed database with sample data
	@echo "$(GREEN)Seeding database...$(NC)"
	pnpm db:seed

db-reset: ## Reset database (migrate + seed)
	@echo "$(YELLOW)Resetting database...$(NC)"
	pnpm db:reset

# Cleanup
clean: ## Clean node_modules and build artifacts
	@echo "$(YELLOW)Cleaning workspace...$(NC)"
	pnpm clean
	@echo "$(GREEN)✅ Workspace cleaned$(NC)"

# Quality checks (run before commit)
check: lint typecheck test ## Run all quality checks

# Development workflow
setup: install docker-up db-migrate ## Complete setup for new developers
	@echo "$(GREEN)🎉 Setup complete! Run 'make dev' to start development$(NC)"

# Health check
health: ## Check system health
	@echo "$(GREEN)Checking system health...$(NC)"
	@echo "Node version: $$(node --version)"
	@echo "pnpm version: $$(pnpm --version)"
	@echo "Docker status: $$(docker --version)"
	@echo "Docker Compose status: $$(docker compose version)"
	@echo "$(GREEN)✅ System health check completed$(NC)"