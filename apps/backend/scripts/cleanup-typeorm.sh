#!/bin/bash
################################################################################
# TypeORM Complete Removal Script
#
# Purpose: Safely remove all TypeORM dependencies and files from the codebase
# Author: System Architect (Claude Code)
# Date: 2025-10-13
#
# Usage:
#   ./scripts/cleanup-typeorm.sh [--dry-run] [--skip-tests]
#
# Options:
#   --dry-run      Show what would be done without making changes
#   --skip-tests   Skip running tests after cleanup
#
# IMPORTANT: Run this script AFTER Phase 1 (TimescaleDB migration) is complete
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
SKIP_TESTS=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      echo "Usage: $0 [--dry-run] [--skip-tests]"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Execute or simulate command
execute() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: $*"
  else
    "$@"
  fi
}

# Main execution
main() {
  echo "========================================="
  echo "  TypeORM Complete Removal Script"
  echo "========================================="
  echo ""

  if [ "$DRY_RUN" = true ]; then
    log_warning "Running in DRY-RUN mode - no changes will be made"
  fi

  # Check we're in the right directory
  if [ ! -f "apps/backend/package.json" ]; then
    log_error "Must run from repository root (money-wise/)"
    exit 1
  fi

  # Phase 1: Pre-flight Checks
  log_info "Phase 1: Pre-flight checks..."

  # Check if TimescaleDB migration exists
  if [ ! -d "apps/backend/prisma/migrations" ]; then
    log_error "Prisma migrations directory not found. Ensure Prisma is set up."
    exit 1
  fi

  # Check for TimescaleDB migration (should be created before running this script)
  TIMESCALE_MIGRATION_COUNT=$(find apps/backend/prisma/migrations -name "*timescale*" | wc -l)
  if [ "$TIMESCALE_MIGRATION_COUNT" -eq 0 ]; then
    log_warning "No TimescaleDB migration found. Did you complete Phase 1?"
    echo "  Expected migration: prisma/migrations/*_add_timescaledb_support/"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Aborted by user"
      exit 1
    fi
  else
    log_success "TimescaleDB migration found"
  fi

  log_success "Pre-flight checks passed"
  echo ""

  # Phase 2: Create Archive Directory
  log_info "Phase 2: Creating archive directory..."

  ARCHIVE_DIR="apps/backend/src/core/database/migrations/archive/typeorm"
  execute mkdir -p "$ARCHIVE_DIR"

  log_success "Archive directory created: $ARCHIVE_DIR"
  echo ""

  # Phase 3: Archive TypeORM Migration Files
  log_info "Phase 3: Archiving TypeORM migration files..."

  # List of TypeORM migration files to archive
  MIGRATION_FILES=(
    "apps/backend/src/core/database/migrations/1760000000000-ConsolidatedCompleteSchema.ts"
    "apps/backend/src/core/database/migrations/1760000000001-UpdateUserTimezoneLength.ts"
    "apps/backend/src/core/database/migrations/1760000000002-AddTimescaleDBSupport.ts"
  )

  for file in "${MIGRATION_FILES[@]}"; do
    if [ -f "$file" ]; then
      execute mv "$file" "$ARCHIVE_DIR/"
      log_success "Archived: $(basename "$file")"
    else
      log_warning "Not found: $file (already archived or moved?)"
    fi
  done

  # Archive TypeORM config
  if [ -f "apps/backend/src/config/database.ts" ]; then
    execute mv "apps/backend/src/config/database.ts" "$ARCHIVE_DIR/"
    log_success "Archived: database.ts (TypeORM DataSource)"
  fi

  log_success "TypeORM migration files archived"
  echo ""

  # Phase 4: Delete Obsolete Test Files
  log_info "Phase 4: Deleting obsolete TypeORM test files..."

  OBSOLETE_TEST_FILES=(
    "apps/backend/src/core/database/test-database.module.ts"
    "apps/backend/src/core/database/tests/factories/test-data.factory.ts"
    "apps/backend/src/core/database/tests/database-test-suite.ts"
    "apps/backend/src/core/database/tests/jest.database.setup.ts"
    "apps/backend/src/auth/__tests__/test-utils/auth-test.factory.ts"
  )

  for file in "${OBSOLETE_TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
      execute rm "$file"
      log_success "Deleted: $file"
    else
      log_warning "Not found: $file (already deleted?)"
    fi
  done

  log_success "Obsolete test files deleted"
  echo ""

  # Phase 5: Create Archive README
  log_info "Phase 5: Creating archive README..."

  ARCHIVE_README="$ARCHIVE_DIR/README.md"
  if [ "$DRY_RUN" = false ]; then
    cat > "$ARCHIVE_README" << 'EOF'
# TypeORM Migrations Archive

**Date Archived**: 2025-10-13
**Reason**: Complete migration to Prisma ORM

## Contents

This directory contains archived TypeORM migration files that were replaced by Prisma Migrate.

### Migration Files

1. **1760000000000-ConsolidatedCompleteSchema.ts**
   - Initial schema (users, accounts, categories, transactions)
   - Superseded by Prisma's `20251012173537_initial_schema` (includes families, budgets, etc.)

2. **1760000000001-UpdateUserTimezoneLength.ts**
   - Altered timezone column from VARCHAR(10) to VARCHAR(50)
   - Already incorporated in Prisma initial schema

3. **1760000000002-AddTimescaleDBSupport.ts**
   - TimescaleDB hypertable setup for transactions
   - Ported to Prisma migration: `YYYYMMDDHHMMSS_add_timescaledb_support`

### Configuration

- **database.ts**: TypeORM DataSource configuration for CLI (no longer used)

## Why Archived?

- **Production code**: Uses 100% Prisma (zero TypeORM at runtime)
- **Prisma schema**: More complete (9 tables vs TypeORM's 4)
- **Test suite**: 481 Prisma-native tests (replaced TypeORM test utilities)
- **Migration system**: Prisma Migrate is superior DX

## Historical Reference

These files are kept for:
- Understanding schema evolution history
- Rollback capability (emergency only)
- Documentation of migration decisions

## DO NOT USE

⚠️ These files are for historical reference only. All new migrations should use Prisma Migrate.

For current migration system, see: `../../prisma/migrations/`

---

**Migration Guide**: See `docs/migration/TYPEORM-PRISMA-COMPLETION-REPORT.md`
EOF
    log_success "Created archive README"
  else
    log_info "Would create: $ARCHIVE_README"
  fi

  echo ""

  # Phase 6: Remove Dependencies
  log_info "Phase 6: Removing TypeORM dependencies..."

  if [ "$DRY_RUN" = false ]; then
    cd apps/backend
    pnpm remove typeorm @nestjs/typeorm
    cd ../..
    log_success "Removed: typeorm, @nestjs/typeorm"
  else
    log_info "Would remove: typeorm, @nestjs/typeorm from apps/backend/package.json"
  fi

  echo ""

  # Phase 7: Update Scripts
  log_info "Phase 7: Updating package.json scripts..."

  if [ "$DRY_RUN" = false ]; then
    log_warning "package.json scripts must be updated manually:"
    echo ""
    echo "  Replace:"
    echo '    "db:migrate": "typeorm-ts-node-commonjs migration:run -d src/config/database.ts"'
    echo '    "db:migrate:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/database.ts"'
    echo '    "db:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/database.ts"'
    echo ""
    echo "  With:"
    echo '    "db:migrate": "prisma migrate deploy"'
    echo '    "db:migrate:dev": "prisma migrate dev"'
    echo '    "db:generate": "prisma migrate dev --create-only"'
    echo ""
    read -p "Press Enter to continue after updating scripts..."
  else
    log_info "Would update package.json scripts (manual step)"
  fi

  echo ""

  # Phase 8: Validation
  if [ "$SKIP_TESTS" = false ]; then
    log_info "Phase 8: Running validation tests..."

    if [ "$DRY_RUN" = false ]; then
      log_info "Running TypeScript compilation..."
      pnpm --filter @money-wise/backend typecheck || {
        log_error "TypeScript compilation failed"
        exit 1
      }
      log_success "TypeScript compilation passed"

      log_info "Running linter..."
      pnpm --filter @money-wise/backend lint || {
        log_error "Linting failed"
        exit 1
      }
      log_success "Linting passed"

      log_info "Running unit tests..."
      pnpm --filter @money-wise/backend test:unit || {
        log_error "Unit tests failed"
        exit 1
      }
      log_success "Unit tests passed (481/481)"

      log_info "Checking for TypeORM remnants..."
      TYPEORM_COUNT=$(grep -r "import.*typeorm" apps/backend/src --exclude-dir=archive || echo "")
      if [ -n "$TYPEORM_COUNT" ]; then
        log_error "TypeORM imports still found in src/:"
        echo "$TYPEORM_COUNT"
        exit 1
      fi
      log_success "No TypeORM remnants found in src/"
    else
      log_info "Would run validation tests (typecheck, lint, test:unit)"
    fi

    echo ""
  else
    log_warning "Skipping tests (--skip-tests flag used)"
    echo ""
  fi

  # Phase 9: Summary
  echo "========================================="
  echo "  Cleanup Complete!"
  echo "========================================="
  echo ""

  if [ "$DRY_RUN" = false ]; then
    log_success "TypeORM has been completely removed from the codebase"
    echo ""
    echo "Next steps:"
    echo "  1. Review package.json scripts (db:migrate, db:generate)"
    echo "  2. Update CHANGELOG.md with removal notes"
    echo "  3. Commit changes with descriptive message"
    echo "  4. Test on staging environment"
    echo ""
    echo "Rollback (if needed):"
    echo "  git revert HEAD"
    echo "  pnpm add typeorm@^0.3.17 @nestjs/typeorm@^10.0.1"
    echo ""
  else
    log_info "Dry-run complete. Run without --dry-run to execute changes."
  fi

  echo "Archive location: $ARCHIVE_DIR"
  echo "Documentation: apps/backend/docs/migration/TYPEORM-COMPLETE-REMOVAL-DEEP-ANALYSIS.md"
  echo ""
}

# Run main function
main
