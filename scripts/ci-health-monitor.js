#!/usr/bin/env node

/**
 * MoneyWise CI Health Monitoring System
 *
 * Real-time monitoring of GitHub Actions CI/CD pipeline health with
 * automated alerting and incident response capabilities.
 *
 * @author Claude Code
 * @version 1.0.0
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class CIHealthMonitor {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    this.config = {
      owner: 'kdantuono',
      repo: 'money-wise',
      healthCheckInterval: 60000, // 1 minute
      alertThresholds: {
        failureRate: 0.20, // Alert if >20% failure rate
        avgDuration: 600, // Alert if avg duration >10 minutes
        queueTime: 300 // Alert if queue time >5 minutes
      },
      monitoring: {
        enabled: true,
        logLevel: 'info',
        retentionDays: 30
      }
    };

    this.healthHistory = [];
    this.alerts = [];
    this.isMonitoring = false;
  }

  /**
   * Start the CI health monitoring system
   */
  async start() {
    console.log('🚀 Starting CI Health Monitor...');

    try {
      await this.validateConfiguration();
      await this.loadHistoricalData();

      this.isMonitoring = true;
      await this.runHealthCheck();

      // Set up periodic monitoring
      this.monitoringInterval = setInterval(
        () => this.runHealthCheck(),
        this.config.healthCheckInterval
      );

      console.log('✅ CI Health Monitor started successfully');
      console.log(`📊 Monitoring ${this.config.owner}/${this.config.repo}`);
      console.log(`⏱️  Check interval: ${this.config.healthCheckInterval / 1000}s`);

    } catch (error) {
      console.error('❌ Failed to start CI Health Monitor:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate configuration and GitHub API access
   */
  async validateConfiguration() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    try {
      // Test GitHub API access
      await this.octokit.rest.repos.get({
        owner: this.config.owner,
        repo: this.config.repo
      });

      console.log('✅ GitHub API access validated');
    } catch (error) {
      throw new Error(`GitHub API validation failed: ${error.message}`);
    }
  }

  /**
   * Load historical monitoring data
   */
  async loadHistoricalData() {
    const historyFile = path.join(__dirname, '../monitoring-history.json');

    try {
      const data = await fs.readFile(historyFile, 'utf8');
      const parsed = JSON.parse(data);

      this.healthHistory = parsed.healthHistory || [];
      this.alerts = parsed.alerts || [];

      console.log(`📈 Loaded ${this.healthHistory.length} historical records`);
    } catch (error) {
      console.log('📝 No historical data found, starting fresh');
      this.healthHistory = [];
      this.alerts = [];
    }
  }

  /**
   * Perform comprehensive CI health check
   */
  async runHealthCheck() {
    const timestamp = new Date().toISOString();
    console.log(`🔍 Running health check at ${timestamp}`);

    try {
      const healthData = await this.gatherHealthMetrics();
      const analysis = this.analyzeHealth(healthData);

      // Store health record
      const healthRecord = {
        timestamp,
        metrics: healthData,
        analysis,
        alerts: []
      };

      // Check for alert conditions
      const alertsTriggered = await this.checkAlertConditions(analysis);
      healthRecord.alerts = alertsTriggered;

      // Store record
      this.healthHistory.push(healthRecord);
      await this.saveHealthData();

      // Process any alerts
      if (alertsTriggered.length > 0) {
        await this.processAlerts(alertsTriggered);
      }

      console.log(`✅ Health check complete - Status: ${analysis.overallHealth}`);

    } catch (error) {
      console.error('❌ Health check failed:', error.message);
    }
  }

  /**
   * Gather CI/CD health metrics from GitHub Actions
   */
  async gatherHealthMetrics() {
    const metrics = {
      recentRuns: [],
      failureRate: 0,
      averageDuration: 0,
      queueTime: 0,
      activeRuns: 0,
      timestamp: new Date().toISOString()
    };

    try {
      // Get recent workflow runs
      const { data: runs } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        per_page: 50,
        status: 'completed'
      });

      metrics.recentRuns = runs.workflow_runs.slice(0, 20);

      // Calculate failure rate
      const failed = metrics.recentRuns.filter(run => run.conclusion === 'failure').length;
      metrics.failureRate = metrics.recentRuns.length > 0 ? failed / metrics.recentRuns.length : 0;

      // Calculate average duration
      const durations = metrics.recentRuns
        .filter(run => run.updated_at && run.created_at)
        .map(run => new Date(run.updated_at) - new Date(run.created_at));

      metrics.averageDuration = durations.length > 0 ?
        durations.reduce((a, b) => a + b, 0) / durations.length / 1000 : 0;

      // Get active runs
      const { data: activeRuns } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        status: 'in_progress',
        per_page: 10
      });

      metrics.activeRuns = activeRuns.total_count;

      return metrics;

    } catch (error) {
      console.error('Failed to gather health metrics:', error.message);
      throw error;
    }
  }

  /**
   * Analyze health metrics and determine overall system health
   */
  analyzeHealth(metrics) {
    const analysis = {
      overallHealth: 'healthy',
      issues: [],
      recommendations: [],
      score: 100
    };

    // Check failure rate
    if (metrics.failureRate > this.config.alertThresholds.failureRate) {
      analysis.issues.push(`High failure rate: ${(metrics.failureRate * 100).toFixed(1)}%`);
      analysis.score -= 30;
    }

    // Check average duration
    if (metrics.averageDuration > this.config.alertThresholds.avgDuration) {
      analysis.issues.push(`Slow build times: ${Math.round(metrics.averageDuration)}s avg`);
      analysis.score -= 20;
    }

    // Check for stuck runs
    if (metrics.activeRuns > 5) {
      analysis.issues.push(`Too many active runs: ${metrics.activeRuns}`);
      analysis.score -= 15;
    }

    // Determine overall health
    if (analysis.score >= 90) {
      analysis.overallHealth = 'healthy';
    } else if (analysis.score >= 70) {
      analysis.overallHealth = 'warning';
    } else {
      analysis.overallHealth = 'critical';
    }

    return analysis;
  }

  /**
   * Check if any alert conditions are met
   */
  async checkAlertConditions(analysis) {
    const alerts = [];

    if (analysis.overallHealth === 'critical') {
      alerts.push({
        type: 'critical',
        message: 'CI/CD system health is critical',
        details: analysis.issues,
        timestamp: new Date().toISOString()
      });
    }

    if (analysis.overallHealth === 'warning') {
      alerts.push({
        type: 'warning',
        message: 'CI/CD system showing warning signs',
        details: analysis.issues,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * Process and handle alerts
   */
  async processAlerts(alerts) {
    for (const alert of alerts) {
      console.log(`🚨 ALERT [${alert.type.toUpperCase()}]: ${alert.message}`);

      // Store alert
      this.alerts.push(alert);

      // For now, just log. Future: Send to Slack, email, etc.
      if (alert.details && alert.details.length > 0) {
        console.log('📋 Issues detected:');
        alert.details.forEach(issue => console.log(`   - ${issue}`));
      }
    }
  }

  /**
   * Save health data to persistence
   */
  async saveHealthData() {
    const data = {
      healthHistory: this.healthHistory.slice(-1000), // Keep last 1000 records
      alerts: this.alerts.slice(-100), // Keep last 100 alerts
      lastUpdated: new Date().toISOString()
    };

    const historyFile = path.join(__dirname, '../monitoring-history.json');

    try {
      await fs.writeFile(historyFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save health data:', error.message);
    }
  }

  /**
   * Stop the monitoring system
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('🛑 CI Health Monitor stopped');
  }

  /**
   * Get current health status
   */
  getCurrentHealth() {
    if (this.healthHistory.length === 0) {
      return { status: 'unknown', message: 'No health data available' };
    }

    const latest = this.healthHistory[this.healthHistory.length - 1];
    return {
      status: latest.analysis.overallHealth,
      score: latest.analysis.score,
      timestamp: latest.timestamp,
      issues: latest.analysis.issues,
      metrics: latest.metrics
    };
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new CIHealthMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    monitor.stop();
    process.exit(0);
  });

  // Start monitoring
  monitor.start().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = CIHealthMonitor;