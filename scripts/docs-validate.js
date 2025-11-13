#!/usr/bin/env node
/**
 * Documentation Validation Script
 * Validates documentation structure and consistency
 */

const fs = require('fs');
const path = require('path');

const ERRORS = [];
const WARNINGS = [];

// Colors for terminal output
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

console.log('📚 Validating documentation structure...\n');

/**
 * Check if required documentation files exist
 */
function checkRequiredDocs() {
  const requiredDocs = [
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'CLAUDE.md',
    'docs/README.md',
  ];

  requiredDocs.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      ERRORS.push(`Missing required documentation file: ${file}`);
    } else {
      console.log(`${GREEN}✓${RESET} Found: ${file}`);
    }
  });
}

/**
 * Validate root directory doesn't have orphan markdown files
 * (per DOC_GOVERNANCE_SYSTEM.md)
 */
function checkOrphanMarkdownFiles() {
  const allowedRootMarkdown = [
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'FRONTEND_HANDOFF.md',
    'LICENSE.md',
    'CLAUDE.md',
  ];

  try {
    const files = fs.readdirSync(process.cwd());
    const markdownFiles = files.filter((f) => f.endsWith('.md'));

    markdownFiles.forEach((file) => {
      if (!allowedRootMarkdown.includes(file)) {
        WARNINGS.push(
          `Orphan markdown file in root: ${file} (should be in docs/ or .claude/)`
        );
      }
    });
  } catch (err) {
    WARNINGS.push(`Could not scan root directory: ${err.message}`);
  }
}

/**
 * Check ADR directory structure
 */
function checkADRStructure() {
  const adrPaths = [
    'docs/explanation/architecture/decisions',
    '.claude/knowledge/architecture/decisions',
  ];

  adrPaths.forEach((adrPath) => {
    const fullPath = path.join(process.cwd(), adrPath);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath);
      const adrFiles = files.filter((f) => f.match(/^\d{4}-.*\.md$/));

      if (adrFiles.length > 0) {
        console.log(`${GREEN}✓${RESET} Found ${adrFiles.length} ADR files in ${adrPath}`);
      } else {
        WARNINGS.push(`No ADR files found in ${adrPath}`);
      }
    }
  });
}

/**
 * Validate TypeDoc configuration exists
 */
function checkTypeDocConfig() {
  const typedocConfigs = ['typedoc.json', 'tsconfig.typedoc.json'];

  typedocConfigs.forEach((config) => {
    const configPath = path.join(process.cwd(), config);
    if (fs.existsSync(configPath)) {
      console.log(`${GREEN}✓${RESET} Found: ${config}`);
    } else {
      WARNINGS.push(`TypeDoc configuration missing: ${config}`);
    }
  });
}

/**
 * Check markdown link check configuration
 */
function checkMarkdownLinkConfig() {
  const configPath = path.join(process.cwd(), '.markdown-link-check.json');
  if (fs.existsSync(configPath)) {
    console.log(`${GREEN}✓${RESET} Found: .markdown-link-check.json`);
  } else {
    ERRORS.push('Missing .markdown-link-check.json configuration');
  }
}

/**
 * Main validation function
 */
function main() {
  checkRequiredDocs();
  checkOrphanMarkdownFiles();
  checkADRStructure();
  checkTypeDocConfig();
  checkMarkdownLinkConfig();

  console.log('\n' + '='.repeat(50));
  console.log('📊 Validation Results\n');

  if (ERRORS.length > 0) {
    console.log(`${RED}❌ Errors: ${ERRORS.length}${RESET}`);
    ERRORS.forEach((err) => console.log(`  ${RED}•${RESET} ${err}`));
    console.log();
  }

  if (WARNINGS.length > 0) {
    console.log(`${YELLOW}⚠️  Warnings: ${WARNINGS.length}${RESET}`);
    WARNINGS.forEach((warn) => console.log(`  ${YELLOW}•${RESET} ${warn}`));
    console.log();
  }

  if (ERRORS.length === 0 && WARNINGS.length === 0) {
    console.log(`${GREEN}✅ All documentation validation checks passed!${RESET}\n`);
    process.exit(0);
  } else if (ERRORS.length === 0) {
    console.log(
      `${GREEN}✅ Documentation validation passed with warnings${RESET}\n`
    );
    process.exit(0);
  } else {
    console.log(`${RED}❌ Documentation validation failed${RESET}\n`);
    process.exit(1);
  }
}

// Run validation
main();
