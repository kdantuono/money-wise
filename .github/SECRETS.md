# GitHub Secrets Configuration

This document describes all required secrets for CI/CD workflows in the MoneyWise project.

## Overview

All secrets are managed through GitHub repository settings and are encrypted. They are only accessible to GitHub Actions workflows and are never exposed in logs or outputs.

---

## 🔓 Public Workflows (All Branches)

These secrets are required for public CI/CD workflows that run on all feature branches.

### GITHUB_TOKEN
- **Auto-provided by GitHub Actions** ✅
- **Scope**: Repository access for CI/CD operations
- **Usage**: Default token for workflow operations
- **Status**: Automatically available - no configuration needed
- **Workflows**: ci-cd.yml, release.yml, specialized-gates.yml

---

## 🔐 Code Quality & Security Secrets

### CODECOV_TOKEN
- **Purpose**: Upload test coverage reports to Codecov
- **Required for**: Code coverage tracking and PR comments
- **Setup**:
  1. Go to https://codecov.io
  2. Sign up with GitHub
  3. Authorize Codecov to access your repositories
  4. Get your repository token from the settings
  5. Add token as `CODECOV_TOKEN` secret in GitHub
- **Workflows**: ci-cd.yml (testing job)
- **Sensitivity**: Medium - token is repo-specific
- **Expiration**: Codecov tokens don't expire but can be regenerated

### SEMGREP_APP_TOKEN
- **Purpose**: Enable Semgrep SAST (Static Application Security Testing) scans
- **Required for**: Security scanning for vulnerabilities
- **Coverage**:
  - OWASP Top 10 vulnerabilities
  - CWE Top 25 security weaknesses
  - XSS, SQL Injection, Command Injection detection
  - JavaScript/TypeScript/React/Next.js patterns
- **Setup**:
  1. Go to https://semgrep.dev
  2. Create a free account
  3. Generate an API token in settings
  4. Add token as `SEMGREP_APP_TOKEN` secret in GitHub
- **Workflows**: ci-cd.yml (security jobs)
- **Sensitivity**: High - enables security scanning
- **Limit**: Semgrep free tier includes up to 5 repos

---

## 🚀 Release & Deployment Secrets

### SENTRY_AUTH_TOKEN
- **Purpose**: Authenticate with Sentry for release management and error tracking
- **Required for**: Creating releases, uploading source maps, and deployment monitoring
- **Setup**:
  1. Go to https://sentry.io
  2. Create a Sentry account or log in
  3. Go to your organization settings
  4. Navigate to Auth Tokens
  5. Create a new token with `project:releases`, `event:read`, and `event:write` scopes
  6. Add token as `SENTRY_AUTH_TOKEN` secret in GitHub
- **Workflows**: release.yml
- **Sensitivity**: Critical - allows release and error management
- **Scopes**: Must include `project:releases`, `event:read`, `event:write`

### SENTRY_ORG
- **Purpose**: Specify your Sentry organization
- **Value**: Your organization name/slug in Sentry
- **Example**: `moneywise` or `my-org`
- **Setup**:
  1. Log in to Sentry
  2. Go to Settings → Organization
  3. Copy the organization slug from the URL or settings
  4. Add as `SENTRY_ORG` secret in GitHub
- **Workflows**: release.yml
- **Sensitivity**: Low - organization names are often public

### SENTRY_PROJECT_BACKEND
- **Purpose**: Identify the Sentry project for backend releases
- **Value**: Backend project slug in Sentry
- **Example**: `backend` or `money-wise-backend`
- **Setup**:
  1. Log in to Sentry
  2. Go to Projects
  3. Click on your backend project
  4. Copy the project slug from the URL or settings
  5. Add as `SENTRY_PROJECT_BACKEND` secret in GitHub
- **Workflows**: release.yml
- **Sensitivity**: Low - project names are often visible

### SENTRY_PROJECT_WEB
- **Purpose**: Identify the Sentry project for web (frontend) releases
- **Value**: Web project slug in Sentry
- **Example**: `web` or `money-wise-web`
- **Setup**:
  1. Log in to Sentry
  2. Go to Projects
  3. Click on your web project
  4. Copy the project slug from the URL or settings
  5. Add as `SENTRY_PROJECT_WEB` secret in GitHub
- **Workflows**: release.yml
- **Sensitivity**: Low - project names are often visible

### SENTRY_PROJECT_MOBILE
- **Purpose**: Identify the Sentry project for mobile releases
- **Value**: Mobile project slug in Sentry
- **Example**: `mobile` or `money-wise-mobile`
- **Setup**:
  1. Log in to Sentry
  2. Go to Projects
  3. Click on your mobile project
  4. Copy the project slug from the URL or settings
  5. Add as `SENTRY_PROJECT_MOBILE` secret in GitHub
- **Workflows**: release.yml
- **Sensitivity**: Low - project names are often visible

---

## 📋 Secrets Summary Table

| Secret | Required | Sensitivity | Workflow | Expiration |
|--------|----------|-------------|----------|-----------|
| GITHUB_TOKEN | ✅ Auto | - | All | N/A |
| CODECOV_TOKEN | ✅ | Medium | ci-cd.yml | None |
| SEMGREP_APP_TOKEN | ✅ | High | ci-cd.yml | None |
| SENTRY_AUTH_TOKEN | ✅ | Critical | release.yml | As needed |
| SENTRY_ORG | ✅ | Low | release.yml | N/A |
| SENTRY_PROJECT_BACKEND | ✅ | Low | release.yml | N/A |
| SENTRY_PROJECT_WEB | ✅ | Low | release.yml | N/A |
| SENTRY_PROJECT_MOBILE | ✅ | Low | release.yml | N/A |

---

## 🔧 How to Add Secrets

### Via GitHub Web Interface

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name (exactly as listed above)
5. Paste the secret value
6. Click **Add secret**

### Via GitHub CLI

```bash
# Add a secret using the CLI
gh secret set CODECOV_TOKEN -b "your-token-value"

# Verify a secret exists (shows only the name, not value)
gh secret list
```

---

## ✅ Verification Checklist

Before deploying, ensure all required secrets are configured:

- [ ] CODECOV_TOKEN configured
- [ ] SEMGREP_APP_TOKEN configured
- [ ] SENTRY_AUTH_TOKEN configured
- [ ] SENTRY_ORG configured
- [ ] SENTRY_PROJECT_BACKEND configured
- [ ] SENTRY_PROJECT_WEB configured
- [ ] SENTRY_PROJECT_MOBILE configured

Run this command to check which secrets are configured:

```bash
gh secret list
```

All 7 secrets (excluding GITHUB_TOKEN) should appear in the list.

---

## 🔒 Security Best Practices

### Token Rotation
- **SENTRY_AUTH_TOKEN**: Regenerate every 90 days
- **CODECOV_TOKEN**: Regenerate if exposed
- **SEMGREP_APP_TOKEN**: Regenerate if team members leave

### Access Control
- Secrets are only accessible to GitHub Actions
- Never commit secrets to the repository
- Use branch protection rules to require reviews

### Monitoring
- Review GitHub's audit log for secret access
- Watch for unexpected CI/CD failures (might indicate invalid secrets)
- Monitor Sentry for deployment errors

### Incident Response
If a secret is accidentally exposed:

1. **Immediately revoke** the token in its service (Sentry, Codecov, Semgrep)
2. **Generate a new token** in the service
3. **Update the GitHub secret** with the new token
4. **Check logs** for unauthorized activity

---

## 🆘 Troubleshooting

### "Authentication failed" errors in CI/CD

**Check**:
1. Is the secret configured? (`gh secret list`)
2. Is the token valid in the service?
3. Does the token have proper scopes?
4. Has the token expired?

**Fix**:
1. Regenerate the token in the service
2. Update the GitHub secret with the new value
3. Re-run the workflow

### Secrets not being used by workflows

Workflows use secrets with `${{ secrets.SECRET_NAME }}` syntax. Check that:
1. The secret name matches exactly (case-sensitive)
2. The secret is used in the correct job/step
3. The workflow has proper permissions

---

## 📖 Related Documentation

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Sentry Release Management](https://docs.sentry.io/product/releases/)
- [Codecov Setup](https://docs.codecov.io/docs)
- [Semgrep CI/CD Integration](https://semgrep.dev/docs/deployment/ci-cd-integration/)

---

## 📝 Notes

- This configuration supports feature branches, develop, and main deployments
- Security scanning runs progressively (lightweight → enhanced → comprehensive)
- All release operations require successful passing of tests and security checks
- Sentry integration provides error tracking across all three apps (backend, web, mobile)

**Last Updated**: October 20, 2025
**Maintained by**: Development Team
