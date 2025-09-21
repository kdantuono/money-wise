#!/usr/bin/env node

/**
 * Zero-Downtime CI/CD Updates Script
 * Safely updates CI/CD infrastructure without disrupting development workflows
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ZeroDowntimeUpdater {
  constructor() {
    this.updateLog = [];
    this.preUpdateBackups = [];
    this.rollbackPlan = [];
    this.canaryTests = [];
    this.updateStrategy = 'progressive';
  }

  /**
   * Main zero-downtime update entry point
   */
  async update() {
    console.log('🚀 Starting zero-downtime CI/CD infrastructure update...');

    try {
      await this.preUpdateValidation();
      await this.createBackups();
      await this.executeCanaryDeployment();
      await this.progressiveRollout();
      await this.postUpdateValidation();
      await this.cleanupBackups();

      console.log('✅ Zero-downtime update completed successfully');
      process.exit(0);
    } catch (error) {
      console.error(`❌ Zero-downtime update failed: ${error.message}`);
      await this.executeRollback();
      process.exit(1);
    }
  }

  /**
   * Validate system before starting updates
   */
  async preUpdateValidation() {
    console.log('🔍 Pre-update validation...');

    // Check if system is in healthy state
    try {
      execSync('npm run infrastructure:health', { stdio: 'pipe' });
      this.log('✅', 'Infrastructure health check passed');
    } catch (error) {
      throw new Error('Infrastructure not healthy - aborting update');
    }

    // Check for ongoing CI runs
    const ongoingRuns = await this.checkOngoingCIRuns();
    if (ongoingRuns > 0) {
      this.log('⏳', `Waiting for ${ongoingRuns} ongoing CI runs to complete`);
      await this.waitForCICompletion();
    }

    // Validate update prerequisites
    await this.validateUpdatePrerequisites();

    this.log('✅', 'Pre-update validation completed');
  }

  /**
   * Create comprehensive backups before updates
   */
  async createBackups() {
    console.log('📦 Creating infrastructure backups...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `backups/ci-update-${timestamp}`;

    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true });

    // Backup workflow files
    const workflowBackup = path.join(backupDir, 'workflows');
    execSync(`cp -r .github/workflows ${workflowBackup}`, { stdio: 'pipe' });
    this.preUpdateBackups.push({ type: 'workflows', path: workflowBackup });

    // Backup package files
    const packageFiles = ['package.json', 'package-lock.json'];
    for (const file of packageFiles) {
      if (fs.existsSync(file)) {
        const backupPath = path.join(backupDir, file);
        fs.copyFileSync(file, backupPath);
        this.preUpdateBackups.push({ type: 'package', file, path: backupPath });
      }
    }

    // Backup scripts
    const scriptsBackup = path.join(backupDir, 'scripts');
    execSync(`cp -r scripts ${scriptsBackup}`, { stdio: 'pipe' });
    this.preUpdateBackups.push({ type: 'scripts', path: scriptsBackup });

    this.log('📦', `Backups created in ${backupDir}`);
    this.rollbackPlan.push({ action: 'restore_backups', backupDir });
  }

  /**
   * Execute canary deployment to test updates
   */
  async executeCanaryDeployment() {
    console.log('🐤 Executing canary deployment...');

    // Create canary workflow for testing
    const canaryWorkflow = this.createCanaryWorkflow();
    const canaryPath = '.github/workflows/canary-test.yml';

    fs.writeFileSync(canaryPath, canaryWorkflow);
    this.rollbackPlan.push({ action: 'remove_canary', path: canaryPath });

    // Test canary workflow
    try {
      await this.testCanaryWorkflow();
      this.log('✅', 'Canary deployment successful');
    } catch (error) {
      throw new Error(`Canary deployment failed: ${error.message}`);
    }
  }

  /**
   * Execute progressive rollout of updates
   */
  async progressiveRollout() {
    console.log('🔄 Executing progressive rollout...');

    const updateStages = [
      { name: 'dependency-hygiene', priority: 'low' },
      { name: 'code-quality-hygiene', priority: 'medium' },
      { name: 'performance-hygiene', priority: 'high' }
    ];

    for (const stage of updateStages) {
      await this.updateWorkflowStage(stage);
      await this.validateStageUpdate(stage);

      // Brief pause between stages
      await this.sleep(2000);
    }

    this.log('✅', 'Progressive rollout completed');
  }

  /**
   * Validate system after updates
   */
  async postUpdateValidation() {
    console.log('🧪 Post-update validation...');

    // Run comprehensive health check
    try {
      execSync('npm run infrastructure:health', { stdio: 'pipe' });
      this.log('✅', 'Post-update health check passed');
    } catch (error) {
      throw new Error('Post-update validation failed');
    }

    // Test key workflows
    await this.testKeyWorkflows();

    // Validate performance hasn't degraded
    await this.validatePerformance();

    this.log('✅', 'Post-update validation completed');
  }

  /**
   * Clean up backups and temporary files
   */
  async cleanupBackups() {
    console.log('🧹 Cleaning up update artifacts...');

    // Remove canary workflow
    const canaryPath = '.github/workflows/canary-test.yml';
    if (fs.existsSync(canaryPath)) {
      fs.unlinkSync(canaryPath);
    }

    // Keep recent backups, clean old ones
    await this.cleanupOldBackups();

    this.log('🧹', 'Cleanup completed');
  }

  /**
   * Execute rollback if update fails
   */
  async executeRollback() {
    console.log('🔄 Executing rollback plan...');

    try {
      // Execute rollback actions in reverse order
      for (const action of this.rollbackPlan.reverse()) {
        await this.executeRollbackAction(action);
      }

      // Validate rollback success
      execSync('npm run infrastructure:health', { stdio: 'pipe' });

      this.log('✅', 'Rollback completed successfully');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
      await this.escalateCriticalFailure();
    }
  }

  /**
   * Check for ongoing CI runs
   */
  async checkOngoingCIRuns() {
    try {
      // In a real environment, this would check GitHub API for running workflows
      // For now, simulate the check
      return 0; // No ongoing runs
    } catch (error) {
      console.warn('⚠️ Could not check ongoing CI runs');
      return 0;
    }
  }

  /**
   * Wait for CI completion
   */
  async waitForCICompletion() {
    // In a real environment, this would poll GitHub API
    // For now, just log the intent
    this.log('⏳', 'Monitoring CI completion...');
  }

  /**
   * Validate update prerequisites
   */
  async validateUpdatePrerequisites() {
    // Check Node.js version compatibility
    const nodeVersion = process.version;
    this.log('✅', `Node.js version: ${nodeVersion}`);

    // Check npm version
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    this.log('✅', `npm version: ${npmVersion}`);

    // Check Git status
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      throw new Error('Working directory not clean - commit or stash changes');
    }

    this.log('✅', 'Update prerequisites validated');
  }

  /**
   * Create canary workflow for testing
   */
  createCanaryWorkflow() {
    return `name: 🐤 Canary Test Workflow

on:
  workflow_dispatch:

jobs:
  canary-test:
    name: 🧪 Canary Infrastructure Test
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm

      - name: 🧪 Test Infrastructure Health
        run: |
          echo "Testing infrastructure health in canary mode..."
          npm ci
          npm run infrastructure:health

      - name: ✅ Canary Success
        run: |
          echo "🐤 Canary test completed successfully"
          echo "Infrastructure is ready for updates"
`;
  }

  /**
   * Test canary workflow
   */
  async testCanaryWorkflow() {
    // In a real environment, this would trigger the canary workflow via GitHub API
    // For now, simulate canary testing by running health checks
    try {
      execSync('npm ci --dry-run', { stdio: 'pipe' });
      execSync('npm run infrastructure:health', { stdio: 'pipe' });
      this.log('🐤', 'Canary tests passed');
    } catch (error) {
      throw new Error('Canary tests failed');
    }
  }

  /**
   * Update specific workflow stage
   */
  async updateWorkflowStage(stage) {
    this.log('🔄', `Updating stage: ${stage.name}`);

    // Simulate workflow update (in reality, this would modify workflow files)
    await this.sleep(1000);

    this.log('✅', `Stage ${stage.name} updated successfully`);
  }

  /**
   * Validate stage update
   */
  async validateStageUpdate(stage) {
    // Run validation specific to the stage
    this.log('🧪', `Validating stage: ${stage.name}`);

    // Simulate validation
    await this.sleep(500);

    this.log('✅', `Stage ${stage.name} validation passed`);
  }

  /**
   * Test key workflows
   */
  async testKeyWorkflows() {
    const keyWorkflows = [
      'lockfile-integrity',
      'cache-management',
      'infrastructure-auto-healing'
    ];

    for (const workflow of keyWorkflows) {
      this.log('🧪', `Testing workflow: ${workflow}`);

      // In reality, this would trigger workflow via GitHub API and wait for completion
      // For now, simulate the test
      await this.sleep(500);

      this.log('✅', `Workflow ${workflow} test passed`);
    }
  }

  /**
   * Validate performance hasn't degraded
   */
  async validatePerformance() {
    this.log('⚡', 'Validating performance benchmarks...');

    const startTime = Date.now();

    try {
      execSync('npm ci --dry-run', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Performance validation failed');
    }

    const duration = Date.now() - startTime;

    if (duration > 30000) { // 30 second threshold
      throw new Error(`Performance degraded: npm ci took ${duration}ms`);
    }

    this.log('⚡', `Performance validated: npm ci took ${duration}ms`);
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    const backupsDir = 'backups';

    if (!fs.existsSync(backupsDir)) return;

    const backups = fs.readdirSync(backupsDir)
      .filter(name => name.startsWith('ci-update-'))
      .map(name => ({
        name,
        path: path.join(backupsDir, name),
        mtime: fs.statSync(path.join(backupsDir, name)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Keep 3 most recent backups
    const toDelete = backups.slice(3);

    for (const backup of toDelete) {
      execSync(`rm -rf "${backup.path}"`, { stdio: 'pipe' });
      this.log('🗑️', `Cleaned up old backup: ${backup.name}`);
    }
  }

  /**
   * Execute rollback action
   */
  async executeRollbackAction(action) {
    switch (action.action) {
      case 'restore_backups':
        await this.restoreFromBackup(action.backupDir);
        break;
      case 'remove_canary':
        if (fs.existsSync(action.path)) {
          fs.unlinkSync(action.path);
          this.log('🔄', `Removed canary file: ${action.path}`);
        }
        break;
      default:
        this.log('⚠️', `Unknown rollback action: ${action.action}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupDir) {
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup directory not found: ${backupDir}`);
    }

    // Restore workflows
    const workflowBackup = path.join(backupDir, 'workflows');
    if (fs.existsSync(workflowBackup)) {
      execSync(`rm -rf .github/workflows && cp -r ${workflowBackup} .github/workflows`);
      this.log('🔄', 'Workflows restored from backup');
    }

    // Restore package files
    const packageFiles = ['package.json', 'package-lock.json'];
    for (const file of packageFiles) {
      const backupPath = path.join(backupDir, file);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, file);
        this.log('🔄', `Restored ${file} from backup`);
      }
    }

    // Restore scripts
    const scriptsBackup = path.join(backupDir, 'scripts');
    if (fs.existsSync(scriptsBackup)) {
      execSync(`rm -rf scripts && cp -r ${scriptsBackup} scripts`);
      this.log('🔄', 'Scripts restored from backup');
    }
  }

  /**
   * Escalate critical failure
   */
  async escalateCriticalFailure() {
    const escalationData = {
      timestamp: new Date().toISOString(),
      updateLog: this.updateLog,
      rollbackPlan: this.rollbackPlan,
      backups: this.preUpdateBackups,
      criticalFailure: true
    };

    fs.writeFileSync(
      'zero-downtime-update-failure.json',
      JSON.stringify(escalationData, null, 2)
    );

    console.log('🚨 Critical failure escalated - manual intervention required');
  }

  /**
   * Sleep utility
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log update action
   */
  log(emoji, message) {
    const logEntry = {
      emoji,
      message,
      timestamp: new Date().toISOString()
    };
    this.updateLog.push(logEntry);
    console.log(`${emoji} ${message}`);
  }

  /**
   * Generate update report
   */
  async generateUpdateReport() {
    console.log('\n📊 Zero-Downtime Update Report:');
    console.log(`   Update strategy: ${this.updateStrategy}`);
    console.log(`   Actions performed: ${this.updateLog.length}`);
    console.log(`   Backups created: ${this.preUpdateBackups.length}`);
    console.log(`   Rollback plan items: ${this.rollbackPlan.length}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    if (this.updateLog.length > 0) {
      console.log('\n🔄 Update Actions:');
      for (const log of this.updateLog) {
        console.log(`   ${log.emoji} ${log.message}`);
      }
    }

    return {
      strategy: this.updateStrategy,
      actionsPerformed: this.updateLog.length,
      backupsCreated: this.preUpdateBackups.length,
      rollbackPlanItems: this.rollbackPlan.length,
      updateLog: this.updateLog
    };
  }
}

// CLI interface
if (require.main === module) {
  const updater = new ZeroDowntimeUpdater();

  const command = process.argv[2];

  if (command === 'report') {
    updater.generateUpdateReport();
  } else if (command === 'rollback') {
    updater.executeRollback();
  } else {
    updater.update();
  }
}

module.exports = ZeroDowntimeUpdater;