#!/usr/bin/env node

/**
 * MoneyWise Workflow Analyzer
 *
 * Advanced GitHub Actions workflow analysis and performance monitoring
 * with detailed metrics and trend analysis capabilities.
 *
 * @author Claude Code
 * @version 1.0.0
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class WorkflowAnalyzer {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    this.config = {
      owner: 'kdantuono',
      repo: 'money-wise',
      analysisDepth: 100, // Number of runs to analyze
      performanceThresholds: {
        build: 300, // 5 minutes
        test: 180, // 3 minutes
        deploy: 600, // 10 minutes
        total: 900 // 15 minutes
      }
    };

    this.workflows = new Map();
    this.performanceData = [];
  }

  /**
   * Analyze all workflows in the repository
   */
  async analyzeAllWorkflows() {
    console.log('🔍 Starting comprehensive workflow analysis...');

    try {
      const workflows = await this.getRepositoryWorkflows();
      console.log(`📊 Found ${workflows.length} workflows to analyze`);

      const results = {
        timestamp: new Date().toISOString(),
        workflows: [],
        summary: {
          totalWorkflows: workflows.length,
          healthyWorkflows: 0,
          problematicWorkflows: 0,
          averageSuccessRate: 0,
          averageDuration: 0
        }
      };

      for (const workflow of workflows) {
        console.log(`\n🔬 Analyzing workflow: ${workflow.name}`);
        const analysis = await this.analyzeWorkflow(workflow);
        results.workflows.push(analysis);

        if (analysis.health.status === 'healthy') {
          results.summary.healthyWorkflows++;
        } else {
          results.summary.problematicWorkflows++;
        }
      }

      // Calculate summary metrics
      if (results.workflows.length > 0) {
        results.summary.averageSuccessRate =
          results.workflows.reduce((sum, w) => sum + w.metrics.successRate, 0) / results.workflows.length;

        results.summary.averageDuration =
          results.workflows.reduce((sum, w) => sum + w.metrics.averageDuration, 0) / results.workflows.length;
      }

      await this.saveAnalysisResults(results);
      this.printAnalysisReport(results);

      return results;

    } catch (error) {
      console.error('❌ Workflow analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all workflows in the repository
   */
  async getRepositoryWorkflows() {
    try {
      const { data } = await this.octokit.rest.actions.listRepoWorkflows({
        owner: this.config.owner,
        repo: this.config.repo
      });

      return data.workflows.filter(workflow => workflow.state === 'active');
    } catch (error) {
      console.error('Failed to get repository workflows:', error.message);
      throw error;
    }
  }

  /**
   * Analyze a specific workflow
   */
  async analyzeWorkflow(workflow) {
    const analysis = {
      id: workflow.id,
      name: workflow.name,
      path: workflow.path,
      state: workflow.state,
      metrics: {},
      health: {},
      trends: {},
      issues: [],
      recommendations: []
    };

    try {
      // Get recent runs for this workflow
      const { data: runsData } = await this.octokit.rest.actions.listWorkflowRuns({
        owner: this.config.owner,
        repo: this.config.repo,
        workflow_id: workflow.id,
        per_page: this.config.analysisDepth
      });

      const runs = runsData.workflow_runs;
      analysis.metrics = this.calculateWorkflowMetrics(runs);
      analysis.health = this.assessWorkflowHealth(analysis.metrics, workflow);
      analysis.trends = this.analyzeTrends(runs);
      analysis.issues = this.identifyIssues(analysis.metrics, analysis.trends);
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;

    } catch (error) {
      console.error(`Failed to analyze workflow ${workflow.name}:`, error.message);
      analysis.health = { status: 'error', message: error.message };
      return analysis;
    }
  }

  /**
   * Calculate comprehensive metrics for a workflow
   */
  calculateWorkflowMetrics(runs) {
    if (runs.length === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        failureRate: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        queueTime: 0,
        recentFailures: 0
      };
    }

    // Basic counts
    const successful = runs.filter(run => run.conclusion === 'success').length;
    const failed = runs.filter(run => run.conclusion === 'failure').length;
    const cancelled = runs.filter(run => run.conclusion === 'cancelled').length;

    // Duration calculations
    const durations = runs
      .filter(run => run.updated_at && run.created_at)
      .map(run => (new Date(run.updated_at) - new Date(run.created_at)) / 1000)
      .sort((a, b) => a - b);

    const averageDuration = durations.length > 0 ?
      durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    const medianDuration = durations.length > 0 ?
      durations[Math.floor(durations.length / 2)] : 0;

    const p95Duration = durations.length > 0 ?
      durations[Math.floor(durations.length * 0.95)] : 0;

    // Recent failures (last 10 runs)
    const recentRuns = runs.slice(0, 10);
    const recentFailures = recentRuns.filter(run => run.conclusion === 'failure').length;

    // Queue time (difference between created and run_started)
    const queueTimes = runs
      .filter(run => run.run_started_at && run.created_at)
      .map(run => (new Date(run.run_started_at) - new Date(run.created_at)) / 1000);

    const averageQueueTime = queueTimes.length > 0 ?
      queueTimes.reduce((sum, q) => sum + q, 0) / queueTimes.length : 0;

    return {
      totalRuns: runs.length,
      successful,
      failed,
      cancelled,
      successRate: runs.length > 0 ? successful / runs.length : 0,
      failureRate: runs.length > 0 ? failed / runs.length : 0,
      averageDuration,
      medianDuration,
      p95Duration,
      queueTime: averageQueueTime,
      recentFailures,
      durationsData: durations
    };
  }

  /**
   * Assess overall workflow health
   */
  assessWorkflowHealth(metrics, workflow) {
    const health = {
      status: 'healthy',
      score: 100,
      issues: []
    };

    // Check success rate
    if (metrics.successRate < 0.8) {
      health.issues.push('Low success rate');
      health.score -= 30;
    } else if (metrics.successRate < 0.9) {
      health.issues.push('Moderate success rate');
      health.score -= 15;
    }

    // Check recent failures
    if (metrics.recentFailures >= 3) {
      health.issues.push('Multiple recent failures');
      health.score -= 25;
    }

    // Check duration against thresholds
    const workflowType = this.identifyWorkflowType(workflow.name);
    const threshold = this.config.performanceThresholds[workflowType] ||
                     this.config.performanceThresholds.total;

    if (metrics.averageDuration > threshold) {
      health.issues.push(`Slow performance (${Math.round(metrics.averageDuration)}s avg)`);
      health.score -= 20;
    }

    // Check queue time
    if (metrics.queueTime > 60) {
      health.issues.push('High queue times');
      health.score -= 10;
    }

    // Determine status
    if (health.score >= 85) {
      health.status = 'healthy';
    } else if (health.score >= 60) {
      health.status = 'warning';
    } else {
      health.status = 'critical';
    }

    return health;
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends(runs) {
    if (runs.length < 10) {
      return { insufficient_data: true };
    }

    const recent = runs.slice(0, 10);
    const older = runs.slice(10, 20);

    // Success rate trend
    const recentSuccessRate = recent.filter(r => r.conclusion === 'success').length / recent.length;
    const olderSuccessRate = older.length > 0 ?
      older.filter(r => r.conclusion === 'success').length / older.length : recentSuccessRate;

    // Duration trend
    const recentDurations = recent
      .filter(run => run.updated_at && run.created_at)
      .map(run => (new Date(run.updated_at) - new Date(run.created_at)) / 1000);

    const olderDurations = older
      .filter(run => run.updated_at && run.created_at)
      .map(run => (new Date(run.updated_at) - new Date(run.created_at)) / 1000);

    const recentAvgDuration = recentDurations.length > 0 ?
      recentDurations.reduce((sum, d) => sum + d, 0) / recentDurations.length : 0;

    const olderAvgDuration = olderDurations.length > 0 ?
      olderDurations.reduce((sum, d) => sum + d, 0) / olderDurations.length : recentAvgDuration;

    return {
      successRateTrend: recentSuccessRate - olderSuccessRate,
      durationTrend: recentAvgDuration - olderAvgDuration,
      improving: recentSuccessRate > olderSuccessRate && recentAvgDuration < olderAvgDuration,
      degrading: recentSuccessRate < olderSuccessRate || recentAvgDuration > olderAvgDuration
    };
  }

  /**
   * Identify workflow issues
   */
  identifyIssues(metrics, trends) {
    const issues = [];

    if (metrics.failureRate > 0.2) {
      issues.push({
        type: 'high_failure_rate',
        severity: 'high',
        message: `High failure rate: ${(metrics.failureRate * 100).toFixed(1)}%`
      });
    }

    if (metrics.recentFailures >= 3) {
      issues.push({
        type: 'recent_failures',
        severity: 'medium',
        message: `${metrics.recentFailures} failures in last 10 runs`
      });
    }

    if (trends.degrading) {
      issues.push({
        type: 'performance_degradation',
        severity: 'medium',
        message: 'Performance is degrading over time'
      });
    }

    if (metrics.p95Duration > metrics.averageDuration * 2) {
      issues.push({
        type: 'inconsistent_performance',
        severity: 'low',
        message: 'Highly variable execution times'
      });
    }

    return issues;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.metrics.failureRate > 0.15) {
      recommendations.push('Investigate recent failures and improve test stability');
    }

    if (analysis.metrics.averageDuration > 600) {
      recommendations.push('Optimize workflow performance - consider parallelization');
    }

    if (analysis.metrics.queueTime > 60) {
      recommendations.push('Consider adding more runners or optimizing resource usage');
    }

    if (analysis.trends.degrading) {
      recommendations.push('Monitor for performance regressions and optimize bottlenecks');
    }

    const issueTypes = analysis.issues.map(i => i.type);
    if (issueTypes.includes('inconsistent_performance')) {
      recommendations.push('Investigate variable execution times - may indicate resource contention');
    }

    return recommendations;
  }

  /**
   * Identify workflow type for threshold comparison
   */
  identifyWorkflowType(name) {
    const nameUpper = name.toUpperCase();

    if (nameUpper.includes('BUILD')) return 'build';
    if (nameUpper.includes('TEST')) return 'test';
    if (nameUpper.includes('DEPLOY')) return 'deploy';

    return 'total';
  }

  /**
   * Save analysis results to file
   */
  async saveAnalysisResults(results) {
    const outputFile = path.join(__dirname, '../workflow-analysis.json');

    try {
      await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
      console.log(`💾 Analysis results saved to ${outputFile}`);
    } catch (error) {
      console.error('Failed to save analysis results:', error.message);
    }
  }

  /**
   * Print formatted analysis report
   */
  printAnalysisReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 WORKFLOW ANALYSIS REPORT');
    console.log('='.repeat(60));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Workflows: ${results.summary.totalWorkflows}`);
    console.log(`   Healthy: ${results.summary.healthyWorkflows}`);
    console.log(`   Problematic: ${results.summary.problematicWorkflows}`);
    console.log(`   Average Success Rate: ${(results.summary.averageSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Average Duration: ${Math.round(results.summary.averageDuration)}s`);

    console.log(`\n🔍 DETAILED ANALYSIS:`);

    results.workflows.forEach(workflow => {
      const statusIcon = {
        'healthy': '✅',
        'warning': '⚠️',
        'critical': '❌',
        'error': '💥'
      }[workflow.health.status] || '❓';

      console.log(`\n${statusIcon} ${workflow.name}`);
      console.log(`   Success Rate: ${(workflow.metrics.successRate * 100).toFixed(1)}%`);
      console.log(`   Avg Duration: ${Math.round(workflow.metrics.averageDuration)}s`);
      console.log(`   Recent Failures: ${workflow.metrics.recentFailures}`);

      if (workflow.issues.length > 0) {
        console.log(`   Issues:`);
        workflow.issues.forEach(issue => {
          console.log(`     - ${issue.message}`);
        });
      }

      if (workflow.recommendations.length > 0) {
        console.log(`   Recommendations:`);
        workflow.recommendations.forEach(rec => {
          console.log(`     - ${rec}`);
        });
      }
    });

    console.log('\n' + '='.repeat(60));
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new WorkflowAnalyzer();

  analyzer.analyzeAllWorkflows().catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = WorkflowAnalyzer;