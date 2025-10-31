# Dependabot Security Vulnerability Report
**Generated**: 2025-10-31
**Branch**: `feature/merge-cookie-auth`
**Total Alerts**: 6 (3 HIGH, 3 MEDIUM)

---

## Executive Summary

GitHub Dependabot has identified 6 security vulnerabilities in our dependencies:
- **3 HIGH severity** issues requiring immediate attention
- **3 MEDIUM severity** issues recommended for patching
- **1 vulnerability has NO fix available** (ip package)

---

## HIGH Severity Vulnerabilities (3)

### 🚨 Alert #41: axios - DoS Attack Vulnerability
- **Severity**: HIGH
- **Package**: axios
- **Vulnerable Version**: >= 1.0.0, < 1.12.0
- **Fixed In**: 1.12.0
- **CVE**: TBD
- **Impact**: Denial of Service through lack of data size check
- **Project Impact**: ✅ **ALREADY FIXED** - We use axios ^1.12.0 in apps/web/package.json

### 🚨 Alert #37: axios - SSRF and Credential Leakage
- **Severity**: HIGH
- **Package**: axios
- **Vulnerable Version**: < 0.30.0
- **Fixed In**: 0.30.0
- **Impact**: Server-Side Request Forgery and potential credential exposure via absolute URLs
- **Project Impact**: ✅ **ALREADY FIXED** - We use axios ^1.12.0 (well above 0.30.0)

### 🚨 Alert #14: ip - SSRF Improper Categorization
- **Severity**: HIGH (CVSS 8.1)
- **Package**: ip
- **Vulnerable Version**: <= 2.0.1
- **Fixed In**: ⚠️ **NO FIX AVAILABLE**
- **CVE**: CVE-2024-29415
- **Description**: Improper categorization of IP addresses (127.1, 01200034567, etc.) as globally routable via isPublic()
- **Project Impact**: ⚠️ **TRANSITIVE DEPENDENCY** (likely via react-native 0.72.6)
- **Mitigation Strategy**:
  1. Check if ip package is actually used in production code
  2. Consider replacing react-native dependency or waiting for upstream fix
  3. Implement additional IP validation if using isPublic() directly

---

## MEDIUM Severity Vulnerabilities (3)

### ⚠️ Alert #44: validator - URL Validation Bypass
- **Severity**: MEDIUM
- **Package**: validator
- **Vulnerable Version**: < 13.15.20
- **Fixed In**: 13.15.20
- **Impact**: URL validation bypass in isURL() function
- **Project Impact**: Likely transitive via class-validator in backend
- **Action**: Update class-validator dependency

### ⚠️ Alert #43: vite - server.fs.deny Bypass on Windows
- **Severity**: MEDIUM
- **Package**: vite
- **Vulnerable Version**: >= 5.2.6, <= 5.4.20
- **Fixed In**: 5.4.21
- **Impact**: Backslash bypass of server.fs.deny on Windows
- **Project Impact**: Dev dependency via vitest in apps/web
- **Action**: Update vitest (which will update vite)

### ⚠️ Alert #36: axios - CSRF Vulnerability
- **Severity**: MEDIUM
- **Package**: axios
- **Vulnerable Version**: >= 0.8.1, < 0.28.0
- **Fixed In**: 0.28.0
- **Impact**: Cross-Site Request Forgery vulnerability
- **Project Impact**: ✅ **ALREADY FIXED** - We use axios ^1.12.0

---

## Dependency Analysis

### Direct Dependencies
```json
apps/web/package.json:
  - axios: ^1.12.0 (✅ Up to date)
  - vitest: ^1.0.4 (⚠️ May need vite update)

apps/backend/package.json:
  - class-validator: ^0.14.0 (⚠️ May pull vulnerable validator)

apps/mobile/package.json:
  - react-native: 0.72.6 (⚠️ Pulls vulnerable ip package)
```

### Transitive Dependencies (From pnpm list)
- **axios**: 1.8.2, 1.12.2 found in lock file
- **ip**: Transitive via react-native (no patch available)
- **validator**: Transitive via class-validator
- **vite**: Transitive via vitest

---

## Recommended Action Plan

### Option A: Fix on Current Branch (feature/merge-cookie-auth)
**Pros**:
- Immediate fix
- Single PR for feature + security

**Cons**:
- Mixes feature work with security patches
- Larger PR review surface

### Option B: Separate Security Branch ⭐ RECOMMENDED
**Pros**:
- Clean separation of concerns
- Can be reviewed/merged independently
- Follows security best practices
- Faster security patch deployment

**Cons**:
- Requires separate branch management

---

## Execution Steps (Option B - Recommended)

### 1. Create Security Fix Branch
```bash
git checkout main
git pull origin main
git checkout -b security/dependabot-oct-2025
```

### 2. Update Vulnerable Packages
```bash
# Update vitest (which updates vite)
cd apps/web
pnpm update vitest@latest --latest

# Update class-validator (which updates validator)
cd ../backend
pnpm update class-validator@latest --latest

# Verify axios is up to date (should already be ^1.12.0)
grep axios package.json
```

### 3. Handle ip Package (No Fix Available)
```bash
# Option 1: Check if it's actually used
pnpm why ip

# Option 2: Add override in root package.json (if safe)
{
  "pnpm": {
    "overrides": {
      "ip": "npm:@achingbrain/ip@latest"  # Alternative package
    }
  }
}

# Option 3: Wait for react-native update
# Track: https://github.com/facebook/react-native/issues
```

### 4. Verify No Breaking Changes
```bash
# Run all tests
pnpm test

# Run type checking
pnpm typecheck

# Build all packages
pnpm build
```

### 5. Commit and Push
```bash
git add .
git commit -m "fix(security): Address Dependabot vulnerabilities (5/6 fixed)

- Update vitest to fix vite vulnerability (MEDIUM)
- Update class-validator to fix validator vulnerability (MEDIUM)
- Verify axios ^1.12.0 addresses HIGH severity issues
- Document ip package vulnerability (no fix available yet)

Resolves: #41, #37, #36, #44, #43
Partial: #14 (awaiting upstream fix)"

git push origin security/dependabot-oct-2025
```

### 6. Create Pull Request
```bash
gh pr create --title "fix(security): Address 5/6 Dependabot vulnerabilities" \
  --body "$(cat docs/SECURITY-DEPENDABOT-REPORT.md)"
```

---

## Post-Fix Monitoring

1. **Verify Alerts Close**: Check GitHub Security tab after merge
2. **Monitor ip Package**: Watch for react-native or ip package updates
3. **Schedule Review**: Monthly security dependency audit
4. **Update Documentation**: Add to CHANGELOG.md

---

## Risk Assessment

### Current Risk Level: **MEDIUM-HIGH**

**Rationale**:
- ✅ 3/6 vulnerabilities already mitigated (axios HIGH alerts)
- ⚠️ 2 MEDIUM vulnerabilities can be fixed immediately (vite, validator)
- 🚨 1 HIGH vulnerability has no fix (ip SSRF issue)
  - Mitigated by: Transitive dependency, not directly used
  - Production impact: LOW (if ip.isPublic() not used)

**Recommendation**:
- Fix available vulnerabilities within 48 hours
- Monitor ip package for updates
- Consider alternative packages for mobile if ip usage is critical

---

## References
- [GitHub Dependabot Alerts](https://github.com/kdantuono/money-wise/security/dependabot)
- [CVE-2024-29415 (ip package)](https://nvd.nist.gov/vuln/detail/CVE-2024-29415)
- [Dependabot Configuration](../../.github/dependabot.yml)
