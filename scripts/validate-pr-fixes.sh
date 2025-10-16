#!/bin/bash
# Validation script to verify PR fixes
# Run this to check if the issues have been resolved

set -e

echo "🔍 Validating PR Fixes for Migration and Benchmark Errors"
echo "==========================================================="
echo ""

# Check 1: Verify benchmark workflow has skip-fetch-gh-pages
echo "✅ Check 1: Benchmark workflow configuration"
if grep -q "skip-fetch-gh-pages: true" .github/workflows/quality-gates.yml; then
  echo "   ✓ skip-fetch-gh-pages is enabled"
else
  echo "   ✗ skip-fetch-gh-pages is NOT enabled"
  exit 1
fi

# Check 2: Verify performance results JSON format
echo ""
echo "✅ Check 2: Performance results JSON format"
if grep -q '"unit": "ops/sec"' .github/workflows/quality-gates.yml; then
  echo "   ✓ Using ops/sec unit (correct for customBiggerIsBetter)"
else
  echo "   ✗ Not using ops/sec unit"
  exit 1
fi

# Check 3: Verify TypeORM is not in backend dependencies
echo ""
echo "✅ Check 3: Prisma migration completeness"
if ! grep -q '"typeorm"' apps/backend/package.json 2>/dev/null; then
  echo "   ✓ TypeORM removed from dependencies"
else
  echo "   ✗ TypeORM still in dependencies"
  exit 1
fi

# Check 4: Verify Prisma is in backend dependencies
echo ""
echo "✅ Check 4: Prisma configuration"
if grep -q '"@prisma/client"' apps/backend/package.json; then
  echo "   ✓ @prisma/client is installed"
else
  echo "   ✗ @prisma/client is NOT installed"
  exit 1
fi

if [ -f "apps/backend/prisma/schema.prisma" ]; then
  echo "   ✓ Prisma schema exists"
else
  echo "   ✗ Prisma schema NOT found"
  exit 1
fi

# Check 5: Verify gh-pages documentation exists
echo ""
echo "✅ Check 5: Documentation"
if [ -f "docs/troubleshooting/gh-pages-setup.md" ]; then
  echo "   ✓ gh-pages setup documentation exists"
else
  echo "   ✗ gh-pages setup documentation NOT found"
  exit 1
fi

# Check 6: Check for skipped tests
echo ""
echo "✅ Check 6: Test status"
SKIPPED_TESTS=$(grep -r "describe.skip\|it.skip" apps/backend/__tests__ --include="*.spec.ts" --include="*.test.ts" | wc -l)
echo "   ℹ Found $SKIPPED_TESTS skipped test blocks"
echo "   Note: Performance tests are intentionally skipped pending full env setup"

# Summary
echo ""
echo "==========================================================="
echo "✅ All validation checks passed!"
echo ""
echo "Summary of fixes:"
echo "  1. Benchmark action configured with skip-fetch-gh-pages"
echo "  2. Performance results JSON format corrected"
echo "  3. Prisma migration verified (TypeORM removed)"
echo "  4. Documentation added for gh-pages setup"
echo ""
echo "Next steps:"
echo "  - Push changes to trigger CI/CD"
echo "  - Monitor benchmark job for success"
echo "  - Optionally create gh-pages branch for historical data"
echo ""
