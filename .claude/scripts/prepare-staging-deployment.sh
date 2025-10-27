#!/bin/bash

###############################################################################
# MoneyWise Staging Deployment Preparation Script
#
# Purpose: Automate the preparation of staging environment
# Usage: ./prepare-staging-deployment.sh [--help] [--check] [--generate] [--verify]
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/backend"
WEB_DIR="$REPO_ROOT/apps/web"
STAGING_DOCS="$REPO_ROOT/docs/deployment/staging"

# Staging configuration
STAGING_DOMAIN="${STAGING_DOMAIN:-staging.moneywise.app}"
STAGING_API_URL="https://staging-api.moneywise.app/api"
BACKEND_ENV_STAGING="$BACKEND_DIR/.env.staging"
WEB_ENV_STAGING="$WEB_DIR/.env.staging"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

generate_secret() {
    local length=${1:-32}
    if check_command openssl; then
        openssl rand -hex $((length / 2))
    else
        print_error "openssl not found - cannot generate secrets"
        return 1
    fi
}

###############################################################################
# Staging Preparation Functions
###############################################################################

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=0

    # Check for required commands
    local required_commands=("git" "docker" "docker-compose" "openssl")
    for cmd in "${required_commands[@]}"; do
        if check_command "$cmd"; then
            print_success "$cmd installed"
        else
            print_error "$cmd not found"
            missing=$((missing + 1))
        fi
    done

    # Check we're in the right directory
    if [ -f "$REPO_ROOT/pnpm-workspace.yaml" ]; then
        print_success "Monorepo root detected"
    else
        print_error "Not in MoneyWise monorepo root"
        return 1
    fi

    if [ $missing -gt 0 ]; then
        print_error "$missing required tools are missing"
        return 1
    fi

    print_success "All prerequisites met"
    return 0
}

check_staging_files() {
    print_header "Checking Staging Configuration Files"

    local missing=0

    # Check for template files
    local templates=(
        "$BACKEND_DIR/.env.staging.example"
        "$WEB_DIR/.env.staging.example"
    )

    for template in "${templates[@]}"; do
        if [ -f "$template" ]; then
            print_success "Template found: $(basename $template)"
        else
            print_error "Missing template: $template"
            missing=$((missing + 1))
        fi
    done

    # Check for existing staging env files
    print_info ""
    if [ -f "$BACKEND_ENV_STAGING" ]; then
        print_warning "Backend staging .env already exists"
    else
        print_info "Backend staging .env not yet created"
    fi

    if [ -f "$WEB_ENV_STAGING" ]; then
        print_warning "Web staging .env already exists"
    else
        print_info "Web staging .env not yet created"
    fi

    if [ $missing -gt 0 ]; then
        print_error "$missing template files are missing"
        return 1
    fi

    return 0
}

generate_staging_secrets() {
    print_header "Generating Staging Secrets"

    local secrets_file="$REPO_ROOT/.claude/staging-secrets.json"

    print_info "Generating secure secrets for staging..."

    # Generate secrets
    local jwt_access_secret=$(generate_secret 32)
    local jwt_refresh_secret=$(generate_secret 32)
    local redis_password=$(generate_secret 32)
    local db_password=$(generate_secret 32)

    # Create secrets file
    cat > "$secrets_file" << EOF
{
  "generated_at": "$(date -Iseconds)",
  "environment": "staging",
  "secrets": {
    "JWT_ACCESS_SECRET": "$jwt_access_secret",
    "JWT_REFRESH_SECRET": "$jwt_refresh_secret",
    "REDIS_PASSWORD": "$redis_password",
    "DB_PASSWORD": "$db_password"
  },
  "instructions": {
    "note": "Store these secrets securely and remove this file after configuration",
    "storage_recommendations": [
      "GitHub Secrets (for CI/CD)",
      "AWS Secrets Manager (for runtime)",
      "HashiCorp Vault (for production-grade management)",
      "1Password / Bitwarden (for team sharing)"
    ]
  }
}
EOF

    # Make file readable only by owner
    chmod 600 "$secrets_file"

    print_success "Staging secrets generated: $secrets_file"
    print_warning "⚠️  This file contains sensitive information!"
    print_info "Please secure and delete after configuration"

    # Display summary
    echo ""
    echo "Generated secrets summary (save these values):"
    echo "  JWT_ACCESS_SECRET: ${jwt_access_secret:0:8}...${jwt_access_secret: -4}"
    echo "  JWT_REFRESH_SECRET: ${jwt_refresh_secret:0:8}...${jwt_refresh_secret: -4}"
    echo "  REDIS_PASSWORD: ${redis_password:0:8}...${redis_password: -4}"
    echo "  DB_PASSWORD: ${db_password:0:8}...${db_password: -4}"
    echo ""

    return 0
}

create_staging_env_files() {
    print_header "Creating Staging Environment Files"

    # Backend .env.staging
    print_info "Creating backend .env.staging..."
    cp "$BACKEND_DIR/.env.staging.example" "$BACKEND_ENV_STAGING"
    print_success "Backend staging .env created: $BACKEND_ENV_STAGING"

    # Web .env.staging
    print_info "Creating web .env.staging..."
    cp "$WEB_DIR/.env.staging.example" "$WEB_ENV_STAGING"
    print_success "Web staging .env created: $WEB_ENV_STAGING"

    # Make them readable only by owner (contain secrets)
    chmod 600 "$BACKEND_ENV_STAGING" "$WEB_ENV_STAGING"
    print_success "Environment files secured (600 permissions)"

    echo ""
    print_warning "NEXT STEPS - Update the following placeholders:"
    echo ""
    echo "Backend ($BACKEND_ENV_STAGING):"
    echo "  - DB_HOST: <staging-db-host>"
    echo "  - DB_PASSWORD: <CHANGE-ME-STAGING-DB-PASSWORD>"
    echo "  - JWT_ACCESS_SECRET: <CHANGE-ME-STAGING-JWT-ACCESS-SECRET>"
    echo "  - JWT_REFRESH_SECRET: <CHANGE-ME-STAGING-JWT-REFRESH-SECRET>"
    echo "  - REDIS_HOST: <staging-redis-host>"
    echo "  - REDIS_PASSWORD: <CHANGE-ME-STAGING-REDIS-PASSWORD>"
    echo "  - SENTRY_DSN: https://<key>@o<org>.ingest.sentry.io/<staging-project-id>"
    echo ""
    echo "Web ($WEB_ENV_STAGING):"
    echo "  - NEXT_PUBLIC_SENTRY_DSN: https://<key>@o<org>.ingest.sentry.io/<staging-project-id>"
    echo ""

    return 0
}

create_staging_deployment_script() {
    print_header "Creating Staging Deployment Script"

    local deploy_script="$REPO_ROOT/.claude/scripts/deploy-staging.sh"

    cat > "$deploy_script" << 'DEPLOY_SCRIPT_EOF'
#!/bin/bash

set -euo pipefail

echo "🚀 MoneyWise Staging Deployment"

# Configuration
BACKEND_DIR="./apps/backend"
WEB_DIR="./apps/web"
STAGING_NAMESPACE="moneywise-staging"

echo "1️⃣  Building Docker images..."
docker build -t moneywise-backend:staging "$BACKEND_DIR/"
docker build -t moneywise-web:staging "$WEB_DIR/"

echo "2️⃣  Starting services..."
docker-compose -f docker-compose.dev.yml up -d

echo "3️⃣  Waiting for services to be ready..."
sleep 10

echo "4️⃣  Running database migrations..."
docker exec moneywise-backend pnpm db:migrate

echo "5️⃣  Health check - Backend..."
if curl -f http://localhost:3001/api/health; then
    echo "✓ Backend is healthy"
else
    echo "✗ Backend health check failed"
    exit 1
fi

echo "6️⃣  Health check - Frontend..."
if curl -f http://localhost:80; then
    echo "✓ Frontend is healthy"
else
    echo "✗ Frontend health check failed"
    exit 1
fi

echo ""
echo "✅ Staging deployment complete!"
echo ""
echo "Services running:"
echo "  Backend: http://localhost:3001"
echo "  Frontend: http://localhost:80"
echo "  Database: PostgreSQL (port 5432, private)"
echo "  Cache: Redis (port 6379, private)"
echo ""
DEPLOY_SCRIPT_EOF

    chmod +x "$deploy_script"
    print_success "Deployment script created: $deploy_script"

    return 0
}

create_staging_checklist() {
    print_header "Creating Staging Deployment Checklist"

    local checklist_file="$REPO_ROOT/.claude/staging-deployment-checklist.md"

    cat > "$checklist_file" << 'CHECKLIST_EOF'
# MoneyWise Staging Deployment Checklist

## ✅ Pre-Deployment Phase

### Infrastructure Setup
- [ ] PostgreSQL 15 with TimescaleDB extension provisioned
  - [ ] Host: `staging-db.example.com`
  - [ ] Database: `moneywise_staging`
  - [ ] User: `postgres`
  - [ ] Password: Set and secured

- [ ] Redis 7+ instance provisioned
  - [ ] Host: `staging-redis-host`
  - [ ] Port: 6379
  - [ ] Password: Set and secured
  - [ ] Persistence: Enabled

- [ ] Domain and SSL/TLS
  - [ ] Domain: `staging.moneywise.app`
  - [ ] DNS: Configured to point to staging server
  - [ ] SSL Certificate: Provisioned
  - [ ] HTTPS: Enforced

### Service Credentials
- [ ] Sentry Projects Created
  - [ ] Backend project: `moneywise-staging-backend`
  - [ ] Frontend project: `moneywise-staging-web`
  - [ ] DSNs: Obtained and documented

- [ ] Banking Integration (SaltEdge)
  - [ ] Staging credentials: Obtained
  - [ ] Client ID: Secured
  - [ ] Secret: Secured

- [ ] Monitoring (Optional)
  - [ ] AWS CloudWatch: Configured (optional)
  - [ ] Sentry: Configured
  - [ ] Alerts: Set up

### Configuration
- [ ] Secrets Generated
  - [ ] JWT_ACCESS_SECRET: Generated (32+ chars)
  - [ ] JWT_REFRESH_SECRET: Generated (32+ chars)
  - [ ] REDIS_PASSWORD: Set
  - [ ] DB_PASSWORD: Set

- [ ] Environment Files Updated
  - [ ] `apps/backend/.env.staging`: All placeholders replaced
  - [ ] `apps/web/.env.staging`: All placeholders replaced
  - [ ] Secrets: Stored securely (not committed)
  - [ ] Permissions: 600 (readable only by owner)

## 🚀 Deployment Phase

### Build & Push
- [ ] Docker images built
  - [ ] Backend: `moneywise-backend:staging`
  - [ ] Frontend: `moneywise-web:staging`

- [ ] Images pushed to registry (if using external registry)
  - [ ] Backend: Pushed
  - [ ] Frontend: Pushed
  - [ ] Tags: `staging` and `latest-staging`

### Services Started
- [ ] docker-compose services running
  - [ ] moneywise-backend: Up and healthy
  - [ ] moneywise-web: Up and healthy
  - [ ] moneywise-postgres: Up and healthy
  - [ ] moneywise-redis: Up and healthy

- [ ] Database initialized
  - [ ] Migrations run: `pnpm db:migrate`
  - [ ] Seed data: `pnpm db:seed` (optional)
  - [ ] Schema verified

## 🔍 Verification Phase

### Health Checks
- [ ] Backend health endpoint
  - [ ] `GET /api/health` returns 200 OK
  - [ ] Response includes uptime and status

- [ ] Frontend accessible
  - [ ] `GET /` returns 200 OK
  - [ ] Pages load without errors
  - [ ] CSS/JS assets load correctly

- [ ] Database connectivity
  - [ ] `pg_isready` returns success
  - [ ] Tables exist and have data
  - [ ] Queries execute without errors

- [ ] Redis connectivity
  - [ ] `redis-cli ping` returns PONG
  - [ ] Can set/get keys
  - [ ] Persistence verified

### Integration Tests
- [ ] Authentication flow
  - [ ] User login works
  - [ ] JWT tokens generated correctly
  - [ ] Token refresh works

- [ ] Banking integration
  - [ ] OAuth initiation works
  - [ ] Callback handling works
  - [ ] Account sync works

- [ ] API endpoints
  - [ ] CORS configured correctly
  - [ ] Content-Type headers correct
  - [ ] Error responses formatted correctly

### Monitoring Setup
- [ ] Sentry monitoring
  - [ ] Backend events received
  - [ ] Frontend events received
  - [ ] Release tracking working

- [ ] CloudWatch (if enabled)
  - [ ] Metrics being collected
  - [ ] Alarms configured
  - [ ] Dashboards accessible

## 📊 Post-Deployment Phase

### Performance Verification
- [ ] Backend response times
  - [ ] API endpoints: < 200ms
  - [ ] Database queries: < 100ms
  - [ ] Redis operations: < 10ms

- [ ] Frontend performance
  - [ ] Largest Contentful Paint: < 2.5s
  - [ ] Cumulative Layout Shift: < 0.1
  - [ ] First Input Delay: < 100ms

### Security Verification
- [ ] HTTPS enforced
  - [ ] HTTP redirects to HTTPS
  - [ ] HSTS headers present
  - [ ] Certificate valid

- [ ] Environment variables
  - [ ] No secrets in logs
  - [ ] No credentials in git history
  - [ ] Secrets stored securely

- [ ] Access control
  - [ ] Non-root container users (nestjs:1001, nextjs:1001)
  - [ ] Database credentials not exposed
  - [ ] API keys not exposed

### Documentation
- [ ] Deployment documented
  - [ ] Configuration documented
  - [ ] Secrets management documented
  - [ ] Rollback procedure documented

- [ ] Team notification
  - [ ] Team informed of staging deployment
  - [ ] Access details shared
  - [ ] Testing instructions provided

## 🎯 Sign-Off

- [ ] Deployment successful
- [ ] All checks passed
- [ ] Staging environment ready for testing
- [ ] Date: _______________
- [ ] Deployed by: _______________

## 🔄 Next Steps

1. **PHASE 5.2**: Run E2E tests against staging
   - Execute Playwright test suite
   - Verify all scenarios pass
   - Document any issues

2. **PHASE 5.3**: Set up monitoring and logging
   - Configure Sentry alerts
   - Set up CloudWatch dashboards
   - Configure log aggregation

3. **PHASE 5.4**: Production deployment
   - Create production environment
   - Run staging E2E tests against prod
   - Monitor production closely

---

**Status**: Preparing for deployment
**Last Updated**: 2025-10-27
**Maintained by**: Claude Code
CHECKLIST_EOF

    print_success "Checklist created: $checklist_file"

    return 0
}

verify_staging_config() {
    print_header "Verifying Staging Configuration"

    local issues=0

    # Check backend .env.staging
    if [ -f "$BACKEND_ENV_STAGING" ]; then
        print_success "Backend .env.staging exists"

        # Check for unresolved placeholders
        if grep -q "CHANGE-ME\|staging-db\|staging-redis" "$BACKEND_ENV_STAGING"; then
            print_warning "Backend .env.staging has unresolved placeholders - needs manual configuration"
            issues=$((issues + 1))
        else
            print_success "Backend .env.staging appears fully configured"
        fi
    else
        print_error "Backend .env.staging not found"
        issues=$((issues + 1))
    fi

    # Check web .env.staging
    if [ -f "$WEB_ENV_STAGING" ]; then
        print_success "Web .env.staging exists"

        if grep -q "CHANGE-ME\|staging.moneywise\|o<org>" "$WEB_ENV_STAGING"; then
            print_warning "Web .env.staging has unresolved placeholders - needs manual configuration"
            issues=$((issues + 1))
        else
            print_success "Web .env.staging appears fully configured"
        fi
    else
        print_error "Web .env.staging not found"
        issues=$((issues + 1))
    fi

    # Check Docker setup
    if docker-compose -f "$REPO_ROOT/docker-compose.dev.yml" config > /dev/null 2>&1; then
        print_success "docker-compose.dev.yml is valid"
    else
        print_error "docker-compose.dev.yml validation failed"
        issues=$((issues + 1))
    fi

    if [ $issues -eq 0 ]; then
        print_success "Staging configuration is ready for deployment"
        return 0
    else
        print_warning "$issues issues found in staging configuration"
        return 1
    fi
}

show_summary() {
    print_header "Staging Deployment Preparation Summary"

    echo "Generated/Created:"
    echo "  ✓ Environment configuration files"
    echo "  ✓ Staging secrets (stored securely)"
    echo "  ✓ Deployment script"
    echo "  ✓ Deployment checklist"
    echo ""
    echo "Next steps:"
    echo "  1. Review secrets: $REPO_ROOT/.claude/staging-secrets.json"
    echo "  2. Update backend .env: $BACKEND_ENV_STAGING"
    echo "  3. Update web .env: $WEB_ENV_STAGING"
    echo "  4. Review checklist: $REPO_ROOT/.claude/staging-deployment-checklist.md"
    echo "  5. Run deployment: $REPO_ROOT/.claude/scripts/deploy-staging.sh"
    echo ""
    echo "Documentation:"
    echo "  - Quick reference: $REPO_ROOT/STAGING-QUICK-REFERENCE.md"
    echo "  - Full analysis: $REPO_ROOT/STAGING-DEPLOYMENT-ANALYSIS.md"
    echo ""
}

show_help() {
    cat << 'HELP_EOF'
Usage: ./prepare-staging-deployment.sh [OPTIONS]

This script automates the preparation of the MoneyWise staging environment.

OPTIONS:
  --help              Show this help message
  --check             Check prerequisites and existing configuration
  --generate          Generate staging secrets (recommended)
  --create            Create environment files from templates
  --deploy-script     Create deployment script
  --checklist         Create deployment checklist
  --verify            Verify staging configuration
  --full              Run all preparation steps (default)

EXAMPLES:
  ./prepare-staging-deployment.sh
  ./prepare-staging-deployment.sh --check
  ./prepare-staging-deployment.sh --generate
  ./prepare-staging-deployment.sh --create
  ./prepare-staging-deployment.sh --verify

ENVIRONMENT VARIABLES:
  STAGING_DOMAIN      Override staging domain (default: staging.moneywise.app)

HELP_EOF
}

###############################################################################
# Main Script
###############################################################################

main() {
    local action="${1:---full}"

    case "$action" in
        --help)
            show_help
            exit 0
            ;;
        --check)
            check_prerequisites && check_staging_files
            ;;
        --generate)
            generate_staging_secrets
            ;;
        --create)
            create_staging_env_files
            ;;
        --deploy-script)
            create_staging_deployment_script
            ;;
        --checklist)
            create_staging_checklist
            ;;
        --verify)
            verify_staging_config
            ;;
        --full|*)
            check_prerequisites && \
            check_staging_files && \
            generate_staging_secrets && \
            create_staging_env_files && \
            create_staging_deployment_script && \
            create_staging_checklist && \
            show_summary && \
            verify_staging_config
            ;;
    esac
}

# Run main function
main "$@"
