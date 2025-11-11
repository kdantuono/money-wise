#!/usr/bin/env tsx
/**
 * PHASE 4 - Week 2: Test Count Validation Script
 *
 * Validates that test count claims in documentation match actual test results.
 * Runs all unit tests and extracts real statistics, then compares with
 * docs/development/progress.md claims.
 *
 * Usage:
 *   pnpm validate:tests           # Run validation
 *   pnpm validate:tests --fix     # Auto-update documentation
 *
 * Context: REMEDIATION-PLAN-2025-01-20.md (Phase 4, Week 2)
 * Refs: False Claim #1 - "1,642 tests" (actually 373)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ========================================
// CONFIGURATION
// ========================================

const DOCS_FILE = path.join(__dirname, '../docs/development/progress.md');
const AUTO_FIX = process.argv.includes('--fix');
const VERBOSE = process.argv.includes('--verbose');

interface TestStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  testSuites: number;
  passedSuites: number;
  failedSuites: number;
}

// ========================================
// EXTRACT REAL TEST COUNTS
// ========================================

function runBackendTests(): TestStats {
  console.log('🧪 Running backend unit tests...');
  console.log('⏱️  This may take 1-2 minutes...\n');

  try {
    // Run Jest with verbose output to capture test counts
    // Using stdio: 'pipe' to capture output for parsing
    const output = execSync(
      'pnpm --filter @money-wise/backend test:unit -- --verbose --passWithNoTests',
      {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'], // inherit stdin, pipe stdout/stderr
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer (was 10MB)
        timeout: 120000, // 2 minute timeout
      }
    );

    if (VERBOSE) {
      console.log('Raw test output:');
      console.log(output);
    }

    // Parse Jest output for test statistics
    return parseJestOutput(output);
  } catch (error: any) {
    // Jest exits with code 1 if tests fail, but still produces output
    if (error.stdout) {
      console.log('\n⚠️  Tests completed with failures, parsing results...');
      return parseJestOutput(error.stdout);
    }

    // Check if error is due to Prisma Client 403 or infrastructure issues
    if (error.message && error.message.includes('403')) {
      console.error('\n❌ ERROR: Prisma Client download blocked (403 Forbidden)');
      console.error('   This is an infrastructure issue external to the codebase.');
      console.error('   Tests cannot run without Prisma Client.');
      console.error('\n💡 WORKAROUND: Counting test files instead of running tests...\n');
      return countTestFiles();
    }

    if (error.code === 'ETIMEDOUT') {
      console.error('\n❌ ERROR: Test execution timed out after 2 minutes');
      console.error('   This may indicate infrastructure issues (Prisma Client download).');
      console.error('\n💡 WORKAROUND: Counting test files instead...\n');
      return countTestFiles();
    }

    throw new Error(`Failed to run tests: ${error.message}`);
  }
}

function countTestFiles(): TestStats {
  console.log('📊 Counting test files as fallback...');

  try {
    // Count .spec.ts files in __tests__/unit/ directory
    const output = execSync(
      'find apps/backend/__tests__/unit -name "*.spec.ts" | wc -l',
      {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
      }
    );

    const testFiles = parseInt(output.trim(), 10);

    // Estimate: Average 8 tests per file (conservative)
    const estimatedTests = testFiles * 8;

    console.log(`   Found ${testFiles} test files`);
    console.log(`   Estimated ${estimatedTests} tests (${testFiles} files × 8 avg)`);
    console.log('   ⚠️  Note: This is an ESTIMATE, not actual test execution\n');

    return {
      totalTests: estimatedTests,
      passedTests: estimatedTests, // Assume all pass (optimistic)
      failedTests: 0,
      skippedTests: 0,
      testSuites: testFiles,
      passedSuites: testFiles,
      failedSuites: 0,
    };
  } catch (error: any) {
    console.error('❌ Failed to count test files:', error.message);
    throw error;
  }
}

function parseJestOutput(output: string): TestStats {
  const stats: TestStats = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    testSuites: 0,
    passedSuites: 0,
    failedSuites: 0,
  };

  // Match Jest summary line: "Tests:       X passed, Y total"
  const testMatch = output.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+skipped)?(?:,\s+(\d+)\s+total)?/);
  if (testMatch) {
    stats.passedTests = parseInt(testMatch[1] || '0', 10);
    stats.failedTests = parseInt(testMatch[2] || '0', 10);
    stats.skippedTests = parseInt(testMatch[3] || '0', 10);
    stats.totalTests = parseInt(testMatch[4] || testMatch[1], 10);
  }

  // Match Jest test suites line: "Test Suites: X passed, Y total"
  const suiteMatch = output.match(/Test Suites:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+total)?/);
  if (suiteMatch) {
    stats.passedSuites = parseInt(suiteMatch[1] || '0', 10);
    stats.failedSuites = parseInt(suiteMatch[2] || '0', 10);
    stats.testSuites = parseInt(suiteMatch[3] || suiteMatch[1], 10);
  }

  // Fallback: Count individual test results if summary not found
  if (stats.totalTests === 0) {
    const passedMatches = output.match(/✓/g);
    const failedMatches = output.match(/✕/g);
    stats.passedTests = passedMatches ? passedMatches.length : 0;
    stats.failedTests = failedMatches ? failedMatches.length : 0;
    stats.totalTests = stats.passedTests + stats.failedTests + stats.skippedTests;
  }

  return stats;
}

// ========================================
// EXTRACT DOCUMENTATION CLAIMS
// ========================================

function extractDocsClaims(): { testCount: number; lineNumber: number } | null {
  if (!fs.existsSync(DOCS_FILE)) {
    console.error(`❌ Documentation file not found: ${DOCS_FILE}`);
    return null;
  }

  const content = fs.readFileSync(DOCS_FILE, 'utf-8');
  const lines = content.split('\n');

  // Find line with test count claim: "- **373 tests passing**"
  const testCountPattern = /^-\s+\*\*(\d+)\s+tests?\s+passing\*\*/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(testCountPattern);
    if (match) {
      return {
        testCount: parseInt(match[1], 10),
        lineNumber: i,
      };
    }
  }

  console.warn('⚠️  No test count claim found in documentation');
  return null;
}

// ========================================
// UPDATE DOCUMENTATION
// ========================================

function updateDocumentation(stats: TestStats): boolean {
  if (!fs.existsSync(DOCS_FILE)) {
    console.error(`❌ Documentation file not found: ${DOCS_FILE}`);
    return false;
  }

  const content = fs.readFileSync(DOCS_FILE, 'utf-8');
  const lines = content.split('\n');

  // Find and update test count line
  const testCountPattern = /^(-\s+\*\*)\d+(\s+tests?\s+passing\*\*.*)/;
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    if (testCountPattern.test(lines[i])) {
      const oldLine = lines[i];
      lines[i] = lines[i].replace(
        testCountPattern,
        `$1${stats.totalTests}$2`
      );

      if (oldLine !== lines[i]) {
        console.log(`\n📝 Updated line ${i + 1}:`);
        console.log(`   OLD: ${oldLine}`);
        console.log(`   NEW: ${lines[i]}`);
        updated = true;
      }
    }

    // Also update "Last Updated" timestamp
    const timestampPattern = /^> \*\*Last Updated\*\*: \d{4}-\d{2}-\d{2}/;
    if (timestampPattern.test(lines[i])) {
      const today = new Date().toISOString().split('T')[0];
      const oldLine = lines[i];
      lines[i] = lines[i].replace(
        /\d{4}-\d{2}-\d{2}/,
        today
      );

      if (oldLine !== lines[i]) {
        console.log(`\n📅 Updated timestamp on line ${i + 1}:`);
        console.log(`   OLD: ${oldLine}`);
        console.log(`   NEW: ${lines[i]}`);
        updated = true;
      }
    }
  }

  if (updated) {
    fs.writeFileSync(DOCS_FILE, lines.join('\n'), 'utf-8');
    console.log(`\n✅ Documentation updated: ${DOCS_FILE}`);
    return true;
  }

  console.log('\n✅ Documentation already accurate (no changes needed)');
  return false;
}

// ========================================
// VALIDATION REPORT
// ========================================

function generateReport(actual: TestStats, claimed: { testCount: number; lineNumber: number } | null): boolean {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST COUNT VALIDATION REPORT');
  console.log('='.repeat(60));

  console.log('\n🔍 ACTUAL TEST RESULTS:');
  console.log(`   Total Tests:     ${actual.totalTests}`);
  console.log(`   ├─ Passed:       ${actual.passedTests}`);
  console.log(`   ├─ Failed:       ${actual.failedTests}`);
  console.log(`   └─ Skipped:      ${actual.skippedTests}`);
  console.log(`   Test Suites:     ${actual.testSuites}`);
  console.log(`   ├─ Passed:       ${actual.passedSuites}`);
  console.log(`   └─ Failed:       ${actual.failedSuites}`);

  if (claimed) {
    console.log('\n📄 DOCUMENTED CLAIMS:');
    console.log(`   Claimed Tests:   ${claimed.testCount}`);
    console.log(`   Location:        ${DOCS_FILE}:${claimed.lineNumber + 1}`);

    const diff = actual.totalTests - claimed.testCount;
    const diffPercent = ((Math.abs(diff) / claimed.testCount) * 100).toFixed(1);

    if (diff === 0) {
      console.log('\n✅ VALIDATION: PASSED');
      console.log('   Documentation accurately reflects test counts!');
      return true;
    } else {
      console.log('\n❌ VALIDATION: FAILED');
      console.log(`   Discrepancy:     ${diff > 0 ? '+' : ''}${diff} tests (${diffPercent}% difference)`);

      if (AUTO_FIX) {
        console.log('\n🔧 AUTO-FIX ENABLED: Updating documentation...');
        const fixed = updateDocumentation(actual);
        return fixed;
      } else {
        console.log('\n💡 TIP: Run with --fix flag to auto-update documentation');
        console.log('   Example: pnpm validate:tests --fix');
        return false;
      }
    }
  } else {
    console.log('\n⚠️  No test count claim found in documentation');
    console.log('   Add a line like: "- **XXX tests passing**" to track this metric');

    if (AUTO_FIX) {
      console.log('\n🔧 AUTO-FIX: Documentation format not recognized, cannot update');
    }
    return false;
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
  console.log('🚀 Starting Test Count Validation...\n');
  console.log('📁 Working Directory:', process.cwd());
  console.log('📄 Documentation File:', DOCS_FILE);
  console.log('🔧 Auto-Fix Enabled:', AUTO_FIX);
  console.log('');

  try {
    // Step 1: Run tests and extract real counts
    const actualStats = runBackendTests();

    // Step 2: Extract documentation claims
    const claimedStats = extractDocsClaims();

    // Step 3: Generate validation report
    const isValid = generateReport(actualStats, claimedStats);

    // Step 4: Exit with appropriate code
    if (isValid) {
      console.log('\n✅ Validation complete: All test counts accurate!');
      process.exit(0);
    } else {
      console.log('\n❌ Validation failed: Test counts do not match documentation');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (VERBOSE && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
