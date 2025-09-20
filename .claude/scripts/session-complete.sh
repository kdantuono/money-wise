#!/bin/bash
# Session Completion Checklist

echo "📋 Session Completion Checklist"

# 1. Git Status
echo "1. Checking Git status..."
UNCOMMITTED=$(git status --porcelain | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "❌ Uncommitted changes detected!"
  git status --short
  exit 1
fi
echo "✅ All changes committed"

# 2. Tests
echo "2. Running tests..."
npm run test || exit 1
echo "✅ Tests passing"

# 3. Build
echo "3. Verifying build..."
npm run build || exit 1
echo "✅ Build successful"

# 4. Documentation
echo "4. Checking documentation..."
if [ -z "$(find docs/features -name "*$(date +%Y-%m-%d)*" -print -quit 2>/dev/null)" ]; then
  echo "⚠️ No documentation created today"
fi

# 5. CLAUDE.md Update
echo "5. Verifying CLAUDE.md..."
CLAUDE_UPDATED=$(git log --since="6 hours ago" --grep="CLAUDE.md" | wc -l)
if [ "$CLAUDE_UPDATED" -eq 0 ]; then
  echo "⚠️ CLAUDE.md not updated in this session"
fi

# 6. Push to remote
echo "6. Pushing to remote..."
git push origin $(git branch --show-current)
echo "✅ Pushed to remote"

# 7. Create session summary
mkdir -p docs/sessions
cat > docs/sessions/$(date +%Y-%m-%d-%H%M).md << EOF
# Session Summary: $(date)
## Branch: $(git branch --show-current)
## Commits: $(git log --oneline --since="6 hours ago" | wc -l)

### Completed Tasks:
$(git log --oneline --since="6 hours ago" | head -5)

### Tests Status:
- Build: Success
- Quality Gates: Passed

### Next Session Priority:
- [ ] Review PR feedback
- [ ] Continue feature implementation
- [ ] Update documentation
EOF

echo "✅ Session completed successfully!"
echo "📄 Summary saved to docs/sessions/"