#!/bin/bash
# MoneyWise Quality Gates - MUST PASS before ANY commit

echo "🔍 Running MoneyWise Quality Gates..."

# 1. TypeScript Check
echo "📘 TypeScript validation..."
npx tsc --noEmit || {
  echo "❌ TypeScript errors found!"
  exit 1
}

# 2. Linting
echo "🧹 ESLint validation..."
npm run lint || {
  echo "❌ Linting errors found!"
  exit 1
}

# 3. Formatting
echo "💅 Prettier check..."
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" || {
  echo "❌ Formatting issues found! Run: npm run format"
  exit 1
}

# 4. Unit Tests
echo "🧪 Running unit tests..."
npm run test || {
  echo "❌ Unit tests failed!"
  exit 1
}

# 5. Build Test
echo "🏗️ Build validation..."
npm run build || {
  echo "❌ Build failed!"
  exit 1
}

# 6. Security Audit
echo "🔒 Security audit..."
npm audit --audit-level=high || {
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