#!/bin/bash
# Pre-commit hook for MoneyWise - Quality gates

echo "🔍 Pre-commit quality check..."

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "❌ ERROR: Direct commits to main branch are forbidden!"
    echo "Please create a feature branch: git checkout -b feature/your-feature"
    exit 1
fi

# Run quality checks on staged files only
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')

if [ -n "$STAGED_FILES" ]; then
    echo "🧹 Checking staged files..."

    # TypeScript check on staged files
    echo "📘 TypeScript check..."
    npx tsc --noEmit || {
        echo "❌ TypeScript errors found!"
        exit 1
    }

    # Lint staged files
    echo "🔍 Linting staged files..."
    echo "$STAGED_FILES" | xargs npx eslint || {
        echo "❌ Linting errors found!"
        exit 1
    }

    # Format staged files
    echo "💅 Formatting staged files..."
    echo "$STAGED_FILES" | xargs npx prettier --write
    git add $STAGED_FILES
fi

# Quick test run
echo "🧪 Running quick tests..."
npm run test -- --passWithNoTests || {
    echo "❌ Tests failed!"
    exit 1
}

echo "✅ Pre-commit checks passed!"