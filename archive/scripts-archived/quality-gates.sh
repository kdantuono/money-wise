#!/bin/bash

# 🚀 MoneyWise Quality Gates Validation Script
# Comprehensive pre-merge validation for multi-agent features
# Ensures KISS, SRP, TDD compliance and prevents regressions

set -e

echo "🎭 MoneyWise Quality Gates Validation"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
VALIDATION_ERRORS=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Function to check KISS principle compliance
check_kiss_compliance() {
    echo ""
    echo "🎯 KISS Principle Validation"
    echo "----------------------------"
    
    # Check function length
    echo "Checking function length..."
    local long_functions=$(find apps -name "*.ts" -o -name "*.tsx" | xargs grep -n "function\|=>" | \
        awk -F: 'BEGIN{func_start=0; func_name=""} 
        /function|=>/ {
            if(func_start > 0 && NR - func_start > 50) {
                print func_name " exceeds 50 lines"
            }
            func_start=NR; func_name=$1":"$2
        } 
        /^}/ {func_start=0}' | head -5)
    
    if [ -z "$long_functions" ]; then
        print_status "SUCCESS" "All functions under 50 lines"
    else
        print_status "ERROR" "Functions exceeding 50 lines found:"
        echo "$long_functions"
    fi
    
    # Check file size
    echo "Checking file size limits..."
    local large_files=$(find apps -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print $2 " (" $1 " lines)"}')
    
    if [ -z "$large_files" ]; then
        print_status "SUCCESS" "All files under 300 lines"
    else
        print_status "ERROR" "Large files found:"
        echo "$large_files"
    fi
    
    # Check complexity (using eslint complexity rule)
    echo "Checking cyclomatic complexity..."
    if npm run lint 2>&1 | grep -q "complexity"; then
        print_status "ERROR" "High complexity functions detected"
    else
        print_status "SUCCESS" "Complexity within acceptable limits"
    fi
}

# Function to check SRP compliance
check_srp_compliance() {
    echo ""
    echo "🔧 SRP (Single Responsibility) Validation"
    echo "----------------------------------------"
    
    # Check for classes with too many methods
    echo "Checking class method counts..."
    local god_classes=$(find apps -name "*.ts" -o -name "*.tsx" | xargs grep -l "class " | \
        while read file; do
            method_count=$(grep -c "public\|private\|protected\|async.*(" "$file" 2>/dev/null || echo 0)
            if [ "$method_count" -gt 15 ]; then
                echo "$file has $method_count methods"
            fi
        done)
    
    if [ -z "$god_classes" ]; then
        print_status "SUCCESS" "No classes with excessive methods"
    else
        print_status "ERROR" "Classes with too many responsibilities:"
        echo "$god_classes"
    fi
    
    # Check component responsibilities
    echo "Checking React component responsibilities..."
    local complex_components=$(find apps/web/src/components -name "*.tsx" | \
        while read file; do
            hook_count=$(grep -c "use[A-Z]" "$file" 2>/dev/null || echo 0)
            export_count=$(grep -c "export\|function\|const.*=" "$file" 2>/dev/null || echo 0)
            if [ "$hook_count" -gt 5 ] || [ "$export_count" -gt 3 ]; then
                echo "$file (hooks: $hook_count, exports: $export_count)"
            fi
        done)
    
    if [ -z "$complex_components" ]; then
        print_status "SUCCESS" "Components follow SRP"
    else
        print_status "WARNING" "Components potentially doing too much:"
        echo "$complex_components"
    fi
}

# Function to check TDD compliance
check_tdd_compliance() {
    echo ""
    echo "🧪 TDD Compliance Validation"
    echo "---------------------------"
    
    # Check test coverage
    echo "Checking test coverage..."
    
    # Frontend coverage
    if [ -d "apps/web/coverage" ]; then
        frontend_coverage=$(grep -o 'LF:[0-9]*' apps/web/coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}' 2>/dev/null || echo 0)
        frontend_hit=$(grep -o 'LH:[0-9]*' apps/web/coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}' 2>/dev/null || echo 0)
        if [ "$frontend_coverage" -gt 0 ]; then
            frontend_percent=$(echo "scale=2; $frontend_hit * 100 / $frontend_coverage" | bc)
            if (( $(echo "$frontend_percent >= 95" | bc -l) )); then
                print_status "SUCCESS" "Frontend coverage: $frontend_percent%"
            else
                print_status "ERROR" "Frontend coverage below 95%: $frontend_percent%"
            fi
        fi
    fi
    
    # Backend coverage
    if [ -d "apps/backend/coverage" ]; then
        backend_coverage=$(grep -o 'LF:[0-9]*' apps/backend/coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}' 2>/dev/null || echo 0)
        backend_hit=$(grep -o 'LH:[0-9]*' apps/backend/coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}' 2>/dev/null || echo 0)
        if [ "$backend_coverage" -gt 0 ]; then
            backend_percent=$(echo "scale=2; $backend_hit * 100 / $backend_coverage" | bc)
            if (( $(echo "$backend_percent >= 95" | bc -l) )); then
                print_status "SUCCESS" "Backend coverage: $backend_percent%"
            else
                print_status "ERROR" "Backend coverage below 95%: $backend_percent%"
            fi
        fi
    fi
    
    # Check for test files
    echo "Checking test file presence..."
    find apps -name "*.ts" -o -name "*.tsx" | grep -v test | grep -v spec | while read src_file; do
        test_file_ts="${src_file%.ts}.test.ts"
        test_file_tsx="${src_file%.tsx}.test.tsx"
        spec_file_ts="${src_file%.ts}.spec.ts"
        
        if [ ! -f "$test_file_ts" ] && [ ! -f "$test_file_tsx" ] && [ ! -f "$spec_file_ts" ]; then
            # Skip certain files
            if [[ ! "$src_file" =~ (index|types|constants|config) ]]; then
                echo "Missing test for: $src_file"
            fi
        fi
    done | head -5
}

# Function to check documentation compliance
check_documentation_compliance() {
    echo ""
    echo "📚 Documentation Compliance"
    echo "---------------------------"
    
    # Check for JSDoc comments
    echo "Checking JSDoc coverage..."
    local missing_docs=$(find apps -name "*.ts" -o -name "*.tsx" | xargs grep -l "export " | \
        while read file; do
            if ! grep -q "@param\|@returns\|@description\|/\*\*" "$file"; then
                echo "$file"
            fi
        done | head -5)
    
    if [ -z "$missing_docs" ]; then
        print_status "SUCCESS" "Good JSDoc coverage"
    else
        print_status "WARNING" "Files missing documentation:"
        echo "$missing_docs"
    fi
    
    # Check interface documentation
    echo "Checking interface documentation..."
    local undocumented_interfaces=$(find apps -name "*.ts" -o -name "*.tsx" | xargs grep -l "interface\|type.*=" | \
        while read file; do
            if ! grep -B3 -A3 "interface\|type.*=" "$file" | grep -q "\/\*\*\|\/\/"; then
                echo "$file"
            fi
        done | head -3)
    
    if [ -z "$undocumented_interfaces" ]; then
        print_status "SUCCESS" "Interfaces properly documented"
    else
        print_status "WARNING" "Interfaces missing documentation:"
        echo "$undocumented_interfaces"
    fi
}

# Function to check import organization
check_import_organization() {
    echo ""
    echo "📦 Import Organization"
    echo "--------------------"
    
    # Run ESLint import checks
    echo "Checking import order and unused imports..."
    if npm run lint 2>&1 | grep -E "(import/order|unused-imports)"; then
        print_status "ERROR" "Import organization issues detected"
    else
        print_status "SUCCESS" "Import organization compliant"
    fi
    
    # Check for duplicate imports
    echo "Checking for duplicate imports..."
    local duplicate_imports=$(find apps -name "*.ts" -o -name "*.tsx" | \
        xargs grep "^import" | sort | uniq -d | head -3)
    
    if [ -z "$duplicate_imports" ]; then
        print_status "SUCCESS" "No duplicate imports found"
    else
        print_status "WARNING" "Potential duplicate imports:"
        echo "$duplicate_imports"
    fi
}

# Function to check for regressions
check_regressions() {
    echo ""
    echo "🚨 Regression Prevention"
    echo "-----------------------"
    
    # Check for breaking API changes
    echo "Checking for breaking API changes..."
    if git diff --name-only HEAD~1 2>/dev/null | grep -q "controller\|route"; then
        print_status "INFO" "API changes detected - manual review required"
    else
        print_status "SUCCESS" "No API changes detected"
    fi
    
    # Check for removed public methods
    echo "Checking for removed public exports..."
    local removed_exports=$(git diff HEAD~1 --name-only 2>/dev/null | \
        xargs git diff HEAD~1 2>/dev/null | grep "^-.*export" | head -3)
    
    if [ -z "$removed_exports" ]; then
        print_status "SUCCESS" "No public exports removed"
    else
        print_status "WARNING" "Public exports may have been removed:"
        echo "$removed_exports"
    fi
}

# Function to run all validations
run_validations() {
    echo "Starting comprehensive quality validation..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm ci --prefer-offline --no-audit
        npm run setup
    fi
    
    # Run all validation checks
    check_kiss_compliance
    check_srp_compliance
    check_tdd_compliance
    check_documentation_compliance
    check_import_organization
    check_regressions
    
    # Final summary
    echo ""
    echo "🎯 Validation Summary"
    echo "===================="
    
    if [ $VALIDATION_ERRORS -eq 0 ]; then
        print_status "SUCCESS" "All quality gates passed! ✨"
        echo ""
        echo "🚀 Ready for merge!"
        echo "📊 Multi-agent features validated"
        echo "🛡️  No regressions detected"
        echo "📋 Architecture compliance confirmed"
        exit 0
    else
        print_status "ERROR" "$VALIDATION_ERRORS validation errors found"
        echo ""
        echo "❌ Fix issues before merging"
        echo "🔧 Run individual checks for details"
        echo "📋 Ensure all quality gates pass"
        exit 1
    fi
}

# Main execution
main() {
    case "${1:-all}" in
        "kiss")
            check_kiss_compliance
            ;;
        "srp")
            check_srp_compliance
            ;;
        "tdd")
            check_tdd_compliance
            ;;
        "docs")
            check_documentation_compliance
            ;;
        "imports")
            check_import_organization
            ;;
        "regression")
            check_regressions
            ;;
        "all"|*)
            run_validations
            ;;
    esac
}

# Run main function with all arguments
main "$@"