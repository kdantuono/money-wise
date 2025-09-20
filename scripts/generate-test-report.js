#!/usr/bin/env node

/**
 * Comprehensive Test Report Generator
 * Consolidates test results from all testing frameworks and generates unified reports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  outputDir: './test-reports',
  coverageThreshold: 80,
  performanceBudget: {
    fcp: 2000, // First Contentful Paint
    lcp: 2500, // Largest Contentful Paint
    fid: 100, // First Input Delay
    cls: 0.1, // Cumulative Layout Shift
  },
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

/**
 * Parse Jest coverage reports
 */
function parseCoverageReport(coveragePath) {
  try {
    if (!fs.existsSync(coveragePath)) {
      console.warn(`Coverage file not found: ${coveragePath}`);
      return null;
    }

    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverageData.total;

    return {
      lines: total.lines.pct,
      statements: total.statements.pct,
      functions: total.functions.pct,
      branches: total.branches.pct,
      covered: total.lines.covered,
      total: total.lines.total,
      threshold: config.coverageThreshold,
      passed: total.lines.pct >= config.coverageThreshold,
    };
  } catch (error) {
    console.error(`Error parsing coverage report: ${error.message}`);
    return null;
  }
}

/**
 * Parse Playwright test results
 */
function parsePlaywrightResults(resultsPath) {
  try {
    if (!fs.existsSync(resultsPath)) {
      console.warn(`Playwright results not found: ${resultsPath}`);
      return null;
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    return {
      total: results.stats.total,
      passed: results.stats.passed,
      failed: results.stats.failed,
      skipped: results.stats.skipped,
      flaky: results.stats.flaky,
      duration: results.stats.duration,
      success: results.stats.failed === 0,
      suites:
        results.suites?.map(suite => ({
          title: suite.title,
          tests: suite.tests?.length || 0,
          failures:
            suite.tests?.filter(test => test.outcome === 'failed').length || 0,
        })) || [],
    };
  } catch (error) {
    console.error(`Error parsing Playwright results: ${error.message}`);
    return null;
  }
}

/**
 * Parse performance metrics
 */
function parsePerformanceMetrics(metricsPath) {
  try {
    if (!fs.existsSync(metricsPath)) {
      console.warn(`Performance metrics not found: ${metricsPath}`);
      return null;
    }

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

    return {
      fcp: metrics.fcp || 0,
      lcp: metrics.lcp || 0,
      fid: metrics.fid || 0,
      cls: metrics.cls || 0,
      budgetPassed: {
        fcp: (metrics.fcp || 0) <= config.performanceBudget.fcp,
        lcp: (metrics.lcp || 0) <= config.performanceBudget.lcp,
        fid: (metrics.fid || 0) <= config.performanceBudget.fid,
        cls: (metrics.cls || 0) <= config.performanceBudget.cls,
      },
      overallPassed: Object.values({
        fcp: (metrics.fcp || 0) <= config.performanceBudget.fcp,
        lcp: (metrics.lcp || 0) <= config.performanceBudget.lcp,
        fid: (metrics.fid || 0) <= config.performanceBudget.fid,
        cls: (metrics.cls || 0) <= config.performanceBudget.cls,
      }).every(Boolean),
    };
  } catch (error) {
    console.error(`Error parsing performance metrics: ${error.message}`);
    return null;
  }
}

/**
 * Parse accessibility results
 */
function parseAccessibilityResults(a11yPath) {
  try {
    if (!fs.existsSync(a11yPath)) {
      console.warn(`Accessibility results not found: ${a11yPath}`);
      return null;
    }

    const results = JSON.parse(fs.readFileSync(a11yPath, 'utf8'));

    return {
      violations: results.violations?.length || 0,
      passes: results.passes?.length || 0,
      incomplete: results.incomplete?.length || 0,
      inapplicable: results.inapplicable?.length || 0,
      success: (results.violations?.length || 0) === 0,
      details:
        results.violations?.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          nodes: violation.nodes?.length || 0,
        })) || [],
    };
  } catch (error) {
    console.error(`Error parsing accessibility results: ${error.message}`);
    return null;
  }
}

/**
 * Generate comprehensive test report
 */
function generateReport() {
  console.log('🎯 Generating comprehensive test report...');

  const timestamp = new Date().toISOString();
  const commitSha = process.env.CI_COMMIT_SHA || 'local';
  const branch = process.env.CI_COMMIT_REF_NAME || 'local';
  const pipelineUrl = process.env.CI_PIPELINE_URL || '';

  // Collect all test results
  const testResults = {
    metadata: {
      timestamp,
      commitSha: commitSha.substring(0, 8),
      branch,
      pipelineUrl,
      environment: process.env.NODE_ENV || 'test',
    },
    coverage: {
      frontend: parseCoverageReport(
        './apps/web/coverage/coverage-summary.json'
      ),
      backend: parseCoverageReport(
        './apps/backend/coverage/coverage-summary.json'
      ),
    },
    tests: {
      unit: {
        frontend: parsePlaywrightResults(
          './apps/web/test-results/unit-results.json'
        ),
        backend: parsePlaywrightResults(
          './apps/backend/test-results/unit-results.json'
        ),
      },
      integration: {
        frontend: parsePlaywrightResults(
          './apps/web/test-results/integration-results.json'
        ),
        backend: parsePlaywrightResults(
          './apps/backend/test-results/e2e-results.json'
        ),
      },
      e2e: parsePlaywrightResults('./apps/web/test-results/results.json'),
    },
    quality: {
      performance: parsePerformanceMetrics(
        './apps/web/test-results/performance-metrics.json'
      ),
      accessibility: parseAccessibilityResults(
        './apps/web/test-results/accessibility-results.json'
      ),
    },
  };

  // Calculate overall status
  const overallStatus = {
    success: true,
    issues: [],
  };

  // Check coverage thresholds
  if (testResults.coverage.frontend && !testResults.coverage.frontend.passed) {
    overallStatus.success = false;
    overallStatus.issues.push(
      `Frontend coverage below threshold: ${testResults.coverage.frontend.lines}%`
    );
  }

  if (testResults.coverage.backend && !testResults.coverage.backend.passed) {
    overallStatus.success = false;
    overallStatus.issues.push(
      `Backend coverage below threshold: ${testResults.coverage.backend.lines}%`
    );
  }

  // Check test failures
  Object.entries(testResults.tests).forEach(([category, tests]) => {
    if (typeof tests === 'object' && tests !== null) {
      Object.entries(tests).forEach(([type, result]) => {
        if (result && !result.success) {
          overallStatus.success = false;
          overallStatus.issues.push(
            `${category}/${type} tests failed: ${result.failed} failures`
          );
        }
      });
    } else if (tests && !tests.success) {
      overallStatus.success = false;
      overallStatus.issues.push(
        `${category} tests failed: ${tests.failed} failures`
      );
    }
  });

  // Check quality gates
  if (
    testResults.quality.performance &&
    !testResults.quality.performance.overallPassed
  ) {
    overallStatus.success = false;
    overallStatus.issues.push('Performance budget exceeded');
  }

  if (
    testResults.quality.accessibility &&
    !testResults.quality.accessibility.success
  ) {
    overallStatus.success = false;
    overallStatus.issues.push(
      `Accessibility violations: ${testResults.quality.accessibility.violations}`
    );
  }

  testResults.overall = overallStatus;

  // Generate JSON report
  const jsonReport = JSON.stringify(testResults, null, 2);
  fs.writeFileSync(path.join(config.outputDir, 'test-report.json'), jsonReport);

  // Generate HTML report
  generateHTMLReport(testResults);

  // Generate Slack notification payload
  generateSlackNotification(testResults);

  console.log(`✅ Test report generated at: ${config.outputDir}`);

  // Exit with error code if tests failed
  if (!overallStatus.success) {
    console.error('❌ Test suite failed with issues:', overallStatus.issues);
    process.exit(1);
  }

  console.log('🎉 All tests passed successfully!');
}

/**
 * Generate HTML report
 */
function generateHTMLReport(testResults) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoneyWise Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .status { padding: 20px; text-align: center; font-size: 1.2rem; font-weight: bold; }
        .status.success { background: #d4edda; color: #155724; }
        .status.failure { background: #f8d7da; color: #721c24; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 20px; }
        .card { background: white; border: 1px solid #e1e5e9; border-radius: 6px; padding: 20px; }
        .card h3 { margin-top: 0; color: #1f2937; border-bottom: 2px solid #e1e5e9; padding-bottom: 10px; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .metric:last-child { border-bottom: none; }
        .metric-value { font-weight: bold; }
        .success { color: #059669; }
        .failure { color: #dc2626; }
        .warning { color: #d97706; }
        .footer { padding: 20px; text-align: center; color: #6b7280; border-top: 1px solid #e1e5e9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 MoneyWise Test Report</h1>
            <p>Branch: ${testResults.metadata.branch} | Commit: ${testResults.metadata.commitSha} | ${testResults.metadata.timestamp}</p>
        </div>

        <div class="status ${testResults.overall.success ? 'success' : 'failure'}">
            ${testResults.overall.success ? '✅ All Tests Passed' : '❌ Tests Failed'}
            ${testResults.overall.issues.length > 0 ? '<br><small>' + testResults.overall.issues.join('<br>') + '</small>' : ''}
        </div>

        <div class="grid">
            <!-- Coverage Card -->
            <div class="card">
                <h3>📊 Code Coverage</h3>
                ${
                  testResults.coverage.frontend
                    ? `
                <div class="metric">
                    <span>Frontend Lines:</span>
                    <span class="metric-value ${testResults.coverage.frontend.passed ? 'success' : 'failure'}">
                        ${testResults.coverage.frontend.lines}%
                    </span>
                </div>
                <div class="metric">
                    <span>Frontend Functions:</span>
                    <span class="metric-value">${testResults.coverage.frontend.functions}%</span>
                </div>
                `
                    : '<p>Frontend coverage not available</p>'
                }

                ${
                  testResults.coverage.backend
                    ? `
                <div class="metric">
                    <span>Backend Lines:</span>
                    <span class="metric-value ${testResults.coverage.backend.passed ? 'success' : 'failure'}">
                        ${testResults.coverage.backend.lines}%
                    </span>
                </div>
                <div class="metric">
                    <span>Backend Functions:</span>
                    <span class="metric-value">${testResults.coverage.backend.functions}%</span>
                </div>
                `
                    : '<p>Backend coverage not available</p>'
                }
            </div>

            <!-- Test Results Card -->
            <div class="card">
                <h3>🧪 Test Results</h3>
                ${
                  testResults.tests.e2e
                    ? `
                <div class="metric">
                    <span>E2E Tests:</span>
                    <span class="metric-value ${testResults.tests.e2e.success ? 'success' : 'failure'}">
                        ${testResults.tests.e2e.passed}/${testResults.tests.e2e.total}
                    </span>
                </div>
                `
                    : ''
                }

                ${
                  testResults.tests.unit.frontend
                    ? `
                <div class="metric">
                    <span>Frontend Unit:</span>
                    <span class="metric-value ${testResults.tests.unit.frontend.success ? 'success' : 'failure'}">
                        ${testResults.tests.unit.frontend.passed}/${testResults.tests.unit.frontend.total}
                    </span>
                </div>
                `
                    : ''
                }

                ${
                  testResults.tests.unit.backend
                    ? `
                <div class="metric">
                    <span>Backend Unit:</span>
                    <span class="metric-value ${testResults.tests.unit.backend.success ? 'success' : 'failure'}">
                        ${testResults.tests.unit.backend.passed}/${testResults.tests.unit.backend.total}
                    </span>
                </div>
                `
                    : ''
                }
            </div>

            <!-- Performance Card -->
            <div class="card">
                <h3>⚡ Performance</h3>
                ${
                  testResults.quality.performance
                    ? `
                <div class="metric">
                    <span>First Contentful Paint:</span>
                    <span class="metric-value ${testResults.quality.performance.budgetPassed.fcp ? 'success' : 'failure'}">
                        ${testResults.quality.performance.fcp}ms
                    </span>
                </div>
                <div class="metric">
                    <span>Largest Contentful Paint:</span>
                    <span class="metric-value ${testResults.quality.performance.budgetPassed.lcp ? 'success' : 'failure'}">
                        ${testResults.quality.performance.lcp}ms
                    </span>
                </div>
                <div class="metric">
                    <span>Cumulative Layout Shift:</span>
                    <span class="metric-value ${testResults.quality.performance.budgetPassed.cls ? 'success' : 'failure'}">
                        ${testResults.quality.performance.cls}
                    </span>
                </div>
                `
                    : '<p>Performance metrics not available</p>'
                }
            </div>

            <!-- Accessibility Card -->
            <div class="card">
                <h3>♿ Accessibility</h3>
                ${
                  testResults.quality.accessibility
                    ? `
                <div class="metric">
                    <span>Violations:</span>
                    <span class="metric-value ${testResults.quality.accessibility.success ? 'success' : 'failure'}">
                        ${testResults.quality.accessibility.violations}
                    </span>
                </div>
                <div class="metric">
                    <span>Passes:</span>
                    <span class="metric-value success">${testResults.quality.accessibility.passes}</span>
                </div>
                `
                    : '<p>Accessibility results not available</p>'
                }
            </div>
        </div>

        <div class="footer">
            <p>Generated by MoneyWise CI/CD Pipeline | <a href="${testResults.metadata.pipelineUrl}">View Pipeline</a></p>
        </div>
    </div>
</body>
</html>
  `;

  fs.writeFileSync(path.join(config.outputDir, 'test-report.html'), html);
}

/**
 * Generate Slack notification payload
 */
function generateSlackNotification(testResults) {
  const emoji = testResults.overall.success ? '✅' : '❌';
  const status = testResults.overall.success ? 'PASSED' : 'FAILED';
  const color = testResults.overall.success ? '#36a64f' : '#ff0000';

  const notification = {
    text: `${emoji} MoneyWise Test Suite ${status}`,
    attachments: [
      {
        color: color,
        fields: [
          {
            title: 'Branch',
            value: testResults.metadata.branch,
            short: true,
          },
          {
            title: 'Commit',
            value: testResults.metadata.commitSha,
            short: true,
          },
          {
            title: 'Frontend Coverage',
            value: testResults.coverage.frontend
              ? `${testResults.coverage.frontend.lines}%`
              : 'N/A',
            short: true,
          },
          {
            title: 'Backend Coverage',
            value: testResults.coverage.backend
              ? `${testResults.coverage.backend.lines}%`
              : 'N/A',
            short: true,
          },
        ],
        actions: [
          {
            type: 'button',
            text: 'View Pipeline',
            url: testResults.metadata.pipelineUrl,
          },
        ],
        footer: 'MoneyWise CI/CD',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  if (!testResults.overall.success) {
    notification.attachments[0].fields.push({
      title: 'Issues',
      value: testResults.overall.issues.join('\\n'),
      short: false,
    });
  }

  fs.writeFileSync(
    path.join(config.outputDir, 'slack-notification.json'),
    JSON.stringify(notification, null, 2)
  );
}

// Run the report generator
if (require.main === module) {
  generateReport();
}

module.exports = { generateReport, config };
