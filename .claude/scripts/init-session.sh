#!/bin/bash
# MoneyWise Session Initialization Script

echo "🚀 Initializing MoneyWise development session..."

# 1. Verify Git state
git status --short
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ WARNING: Uncommitted changes detected!"
    git status
fi

# 2. Verify current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "❌ ERROR: On main branch! Create feature branch first!"
    exit 1
fi
echo "✅ Current branch: $CURRENT_BRANCH"

# 3. Sync with remote
git fetch origin --prune
git pull origin main --rebase

# 4. Verify environment
node --version | grep -q "v18\|v20" || echo "⚠️ Node version issue"
npm --version || echo "❌ Package manager not found"

# 5. Check dependencies
npm install

# 6. Verify CLAUDE.md exists
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ CLAUDE.md missing! Creating template..."
    cp .claude/templates/claude.md.template CLAUDE.md
fi

# 7. Run initial tests
npm run test || echo "⚠️ Some tests failing"

# 8. Check TypeScript
npx tsc --noEmit || echo "⚠️ TypeScript errors present"

echo "✅ Session initialized. Ready for development!"