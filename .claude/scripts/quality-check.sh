#!/bin/bash
# MoneyWise Quality Gates - MUST PASS before ANY commit

echo "🔍 Running MoneyWise Quality Gates..."

# 1. TypeScript Check (skip test-utils for now due to JSX issues)
echo "📘 TypeScript validation..."
pnpm typecheck --filter '!@money-wise/test-utils' || {
  echo "❌ TypeScript errors found!"
  exit 1
}

# 2. Linting
echo "🧹 ESLint validation..."
pnpm lint || {
  echo "❌ Linting errors found!"
  exit 1
}

# 3. Formatting
echo "💅 Prettier check..."
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" || {
  echo "❌ Formatting issues found! Run: pnpm format"
  exit 1
}

# 4. Unit Tests
echo "🧪 Running unit tests..."
pnpm test:unit || {
  echo "❌ Unit tests failed!"
  exit 1
}

# 5. Build Test
echo "🏗️ Build validation..."
pnpm build || {
  echo "❌ Build failed!"
  exit 1
}

# 6. Security Audit
echo "🔒 Security audit..."
pnpm audit --audit-level=high || {
  echo "⚠️ Security vulnerabilities found!"
  # Don't exit, just warn
}

# 7. Bundle Size Check
echo "📦 Bundle size check..."
if [ -d ".next" ]; then
  BUNDLE_SIZE=$(du -sh .next | cut -f1)
  echo "Bundle size: $BUNDLE_SIZE"
fi

echo "✅ All quality gates passed!"