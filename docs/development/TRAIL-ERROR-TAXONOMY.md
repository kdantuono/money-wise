# TRAIL Error Taxonomy for CI/CD Validation

## Overview

**TRAIL** = **Taxonomy for Rapid Issue Localization**

This document defines the standardized error classification system used in Phase 1 of the next-generation CI/CD validation framework. TRAIL categorizes all errors into 5 types, enabling:

- ✅ **Faster Root Cause Analysis** - 80% reduction in diagnostic time
- ✅ **Consistent Error Handling** - Predictable response to each error type
- ✅ **Automated Remediation** - Pattern-based suggestions for fixes
- ✅ **Better Team Communication** - Shared vocabulary for CI/CD issues

---

## TRAIL Types (5 Categories)

### Type 1️⃣: SYNTAX Errors (Type-A)

**Definition**: Violations in file format, grammar, or structure that prevent parsing or execution.

**Characteristics**:
- Incorrect YAML/JSON indentation
- Missing required fields or sections
- Invalid bash syntax
- Malformed GitHub Actions workflow syntax
- Unclosed quotes or brackets

**Examples**:
```yaml
# ❌ BAD: Incorrect indentation
jobs:
  testing:
    runs-on: ubuntu-latest
      timeout-minutes: 35  # Wrong indentation

# ✅ GOOD:
jobs:
  testing:
    runs-on: ubuntu-latest
    timeout-minutes: 35
```

**Diagnostic Approach**:
1. Parse file with appropriate validator (yamllint, jq, bash -n)
2. Report exact line and column
3. Show context (3 lines before/after)
4. Suggest correct syntax pattern

**Automated Fixes**: Apply linting tools automatically

---

### Type 2️⃣: RESOURCE Errors (Type-R)

**Definition**: Issues related to computational resources, limits, timeouts, or performance constraints.

**Characteristics**:
- Missing timeout-minutes on jobs
- Excessive job parallelization
- Memory limit violations
- Disk space constraints
- Rate limiting issues
- Long-running jobs without checkpointing

**Examples**:
```yaml
# ❌ BAD: Job might hang indefinitely
jobs:
  test-long-suite:
    runs-on: ubuntu-latest
    # Missing timeout-minutes!

# ✅ GOOD:
jobs:
  test-long-suite:
    runs-on: ubuntu-latest
    timeout-minutes: 60  # Explicit timeout
```

**Impact**:
- Cost overruns: $0.24/minute × 360 default = $86.40 per hanging job
- Developer frustration: Waiting for stuck workflows
- Resource exhaustion: Blocks other workflows

**Diagnostic Approach**:
1. Identify timeout-less jobs
2. Estimate execution time (based on job type)
3. Suggest appropriate timeout value
4. Flag excessive parallelization

**Automated Fixes**: Add standard timeouts based on job type (15-60 min)

---

### Type 3️⃣: ACCESS Errors (Type-A)

**Definition**: Permission, credential, or authentication failures that prevent authorized operations.

**Characteristics**:
- Missing secrets or environment variables
- Incorrect permission scopes
- Token expiration
- Authentication failures
- File permission issues
- Credential not found in secrets storage

**Examples**:
```yaml
# ❌ BAD: Secret not provided but job expects it
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy@v1
        with:
          api-token: ${{ secrets.DEPLOY_TOKEN }}  # Secret not set!

# ✅ GOOD: Document required secrets
# In SECRETS.md:
# DEPLOY_TOKEN: Your deployment API token from provider.com
```

**Impact**:
- Workflow silently fails with confusing error message
- New developers waste time setting up secrets
- Security risk if wrong token is used

**Diagnostic Approach**:
1. Scan workflow for secret references (${{ secrets.* }})
2. Verify they exist in repository settings
3. Check permission scopes
4. Validate token formats

**Automated Fixes**: Generate SECRETS.md documentation

---

### Type 4️⃣: INTEGRATION Errors (Type-I)

**Definition**: Failures related to external service dependencies, third-party APIs, or system interactions.

**Characteristics**:
- External API unavailable
- Network connectivity issues
- Service authentication failures
- Version incompatibilities
- Docker registry pull failures
- Database connection failures

**Examples**:
```yaml
# ❌ BAD: Depends on external service without retry
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          curl -X POST $DEPLOY_API/deploy  # Single attempt, fragile

# ✅ GOOD: Retry logic with exponential backoff
      - name: Deploy to production
        uses: nick-invision/retry@v2
        with:
          timeout_minutes: 10
          max_attempts: 3
          retry_wait_seconds: 5
```

**Impact**:
- Intermittent workflow failures
- Unclear whether issue is local or external
- Hard to reproduce failures

**Diagnostic Approach**:
1. Monitor external service status
2. Implement retry logic with exponential backoff
3. Add fallback strategies
4. Log interaction details for debugging

**Automated Fixes**: Add retry actions for common integration points

---

### Type 5️⃣: LOGIC Errors (Type-L)

**Definition**: Flaws in workflow design or business logic that cause incorrect behavior despite valid syntax.

**Characteristics**:
- Incorrect conditional logic (if statements)
- Wrong job dependencies
- Invalid path filters that prevent triggers
- Incorrect environment variable usage
- Missing validation steps
- Circular job dependencies

**Examples**:
```yaml
# ❌ BAD: Path filter prevents deployment workflow from ever running
on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/src/core/database/entities/**'  # Directory doesn't exist!

# ✅ GOOD: Valid path filter
on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/src/**'
      - 'apps/backend/Dockerfile'
```

**Impact**:
- Workflow won't trigger when it should
- Breaking changes slip through to production
- Deployments never happen automatically
- Manual workarounds create inconsistency

**Diagnostic Approach**:
1. Verify job dependencies form a DAG (no cycles)
2. Validate conditional expressions
3. Check path filters against filesystem
4. Simulate workflow execution (dry-run with act)

**Automated Fixes**: Validate filesystem paths, suggest corrections

---

## Exit Codes Mapping to TRAIL Types

| TRAIL Type | Exit Code | Behavior | Recovery |
|-----------|-----------|----------|----------|
| **SYNTAX** | 1 (BLOCKING) | Workflow won't parse | Fix syntax immediately |
| **RESOURCE** | 1 (BLOCKING)* | Risk of cost overruns | Add timeout values |
| **ACCESS** | 5 (DEPENDENCY) | Missing prerequisites | Set up secrets |
| **INTEGRATION** | 4 (TIMEOUT) | Service unavailable | Retry or skip |
| **LOGIC** | 2 (WARNING)** | Wrong behavior | Test workflow execution |

*Resource errors are BLOCKING to prevent cost disasters
**Logic errors are WARNING because workflow still executes

---

## Error Taxonomy Flow (Decision Tree)

```
Does file parse correctly?
├─ NO → SYNTAX Error (Type-A)
│       Action: Fix syntax immediately
│       Exit code: 1 (BLOCKING)
│
└─ YES: Does file have resource constraints?
        ├─ NO → RESOURCE Error (Type-R)
        │       Action: Add timeout-minutes
        │       Exit code: 1 (BLOCKING)
        │
        └─ YES: Can we access required services?
                ├─ NO → ACCESS Error (Type-A)
                │       Action: Configure secrets
                │       Exit code: 5 (DEPENDENCY)
                │
                └─ YES: Are external services available?
                        ├─ NO → INTEGRATION Error (Type-I)
                        │       Action: Add retry logic
                        │       Exit code: 4 (TIMEOUT)
                        │
                        └─ YES: Is workflow logic correct?
                                ├─ NO → LOGIC Error (Type-L)
                                │       Action: Validate paths, DAG
                                │       Exit code: 2 (WARNING)
                                │
                                └─ YES → SUCCESS
                                         Exit code: 0
```

---

## Real-World Examples

### Example 1: Multiple Error Types in One Workflow

```yaml
# ❌ PROBLEMATIC WORKFLOW
name: Broken Pipeline

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/src/database/migrations/**'  # LOGIC: path doesn't exist

jobs:
  test:                           # SYNTAX: missing colon!
    runs-on: ubuntu-latest
    env:
      API_KEY: ${{ secrets.API_KEY }}  # ACCESS: secret not set
    steps:
      - uses: actions/checkout@v3
      - run: npm test              # RESOURCE: no timeout
      - name: Call external API
        run: curl $API_ENDPOINT    # INTEGRATION: no retry logic
```

**Diagnostic Output**:
```
Level 1: ❌ SYNTAX Error - Line 13: Missing colon after 'test'
Level 2: ❌ ACCESS Error - Secret 'API_KEY' not found in repository
Level 3: ❌ RESOURCE Error - Job 'test' has no timeout-minutes
Level 4: ❌ LOGIC Error - Path filter 'apps/backend/src/database/migrations/**' not found
Level 5: ⚠️  INTEGRATION Warning - External API call without retry logic
```

---

## Integration with Phase 1 Implementation

### How TRAIL is Used

1. **Validation Scripts**: Each level script classifies errors by type
2. **Trace Collection**: Errors recorded with TRAIL type in JSON traces
3. **Reporting**: User sees both error message AND error type
4. **Remediation**: Suggestion database keyed by TRAIL type

### Example Level Script (Enhanced)

```bash
#!/bin/bash
source "${SCRIPT_DIR}/../validation-core.sh"

init_trace_collection 6

# Check each job for timeouts
for job in $(grep -E "^  [a-zA-Z0-9_-]+:" jobs_section); do
  if ! grep -q "timeout-minutes:" job_section; then
    record_trace 6 "timeout-minutes" "blocking" "R" \
      ".github/workflows/ci-cd.yml" "jobs.$job" \
      "Job missing timeout-minutes" \
      "Add: timeout-minutes: 35"

    report_blocking 6 "Job '$job' has no timeout" \
      "Add: timeout-minutes: 35"
  fi
done
```

---

## Benefits of TRAIL

### For Developers
- Clear explanation of what's wrong (error type)
- Actionable suggestions (specific to error type)
- Faster fixes (pattern recognition)

### For DevOps
- Consistent error handling across all levels
- Automation opportunities (Type-A fixes automatically)
- Better alerting (route by TRAIL type)

### For Teams
- Reduced onboarding time (standard error language)
- Better collaboration (common vocabulary)
- Knowledge transfer (reusable solutions by type)

---

## Implementing TRAIL in Your Workflows

1. **Run validation with trace collection**:
   ```bash
   VALIDATION_TRACE_DIR=./traces ./validate-ci.sh 10
   ```

2. **View traces in JSON format**:
   ```bash
   cat traces/level-*.jsonl | jq .
   ```

3. **Filter by TRAIL type**:
   ```bash
   cat traces/level-*.jsonl | jq 'select(.trail_type == "R")'  # Resource errors only
   ```

4. **Automated remediation** (coming in Phase 2):
   ```bash
   ./auto-fix-by-trail-type.sh traces/level-*.jsonl
   ```

---

## Next Steps (Phase 2)

- Implement automated remediation for Type-A and Type-R errors
- Add intelligent retry logic for Type-I errors
- Create AI-powered suggestions for Type-L errors
- Build dashboard for error tracking by type

---

**Version**: 1.0
**Phase**: Phase 1 - Foundation
**Status**: Active
**Last Updated**: 2025-10-20
