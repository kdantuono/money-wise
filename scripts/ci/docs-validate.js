#!/usr/bin/env node

/**
 * Documentation Quality Validation Script
 * Based on documentation-specialist agent patterns
 *
 * Validates:
 * - README.md completeness and quality
 * - CHANGELOG.md semantic versioning compliance
 * - SETUP.md newcomer accessibility
 * - Overall documentation health
 */

const fs = require('fs');
const path = require('path');

class DocumentationQualityValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.report = {
      overall: 'pending',
      score: 0,
      checks: []
    };
  }

  async validateDocumentationQuality() {
    console.log('🔍 Starting Documentation Quality Validation...\n');

    // Run all quality checks
    this.report.checks.push(await this.validateReadme());
    this.report.checks.push(await this.validateChangelog());
    this.report.checks.push(await this.validateSetup());
    this.report.checks.push(await this.validateProjectStructure());
    this.report.checks.push(await this.validateNewcomerAccessibility());

    // Calculate overall score
    const passed = this.report.checks.filter(check => check.status === 'pass').length;
    const warnings = this.report.checks.filter(check => check.status === 'warning').length;
    const total = this.report.checks.length;

    this.report.score = Math.round(((passed + (warnings * 0.5)) / total) * 100);

    if (this.report.score >= 80) {
      this.report.overall = 'pass';
    } else if (this.report.score >= 60) {
      this.report.overall = 'warning';
    } else {
      this.report.overall = 'fail';
    }

    // Output results
    this.outputReport();
    return this.report;
  }

  async validateReadme() {
    const readmePath = path.join(this.projectRoot, 'README.md');
    const issues = [];
    const suggestions = [];

    // Check if README exists
    if (!this.fileExists(readmePath)) {
      return {
        name: 'README.md Validation',
        status: 'fail',
        issues: ['README.md not found'],
        suggestions: ['Create comprehensive README.md with project overview, setup instructions, and usage examples']
      };
    }

    const content = fs.readFileSync(readmePath, 'utf8');

    // Check essential sections
    const requiredSections = [
      { section: 'Project title', pattern: /^#\s+\w+/ },
      { section: 'Description', pattern: /description|overview/i },
      { section: 'Quick start', pattern: /quick start|getting started/i },
      { section: 'Installation', pattern: /install|setup|prerequisite/i },
      { section: 'Usage examples', pattern: /usage|example|script/i },
      { section: 'Tech stack', pattern: /tech|stack|architecture|built with/i },
      { section: 'Contributing', pattern: /contribut/i },
      { section: 'License', pattern: /license/i }
    ];

    requiredSections.forEach(({ section, pattern }) => {
      if (!pattern.test(content)) {
        issues.push(`Missing ${section} section`);
        suggestions.push(`Add ${section} section to improve documentation completeness`);
      }
    });

    // Check for badges
    if (!/!\[.*\]\(.*\)/.test(content)) {
      issues.push('No badges found');
      suggestions.push('Add status badges for version, license, build status');
    }

    // Check content quality
    if (content.length < 1000) {
      issues.push('README content appears minimal');
      suggestions.push('Expand README with more detailed information');
    }

    return {
      name: 'README.md Validation',
      status: issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warning' : 'fail',
      issues,
      suggestions
    };
  }

  async validateChangelog() {
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    const issues = [];
    const suggestions = [];

    if (!this.fileExists(changelogPath)) {
      return {
        name: 'CHANGELOG.md Validation',
        status: 'fail',
        issues: ['CHANGELOG.md not found'],
        suggestions: ['Create CHANGELOG.md following Keep a Changelog format']
      };
    }

    const content = fs.readFileSync(changelogPath, 'utf8');

    // Check Keep a Changelog format
    if (!content.includes('Keep a Changelog')) {
      issues.push('Does not reference Keep a Changelog format');
    }

    // Check semantic versioning reference
    if (!content.includes('Semantic Versioning')) {
      issues.push('Does not reference Semantic Versioning');
    }

    // Check for version entries
    if (!/## \[\d+\.\d+\.\d+\]/.test(content)) {
      issues.push('No semantic version entries found');
    }

    // Check for categorized changes
    const categories = ['Added', 'Changed', 'Fixed', 'Deprecated', 'Removed', 'Security'];
    const hasCategories = categories.some(category => content.includes(`### ${category}`));

    if (!hasCategories) {
      issues.push('No categorized change entries found');
      suggestions.push('Use standard categories: Added, Changed, Fixed, etc.');
    }

    return {
      name: 'CHANGELOG.md Validation',
      status: issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warning' : 'fail',
      issues,
      suggestions
    };
  }

  async validateSetup() {
    const setupPath = path.join(this.projectRoot, 'SETUP.md');
    const issues = [];
    const suggestions = [];

    if (!this.fileExists(setupPath)) {
      issues.push('SETUP.md not found');
      suggestions.push('Create detailed setup guide for newcomers');
    } else {
      const content = fs.readFileSync(setupPath, 'utf8');

      // Check for essential setup sections
      const setupSections = [
        { section: 'Prerequisites', pattern: /prerequisite/i },
        { section: 'Installation steps', pattern: /install|setup/i },
        { section: 'Verification', pattern: /verify|test|check/i },
        { section: 'Troubleshooting', pattern: /troubleshoot|problem|issue/i }
      ];

      setupSections.forEach(({ section, pattern }) => {
        if (!pattern.test(content)) {
          issues.push(`Missing ${section} in setup guide`);
        }
      });

      // Check for code examples
      if (!/```/.test(content)) {
        issues.push('No code examples found in setup guide');
        suggestions.push('Add code examples for setup commands');
      }
    }

    return {
      name: 'SETUP.md Validation',
      status: issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warning' : 'fail',
      issues,
      suggestions
    };
  }

  async validateProjectStructure() {
    const issues = [];
    const suggestions = [];

    // Check essential files
    const essentialFiles = [
      'package.json',
      'README.md',
      'CHANGELOG.md',
      '.gitignore',
      'CLAUDE.md'
    ];

    essentialFiles.forEach(file => {
      if (!this.fileExists(path.join(this.projectRoot, file))) {
        issues.push(`Missing essential file: ${file}`);
      }
    });

    // Check for license
    const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'];
    const hasLicense = licenseFiles.some(file =>
      this.fileExists(path.join(this.projectRoot, file))
    );

    if (!hasLicense) {
      issues.push('No LICENSE file found');
      suggestions.push('Add LICENSE file for legal clarity');
    }

    // Check documentation directory
    const docsPath = path.join(this.projectRoot, 'docs');
    if (!fs.existsSync(docsPath)) {
      issues.push('No docs/ directory found');
      suggestions.push('Create docs/ directory for additional documentation');
    }

    return {
      name: 'Project Structure Validation',
      status: issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warning' : 'fail',
      issues,
      suggestions
    };
  }

  async validateNewcomerAccessibility() {
    const issues = [];
    const suggestions = [];

    // Check if setup instructions are testable
    const readmePath = path.join(this.projectRoot, 'README.md');
    const setupPath = path.join(this.projectRoot, 'SETUP.md');

    if (this.fileExists(readmePath)) {
      const readmeContent = fs.readFileSync(readmePath, 'utf8');

      // Check for quick start section
      if (!/quick start|getting started/i.test(readmeContent)) {
        issues.push('No quick start section in README');
        suggestions.push('Add quick start section for immediate onboarding');
      }

      // Check for prerequisites
      if (!/prerequisite|require/i.test(readmeContent)) {
        issues.push('Prerequisites not clearly specified');
      }
    }

    // Check for contributing guide
    const contributingFiles = ['CONTRIBUTING.md', 'CONTRIBUTE.md'];
    const hasContributing = contributingFiles.some(file =>
      this.fileExists(path.join(this.projectRoot, file))
    );

    if (!hasContributing) {
      issues.push('No contributing guide found');
      suggestions.push('Create CONTRIBUTING.md for contributor guidelines');
    }

    // Check for issue templates
    const issueTemplatesPath = path.join(this.projectRoot, '.github', 'ISSUE_TEMPLATE');
    if (!fs.existsSync(issueTemplatesPath)) {
      issues.push('No GitHub issue templates found');
      suggestions.push('Add issue templates to guide bug reports and feature requests');
    }

    return {
      name: 'Newcomer Accessibility',
      status: issues.length === 0 ? 'pass' : issues.length <= 3 ? 'warning' : 'fail',
      issues,
      suggestions
    };
  }

  fileExists(filePath) {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  outputReport() {
    console.log('📊 Documentation Quality Report');
    console.log('================================\n');

    // Overall score
    const statusIcon = {
      pass: '✅',
      warning: '⚠️',
      fail: '❌'
    }[this.report.overall];

    console.log(`${statusIcon} Overall Score: ${this.report.score}% (${this.report.overall.toUpperCase()})\n`);

    // Individual check results
    this.report.checks.forEach(check => {
      const icon = {
        pass: '✅',
        warning: '⚠️',
        fail: '❌'
      }[check.status];

      console.log(`${icon} ${check.name}: ${check.status.toUpperCase()}`);

      if (check.issues.length > 0) {
        console.log('   Issues:');
        check.issues.forEach(issue => console.log(`     - ${issue}`));
      }

      if (check.suggestions && check.suggestions.length > 0) {
        console.log('   Suggestions:');
        check.suggestions.forEach(suggestion => console.log(`     - ${suggestion}`));
      }

      console.log('');
    });

    // Summary and recommendations
    if (this.report.overall === 'fail') {
      console.log('🚨 Documentation quality is below acceptable standards.');
      console.log('   Please address the critical issues before proceeding.\n');
    } else if (this.report.overall === 'warning') {
      console.log('⚠️  Documentation quality has room for improvement.');
      console.log('   Consider addressing the suggestions to enhance quality.\n');
    } else {
      console.log('🎉 Documentation quality meets high standards!');
      console.log('   Great work on maintaining comprehensive documentation.\n');
    }

    // Exit with appropriate code
    if (this.report.overall === 'fail') {
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DocumentationQualityValidator();
  validator.validateDocumentationQuality()
    .catch(error => {
      console.error('❌ Documentation validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = DocumentationQualityValidator;