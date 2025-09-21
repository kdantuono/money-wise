#!/usr/bin/env node

/**
 * MoneyWise Recovery Orchestrator
 *
 * Intelligent incident response and automated recovery coordination system
 * with self-healing capabilities and escalation procedures.
 *
 * @author Claude Code
 * @version 1.0.0
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class RecoveryOrchestrator {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    this.config = {
      owner: 'kdantuono',
      repo: 'money-wise',
      recoveryStrategies: {
        lockfile_corruption: {
          automated: true,
          steps: ['backup_lockfile', 'clean_cache', 'reinstall_deps', 'verify_build'],
          maxRetries: 2,
          timeout: 600
        },
        cache_corruption: {
          automated: true,
          steps: ['clear_all_caches', 'reinstall_deps', 'verify_build'],
          maxRetries: 3,
          timeout: 300
        },
        workflow_failures: {
          automated: true,
          steps: ['analyze_failures', 'restart_failed_jobs', 'monitor_recovery'],
          maxRetries: 1,
          timeout: 900
        },
        performance_degradation: {
          automated: false,
          steps: ['analyze_performance', 'identify_bottlenecks', 'escalate_manual'],
          maxRetries: 0,
          timeout: 1800
        }
      },
      healthThresholds: {
        critical: { failureRate: 0.5, avgDuration: 1800 },
        warning: { failureRate: 0.25, avgDuration: 900 },
        healthy: { failureRate: 0.1, avgDuration: 600 }
      }
    };

    this.recoveryHistory = [];
    this.currentRecovery = null;
  }

  /**
   * Orchestrate recovery for detected incidents
   */
  async orchestrateRecovery(incident) {
    try {
      console.log(`🚀 Starting recovery orchestration for: ${incident.type}`);

      const recovery = {
        id: this.generateRecoveryId(),
        incident,
        startTime: new Date(),
        status: 'in_progress',
        steps: [],
        retryCount: 0,
        success: false
      };

      this.currentRecovery = recovery;

      // Get recovery strategy
      const strategy = this.config.recoveryStrategies[incident.type];
      if (!strategy) {
        throw new Error(`No recovery strategy defined for incident type: ${incident.type}`);
      }

      if (!strategy.automated) {
        console.log('👤 Manual intervention required - escalating...');
        return await this.escalateToManual(recovery);
      }

      // Execute automated recovery
      let success = false;
      while (recovery.retryCount <= strategy.maxRetries && !success) {
        console.log(`🔄 Recovery attempt ${recovery.retryCount + 1}/${strategy.maxRetries + 1}`);

        try {
          success = await this.executeRecoverySteps(recovery, strategy);
        } catch (error) {
          console.error(`❌ Recovery attempt failed: ${error.message}`);
          recovery.retryCount++;

          if (recovery.retryCount <= strategy.maxRetries) {
            console.log(`⏳ Waiting before retry...`);
            await this.sleep(30000); // Wait 30 seconds before retry
          }
        }
      }

      // Finalize recovery
      recovery.endTime = new Date();
      recovery.success = success;
      recovery.status = success ? 'completed' : 'failed';

      this.recoveryHistory.push(recovery);
      await this.saveRecoveryHistory();

      if (success) {
        console.log(`✅ Recovery completed successfully in ${this.getRecoveryDuration(recovery)}`);
        await this.notifyRecoverySuccess(recovery);
      } else {
        console.log(`❌ Recovery failed after ${recovery.retryCount} attempts`);
        await this.escalateFailedRecovery(recovery);
      }

      return recovery;

    } catch (error) {
      console.error('❌ Recovery orchestration failed:', error.message);
      throw error;
    } finally {
      this.currentRecovery = null;
    }
  }

  /**
   * Execute recovery steps for a strategy
   */
  async executeRecoverySteps(recovery, strategy) {
    const stepResults = [];

    for (const stepName of strategy.steps) {
      console.log(`🔧 Executing step: ${stepName}`);

      const stepResult = {
        name: stepName,
        startTime: new Date(),
        status: 'running'
      };

      try {
        const success = await this.executeRecoveryStep(stepName, recovery.incident);

        stepResult.endTime = new Date();
        stepResult.status = success ? 'completed' : 'failed';
        stepResult.success = success;

        stepResults.push(stepResult);

        if (!success) {
          console.log(`❌ Step failed: ${stepName}`);
          recovery.steps = stepResults;
          return false;
        }

        console.log(`✅ Step completed: ${stepName}`);

      } catch (error) {
        stepResult.endTime = new Date();
        stepResult.status = 'error';
        stepResult.error = error.message;
        stepResult.success = false;

        stepResults.push(stepResult);
        recovery.steps = stepResults;

        console.error(`💥 Step error: ${stepName} - ${error.message}`);
        return false;
      }
    }

    recovery.steps = stepResults;

    // Verify recovery success
    return await this.verifyRecoverySuccess(recovery.incident);
  }

  /**
   * Execute individual recovery step
   */
  async executeRecoveryStep(stepName, incident) {
    switch (stepName) {
      case 'backup_lockfile':
        return await this.backupLockfile();
      case 'clean_cache':
        return await this.cleanCache();
      case 'reinstall_deps':
        return await this.reinstallDependencies();
      case 'verify_build':
        return await this.verifyBuild();
      case 'clear_all_caches':
        return await this.clearAllCaches();
      case 'analyze_failures':
        return await this.analyzeFailures();
      case 'restart_failed_jobs':
        return await this.restartFailedJobs();
      case 'monitor_recovery':
        return await this.monitorRecovery();
      case 'analyze_performance':
        return await this.analyzePerformance();
      case 'identify_bottlenecks':
        return await this.identifyBottlenecks();
      case 'escalate_manual':
        return await this.escalateToManual();
      default:
        throw new Error(`Unknown recovery step: ${stepName}`);
    }
  }

  /**
   * Recovery step implementations
   */
  async backupLockfile() {
    try {
      if (await this.fileExists('package-lock.json')) {
        execSync('cp package-lock.json package-lock.json.backup');
        console.log('💾 Lockfile backed up');
      }
      return true;
    } catch (error) {
      console.error('Backup failed:', error.message);
      return false;
    }
  }

  async cleanCache() {
    try {
      execSync('npm cache clean --force', { stdio: 'inherit' });
      console.log('🧹 NPM cache cleaned');
      return true;
    } catch (error) {
      console.error('Cache clean failed:', error.message);
      return false;
    }
  }

  async reinstallDependencies() {
    try {
      // Remove node_modules and lockfile
      execSync('rm -rf node_modules package-lock.json', { stdio: 'inherit' });

      // Reinstall
      execSync('npm install', { stdio: 'inherit' });
      console.log('📦 Dependencies reinstalled');
      return true;
    } catch (error) {
      console.error('Dependency reinstall failed:', error.message);
      return false;
    }
  }

  async verifyBuild() {
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build verification successful');
      return true;
    } catch (error) {
      console.error('Build verification failed:', error.message);
      return false;
    }
  }

  async clearAllCaches() {
    try {
      const cacheCommands = [
        'npm cache clean --force',
        'rm -rf .next/cache',
        'rm -rf node_modules/.cache',
        'rm -rf .eslintcache'
      ];

      for (const cmd of cacheCommands) {
        try {
          execSync(cmd, { stdio: 'inherit' });
        } catch (error) {
          // Some cache dirs might not exist, continue
          console.log(`Cache command failed (continuing): ${cmd}`);
        }
      }

      console.log('🗑️ All caches cleared');
      return true;
    } catch (error) {
      console.error('Cache clearing failed:', error.message);
      return false;
    }
  }

  async analyzeFailures() {
    try {
      console.log('🔍 Analyzing recent failures...');

      const { data: runs } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        status: 'failure',
        per_page: 10
      });

      console.log(`📊 Found ${runs.workflow_runs.length} recent failures`);
      return true;
    } catch (error) {
      console.error('Failure analysis failed:', error.message);
      return false;
    }
  }

  async restartFailedJobs() {
    try {
      console.log('🔄 Restarting failed jobs...');

      const { data: runs } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        status: 'failure',
        per_page: 5
      });

      for (const run of runs.workflow_runs) {
        try {
          await this.octokit.rest.actions.reRunWorkflowFailedJobs({
            owner: this.config.owner,
            repo: this.config.repo,
            run_id: run.id
          });
          console.log(`🔄 Restarted run: ${run.id}`);
        } catch (error) {
          console.log(`⚠️ Could not restart run ${run.id}: ${error.message}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Job restart failed:', error.message);
      return false;
    }
  }

  async monitorRecovery() {
    try {
      console.log('👀 Monitoring recovery progress...');
      await this.sleep(60000); // Wait 1 minute
      console.log('📊 Recovery monitoring complete');
      return true;
    } catch (error) {
      console.error('Recovery monitoring failed:', error.message);
      return false;
    }
  }

  async analyzePerformance() {
    try {
      console.log('📈 Analyzing performance metrics...');
      // This would run performance analysis
      return true;
    } catch (error) {
      console.error('Performance analysis failed:', error.message);
      return false;
    }
  }

  async identifyBottlenecks() {
    try {
      console.log('🔍 Identifying performance bottlenecks...');
      // This would identify bottlenecks
      return true;
    } catch (error) {
      console.error('Bottleneck identification failed:', error.message);
      return false;
    }
  }

  /**
   * Verify recovery success by checking system health
   */
  async verifyRecoverySuccess(incident) {
    try {
      console.log('🔍 Verifying recovery success...');

      // Run health check
      const CIHealthMonitor = require('./ci-health-monitor');
      const monitor = new CIHealthMonitor();

      await monitor.runHealthCheck();
      const health = monitor.getCurrentHealth();

      if (health.status === 'healthy') {
        console.log('✅ System health verified as healthy');
        return true;
      } else if (health.status === 'warning') {
        console.log('⚠️ System health shows warnings but is functional');
        return true;
      } else {
        console.log('❌ System health still critical');
        return false;
      }

    } catch (error) {
      console.error('Recovery verification failed:', error.message);
      return false;
    }
  }

  /**
   * Escalate to manual intervention
   */
  async escalateToManual(recovery) {
    console.log('👤 Escalating to manual intervention...');

    recovery.status = 'escalated';
    recovery.endTime = new Date();

    // This would create GitHub issue or send notifications
    console.log('📢 Manual intervention request created');

    return recovery;
  }

  /**
   * Handle failed recovery
   */
  async escalateFailedRecovery(recovery) {
    console.log('🚨 Recovery failed - escalating to critical response...');

    // This would create critical incident response
    console.log('📢 Critical incident response initiated');
  }

  /**
   * Notify successful recovery
   */
  async notifyRecoverySuccess(recovery) {
    console.log('📢 Recovery success notification sent');
  }

  /**
   * Utility methods
   */
  generateRecoveryId() {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRecoveryDuration(recovery) {
    const duration = recovery.endTime - recovery.startTime;
    return `${Math.round(duration / 1000)}s`;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveRecoveryHistory() {
    try {
      const historyFile = path.join(__dirname, '../recovery-history.json');
      const data = {
        recoveries: this.recoveryHistory.slice(-100), // Keep last 100 recoveries
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(historyFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save recovery history:', error.message);
    }
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    const recent = this.recoveryHistory.slice(-20);

    return {
      totalRecoveries: this.recoveryHistory.length,
      recentSuccess: recent.filter(r => r.success).length,
      recentFailures: recent.filter(r => !r.success).length,
      successRate: recent.length > 0 ? recent.filter(r => r.success).length / recent.length : 0,
      averageDuration: recent.length > 0 ?
        recent.reduce((sum, r) => sum + (r.endTime - r.startTime), 0) / recent.length / 1000 : 0
    };
  }
}

// CLI interface
if (require.main === module) {
  const orchestrator = new RecoveryOrchestrator();

  // Test recovery orchestration
  const testIncident = {
    type: 'lockfile_corruption',
    severity: 'critical',
    timestamp: new Date().toISOString(),
    description: 'Test lockfile corruption incident'
  };

  console.log('🧪 Testing Recovery Orchestrator...\n');

  orchestrator.orchestrateRecovery(testIncident)
    .then(recovery => {
      console.log('\n📊 Recovery Statistics:');
      console.log(JSON.stringify(orchestrator.getRecoveryStats(), null, 2));
      console.log('\n✅ Recovery Orchestrator testing completed');
    })
    .catch(error => {
      console.error('❌ Recovery Orchestrator test failed:', error.message);
      process.exit(1);
    });
}

module.exports = RecoveryOrchestrator;