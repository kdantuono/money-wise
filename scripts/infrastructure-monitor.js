#!/usr/bin/env node

/**
 * Infrastructure Monitoring & Alerting Script
 * Comprehensive monitoring of CI/CD infrastructure health with intelligent alerting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class InfrastructureMonitor {
  constructor() {
    this.metrics = {};
    this.alerts = [];
    this.thresholds = {
      lockfileSize: 2 * 1024 * 1024, // 2MB
      cacheSize: 5 * 1024 * 1024 * 1024, // 5GB
      installTime: 60000, // 60 seconds
      buildTime: 120000, // 2 minutes
      healthCheckInterval: 3600000, // 1 hour
      alertCooldown: 86400000 // 24 hours
    };
    this.monitoringHistory = this.loadMonitoringHistory();
  }

  /**
   * Main monitoring entry point
   */
  async monitor() {
    console.log('📊 Starting infrastructure monitoring...');

    try {
      await this.collectMetrics();
      await this.analyzeHealth();
      await this.checkThresholds();
      await this.generateAlerts();
      await this.saveMetrics();
      await this.generateReport();

      console.log('✅ Infrastructure monitoring completed');
      process.exit(0);
    } catch (error) {
      console.error(`❌ Monitoring failed: ${error.message}`);
      await this.escalateCriticalAlert('Monitoring system failure', error.message);
      process.exit(1);
    }
  }

  /**
   * Collect comprehensive infrastructure metrics
   */
  async collectMetrics() {
    console.log('📈 Collecting infrastructure metrics...');

    this.metrics = {
      timestamp: new Date().toISOString(),
      system: await this.collectSystemMetrics(),
      lockfile: await this.collectLockfileMetrics(),
      cache: await this.collectCacheMetrics(),
      dependencies: await this.collectDependencyMetrics(),
      performance: await this.collectPerformanceMetrics(),
      security: await this.collectSecurityMetrics(),
      workflows: await this.collectWorkflowMetrics()
    };

    console.log('📊 Metrics collection completed');
  }

  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    return {
      nodeVersion: process.version,
      npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
    };
  }

  /**
   * Collect lockfile health metrics
   */
  async collectLockfileMetrics() {
    const lockfilePath = 'package-lock.json';

    if (!fs.existsSync(lockfilePath)) {
      return { exists: false, health: 'missing' };
    }

    const stats = fs.statSync(lockfilePath);
    let health = 'healthy';
    let validationResult = null;

    try {
      execSync('npm run validate:lockfile', { stdio: 'pipe' });
      health = 'healthy';
      validationResult = 'passed';
    } catch (error) {
      health = 'corrupted';
      validationResult = 'failed';
    }

    return {
      exists: true,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      health,
      validationResult,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Collect cache health metrics
   */
  async collectCacheMetrics() {
    let cacheDir = null;
    let cacheSize = 0;
    let health = 'unknown';

    try {
      cacheDir = execSync('npm config get cache', { encoding: 'utf8' }).trim();

      if (fs.existsSync(cacheDir)) {
        const output = execSync(`du -sb "${cacheDir}"`, { encoding: 'utf8' });
        cacheSize = parseInt(output.split('\t')[0]);
      }

      execSync('npm run validate:cache', { stdio: 'pipe' });
      health = 'healthy';
    } catch (error) {
      health = 'degraded';
    }

    return {
      directory: cacheDir,
      size: cacheSize,
      sizeMB: (cacheSize / 1024 / 1024).toFixed(2),
      sizeGB: (cacheSize / 1024 / 1024 / 1024).toFixed(2),
      health
    };
  }

  /**
   * Collect dependency health metrics
   */
  async collectDependencyMetrics() {
    let totalDependencies = 0;
    let outdatedCount = 0;
    let vulnerabilities = 0;
    let securityLevel = 'secure';

    try {
      // Count total dependencies
      const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      totalDependencies = Object.keys(packageLock.packages || {}).length;

      // Check for outdated packages
      try {
        const outdatedOutput = execSync('npm outdated --parseable', { encoding: 'utf8' });
        outdatedCount = outdatedOutput.trim().split('\n').filter(line => line).length;
      } catch (error) {
        // npm outdated returns non-zero exit code when outdated packages exist
        outdatedCount = 0;
      }

      // Check for security vulnerabilities
      try {
        execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
        securityLevel = 'secure';
      } catch (error) {
        securityLevel = 'vulnerable';
        // Parse audit output for vulnerability count (simplified)
        vulnerabilities = 1; // Placeholder - in real implementation, parse audit JSON
      }
    } catch (error) {
      securityLevel = 'unknown';
    }

    return {
      totalDependencies,
      outdatedCount,
      vulnerabilities,
      securityLevel,
      lastAudit: new Date().toISOString()
    };
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    let installTime = 0;
    let buildTime = 0;

    try {
      // Measure npm ci time
      const installStart = Date.now();
      execSync('npm ci --dry-run', { stdio: 'pipe' });
      installTime = Date.now() - installStart;

      // Measure build time
      const buildStart = Date.now();
      execSync('cd packages/types && npm run build', { stdio: 'pipe' });
      buildTime = Date.now() - buildStart;
    } catch (error) {
      console.warn('⚠️ Performance measurement failed');
    }

    return {
      installTime,
      buildTime,
      installTimeSeconds: (installTime / 1000).toFixed(2),
      buildTimeSeconds: (buildTime / 1000).toFixed(2)
    };
  }

  /**
   * Collect security metrics
   */
  async collectSecurityMetrics() {
    let auditStatus = 'unknown';
    let criticalVulnerabilities = 0;
    let highVulnerabilities = 0;

    try {
      execSync('npm audit --audit-level critical', { stdio: 'pipe' });
      auditStatus = 'secure';
    } catch (error) {
      auditStatus = 'vulnerable';
      // In real implementation, parse audit JSON for detailed counts
    }

    return {
      auditStatus,
      criticalVulnerabilities,
      highVulnerabilities,
      lastSecurityScan: new Date().toISOString()
    };
  }

  /**
   * Collect workflow health metrics
   */
  async collectWorkflowMetrics() {
    const workflowDir = '.github/workflows';
    let workflowCount = 0;
    let workflowHealth = 'healthy';

    try {
      if (fs.existsSync(workflowDir)) {
        const workflows = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml'));
        workflowCount = workflows.length;

        // Basic health check - ensure key workflows exist
        const keyWorkflows = [
          'lockfile-integrity.yml',
          'cache-management.yml',
          'infrastructure-auto-healing.yml'
        ];

        const missingWorkflows = keyWorkflows.filter(
          workflow => !workflows.includes(workflow)
        );

        if (missingWorkflows.length > 0) {
          workflowHealth = 'degraded';
        }
      } else {
        workflowHealth = 'missing';
      }
    } catch (error) {
      workflowHealth = 'unknown';
    }

    return {
      workflowCount,
      workflowHealth,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Analyze overall infrastructure health
   */
  async analyzeHealth() {
    console.log('🔍 Analyzing infrastructure health...');

    const healthScores = {
      lockfile: this.calculateLockfileHealth(),
      cache: this.calculateCacheHealth(),
      dependencies: this.calculateDependencyHealth(),
      performance: this.calculatePerformanceHealth(),
      security: this.calculateSecurityHealth(),
      workflows: this.calculateWorkflowHealth()
    };

    // Calculate overall health score (0-100)
    const weights = {
      lockfile: 0.2,
      cache: 0.15,
      dependencies: 0.2,
      performance: 0.2,
      security: 0.15,
      workflows: 0.1
    };

    let overallScore = 0;
    for (const [component, score] of Object.entries(healthScores)) {
      overallScore += score * weights[component];
    }

    this.metrics.health = {
      overall: Math.round(overallScore),
      components: healthScores,
      status: this.getHealthStatus(overallScore),
      weights
    };

    console.log(`📊 Overall health score: ${Math.round(overallScore)}/100`);
  }

  /**
   * Calculate component health scores
   */
  calculateLockfileHealth() {
    const lockfile = this.metrics.lockfile;
    if (!lockfile.exists) return 0;
    if (lockfile.health === 'corrupted') return 20;
    if (lockfile.size > this.thresholds.lockfileSize) return 70;
    return 100;
  }

  calculateCacheHealth() {
    const cache = this.metrics.cache;
    if (cache.health === 'degraded') return 30;
    if (cache.size > this.thresholds.cacheSize) return 60;
    return 100;
  }

  calculateDependencyHealth() {
    const deps = this.metrics.dependencies;
    let score = 100;
    score -= deps.vulnerabilities * 20;
    score -= Math.min(deps.outdatedCount * 5, 30);
    return Math.max(score, 0);
  }

  calculatePerformanceHealth() {
    const perf = this.metrics.performance;
    let score = 100;
    if (perf.installTime > this.thresholds.installTime) score -= 30;
    if (perf.buildTime > this.thresholds.buildTime) score -= 30;
    return Math.max(score, 0);
  }

  calculateSecurityHealth() {
    const security = this.metrics.security;
    if (security.auditStatus === 'vulnerable') return 40;
    if (security.auditStatus === 'unknown') return 70;
    return 100;
  }

  calculateWorkflowHealth() {
    const workflows = this.metrics.workflows;
    if (workflows.workflowHealth === 'missing') return 0;
    if (workflows.workflowHealth === 'degraded') return 60;
    return 100;
  }

  /**
   * Get health status from score
   */
  getHealthStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'acceptable';
    if (score >= 50) return 'degraded';
    return 'critical';
  }

  /**
   * Check thresholds and identify issues
   */
  async checkThresholds() {
    console.log('⚠️ Checking alert thresholds...');

    const issues = [];

    // Check lockfile issues
    if (!this.metrics.lockfile.exists) {
      issues.push({ severity: 'critical', component: 'lockfile', message: 'Lockfile missing' });
    } else if (this.metrics.lockfile.health === 'corrupted') {
      issues.push({ severity: 'critical', component: 'lockfile', message: 'Lockfile corrupted' });
    }

    // Check cache issues
    if (this.metrics.cache.size > this.thresholds.cacheSize) {
      issues.push({ severity: 'warning', component: 'cache', message: `Cache size exceeded ${this.metrics.cache.sizeGB}GB` });
    }

    // Check performance issues
    if (this.metrics.performance.installTime > this.thresholds.installTime) {
      issues.push({ severity: 'warning', component: 'performance', message: `Install time slow: ${this.metrics.performance.installTimeSeconds}s` });
    }

    // Check security issues
    if (this.metrics.security.auditStatus === 'vulnerable') {
      issues.push({ severity: 'high', component: 'security', message: 'Security vulnerabilities detected' });
    }

    // Check overall health
    if (this.metrics.health.overall < 50) {
      issues.push({ severity: 'critical', component: 'overall', message: `Infrastructure health critical: ${this.metrics.health.overall}/100` });
    }

    this.metrics.issues = issues;
    console.log(`⚠️ Found ${issues.length} issues requiring attention`);
  }

  /**
   * Generate alerts based on issues and history
   */
  async generateAlerts() {
    if (this.metrics.issues.length === 0) {
      console.log('✅ No alerts to generate');
      return;
    }

    console.log('🚨 Generating alerts...');

    for (const issue of this.metrics.issues) {
      if (this.shouldAlert(issue)) {
        this.alerts.push({
          ...issue,
          timestamp: new Date().toISOString(),
          id: this.generateAlertId(issue)
        });
      }
    }

    console.log(`🚨 Generated ${this.alerts.length} alerts`);
  }

  /**
   * Check if alert should be sent (considering cooldown)
   */
  shouldAlert(issue) {
    const recentAlerts = this.monitoringHistory.alerts || [];
    const cutoff = Date.now() - this.thresholds.alertCooldown;

    const recentSimilarAlert = recentAlerts.find(alert =>
      alert.component === issue.component &&
      alert.severity === issue.severity &&
      new Date(alert.timestamp).getTime() > cutoff
    );

    return !recentSimilarAlert;
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId(issue) {
    return `${issue.component}-${issue.severity}-${Date.now()}`;
  }

  /**
   * Save metrics to monitoring history
   */
  async saveMetrics() {
    const historyPath = 'monitoring-history.json';

    this.monitoringHistory.metrics = this.monitoringHistory.metrics || [];
    this.monitoringHistory.alerts = this.monitoringHistory.alerts || [];

    // Add current metrics
    this.monitoringHistory.metrics.push(this.metrics);

    // Add current alerts
    this.monitoringHistory.alerts.push(...this.alerts);

    // Keep only last 30 days of metrics
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.monitoringHistory.metrics = this.monitoringHistory.metrics.filter(
      metric => new Date(metric.timestamp).getTime() > thirtyDaysAgo
    );

    // Keep only last 90 days of alerts
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    this.monitoringHistory.alerts = this.monitoringHistory.alerts.filter(
      alert => new Date(alert.timestamp).getTime() > ninetyDaysAgo
    );

    fs.writeFileSync(historyPath, JSON.stringify(this.monitoringHistory, null, 2));
    console.log(`📊 Metrics saved to ${historyPath}`);
  }

  /**
   * Load monitoring history
   */
  loadMonitoringHistory() {
    const historyPath = 'monitoring-history.json';

    if (fs.existsSync(historyPath)) {
      try {
        return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      } catch (error) {
        console.warn('⚠️ Could not load monitoring history');
      }
    }

    return { metrics: [], alerts: [] };
  }

  /**
   * Generate comprehensive monitoring report
   */
  async generateReport() {
    // Load metrics from history if not available
    if (!this.metrics.timestamp) {
      const history = this.loadMonitoringHistory();
      if (history.metrics && history.metrics.length > 0) {
        this.metrics = history.metrics[history.metrics.length - 1];
        this.alerts = history.alerts || [];
      } else {
        console.log('📊 No monitoring data available. Run monitoring first.');
        return null;
      }
    }

    console.log('\n📊 Infrastructure Monitoring Report:');
    console.log(`   Timestamp: ${this.metrics.timestamp}`);
    console.log(`   Overall Health: ${this.metrics.health?.overall || 'Unknown'}/100 (${this.metrics.health?.status || 'Unknown'})`);
    console.log(`   Issues Found: ${this.metrics.issues?.length || 0}`);
    console.log(`   Alerts Generated: ${this.alerts.length}`);

    if (this.metrics.health?.components) {
      console.log('\n🏗️ Component Health:');
      for (const [component, score] of Object.entries(this.metrics.health.components)) {
        const status = this.getHealthStatus(score);
        console.log(`   ${component}: ${score}/100 (${status})`);
      }
    }

    if (this.metrics.issues && this.metrics.issues.length > 0) {
      console.log('\n⚠️ Issues Requiring Attention:');
      for (const issue of this.metrics.issues) {
        console.log(`   ${issue.severity.toUpperCase()}: ${issue.component} - ${issue.message}`);
      }
    }

    if (this.alerts.length > 0) {
      console.log('\n🚨 Alerts Generated:');
      for (const alert of this.alerts) {
        console.log(`   ${alert.severity.toUpperCase()}: ${alert.component} - ${alert.message}`);
      }
    }

    if (this.metrics.performance) {
      console.log('\n📈 Performance Metrics:');
      console.log(`   Install Time: ${this.metrics.performance.installTimeSeconds || 'Unknown'}s`);
      console.log(`   Build Time: ${this.metrics.performance.buildTimeSeconds || 'Unknown'}s`);
      console.log(`   Cache Size: ${this.metrics.cache?.sizeMB || 'Unknown'}MB`);
      console.log(`   Dependencies: ${this.metrics.dependencies?.totalDependencies || 'Unknown'}`);
    }

    return this.metrics;
  }

  /**
   * Escalate critical alert
   */
  async escalateCriticalAlert(title, details) {
    const escalationData = {
      title,
      details,
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      alerts: this.alerts
    };

    fs.writeFileSync(
      'infrastructure-monitoring-escalation.json',
      JSON.stringify(escalationData, null, 2)
    );

    console.log('🚨 Critical alert escalated for manual intervention');
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new InfrastructureMonitor();

  const command = process.argv[2];

  if (command === 'report') {
    monitor.generateReport();
  } else {
    monitor.monitor();
  }
}

module.exports = InfrastructureMonitor;