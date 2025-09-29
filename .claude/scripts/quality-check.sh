#!/bin/bash
# MoneyWise Quality Gates - MUST PASS before ANY commit

echo "🔍 Running MoneyWise Quality Gates..."

# Check if we're in the root directory
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ Must run from project root (contains pnpm-workspace.yaml)"
  exit 1
fi

# 1. TypeScript Check
echo "📘 TypeScript validation..."
pnpm run typecheck || {
  echo "❌ TypeScript errors found!"
  exit 1
}

# 2. Linting
echo "🧹 ESLint validation..."
pnpm run lint || {
  echo "❌ Linting errors found!"
  exit 1
}

# 3. Formatting
echo "💅 Prettier check..."
pnpm run format --check || {
  echo "❌ Formatting issues found! To fix, run: pnpm run format"
  exit 1
}

# 4. Unit Tests (with workspace filtering)
echo "🧪 Running unit tests..."
# Exclude 'test-utils' from unit tests due to [ISSUE: test-utils does not have a valid test configuration; see https://github.com/your-org/your-repo/issues/123].
# TODO: Remove this exclusion once test-utils test configuration is fixed.
pnpm --filter "!test-utils" run test || {
  echo "❌ Unit tests failed!"
  exit 1
}

# 5. Build Test (build all workspaces)
echo "🏗️ Build validation..."
pnpm run build || {
  echo "❌ Build failed!"
  exit 1
}

# 6. Security Audit (using pnpm)
echo "🔒 Security audit..."
pnpm audit --audit-level=high || {
  echo "⚠️ Security vulnerabilities found!"
  # Don't exit, just warn
}

# 7. Bundle Size Check (check web app specifically)
echo "📦 Bundle size check..."
if [ -d "apps/web/.next" ]; then
  BUNDLE_SIZE=$(du -sh apps/web/.next | cut -f1)
  echo "Web bundle size: $BUNDLE_SIZE"
fi

# 8. Workspace dependency check
echo "🔗 Workspace dependency validation..."
pnpm ls --recursive --depth=0 > /dev/null || {
  echo "⚠️ Workspace dependency issues detected"
}

echo "✅ All quality gates passed!"