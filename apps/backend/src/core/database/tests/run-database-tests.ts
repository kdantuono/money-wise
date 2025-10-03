#!/usr/bin/env ts-node
/* eslint-disable no-console */

/**
 * Database Test Runner
 * Standalone script to run comprehensive database tests
 * Console statements are intentionally used for test runner output
 */

import * as fs from 'fs';
import * as path from 'path';
import { runDatabaseTestSuite, TestSuiteResults } from './database-test-suite';

async function main() {
  console.log('🎯 MoneyWise Database Test Suite');
  console.log('=' .repeat(50));

  try {
    // Run the complete test suite
    const results: TestSuiteResults = await runDatabaseTestSuite();

    // Exit with appropriate code
    const exitCode = results.summary.failedTests > 0 ? 1 : 0;

    if (exitCode === 0) {
      console.log('\n🎉 All database tests passed!');
    } else {
      console.log('\n❌ Some database tests failed!');
      console.log(`Failed tests: ${results.summary.failedTests}/${results.summary.totalTests}`);
    }

    // Write results to file for CI/CD
    const resultsPath = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📄 Test results written to: ${resultsPath}`);

    process.exit(exitCode);

  } catch (error) {
    console.error('💥 Database test suite crashed:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️ Test suite interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Test suite terminated');
  process.exit(143);
});

// Run the test suite
if (require.main === module) {
  main();
}