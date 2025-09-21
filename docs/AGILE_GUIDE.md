# MoneyWise Agile Development Guide

## Overview

This guide establishes the complete agile methodology for MoneyWise MVP development, integrating Board-First execution patterns with systematic Definition of Done enforcement. These practices ensure traceability, quality, and consistency across all development activities.

## 🚨 CRITICAL METHODOLOGY REQUIREMENTS

### **MANDATORY WORKFLOW: Never Work on Main Branch**

**ABSOLUTE RULE**: ALL development work MUST use feature branches. Working directly on main branch is a **critical methodology violation**.

```bash
# ❌ WRONG - Working on main branch
git checkout main
# Start coding... [METHODOLOGY VIOLATION]

# ✅ CORRECT - Feature branch workflow
git checkout -b feature/[descriptive-name]
# Start coding after board update
```

### **Board-First Execution Pattern**

**CRITICAL**: Update GitHub Projects board status BEFORE starting any work to ensure real-time traceability.

```bash
# 1. BEFORE starting work - Update board to "In Progress"
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [IN_PROGRESS_ID]

# 2. THEN start development work
git checkout -b feature/[name]
```

## Complete 10-Step Definition of Done

Every user story, task, or fix MUST complete ALL 10 steps before being marked "Done" on the board:

### **Phase 1: Development (Steps 1-4)**
1. ✅ **Feature branch created and used** - Never work on main branch
2. ✅ **Code implemented with atomic commits** - One logical unit per commit
3. ✅ **Documentation updated** - docs/, README, CHANGELOG as needed
4. ✅ **Feature branch pushed to remote** - Enable CI/CD validation

### **Phase 2: Validation (Step 5)**
5. ✅ **CI/CD pipeline green on feature branch** - All tests, linting, security checks pass

### **Phase 3: Integration (Steps 6-9)**
6. ✅ **Pull request created and approved** - Code review and documentation
7. ✅ **Merged to main with --no-ff** - Preserve branch history
8. ✅ **CI/CD pipeline green on main branch** - Final validation
9. ✅ **Feature branch deleted (local + remote)** - Clean repository state

### **Phase 4: Completion (Step 10)**
10. ✅ **Board status updated to "Done"** - ONLY after steps 1-9 complete

## Detailed Workflow Commands

### **Session Initialization**
```bash
# Read best practices first (MANDATORY)
# Then analyze GitHub Projects board for current work state
gh project item-list [PROJECT_NUMBER] --owner [OWNER] --format json
```

### **Starting New Work**
```bash
# 1. Update board status to "In Progress"
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [IN_PROGRESS_ID]

# 2. Create feature branch
git checkout -b feature/[descriptive-name]

# 3. Implement with atomic commits
# [Development work with frequent commits]
```

### **Phase 1: Push and Verify**
```bash
# 4. Push feature branch
git push -u origin feature/[name]

# 5. Monitor CI/CD until green
gh run list --branch=feature/[name] --limit=1
gh run view [RUN_ID]  # Wait for completion
```

### **Phase 2: Integration (Only if CI/CD Green)**
```bash
# 6. Create pull request
gh pr create --title "[type]: descriptive title" --body "$(cat <<'EOF'
## Summary
- Clear description of changes

## User Story
**Issue #[N]**: [Story title] ([N] story points)

## Test plan
- [x] Verification steps

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"

# 7. Merge to main
git checkout main
git pull origin main
git merge feature/[name] --no-ff
git push origin main
```

### **Phase 3: Final Validation and Cleanup**
```bash
# 8. Verify main branch CI/CD
gh run list --branch=main --limit=1
gh run view [RUN_ID]  # Wait for completion

# 9. Delete branches (ONLY after main CI/CD passes)
git branch -d feature/[name]
git push origin --delete feature/[name]

# 10. Confirm clean state
git status  # Should show "working tree clean"
```

### **Phase 4: Board Completion**
```bash
# 11. Update board to "Done" (ONLY after phases 1-3 complete)
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [DONE_ID]
```

## GitHub Projects Configuration

### **Required Custom Fields**
- **Status**: Todo, In Progress, Done
- **Priority**: Critical, High, Medium, Low
- **Story Points**: Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
- **Epic**: Grouping related user stories

### **Current Project Structure**
- **Project ID**: `PVT_kwHOADnPXc4BDdMt`
- **Status Field ID**: `PVTSSF_lAHOADnPXc4BDdMtzg1Xr-o`
- **Status Options**:
  - Todo: `f75ad846`
  - In Progress: `47fc9ee4`
  - Done: `98236657`

## Micro-Iteration Pattern

### **Execute → Commit → Verify → Document → Repeat**

```bash
# Development cycle
1. Update board → In Progress
2. Code implementation → Atomic commit
3. Local verification → Tests pass
4. Documentation → Update relevant docs
5. Push → CI/CD validation
6. Review → Pull request
7. Merge → Main branch integration
8. Cleanup → Branch deletion
9. Complete → Board update to Done
```

## Epic and User Story Management

### **Epic Structure**
- **Purpose**: Group related user stories achieving business goal
- **Sizing**: 4-20 story points total
- **Duration**: 1-2 development cycles
- **Tracking**: Aggregate story points completion

### **User Story Format**
```
Title: User Story: [Action/Goal]
Description: As a [user], I want [functionality] so that [benefit]
Acceptance Criteria:
- [ ] Specific testable requirement
- [ ] Another measurable outcome
Story Points: [Fibonacci number]
Epic: [Related epic name]
```

## Quality Standards Integration

### **Automated Quality Gates**
- **TypeScript**: Zero compilation errors
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting standards
- **Tests**: Unit tests passing
- **Security**: Vulnerability scanning

### **Manual Quality Checks**
- **Code Review**: Pull request approval required
- **Documentation**: Updates reflect changes
- **Integration**: Feature works with existing code
- **User Experience**: Meets acceptance criteria

## Failure Handling Procedures

### **Feature Branch CI/CD Fails**
```bash
# Fix issues on feature branch, do NOT merge
git checkout feature/[name]
# Fix the issues
git add .
git commit -m "fix: resolve CI/CD issues"
git push
# Wait for green CI/CD, then proceed with merge
```

### **Main Branch CI/CD Fails**
```bash
# Immediately revert merge, investigate on feature branch
git revert [MERGE_COMMIT] -m 1
git push origin main
# Investigate and fix on new feature branch
```

### **Board Update Fails**
```bash
# Get current field and option IDs
gh project field-list [PROJECT_NUMBER] --owner [OWNER]
# Use correct IDs for board update
```

## Documentation Integration

### **Required Documentation Updates**

#### **F1: BEFORE Implementation**
- Create planning document in `docs/features/`
- Define scope, requirements, and approach
- Estimate effort and identify risks

#### **F2: DURING Implementation**
- Update progress in planning document
- Track changes and decisions
- Document challenges and solutions

#### **F3: AFTER Implementation**
- Create completion report with impact assessment
- Update README, CHANGELOG, and relevant docs
- Archive planning documents

### **Documentation Standards**
- **Purpose**: Clear statement of goals
- **Requirements**: Functional and technical needs
- **Architecture**: Design decisions and rationale
- **Evolution**: Stage-by-stage progression
- **Impact**: Measurable outcomes and benefits

## Enforcement and Compliance

### **Critical Violations**
1. **Working on main branch directly**
2. **Marking stories "Done" without complete workflow**
3. **Skipping CI/CD validation**
4. **Missing documentation updates**
5. **Incomplete branch cleanup**

### **Prevention Mechanisms**
- **Git hooks**: Prevent direct main branch commits
- **CI/CD gates**: Block incomplete workflows
- **Documentation requirements**: Enforce consistency
- **Board validation**: Require complete Definition of Done

### **Monitoring and Improvement**
- **Weekly reviews**: Assess methodology adherence
- **Continuous improvement**: Refine based on practice
- **Team training**: Ensure consistent application
- **Tool enhancement**: Improve automation and validation

## Success Metrics

### **Process Metrics**
- **Workflow Completion Rate**: 100% stories follow complete DoD
- **Board Accuracy**: Real-time status reflects actual work state
- **CI/CD Success Rate**: >95% green pipelines
- **Documentation Coverage**: All features have complete docs

### **Quality Metrics**
- **Test Coverage**: >80% unit test coverage
- **Code Quality**: Zero TypeScript errors, ESLint compliance
- **Performance**: API response times <100ms average
- **Security**: Zero high/critical vulnerabilities

### **Team Metrics**
- **Velocity**: Consistent story point delivery
- **Cycle Time**: Feature branch to Done completion time
- **Defect Rate**: Post-deployment issues per story
- **Knowledge Sharing**: Documentation completeness and clarity

## Advanced Patterns

### **Multi-Story Coordination**
When multiple stories affect the same code:
1. **Sequential Execution**: Complete one story before starting next
2. **Dependency Management**: Clearly define story dependencies
3. **Integration Planning**: Plan merge strategy for related changes

### **Hotfix Workflow**
For critical production issues:
1. **Create hotfix branch** from main: `hotfix/[issue-name]`
2. **Follow abbreviated DoD**: Skip some documentation steps
3. **Immediate merge** after CI/CD passes
4. **Retrospective documentation**: Update docs post-deployment

### **Spike Stories**
For research and investigation:
1. **Time-boxed effort**: Set maximum investigation time
2. **Document findings**: Create research report
3. **Follow-up stories**: Create implementation stories based on findings

## Integration with Development Tools

### **IDE Configuration**
- **Git hooks**: Pre-commit quality checks
- **Format on save**: Prettier integration
- **Lint on type**: Real-time ESLint feedback
- **Test runner**: Automated test execution

### **CI/CD Integration**
- **Feature branch protection**: Require CI/CD green before merge
- **Main branch protection**: Require pull request and review
- **Automated deployment**: Deploy to staging after main merge
- **Rollback procedures**: Quick revert for production issues

## Conclusion

This agile methodology ensures MoneyWise MVP development maintains high quality, complete traceability, and systematic progress tracking. By following the Board-First execution pattern and complete 10-step Definition of Done, every development activity contributes to a robust, maintainable, and professionally managed codebase.

**Remember**: Methodology compliance is not optional. These practices ensure project success, team alignment, and stakeholder confidence through transparent, high-quality development processes.