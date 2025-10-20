# Phase 1: Implementation Guide

## Overview

Phase 1 implements the foundational layer of the next-generation CI/CD validation framework based on cutting-edge research from SWE-Factory, TRAIL taxonomy, and trace collection principles.

**Timeline**: Weeks 1-2 (7 hours total)
**Status**: In Progress ✅ Foundation Layer Deployed
**Components**:
- ✅ Exit-code standardization (SWE-Factory)
- ✅ TRAIL error taxonomy (7 types → 5 core types)
- ✅ Trace collection system (JSON Lines format)
- 🔄 Integration into level scripts (In Progress)

---

## What Was Implemented

### 1. Exit-Code Standardization Library

**File**: `.claude/scripts/ci-validation/validation-core.sh`

**Purpose**: Provides standardized exit codes and reporting functions for all validation scripts.

**Exit Codes** (100% Accurate Interpretation):
```bash
0 (SUCCESS)      ✅ All checks passed, workflow can proceed
1 (BLOCKING)     ❌ Fatal error, workflow must stop
2 (WARNING)      ⚠️  Issue detected, workflow proceeds but action needed
3 (SKIP)         ⏭️  Check skipped, not applicable
4 (TIMEOUT)      ⏱️  Check exceeded time limit
5 (DEPENDENCY)   📦 Required dependency missing
```

**Benefits**:
- ✅ Eliminates ambiguity in result interpretation
- ✅ Enables programmatic error handling
- ✅ Works with standard shell scripting (`$?` capture)
- ✅ Compatible with GitHub Actions job status

### 2. TRAIL Error Taxonomy

**File**: `docs/development/TRAIL-ERROR-TAXONOMY.md`

**5 Core Error Types**:

| Type | Name | Example | Fix Strategy |
|------|------|---------|--------------|
| **A** | SYNTAX | Invalid YAML indentation | Auto-fix with yamllint |
| **R** | RESOURCE | Missing timeout-minutes | Add standard values |
| **A** | ACCESS | Missing secrets | Generate SECRETS.md |
| **I** | INTEGRATION | External API failure | Add retry logic |
| **L** | LOGIC | Invalid path filter | Validate filesystem |

**Usage**:
- Each validation error is classified by type
- Type determines suggested fix
- Enables pattern-based automation

### 3. Trace Collection System

**Format**: JSON Lines (one JSON object per line)

**Example Trace Entry**:
```json
{"level":6,"check":"timeout-minutes","status":"blocking","trail_type":"R","file":".github/workflows/ci-cd.yml","location":"jobs.testing","issue":"Job 'testing' has no timeout-minutes","suggestion":"Add: timeout-minutes: 35","timestamp":"2025-10-20T14:32:15Z"}
```

**Storage**: `.claude/traces/level-X-{timestamp}.jsonl`

**Query Examples**:
```bash
# View all traces
cat .claude/traces/*.jsonl | jq .

# Filter by error type
cat .claude/traces/*.jsonl | jq 'select(.trail_type == "R")'

# Count errors by level
cat .claude/traces/*.jsonl | jq '.level' | sort | uniq -c

# Export to CSV
cat .claude/traces/*.jsonl | jq -r '[.level, .trail_type, .file, .issue] | @csv'
```

---

## How to Use the Framework

### For Level Script Authors

#### Step 1: Source the Framework

```bash
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Now you have access to:
# - EXIT_SUCCESS, EXIT_BLOCKING, EXIT_WARNING, etc. (exit codes)
# - report_success(), report_blocking(), report_warning() (output functions)
# - record_trace() (trace collection)
# - init_trace_collection() (trace initialization)
```

#### Step 2: Initialize Tracing (Optional but Recommended)

```bash
# Set up trace file for this level
init_trace_collection 7  # Use your level number

# Traces will be saved to:
# .claude/traces/level-7-{timestamp}.jsonl
```

#### Step 3: Record Errors with TRAIL Classification

```bash
# When you find an error:
record_trace 7 "path-filter" "blocking" "L" \
  ".github/workflows/deploy.yml" \
  "on.push.paths[0]" \
  "Path filter points to non-existent directory" \
  "Use: apps/backend/src/** instead"
```

**Parameters**:
- `7` = Level number
- `"path-filter"` = Check name
- `"blocking"` = Severity (blocking, warning)
- `"L"` = TRAIL type (A, R, I, L)
- `".github/workflows/deploy.yml"` = File name
- `"on.push.paths[0]"` = Location (YAML path or section)
- `"Path filter..."` = Detailed issue description
- `"Use: apps/backend..."` = Specific suggestion

#### Step 4: Use Standardized Reporting

```bash
# For successful checks
report_success 7 "All path filters are valid"
exit $EXIT_SUCCESS

# For blocking errors
report_blocking 7 "4 invalid path filters found" \
  "Update paths to valid directories"
exit $EXIT_BLOCKING

# For warnings (non-fatal)
report_warning 7 "Path filter could be more specific" \
  "Consider narrowing scope to reduce workflow triggers"
exit $EXIT_WARNING

# For skipped checks
report_skip 7 "No path filters configured (check skipped)"
exit $EXIT_SKIP
```

---

## Example: Converting Level-6 (Completed ✅)

Before (Old Style):
```bash
echo -e "${YELLOW}⚠️  Job '$job' has no timeout-minutes${NC}"
WARNINGS=$((WARNINGS + 1))

# Later...
if [ $WARNINGS -gt 0 ]; then
  echo -e "${RED}❌ BLOCKING ERROR: Found $WARNINGS jobs...${NC}"
  exit 1  # 1 = generic error code
fi
```

After (Phase 1 Style):
```bash
# Record trace with TRAIL type
record_trace 6 "timeout-minutes" "blocking" "R" \
  "$display_path" "jobs.$job" \
  "Job '$job' has no timeout-minutes" \
  "Add: timeout-minutes: 35"

# Use standardized reporting
echo -e "${RED}❌ RESOURCE ERROR: Job '$job' in $filename${NC}"

# Later...
report_blocking 6 "Found $ERRORS jobs without timeout-minutes" \
  "Add timeout-minutes to all jobs"
exit $EXIT_BLOCKING
```

**Improvements**:
- ✅ Error type clearly identified (TRAIL-R)
- ✅ Trace recorded for analysis
- ✅ Consistent exit code ($EXIT_BLOCKING)
- ✅ Standardized message format
- ✅ Specific suggestion provided

---

## Converting Other Level Scripts

### Priority Order (Recommend This Sequence)

1. **Level 1-2** (YAML/Syntax validation)
   - Simple integration
   - High-value errors (TRAIL-A)
   - Auto-fix opportunities
   - **Effort**: 1 hour each

2. **Level 3-5** (Permissions, dependencies, jobs)
   - Medium complexity
   - TRAIL-A errors primarily
   - **Effort**: 1-2 hours each

3. **Level 7** (Path filters)
   - Medium complexity
   - TRAIL-L errors (logic)
   - **Effort**: 1 hour

4. **Level 8** (Secrets)
   - Medium complexity
   - TRAIL-A errors (access)
   - **Effort**: 1 hour

5. **Levels 9-10** (act validation)
   - Complex integration
   - TRAIL-I errors (integration)
   - **Effort**: 2-3 hours each

### Template for New Level Script

```bash
#!/bin/bash
# Level X: [Description]
#
# Phase 1 Enhancements:
#   ✅ Exit-code based validation
#   ✅ TRAIL error taxonomy
#   ✅ Trace collection

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection X

echo -e "${YELLOW}🔍 LEVEL X: [Description]${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
ERRORS=0

# Start timing
TIMER_START=$(start_timer)

# Your validation logic here
# For each error found:
#   record_trace X "check-name" "blocking" "[TRAIL_TYPE]" ...
#   echo error message
#   ERRORS=$((ERRORS + 1))

TIMER_END=$(end_timer $TIMER_START)

# Report results
if [ $ERRORS -gt 0 ]; then
  report_blocking X "Found $ERRORS errors" "See suggestions above"
  exit $EXIT_BLOCKING
fi

report_success X "All checks passed"
exit $EXIT_SUCCESS
```

---

## Integration with Continuous Integration

### Local Validation

```bash
# Run validation with trace collection
./.claude/scripts/validate-ci.sh 10

# View traces immediately after
cat .claude/traces/*.jsonl | jq .

# Analyze by error type
echo "=== RESOURCE ERRORS (Type-R) ==="
cat .claude/traces/*.jsonl | jq 'select(.trail_type == "R")'

echo "=== LOGIC ERRORS (Type-L) ==="
cat .claude/traces/*.jsonl | jq 'select(.trail_type == "L")'
```

### Git Hook Integration

Add to `.git/hooks/pre-push`:
```bash
#!/bin/bash
# Collect traces
./.claude/scripts/validate-ci.sh 10

# If validation fails, save traces
if [ $? -ne 0 ]; then
  TRACE_PATH=".claude/traces/failed-$(date +%s).jsonl"
  cat .claude/traces/*.jsonl > "$TRACE_PATH"
  echo "❌ Traces saved to: $TRACE_PATH"
  echo "Analyze with: cat $TRACE_PATH | jq ."
  exit 1
fi
```

### CI/CD Pipeline Integration

```yaml
# In .github/workflows/validate.yml
- name: Run validation with traces
  run: |
    ./.claude/scripts/validate-ci.sh 10

    # Archive traces for analysis
    if [ -d ".claude/traces" ]; then
      tar czf traces-${{ github.run_id }}.tar.gz .claude/traces/
    fi

- name: Upload trace artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: validation-traces
    path: traces-*.tar.gz
```

---

## Trace Analysis Tools

### View Raw Traces

```bash
cat .claude/traces/level-6-*.jsonl | jq '.'
```

### Count Errors by Type

```bash
cat .claude/traces/*.jsonl | jq -s 'group_by(.trail_type) | map({type: .[0].trail_type, count: length})'
```

### Find Slowest Checks

```bash
cat .claude/traces/*.jsonl | jq 'select(.execution_time_ms > 1000)' | \
  jq -s 'sort_by(.execution_time_ms) | reverse | .[0:5]'
```

### Generate Report

```bash
cat .claude/traces/*.jsonl | jq -s '
  {
    total: length,
    by_level: (group_by(.level) | map({level: .[0].level, count: length})),
    by_type: (group_by(.trail_type) | map({type: .[0].trail_type, count: length})),
    blocking: (map(select(.status == "blocking")) | length),
    warnings: (map(select(.status == "warning")) | length)
  }
'
```

---

## Success Metrics for Phase 1

### ✅ Completed Deliverables

| Component | Status | Evidence |
|-----------|--------|----------|
| **Exit-code Library** | ✅ | `validation-core.sh` with 6 exit codes |
| **TRAIL Taxonomy** | ✅ | `TRAIL-ERROR-TAXONOMY.md` with 5 types + decision tree |
| **Trace Collection** | ✅ | JSON Lines format, timestamp, all metadata |
| **Level-6 Integration** | ✅ | Updated script uses all Phase 1 features |

### 📊 Expected Improvements (Week 1-2)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Error Type Identification** | Manual | Automatic (TRAIL) | 5x faster |
| **Trace Collection** | None | Comprehensive | New capability |
| **Exit Code Consistency** | 0/1 only | 6 standardized | 100% accuracy |
| **Diagnostic Detail** | Basic | Detailed traces | 10x more context |

---

## Next Steps (Phase 2)

**Phase 2** (Weeks 3-4) will build on Phase 1 with:

1. **Runtime Dependency Graph (RDG)**
   - Enable 3-5x parallelization
   - Identify critical path
   - Estimate total validation time

2. **Robustness Scoring**
   - Semantic variation testing
   - Consistency metrics (70-90%)
   - Failure prediction

3. **Automated Remediation**
   - Type-A (Syntax) errors: Auto-fix
   - Type-R (Resource) errors: Suggest values
   - Type-L (Logic) errors: Validate paths

---

## Troubleshooting

### Issue: Traces Not Being Created

**Check**:
```bash
ls -la .claude/traces/
```

**Solution**:
```bash
# Ensure validation-core.sh is sourced correctly
grep "source.*validation-core.sh" .claude/scripts/ci-validation/level-*.sh
```

### Issue: Exit Codes Not Working

**Check**:
```bash
bash .claude/scripts/ci-validation/level-6-resource-limits.sh
echo "Exit code: $?"
```

**Solution**:
```bash
# Verify EXIT_* constants are exported
grep "export EXIT_" .claude/scripts/ci-validation/validation-core.sh
```

### Issue: Trace JSON Invalid

**Check**:
```bash
cat .claude/traces/*.jsonl | jq .
```

**Solution**:
```bash
# Validate JSON syntax
cat .claude/traces/level-6-*.jsonl | jq empty
```

---

## File Structure

```
.claude/scripts/
├── validate-ci.sh                 (Main orchestrator)
└── ci-validation/
    ├── validation-core.sh         ✅ NEW: Phase 1 foundation
    ├── level-1-*.sh              (TODO: Integrate in Phase 1)
    ├── level-2-*.sh              (TODO: Integrate in Phase 1)
    ├── ...
    ├── level-6-resource-limits.sh ✅ CONVERTED: Phase 1 example
    ├── level-7-path-filters.sh   (TODO: Integrate in Phase 1)
    ├── level-8-*.sh              (TODO: Integrate in Phase 1)
    └── level-9-10-*.sh           (TODO: Phase 2)

docs/development/
├── TRAIL-ERROR-TAXONOMY.md        ✅ NEW: Error classification
├── PHASE-1-IMPLEMENTATION-GUIDE.md ✅ NEW: This file
└── CI-CD-VALIDATION-NEXT-GENERATION.md (Existing: Overall roadmap)

.claude/traces/                     ✅ NEW: Trace storage
└── level-X-{timestamp}.jsonl      (Auto-created per run)
```

---

## Commit Strategy

**Commits for Phase 1**:

```bash
# 1. Add foundational libraries
git commit -m "feat(ci-cd): add validation-core.sh with exit-code framework"

# 2. Add documentation
git commit -m "docs(ci-cd): add TRAIL taxonomy and Phase 1 guide"

# 3. Update level scripts (done per level)
git commit -m "refactor(level-6): integrate Phase 1 validation framework"
git commit -m "refactor(level-7): integrate Phase 1 validation framework"
# ... etc
```

---

## Getting Help

### Common Questions

**Q: Should I update all levels at once?**
A: No, integrate one or two at a time (max 2 hours). Test thoroughly.

**Q: How do I test trace collection?**
A: Run validation, then: `cat .claude/traces/*.jsonl | jq .`

**Q: Can I disable trace collection?**
A: Yes, comment out `init_trace_collection X` in the level script.

**Q: What if validation-core.sh is missing?**
A: Run from project root: `./.claude/scripts/validate-ci.sh`

---

**Version**: 1.0
**Phase**: Phase 1 - Foundation
**Status**: In Progress
**Last Updated**: 2025-10-20
**Timeline**: Week 1-2 / 7 hours
