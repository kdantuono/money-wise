# Claude Code GitHub Actions Setup

This document describes the Claude Code GitHub Actions installed in the MoneyWise repository.

## 🤖 Installed Actions

### 1. **Claude Code** (`claude-code.yml`)

**Purpose:** Interactive Claude assistance triggered by `@claude` mentions **Triggers:**

- Issue comments containing `@claude`
- PR review comments containing `@claude`
- New issues with `@claude` in title/body
- PR reviews containing `@claude`

**Use Cases:**

- Get help with code issues: "This function is buggy @claude"
- Request code reviews: "@claude please review this implementation"
- Ask questions: "@claude how should I structure this component?"

### 2. **Auto Fix CI Failures** (`claude-ci-auto-fix.yml`)

**Purpose:** Automatically fix CI pipeline failures **Triggers:** When CI/CD Pipeline workflow fails **Features:**

- Creates fix branch with pattern `claude-auto-fix-ci-{branch}-{timestamp}`
- Analyzes CI failure logs
- Implements fixes for common issues (linting, tests, builds)
- Creates PR with fixes

### 3. **Comprehensive PR Review** (`claude-pr-review-comprehensive.yml`)

**Purpose:** In-depth code review for all PRs **Triggers:** PR opened, synchronized, ready for review **Review Areas:**

- Financial security & compliance
- Code quality & architecture
- Security vulnerabilities
- Performance optimization
- Testing coverage
- Multi-tenant data isolation

### 4. **Security-Focused PR Review** (`claude-pr-review-security.yml`)

**Purpose:** Intensive security review for sensitive changes **Triggers:** PRs affecting security-sensitive paths:

- `apps/backend/**`
- `**/auth/**`, `**/security/**`
- `.env*`, `docker-compose*.yml` **Focus:** Authentication, data protection, financial security, API security

### 5. **Frontend-Focused PR Review** (`claude-pr-review-frontend.yml`)

**Purpose:** UI/UX and frontend-specific review **Triggers:** PRs affecting frontend code:

- `apps/web/**`, `apps/mobile/**` **Focus:** React/Next.js patterns, UX, performance, accessibility, design system

### 6. **Issue Triage** (`claude-issue-triage.yml`)

**Purpose:** Automatic issue classification and labeling **Triggers:** New issues opened **Features:**

- Categorizes issue type (bug, feature, security, etc.)
- Assigns priority levels
- Estimates effort required
- Applies appropriate labels

### 7. **Issue Deduplication** (`claude-issue-deduplication.yml`)

**Purpose:** Detect and manage duplicate issues **Triggers:** Issues opened or edited **Features:**

- Searches for similar existing issues
- Semantic analysis of problem descriptions
- Marks duplicates and links to originals

### 8. **Manual Code Analysis** (`claude-manual-analysis.yml`)

**Purpose:** On-demand deep code analysis **Triggers:** Manual workflow dispatch **Analysis Types:**

- `summarize-commit`: Detailed commit analysis
- `security-review`: Security vulnerability scan
- `performance-audit`: Performance bottleneck identification
- `architecture-review`: Architectural pattern compliance
- `dependency-audit`: Dependency health check

## 🔧 Configuration Required

### 1. Add GitHub Secret

Add `ANTHROPIC_API_KEY` to your repository secrets:

1. Go to Repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key from https://console.anthropic.com/

### 2. Enable GitHub Actions

Ensure GitHub Actions are enabled in your repository settings.

### 3. Set Permissions

The workflows require these permissions (already configured):

- `contents: read/write`
- `pull-requests: write`
- `issues: write`
- `id-token: write`
- `actions: read`

## 📋 Usage Examples

### Interactive Help

```
# In any issue or PR comment:
@claude this function is throwing an error, can you help debug it?

@claude please review the security of this authentication flow

@claude how can I optimize this React component for better performance?
```

### Manual Analysis

1. Go to Actions tab → "Claude Manual Code Analysis"
2. Click "Run workflow"
3. Select analysis type and options
4. Review results in workflow output or created issues

### CI Auto-Fix

- Automatically triggered when CI fails
- Creates fix branch and PR
- Review and merge the auto-generated fixes

## 🎯 Best Practices

### For Developers

1. **Use @claude mentions strategically** - Be specific about what help you need
2. **Review auto-generated PRs carefully** - Always validate AI-generated fixes
3. **Leverage manual analysis** - Run periodic security and performance audits
4. **Monitor issue triage** - Verify AI-assigned labels and priorities

### For Team Leads

1. **Monitor action usage** - Check Actions tab for workflow runs
2. **Review security alerts** - Pay attention to security-focused reviews
3. **Track issue quality** - Use triage insights for process improvement
4. **Performance monitoring** - Run regular performance audits

## 🚨 Important Notes

### Security Considerations

- AI can identify many security issues but shouldn't replace human security review
- Always validate security-critical changes manually
- Monitor for false positives in security alerts

### Financial Application Specific

- All actions are configured for MoneyWise's fintech context
- Special attention to PCI DSS compliance
- Multi-tenant data isolation validation
- Transaction integrity checks

### Rate Limits

- Anthropic API has rate limits - monitor usage
- GitHub Actions have execution time limits
- Large repositories may need workflow optimization

## 🔄 Maintenance

### Regular Tasks

- Monitor API key usage and billing
- Review workflow effectiveness
- Update action versions when available
- Adjust prompts based on team feedback

### Troubleshooting

- Check workflow logs in Actions tab
- Verify API key is set and valid
- Ensure repository permissions are correct
- Review action triggers and filters

## 📈 Analytics

Track these metrics to measure effectiveness:

- Issue triage accuracy
- PR review quality improvements
- CI failure auto-fix success rate
- Security vulnerability detection
- Developer satisfaction with AI assistance

---

🤖 These actions enhance the MoneyWise development workflow by providing intelligent, context-aware assistance while
maintaining the high security and quality standards required for financial applications.
