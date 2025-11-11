# MANDATORY DOCUMENTATION GOVERNANCE

**⚠️ ZERO TOLERANCE POLICY - VIOLATIONS RESULT IN SESSION TERMINATION**

This section MUST be included in every AI agent that creates or modifies documentation files.

---

## 🚨 BEFORE CREATING ANY DOCUMENTATION FILE

**YOU MUST**:

1. **Determine Category** (if not obvious, ASK user)
   ```
   Options:
   - docs/how-to/          → Problem-solving guides (How do I...?)
   - docs/reference/       → Technical specifications (What is...?)
   - docs/explanation/     → Conceptual understanding (Why...?)
   - docs/tutorials/       → Learning by doing (Teach me...)
   - docs/development/     → Only for progress.md (SSOT)
   - .claude/              → Only for agent configs, scripts, workflows
   ```

2. **Use Kebab-Case Naming**
   ```
   ✅ CORRECT: authentication-setup.md
   ✅ CORRECT: api-transaction-endpoints.md
   ✅ CORRECT: c4-system-context-diagram.md

   ❌ WRONG: AuthenticationSetup.md (PascalCase)
   ❌ WRONG: API_ENDPOINTS.md (SCREAMING_SNAKE_CASE)
   ❌ WRONG: setup.md (too generic)
   ```

3. **Check Existing Files First**
   ```bash
   # Search for similar content before creating
   grep -r "authentication setup" docs/

   # If exists, UPDATE instead of CREATE
   ```

4. **Include Frontmatter** (for future automation)
   ```yaml
   ---
   title: "Authentication Setup Guide"
   category: how-to
   tags: [authentication, setup, oauth, jwt]
   last_updated: 2025-01-20
   author: architect-agent
   status: published
   ---
   ```

5. **Run Validation**
   ```bash
   # Check for governance violations
   ./.claude/commands/doc-audit.sh --check

   # If violations found, FIX before proceeding
   ```

---

## ❌ ABSOLUTE PROHIBITIONS (IMMEDIATE TERMINATION)

### Prohibition #1: Root-Level Markdown Files
```
❌ NEVER CREATE: /my-document.md
❌ NEVER CREATE: /api-docs.md
❌ NEVER CREATE: /setup-guide.md

✅ ALWAYS USE: docs/how-to/my-document.md
✅ ALWAYS USE: docs/reference/api-endpoints.md
✅ ALWAYS USE: docs/how-to/setup-guide.md

EXCEPTION: Only these root files allowed:
  - README.md
  - CHANGELOG.md
  - CONTRIBUTING.md
  - FRONTEND_HANDOFF.md
  - LICENSE.md
  - CLAUDE.md
```

### Prohibition #2: Creating Without Category
```
❌ NEVER: Create file without knowing its Diátaxis category
✅ ALWAYS: Ask user if uncertain which category
```

### Prohibition #3: Duplicating Existing Content
```
❌ NEVER: Create new file if content exists elsewhere
✅ ALWAYS: Search first, then update existing or consolidate
```

### Prohibition #4: Skipping Frontmatter
```
❌ NEVER: Create documentation without YAML frontmatter
✅ ALWAYS: Include category, tags, date at minimum
```

---

## ✅ ENFORCEMENT & VALIDATION

### Pre-Creation Checklist

**Before creating ANY documentation file, verify**:

- [ ] Category determined (tutorial/how-to/reference/explanation)
- [ ] Kebab-case naming convention
- [ ] Searched for existing similar content
- [ ] Frontmatter prepared (YAML header)
- [ ] NOT creating in repository root (unless exception)
- [ ] Validation script ready to run

### Post-Creation Validation

**After creating documentation file**:

```bash
# Step 1: Run governance check
./.claude/commands/doc-audit.sh --check

# Step 2: Verify no root violations
find . -maxdepth 1 -name "*.md" | grep -v "README\|CHANGELOG\|CONTRIBUTING\|FRONTEND_HANDOFF\|LICENSE\|CLAUDE"

# Step 3: Check file is in correct location
# (Manual verification based on category)
```

---

## 🎯 QUALITY STANDARDS

### Documentation Quality Requirements

**Every documentation file MUST**:

1. **Clear Purpose Statement**
   ```markdown
   # Title

   **Purpose**: What this document is for (1 sentence)
   **Audience**: Who should read this
   **Prerequisites**: What you need to know first
   ```

2. **Table of Contents** (if >500 lines)
   ```markdown
   ## Table of Contents
   - [Section 1](#section-1)
   - [Section 2](#section-2)
   ```

3. **Examples** (where applicable)
   ```markdown
   ## Example: Creating Authentication Endpoint

   \`\`\`typescript
   // Show, don't just tell
   @Post('login')
   async login(@Body() dto: LoginDto) { ... }
   \`\`\`
   ```

4. **Links to Related Docs**
   ```markdown
   ## Related Documentation
   - [API Reference](../reference/api-endpoints.md)
   - [ADR-0002: Cookie Auth](../explanation/architecture/decisions/0002-cookie-based-authentication.md)
   ```

5. **Last Updated Date**
   ```markdown
   ---
   **Last Updated**: 2025-01-20
   **Next Review**: 2025-04-20
   ```

---

## 🚨 VIOLATION CONSEQUENCES

### Severity Levels

**CRITICAL (Session Termination)**:
- Creating file in repository root (outside exceptions)
- Skipping category determination entirely
- Ignoring governance validation results

**HIGH (Immediate Correction Required)**:
- Wrong naming convention (not kebab-case)
- Missing frontmatter
- Duplicating existing content

**MEDIUM (Warning + Fix)**:
- Unclear purpose statement
- Missing examples where applicable
- No links to related docs

**LOW (Nice to Have)**:
- Missing table of contents (on long docs)
- No "last updated" date
- Could improve formatting

---

## 📚 REFERENCES

**Governance System**:
- Complete Documentation: `.claude/DOC_GOVERNANCE_SYSTEM.md`
- Audit Command: `.claude/commands/doc-audit.md`
- Cleanup Script: `.claude/scripts/cleanup-root.sh`
- Remediation Plan: `docs/REMEDIATION-PLAN-2025-01-20.md`

**Framework Standards**:
- Diátaxis Framework: https://diataxis.fr/
- ADR Template: https://github.com/joelparkerhenderson/architecture-decision-record
- Markdown Guide: https://www.markdownguide.org/

**Project Context**:
- Main Instructions: `CLAUDE.md`
- Documentation Hub: `docs/README.md`
- Development Progress: `docs/development/progress.md`

---

## ✅ QUICK REFERENCE CARD

```
BEFORE CREATING FILE:
1. Category? (tutorial/how-to/reference/explanation)
2. Name? (kebab-case.md)
3. Search? (grep -r "content" docs/)
4. Frontmatter? (YAML header with category/tags)
5. Location? (docs/[category]/filename.md)

AFTER CREATING FILE:
1. Run: ./.claude/commands/doc-audit.sh --check
2. Verify: No root violations
3. Commit: With descriptive message

NEVER:
- Create in root (except 6 exceptions)
- Skip category determination
- Duplicate existing content
- Use wrong naming (PascalCase, SCREAMING_SNAKE)

ALWAYS:
- Include frontmatter
- Link related docs
- Show examples
- Validate with audit command
```

---

**Version**: 1.0
**Last Updated**: 2025-01-20
**Status**: MANDATORY for all agents
**Enforcement**: ZERO TOLERANCE
