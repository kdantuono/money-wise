# Documentation Root Audit Command

Periodic monitoring command to verify documentation governance compliance and identify violations.

## Usage

```bash
/doc-audit                # Default: show summary report
/doc-audit --check        # Dry-run: show what would be fixed
/doc-audit --fix          # Apply fixes for violations
/doc-audit --report       # Detailed violation statistics
/doc-audit --monitor      # Setup monitoring (scheduled checks)
```

## Features

- **Regular compliance checking**: Scan root for violations
- **Categorized reporting**: Statistics by file type
- **Actionable fixes**: Optional auto-fix with confirmation
- **Scheduled monitoring**: Optional periodic verification (future)

## Implementation

This command wraps the `.claude/scripts/cleanup-root.sh` script and provides:

1. **--check** (default): Dry-run showing violations without action
2. **--report**: Detailed statistics and violation categorization
3. **--fix**: Apply fixes with user confirmation
4. **--monitor**: Setup periodic verification tasks

## Examples

### Check for violations (default)
```bash
/doc-audit
```

Output:
```
📋 DOCUMENTATION ROOT AUDIT
🔍 DRY-RUN: 3 violations found

Violations that would be moved:
  → STALE_FILE.md would move to docs/archive/
  → TEMP_NOTES.txt would move to docs/archive/
  → debug.log would move to docs/archive/
```

### Show detailed statistics
```bash
/doc-audit --report
```

Output:
```
📊 VIOLATION STATISTICS:

  📄 Markdown files (.md): 2
  📝 Text files (.txt): 5
  📋 Log files (.log): 1

📋 VIOLATIONS TO FIX:
  • STALE_FILE.md → docs/archive/
  • TEMP_NOTES.txt → docs/archive/
  • debug.log → docs/archive/
  (and 3 more)

Run with --fix to move these files
```

### Apply fixes
```bash
/doc-audit --fix
```

Output:
```
⚠️  FIX MODE: About to move 3 violations

  → STALE_FILE.md → docs/archive/STALE_FILE.md
  → TEMP_NOTES.txt → docs/archive/TEMP_NOTES.txt
  → debug.log → docs/archive/debug.log

Continue with cleanup? (yes/no)
[User confirms with 'yes']

🔄 Moving files...

✅ Moved: STALE_FILE.md → docs/archive/STALE_FILE.md
✅ Moved: TEMP_NOTES.txt → docs/archive/TEMP_NOTES.txt
✅ Moved: debug.log → docs/archive/debug.log

📦 CLEANUP COMPLETE

3 files moved:
  ✓ docs/archive/STALE_FILE.md
  ✓ docs/archive/TEMP_NOTES.txt
  ✓ docs/archive/debug.log

Changes staged for commit. Next steps:
  1. Review changes: git status
  2. Commit: git commit -m 'chore(docs): Clean up root directory violations'
  3. Push: git push origin [branch]
```

## When to Use

- **Start of session**: Verify root is clean
- **Before pushing**: Ensure no violations
- **Periodically**: Regular maintenance checks
- **After cleanup**: Validate that everything was moved correctly

## Integration with Workflow

This command is part of the **Layered Documentation Governance System**:

1. **Layer 1 - Cleanup Script** (`.claude/scripts/cleanup-root.sh`)
   - One-time remediation tool
   - Can be run manually with `--fix`

2. **Layer 2 - Hook** (`auto-fix-doc-governance.sh`)
   - Automatic prevention on every commit
   - Pre-commit verification

3. **Layer 3 - Audit Command** (`/doc-audit`)
   - Periodic monitoring
   - Discoverable in Claude Code workflow
   - Interactive options for compliance

4. **Layer 4 - Extended Rules** (`.claude/rules/markdown.rules`)
   - Support for multiple file types
   - Configurable patterns and destinations

## Related Documentation

- Main governance system: `.claude/DOC_GOVERNANCE_SYSTEM.md`
- Project instructions: `CLAUDE.md` (Documentation Governance section)
- Rules definition: `.claude/rules/markdown.rules`
- Cleanup script: `.claude/scripts/cleanup-root.sh`

---

**Part of the Documentation Governance System v2**
