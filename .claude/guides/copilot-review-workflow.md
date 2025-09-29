# GitHub Copilot PR Review Workflow Guide

## CRITICAL: The Two-Phase Process

### Phase 1: Create PR and Setup (Via CLI)
```bash
# 1. Create PR with complete metadata
gh pr create \
  --base epic/[target-branch] \
  --title "feat(scope): description - STORY-XXX #issue" \
  --body "$(cat <<'EOF'
## Summary
[Brief description of changes]

### Related Issue
- Resolves #[issue-number] - [Issue title]
- Part of [STORY-XXX]: [Story description]
- Connected to Epic: [Epic name]

### Changes Included
- [Change 1]
- [Change 2]
- [Change 3]

### Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement
- [ ] Refactoring
- [ ] Documentation update
- [ ] Test improvement

### Test Coverage
- [ ] Unit tests passing
- [ ] Integration tests updated
- [ ] E2E scenarios covered

### Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Tests are passing locally
- [ ] Documentation updated if needed
- [ ] Ready for Copilot review

## Request for Review
@github-copilot Please review focusing on:
1. **Code Quality**: Ensure adherence to best practices
2. **Security**: Validate security implementations
3. **Performance**: Check for optimization opportunities
4. **Testing**: Verify comprehensive test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
  )" \
  --assignee kdantuono \
  --reviewer copilot \
  --label "review,enhancement,task" \
  --project "money-wise"

# 2. Get PR number for further operations
PR_NUM=$(gh pr view --json number -q .number)

# 3. Add initial comment to signal Copilot
gh pr comment $PR_NUM --body "@github-copilot review"
```

### Phase 2: CRITICAL - Activate Copilot Review (Via GitHub UI)
**⚠️ THIS STEP CANNOT BE AUTOMATED VIA CLI - MUST BE DONE IN BROWSER**

1. Navigate to the PR page: `https://github.com/kdantuono/money-wise/pull/[PR#]`
2. Look for the **Reviewers** section (right sidebar)
3. Find the **"Request"** button next to the Copilot icon (🤖)
4. **CLICK "Request"** - This is what actually triggers Copilot to start reviewing!

### Phase 3: Validate PR Metadata (Via CLI)
```bash
# Use automated validation script
./.claude/scripts/pr-metadata-validator.sh $PR_NUM

# Or manual validation:
echo "Validating PR metadata..."
gh pr view $PR_NUM --json number,title,assignees,reviewRequests,labels,projectItems,milestone | jq '{
  number: .number,
  title: .title,
  assignees: [.assignees[].login],
  reviewers: [.reviewRequests[].requestedReviewer.login],
  labels: [.labels[].name],
  projects: [.projectItems[].project.title],
  milestone: .milestone.title
}'

# Expected output validation:
# - assignees: ["kdantuono"]
# - reviewers: ["copilot"]
# - labels: should include "review", "enhancement", "task"
# - projects: ["money-wise"]
```

### Phase 4: Monitor and Process Suggestions (Via CLI)
```bash
# Use automated monitoring (recommended)
./.claude/scripts/pr-metadata-validator.sh $PR_NUM --monitor

# Or manual monitoring:
while true; do
  gh pr view [PR#] --json reviews,comments | jq '.reviews[] | select(.author.login == "github-copilot")'
  sleep 120
done
```

## Decision Matrix for Suggestions

### Auto-Accept Categories
- ✅ Formatting improvements
- ✅ Import optimization
- ✅ Type safety enhancements
- ✅ Unused variable removal

### Manual Review Required
- ⚠️ Security-related changes
- ⚠️ Performance optimizations
- ⚠️ Architectural changes
- ⚠️ Breaking API changes

### Auto-Reject Categories
- ❌ Changes that break tests
- ❌ Suggestions conflicting with project standards
- ❌ Major refactors without discussion

## Processing Copilot Suggestions

### To Accept a Suggestion:
```bash
# Via GitHub UI: Click "Commit suggestion" button
# Via API (if available):
gh api repos/kdantuono/money-wise/pulls/[PR#]/reviews/[REVIEW_ID]/comments/[COMMENT_ID]/suggestions \
  --method PATCH --field commit_message="Apply Copilot suggestion"
```

### To Dismiss a Suggestion:
```bash
# Add reply explaining why
gh pr comment [PR#] --body "Re: [suggestion] - Not applicable because [reason]"
```

## Complete Workflow Example

```bash
# Step 1: Create PR
gh pr create --base epic/milestone-1-foundation \
  --title "feat(auth): implement JWT refresh - STORY-002"

# Step 2: Get PR number
PR_NUM=$(gh pr view --json number -q .number)

# Step 3: Add comment
gh pr comment $PR_NUM --body "@github-copilot review focusing on security"

# Step 4: Validate metadata
./.claude/scripts/pr-metadata-validator.sh $PR_NUM

# Step 5: **GO TO BROWSER**
echo "⚠️ ACTION REQUIRED: Go to https://github.com/kdantuono/money-wise/pull/$PR_NUM"
echo "Click 'Request' button next to Copilot in reviewers section!"

# Step 6: Monitor for review (automated)
./.claude/scripts/pr-metadata-validator.sh $PR_NUM --monitor
```

## Troubleshooting

**Copilot not responding?**
- Verify "Request" button was clicked in UI
- Check if Copilot is enabled for the repository
- Ensure PR has sufficient changes to review

**Can't find Request button?**
- Look in right sidebar under "Reviewers"
- May need repository admin to enable Copilot
- Try refreshing the page

## Important Notes

1. **The "Request" button click is MANDATORY** - Comments alone won't trigger review
2. Copilot typically responds within 2-5 minutes after request
3. Large PRs may take longer to review
4. Copilot may not review PRs with only config/docs changes

## Integration with Git Workflow

### Follow Standard Workflow Pattern
```bash
# Always follow: feature → epic → develop → main
git checkout feature/[name]
# ... make changes ...
git push -u origin feature/[name]

# Create PR to epic branch
gh pr create --base epic/milestone-1-foundation

# Request Copilot review (browser step)
# Process suggestions
# Merge when approved
```

### Best Practices
- Create focused PRs (single feature/fix)
- Include comprehensive PR descriptions
- Reference related issues and stories
- Always request Copilot review for code changes
- Document reasoning for rejected suggestions

---

*This guide ensures comprehensive GitHub Copilot integration while maintaining our established git workflow and quality standards.*