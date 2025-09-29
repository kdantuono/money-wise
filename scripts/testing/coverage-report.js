#!/usr/bin/env node

/**
 * Comprehensive Coverage Reporting Script
 * Aggregates coverage from all packages and generates reports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Coverage configuration
const COVERAGE_CONFIG = {
  thresholds: {
    backend: { branches: 75, functions: 75, lines: 75, statements: 75 },
    web: { branches: 70, functions: 70, lines: 70, statements: 70 },
    mobile: { branches: 65, functions: 65, lines: 65, statements: 65 },
    packages: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  outputDir: 'coverage-reports',
  formats: ['lcov', 'html', 'json', 'text-summary'],
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(COVERAGE_CONFIG.outputDir)) {
    fs.mkdirSync(COVERAGE_CONFIG.outputDir, { recursive: true });
  }
}

// Run coverage for a specific package
function runPackageCoverage(packagePath, packageName) {
  const startTime = Date.now();
  logInfo(`Running coverage for ${packageName}...`);

  try {
    const command = 'pnpm test:coverage';
    execSync(command, {
      cwd: packagePath,
      stdio: 'inherit',
    });

    const endTime = Date.now();
    logSuccess(`Coverage completed for ${packageName} (${endTime - startTime}ms)`);
    return true;
  } catch (error) {
    logError(`Coverage failed for ${packageName}: ${error.message}`);
    return false;
  }
}

// Read coverage summary from a package
function readCoverageSummary(packagePath) {
  const summaryPath = path.join(packagePath, 'coverage', 'coverage-summary.json');

  if (!fs.existsSync(summaryPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(summaryPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logWarning(`Could not read coverage summary from ${summaryPath}`);
    return null;
  }
}

// Merge coverage files using istanbul
function mergeCoverageFiles() {
  logInfo('Merging coverage files...');

  const coverageFiles = [];
  const packages = ['apps/backend', 'apps/web', 'apps/mobile'];

  // Find all coverage files
  packages.forEach(pkg => {
    const coverageFile = path.join(pkg, 'coverage', 'coverage-final.json');
    if (fs.existsSync(coverageFile)) {
      coverageFiles.push(coverageFile);
    }
  });

  if (coverageFiles.length === 0) {
    logWarning('No coverage files found to merge');
    return false;
  }

  try {
    // Use nyc to merge coverage files
    const command = `npx nyc merge ${coverageFiles.join(' ')} ${COVERAGE_CONFIG.outputDir}/merged-coverage.json`;
    execSync(command, { stdio: 'inherit' });

    logSuccess('Coverage files merged successfully');
    return true;
  } catch (error) {
    logError(`Failed to merge coverage files: ${error.message}`);
    return false;
  }
}

// Generate coverage reports
function generateReports() {
  logInfo('Generating coverage reports...');

  try {
    // Generate different report formats
    COVERAGE_CONFIG.formats.forEach(format => {
      const outputPath = path.join(COVERAGE_CONFIG.outputDir, format);
      const command = `npx nyc report --reporter=${format} --report-dir=${outputPath} --temp-dir=${COVERAGE_CONFIG.outputDir}`;

      execSync(command, { stdio: 'inherit' });
      logSuccess(`Generated ${format} report`);
    });

    return true;
  } catch (error) {
    logError(`Failed to generate reports: ${error.message}`);
    return false;
  }
}

// Check coverage thresholds
function checkThresholds() {
  logInfo('Checking coverage thresholds...');

  let allPassed = true;
  const results = {};

  // Check each package
  Object.entries(COVERAGE_CONFIG.thresholds).forEach(([packageName, thresholds]) => {
    const packagePath = packageName === 'packages' ? 'packages' : `apps/${packageName}`;

    if (!fs.existsSync(packagePath)) {
      logWarning(`Package ${packageName} not found, skipping threshold check`);
      return;
    }

    const summary = readCoverageSummary(packagePath);
    if (!summary) {
      logWarning(`No coverage summary found for ${packageName}`);
      return;
    }

    const total = summary.total;
    const packageResults = {
      passed: true,
      metrics: {},
    };

    // Check each metric
    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const actual = total[metric]?.pct || 0;
      const passed = actual >= threshold;

      packageResults.metrics[metric] = {
        actual,
        threshold,
        passed,
      };

      if (!passed) {
        packageResults.passed = false;
        allPassed = false;
      }
    });

    results[packageName] = packageResults;
  });

  // Print results
  log('\n📊 Coverage Threshold Results:', colors.bright);
  Object.entries(results).forEach(([packageName, result]) => {
    const status = result.passed ? '✅' : '❌';
    log(`\n${status} ${packageName.toUpperCase()}:`);

    Object.entries(result.metrics).forEach(([metric, data]) => {
      const status = data.passed ? colors.green : colors.red;
      log(`  ${metric}: ${status}${data.actual.toFixed(1)}%${colors.reset} (threshold: ${data.threshold}%)`);
    });
  });

  if (allPassed) {
    logSuccess('\n🎉 All coverage thresholds passed!');
  } else {
    logError('\n💥 Some coverage thresholds failed!');
  }

  return allPassed;
}

// Generate HTML report summary
function generateSummaryReport() {
  logInfo('Generating summary report...');

  const summaryHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>MoneyWise Coverage Report</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .package { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .package-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .metrics { padding: 15px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MoneyWise Test Coverage Report</h1>
        <p class="timestamp">Generated: ${new Date().toISOString()}</p>
    </div>

    <div id="packages">
        <!-- Package coverage details would be inserted here -->
    </div>

    <div class="footer">
        <p><strong>Coverage Reports:</strong></p>
        <ul>
            <li><a href="html/index.html">Detailed HTML Report</a></li>
            <li><a href="lcov-report/index.html">LCOV Report</a></li>
        </ul>
    </div>
</body>
</html>
  `;

  const summaryPath = path.join(COVERAGE_CONFIG.outputDir, 'index.html');
  fs.writeFileSync(summaryPath, summaryHtml);

  logSuccess(`Summary report generated: ${summaryPath}`);
}

// Main execution
async function main() {
  log('\n🚀 Starting comprehensive coverage reporting...', colors.bright);

  ensureOutputDir();

  // Run coverage for each app (packages are included in their respective apps)
  const packages = [
    { path: 'apps/backend', name: 'backend' },
    { path: 'apps/web', name: 'web' },
    { path: 'apps/mobile', name: 'mobile' },
  ];

  let allSucceeded = true;

  for (const pkg of packages) {
    if (fs.existsSync(pkg.path)) {
      const success = runPackageCoverage(pkg.path, pkg.name);
      allSucceeded = allSucceeded && success;
    } else {
      logWarning(`Package ${pkg.name} not found at ${pkg.path}`);
    }
  }

  if (!allSucceeded) {
    logError('Some packages failed coverage collection');
    process.exit(1);
  }

  // Merge coverage files
  mergeCoverageFiles();

  // Generate reports
  generateReports();

  // Check thresholds
  const thresholdsPassed = checkThresholds();

  // Generate summary
  generateSummaryReport();

  // Final status
  if (thresholdsPassed) {
    logSuccess('\n🎉 Coverage reporting completed successfully!');
    process.exit(0);
  } else {
    logError('\n💥 Coverage thresholds not met!');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Coverage reporting failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runPackageCoverage,
  checkThresholds,
  COVERAGE_CONFIG,
};