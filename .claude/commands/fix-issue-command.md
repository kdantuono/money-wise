<!-- .claude/commands/fix-issue.md -->
description: Automated GitHub issue resolution with end-to-end workflow

# GitHub Issue Resolution Workflow

Automatically resolve GitHub issue and create pull request.

## Arguments
Issue number or URL: $ARGUMENTS

## Prerequisites Check
Before starting, verify:
- GitHub CLI is authenticated: `gh auth status`
- Current branch is clean: `git status`
- All tests pass on main: `pnpm test` or equivalent

## Step 1: Issue Analysis & Context Loading
**DO NOT proceed to implementation until this analysis is complete.**

```bash
# Fetch complete issue details
gh issue view $ARGUMENTS --json number,title,body,labels,assignees,comments
```

**Analysis Requirements:**
1. Read the issue title, description, and ALL comments
2. Identify the root cause and affected components
3. List all files likely to need modification
4. Determine if this requires database changes, API updates, or frontend work
5. Check for related issues or PRs: `gh issue list --search "relates to #$ARGUMENTS"`

**Output a summary:**
- Problem statement in one sentence
- Affected components/files
- Proposed solution approach
- Estimated complexity (simple/medium/complex)

**Wait for user confirmation before proceeding.**

## Step 2: Branch Creation & Environment Setup

```bash
# Create feature branch with consistent naming
BRANCH_NAME="fix/issue-$ARGUMENTS-$(gh issue view $ARGUMENTS --json title --jq '.title' | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-30)"
git checkout -b $BRANCH_NAME

# Verify branch created successfully
git branch --show-current
```

**Environment Preparation:**
1. Pull latest changes from main: `git pull origin main`
2. Install/update dependencies if needed: `pnpm install` or equivalent
3. Run existing tests to establish baseline: `pnpm test`
4. Clear any previous build artifacts: `pnpm run clean` or equivalent

## Step 3: Implementation Phase
**Follow Test-Driven Development (TDD) approach:**

### 3.1 Write Tests First (RED Phase)
1. Analyze existing test structure in the codebase
2. Write failing tests that verify the fix
3. Run tests to confirm they fail: `pnpm test`
4. Commit tests: `git add . && git commit -m "test: add failing tests for issue #$ARGUMENTS"`

### 3.2 Implement Solution (GREEN Phase)
1. **Read relevant files** before modifying anything
2. Implement minimal code to make tests pass
3. Follow existing code patterns and conventions from CLAUDE.md
4. Add inline comments for complex logic
5. Ensure error handling is robust

**Critical Files to Review:**
- Check CLAUDE.md for project-specific conventions
- Review similar implementations in the codebase
- Verify API contracts are maintained

### 3.3 Verify Implementation
```bash
# Run full test suite
pnpm test

# Run linting
pnpm run lint

# Run type checking (if applicable)
pnpm run type-check

# Test the specific scenario from the issue manually
```

## Step 4: Code Quality & Security Validation

**Quality Checklist:**
- [ ] All tests pass (100% of test suite)
- [ ] No new linting errors introduced
- [ ] Type safety verified (TypeScript/Flow)
- [ ] No console.log or debug statements left
- [ ] Error messages are user-friendly
- [ ] Edge cases handled (null, undefined, empty arrays, etc.)

**Security Checklist:**
- [ ] Input validation on all user data
- [ ] No SQL injection vulnerabilities (use parameterized queries)
- [ ] No XSS vulnerabilities (sanitize output)
- [ ] Authentication/authorization checks in place
- [ ] No sensitive data in logs or error messages
- [ ] Rate limiting considered for new endpoints

**Performance Check:**
- [ ] No N+1 query problems
- [ ] Database queries use proper indexes
- [ ] No unnecessary re-renders (React/Vue)
- [ ] Bundle size impact acceptable (<10KB increase)

## Step 5: Documentation Updates

1. **Code Documentation:**
   - Add/update JSDoc comments for new functions
   - Update type definitions if changed
   - Document any breaking changes

2. **User-Facing Documentation:**
   - Update README.md if user-facing features changed
   - Update API documentation for endpoint changes
   - Add migration guide for breaking changes

## Step 6: Commit & Push

```bash
# Stage all changes
git add .

# Create descriptive commit following conventional commits
git commit -m "fix: resolve issue #$ARGUMENTS - [concise description]

- Detailed explanation of what was changed
- Why this approach was chosen
- Any breaking changes or migration notes

Fixes #$ARGUMENTS"

# Push to remote
git push -u origin $BRANCH_NAME
```

## Step 7: Pull Request Creation

```bash
# Create PR with comprehensive details
gh pr create \
  --title "Fix #$ARGUMENTS: $(gh issue view $ARGUMENTS --json title --jq '.title')" \
  --body "## Description
Resolves #$ARGUMENTS

## Changes Made
- [List specific changes]
- [Affected components]

## Testing
- [x] Unit tests added/updated
- [x] Integration tests pass
- [x] Manual testing completed

## Checklist
- [x] Code follows project conventions
- [x] Tests cover edge cases
- [x] Documentation updated
- [x] No security vulnerabilities introduced
- [x] Performance impact acceptable

## Screenshots (if UI changes)
[Add screenshots if applicable]" \
  --assignee @me \
  --label "bug,automated-fix"

# Get PR URL
gh pr view --web
```

## Step 8: Post-PR Actions

1. **Request Reviews:**
   ```bash
   gh pr edit --add-reviewer [team-member-1],[team-member-2]
   ```

2. **Link Related Issues:**
   - Comment on related issues with PR link
   - Update project board if applicable

3. **Monitor CI/CD:**
   - Verify all CI checks pass
   - Address any failing tests immediately

## Rollback Procedure (if needed)

If issues are discovered:
```bash
# Revert commit
git revert HEAD

# Or force delete branch
git branch -D $BRANCH_NAME
git push origin --delete $BRANCH_NAME
```

## Success Criteria

✅ Issue is fully resolved
✅ All tests pass
✅ Code review approved
✅ CI/CD pipeline green
✅ Documentation updated
✅ No regressions introduced

---

**Important Notes:**
- Always wait for explicit user confirmation before moving between major steps
- If any step fails, STOP and report the issue before proceeding
- Prefer smaller, incremental commits over large monolithic changes
- When in doubt, ask for clarification rather than making assumptions