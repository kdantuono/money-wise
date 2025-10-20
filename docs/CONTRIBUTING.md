# Contributing to MoneyWise Documentation

**Last Updated**: October 18, 2025
**Status**: Active Guidelines
**Purpose**: Standards and procedures for maintaining MoneyWise documentation

---

## 📖 Overview

This guide ensures MoneyWise documentation remains high-quality, consistent, and accessible. Follow these standards when creating or updating documentation.

---

## 🎯 Documentation Philosophy

### Core Principles

1. **Reality-Based Documentation**
   - Document what *exists*, not what's planned
   - If docs and code diverge, update the docs
   - Use actual code examples, not hypothetical
   - Include version information where relevant

2. **Developer-Focused**
   - Optimize for newcomer onboarding
   - Write for daily development needs
   - Be clear and actionable, not abstract
   - Provide copy-paste examples when possible

3. **Living Documents**
   - Update alongside code changes
   - Version controlled in git
   - Reviewed in pull requests
   - Clearly mark status (Active/Historical/Archived)

4. **Just Enough Content**
   - Comprehensive but not overwhelming
   - Link to related docs instead of duplicating
   - Focus on signal, not noise
   - Remove outdated content promptly

---

## 📝 Documentation Structure

### File Organization

```
docs/
├── CONTRIBUTING.md                 # This file
├── DOCUMENTATION-GUIDE.md          # Navigation hub
├── README.md                       # (each subdirectory has one)
├── planning/                       # Project roadmaps & requirements
├── development/                    # Dev setup & guides
├── architecture/                   # System design & ADRs
├── auth/                          # Authentication docs
├── api/                           # API specifications
├── security/                      # Security guidelines
├── testing/                       # Testing strategies
├── monitoring/                    # Observability docs
├── migration/                     # Historical migration docs
├── releases/                      # Version history
└── archives/                      # Old documentation
```

### Subdirectory Standards

Each major directory MUST have:
- **README.md** - Directory overview and navigation
- **LAST UPDATED** date in header
- **Status** indicator (Active/Historical/Archived)
- Organized subsections

### Document Header Template

```markdown
# [Document Title]

**Last Updated**: [Date in YYYY-MM-DD format]
**Status**: [Active/Historical/Archived]
**Purpose**: [One-line summary of what this doc is for]

---

## [Content organized by heading levels]

## See Also
- [Related document 1]
- [Related document 2]
```

---

## ✅ Quality Checklist

### Before Submitting Documentation

#### Content Quality
- [ ] Markdown is valid and renders correctly
- [ ] Links are relative (not absolute external URLs)
- [ ] Code examples are actual code (not pseudocode)
- [ ] Technical terms are consistent with rest of docs
- [ ] Status and Last Updated date are current
- [ ] No TODO items left unresolved
- [ ] No broken/dead links (validate with script)

#### Structure & Formatting
- [ ] Headings follow hierarchy (# → ## → ### → ####)
- [ ] No more than 3 levels of nesting in lists
- [ ] Code blocks include language specification
- [ ] Tables are properly formatted
- [ ] Important warnings/notes use blockquotes
- [ ] Complex sections use headers to break up content

#### Accuracy & Completeness
- [ ] Information matches current codebase
- [ ] Examples have been tested/verified
- [ ] Dependencies and versions are accurate
- [ ] No assumptions about reader knowledge
- [ ] Includes links to prerequisites when needed

#### Consistency
- [ ] Terminology matches project standards
- [ ] Style matches other similar documents
- [ ] Tone is professional but approachable
- [ ] Formatting conventions are followed

---

## 📍 Where to Put Documentation

### Decision Tree

**Planning & Requirements?**
→ `docs/planning/`

**Development Setup & Guides?**
→ `docs/development/`

**Architecture & Design Decisions?**
→ `docs/architecture/` (or `docs/architecture/adr/` for ADRs)

**API Endpoints & Specs?**
→ `docs/api/`

**Security Guidelines?**
→ `docs/security/`

**Testing Information?**
→ `docs/testing/`

**Historical/Archive?**
→ `docs/archives/`

**Monitoring & Analytics?**
→ `docs/monitoring/`

---

## 🔄 Documentation Workflow

### Creating New Documentation

1. **Determine Location** (use decision tree above)
2. **Create File** with descriptive name (kebab-case)
3. **Add Header** with date, status, purpose
4. **Write Content** following structure guidelines
5. **Add Links** from parent README
6. **Test Links** (relative paths only)
7. **Commit** with descriptive message

### Updating Existing Documentation

1. **Update Content** as needed
2. **Change Last Updated Date**
3. **Review Quality Checklist**
4. **Update Status** if needed (e.g., Active → Historical)
5. **Check All Links** still work
6. **Commit** with specific change description

### Archiving Documentation

1. **Move File** to `docs/archives/[category]/`
2. **Update All Links** pointing to old location
3. **Add Redirect** in old location if needed
4. **Update README** in parent directories
5. **Commit** with archive message

---

## 🏷️ Status Indicators

Use these status indicators in document headers:

| Status | Meaning | Action |
|--------|---------|--------|
| **Active** | Currently maintained and used | Keep updated with code |
| **Historical** | Reference only, not actively maintained | Don't update, move to archive if outdated |
| **Archived** | Moved from active use, kept for reference | No updates needed |
| **Draft** | Work in progress, not ready | Complete before PR |
| **Deprecated** | Being phased out, use [X] instead | Plan to archive |

---

## 🔗 Cross-Document Links

### Internal Linking Rules

**GOOD - Relative Paths:**
```markdown
[Authentication Setup](../development/authentication-setup.md)
[ADR-001](./architecture/adr/001-monorepo-structure.md)
```

**BAD - Absolute Paths:**
```markdown
[Doc](/home/user/dev/moneywise/docs/file.md)
[Doc](https://github.com/user/moneywise/docs/file.md)
```

### Link Validation

Before committing:
1. Check all relative links exist
2. Test in markdown preview
3. Use validation script (when available)

---

## 📐 Code Examples

### Good Code Examples

```javascript
// ✅ GOOD: Shows actual usage with context
import { AuthService } from '@money-wise/backend';

const authService = new AuthService();
const user = await authService.register({
  email: 'user@example.com',
  password: 'secure-password'
});
```

### Problematic Examples

```javascript
// ❌ BAD: Hypothetical/incomplete
const user = authService.register(data);

// ❌ BAD: Outdated syntax
const user = await authService.register(email, password);
```

### Code Block Format

````markdown
```javascript
// Always include language
// Keep examples focused (5-15 lines ideally)
const result = await doSomething();
```
````

---

## 📊 Documentation Metrics & Goals

### Quality Targets

- **Readability**: Avg 8-10 grade reading level
- **Completeness**: 0 unresolved TODOs
- **Accuracy**: 100% matches current codebase
- **Currency**: Updated within 2 weeks of code change
- **Links**: 100% links valid

### Health Checks

**Monthly Review:**
- Update progress documentation
- Archive completed milestones/epics
- Check for broken links
- Update outdated information

**Quarterly Deep Review:**
- Review all major documentation sections
- Update architecture decisions
- Archive old approaches
- Plan documentation reorganization

**Yearly Archive:**
- Move old documentation to archives
- Create retrospective documentation
- Plan structure improvements

---

## 🤝 Pull Request Guidelines

### Before Submitting PR with Docs Changes

1. **Run Quality Checks**
   ```bash
   # Check for common issues
   pnpm docs:validate  # when available
   ```

2. **Validate All Links**
   - Ensure relative paths are correct
   - Test links in preview

3. **Review Checklist**
   - [ ] Documentation follows template
   - [ ] Status/Date are current
   - [ ] No broken links
   - [ ] Code examples work
   - [ ] Consistent with other docs

4. **Descriptive Commit Message**
   ```
   docs(section): brief description of changes

   - Changed X to Y because Z
   - Added new section on feature
   - Updated outdated examples
   ```

### PR Template for Docs

```markdown
## 📝 Documentation Changes

**What changed?**
- Brief list of changes

**Why?**
- Rationale for changes

**Validation?**
- [ ] Links validated
- [ ] Code examples verified
- [ ] Status/dates current
- [ ] Quality checklist passed
```

---

## 🚀 Advanced: Automation

### Pre-Commit Hook for Docs

*Future: Check for common issues automatically*

- Validate markdown syntax
- Check for broken relative links
- Ensure status/date headers
- Flag TODO comments

### CI/CD Integration

*Future: Automated documentation validation*

- Run linting checks
- Validate link integrity
- Check for consistency
- Generate quality reports

---

## ❓ FAQ

**Q: Should I update the docs when the code changes?**
A: Yes! Documentation should be updated in the same commit or PR as code changes.

**Q: How detailed should examples be?**
A: Show enough to understand the concept (5-15 lines). For extensive examples, create a separate guide.

**Q: What if documentation is outdated?**
A: Update it immediately. If you find outdated docs, fix them or note the issue.

**Q: Where do I put temporary notes?**
A: Use TODO comments, but resolve them before PR. Never merge PRs with unresolved TODOs.

**Q: Should I include version numbers?**
A: Yes, for version-specific information. Update when versions change.

---

## 🆘 Getting Help

**Questions about documentation?**
- Check [`DOCUMENTATION-GUIDE.md`](./DOCUMENTATION-GUIDE.md)
- Review existing similar documents
- Ask in PR comments

**Found an issue?**
- Create a GitHub issue with `docs` label
- Submit a PR with fixes
- Include context about the problem

---

## 📚 Resources

- **Navigation**: [`DOCUMENTATION-GUIDE.md`](./DOCUMENTATION-GUIDE.md)
- **Planning**: [`planning/README.md`](./planning/README.md)
- **Development**: [`development/setup.md`](./development/setup.md)
- **Architecture**: [`architecture/README.md`](./architecture/README.md)

---

**Remember**: *Docs should be easier to update than code. If documentation is painful to maintain, we redesign it until it's not.*

