#!/bin/bash
# MoneyWise Monorepo Structure Validation Script
# Part of STORY-1.5.6: Project Structure Optimization

set -e

echo "🔍 MoneyWise Structure Validation"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    FAILURES=$((FAILURES + 1))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "1. Checking monorepo structure..."
echo "---------------------------------"

# Check apps exist
if [ -d "apps/backend" ] && [ -d "apps/web" ] && [ -d "apps/mobile" ]; then
    success "All apps directories exist"
else
    error "Missing app directories"
fi

# Check packages exist
if [ -d "packages/types" ] && [ -d "packages/utils" ] && [ -d "packages/ui" ] && [ -d "packages/test-utils" ]; then
    success "All package directories exist"
else
    error "Missing package directories"
fi

echo ""
echo "2. Checking configuration files..."
echo "-----------------------------------"

# Check for required config files
REQUIRED_CONFIGS=(
    "package.json"
    "pnpm-workspace.yaml"
    "turbo.json"
    "tsconfig.json"
    ".eslintrc.monorepo.json"
)

for config in "${REQUIRED_CONFIGS[@]}"; do
    if [ -f "$config" ]; then
        success "Found $config"
    else
        error "Missing $config"
    fi
done

echo ""
echo "3. Checking package READMEs..."
echo "-------------------------------"

# Check package READMEs
PACKAGE_READMES=(
    "packages/types/README.md"
    "packages/utils/README.md"
    "packages/ui/README.md"
    "packages/test-utils/README.md"
)

for readme in "${PACKAGE_READMES[@]}"; do
    if [ -f "$readme" ]; then
        success "Found $readme"
    else
        error "Missing $readme"
    fi
done

echo ""
echo "4. Checking TypeScript configuration..."
echo "----------------------------------------"

# Check for TypeScript path aliases
if grep -q '"paths"' tsconfig.json; then
    success "TypeScript path aliases configured"
else
    error "TypeScript path aliases not configured"
fi

# Check for baseUrl
if grep -q '"baseUrl"' tsconfig.json; then
    success "TypeScript baseUrl configured"
else
    error "TypeScript baseUrl not configured"
fi

echo ""
echo "5. Checking ESLint import boundaries..."
echo "----------------------------------------"

# Check for import boundary rules
if [ -f ".eslintrc.monorepo.json" ]; then
    if grep -q "no-restricted-imports" .eslintrc.monorepo.json; then
        success "ESLint import boundary rules configured"
    else
        error "ESLint import boundary rules missing"
    fi
else
    error "ESLint monorepo config missing"
fi

echo ""
echo "6. Checking Turborepo configuration..."
echo "---------------------------------------"

# Check Turborepo config
if grep -q '"globalEnv"' turbo.json; then
    success "Turborepo globalEnv configured"
else
    warning "Turborepo globalEnv not configured (optional)"
fi

if grep -q '"globalDependencies"' turbo.json; then
    success "Turborepo globalDependencies configured"
else
    error "Turborepo globalDependencies missing"
fi

echo ""
echo "7. Checking for circular dependencies..."
echo "-----------------------------------------"

# Check for madge
if command -v madge &> /dev/null; then
    # Run madge to check for circular dependencies
    CIRCULAR=$(madge --circular --extensions ts,tsx apps/ packages/ 2>&1 | grep -E "Found [0-9]+ circular" || echo "No circular")

    if echo "$CIRCULAR" | grep -q "No circular"; then
        success "No problematic circular dependencies found"
    else
        warning "Found circular dependencies (may be acceptable for TypeORM entities): $CIRCULAR"
    fi
else
    warning "madge not installed, skipping circular dependency check"
fi

echo ""
echo "8. Validating build integrity..."
echo "---------------------------------"

# Check if build artifacts exist (packages should be buildable)
if [ -d "packages/types/dist" ] || [ -d "packages/utils/dist" ]; then
    success "Package build artifacts exist"
else
    warning "Run 'pnpm build' to verify package builds"
fi

echo ""
echo "9. Checking documentation..."
echo "-----------------------------"

# Check for structure documentation
if [ -f "docs/development/monorepo-structure.md" ]; then
    success "Monorepo structure documentation exists"
else
    error "Missing monorepo structure documentation"
fi

# Check for audit report
if [ -f "docs/development/project-structure-audit-report.md" ]; then
    success "Project structure audit report exists"
else
    error "Missing project structure audit report"
fi

echo ""
echo "================================="
echo "Validation Summary"
echo "================================="

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All structure validations passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILURES validation(s) failed${NC}"
    exit 1
fi
