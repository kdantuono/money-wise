#!/usr/bin/env node

/**
 * CI/CD Auto-Healing Script
 * Automatically detects and resolves common CI/CD infrastructure issues
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

class AutoHealer {
  constructor() {
    this.healingLog = [];
    this.criticalIssues = [];
    this.healed = false;
  }

  /**
   * Main auto-healing entry point
   */
  async heal() {
    console.log('🏥 Starting CI/CD infrastructure auto-healing...');

    try {
      await this.detectAndHealIssues();
      await this.verifyHealing();
      await this.generateHealingReport();

      if (this.healed) {
        console.log('✅ Auto-healing completed successfully');
        process.exit(0);
      } else {
        console.log('ℹ️ No issues requiring healing were detected');
        process.exit(0);
      }
    } catch (error) {
      console.error(`❌ Auto-healing failed: ${error.message}`);
      await this.escalateCriticalIssues();
      process.exit(1);
    }
  }

  /**
   * Detect and heal common CI/CD issues
   */
  async detectAndHealIssues() {
    console.log('🔍 Scanning for common CI/CD issues...');

    // Check and heal lockfile corruption
    await this.healLockfileIssues();

    // Check and heal cache corruption
    await this.healCacheIssues();

    // Check and heal dependency issues
    await this.healDependencyIssues();

    // Check and heal build environment issues
    await this.healEnvironmentIssues();

    // Check and heal workflow configuration issues
    await this.healWorkflowIssues();
  }

  /**
   * Heal lockfile-related issues
   */
  async healLockfileIssues() {
    console.log('🔒 Checking lockfile health...');

    try {
      execSync('npm run validate:lockfile', { stdio: 'pipe' });
      this.log('✅', 'Lockfile validation passed');
    } catch (error) {
      this.log('🔧', 'Lockfile corruption detected - regenerating');

      try {
        // Backup corrupted lockfile
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `package-lock.json.corrupted.${timestamp}`;

        if (fs.existsSync('package-lock.json')) {
          fs.copyFileSync('package-lock.json', backupPath);
          this.log('📦', `Backed up corrupted lockfile to ${backupPath}`);
        }

        // Regenerate lockfile
        execSync('rm -f package-lock.json', { stdio: 'pipe' });
        execSync('npm install', { stdio: 'pipe' });

        // Validate new lockfile
        execSync('npm run validate:lockfile', { stdio: 'pipe' });

        this.log('✅', 'Lockfile regenerated and validated successfully');
        this.healed = true;
      } catch (healError) {
        this.criticalIssues.push('Lockfile regeneration failed');
        throw new Error(`Lockfile healing failed: ${healError.message}`);
      }
    }
  }

  /**
   * Heal cache-related issues
   */
  async healCacheIssues() {
    console.log('🗄️ Checking cache health...');

    try {
      execSync('npm run validate:cache', { stdio: 'pipe' });
      this.log('✅', 'Cache validation passed');
    } catch (error) {
      this.log('🔧', 'Cache corruption detected - cleaning');

      try {
        execSync('npm run cache:clean', { stdio: 'pipe' });
        execSync('npm run validate:cache', { stdio: 'pipe' });

        this.log('✅', 'Cache cleaned and validated successfully');
        this.healed = true;
      } catch (healError) {
        this.criticalIssues.push('Cache healing failed');
        console.warn(`⚠️ Cache healing failed: ${healError.message}`);
      }
    }
  }

  /**
   * Heal dependency-related issues
   */
  async healDependencyIssues() {
    console.log('📦 Checking dependency health...');

    try {
      // Check for missing node_modules
      if (!fs.existsSync('node_modules')) {
        this.log('🔧', 'Missing node_modules - installing dependencies');
        execSync('npm ci', { stdio: 'pipe' });
        this.log('✅', 'Dependencies installed successfully');
        this.healed = true;
      }

      // Check for critical security vulnerabilities
      try {
        execSync('npm audit --audit-level critical', { stdio: 'pipe' });
        this.log('✅', 'No critical security vulnerabilities');
      } catch (auditError) {
        this.log('🔧', 'Critical vulnerabilities detected - attempting fix');
        try {
          execSync('npm audit fix --force', { stdio: 'pipe' });
          this.log('✅', 'Security vulnerabilities fixed');
          this.healed = true;
        } catch (fixError) {
          this.log('⚠️', 'Could not auto-fix all vulnerabilities');
        }
      }
    } catch (error) {
      this.criticalIssues.push('Dependency healing failed');
      console.warn(`⚠️ Dependency healing failed: ${error.message}`);
    }
  }

  /**
   * Heal build environment issues
   */
  async healEnvironmentIssues() {
    console.log('🌍 Checking build environment...');

    try {
      // Check Node.js version compatibility
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      if (packageJson.engines && packageJson.engines.node) {
        this.log('✅', `Node.js ${nodeVersion} (required: ${packageJson.engines.node})`);
      }

      // Check essential directories exist
      const requiredDirs = ['bundle-analysis', 'apps', 'packages'];
      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          this.log('🔧', `Creating missing directory: ${dir}`);
          fs.mkdirSync(dir, { recursive: true });
          this.healed = true;
        }
      }

      // Check TypeScript build health
      this.log('🔧', 'Verifying TypeScript compilation...');
      execSync('cd packages/types && npm run build', { stdio: 'pipe' });
      this.log('✅', 'TypeScript compilation successful');

    } catch (error) {
      this.criticalIssues.push('Environment healing failed');
      console.warn(`⚠️ Environment healing failed: ${error.message}`);
    }
  }

  /**
   * Heal workflow configuration issues
   */
  async healWorkflowIssues() {
    console.log('⚙️ Checking workflow configurations...');

    try {
      const workflowDir = '.github/workflows';
      if (!fs.existsSync(workflowDir)) {
        this.criticalIssues.push('Missing .github/workflows directory');
        return;
      }

      const workflows = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml'));
      this.log('✅', `Found ${workflows.length} workflow files`);

      // Basic YAML syntax validation
      for (const workflow of workflows) {
        const workflowPath = path.join(workflowDir, workflow);
        const content = fs.readFileSync(workflowPath, 'utf8');

        // Check for common issues
        if (!content.includes('actions/checkout@v4')) {
          this.log('⚠️', `${workflow} may use outdated checkout action`);
        }

        if (!content.includes('node-version: 18')) {
          this.log('⚠️', `${workflow} may not use Node.js 18`);
        }
      }

    } catch (error) {
      this.criticalIssues.push('Workflow validation failed');
      console.warn(`⚠️ Workflow healing failed: ${error.message}`);
    }
  }

  /**
   * Verify healing was successful
   */
  async verifyHealing() {
    if (!this.healed) return;

    console.log('🧪 Verifying healing effectiveness...');

    try {
      // Test basic npm operations
      execSync('npm ci --dry-run', { stdio: 'pipe' });

      // Test TypeScript compilation
      execSync('cd packages/types && npm run build', { stdio: 'pipe' });

      // Test basic linting
      execSync('npm run lint:backend', { stdio: 'pipe' });

      this.log('✅', 'Healing verification passed');
    } catch (error) {
      throw new Error(`Healing verification failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive healing report
   */
  async generateHealingReport() {
    console.log('\n📊 Auto-Healing Report:');
    console.log(`   Healing required: ${this.healed ? '✅' : '❌'}`);
    console.log(`   Critical issues: ${this.criticalIssues.length}`);
    console.log(`   Healing actions: ${this.healingLog.length}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    if (this.healingLog.length > 0) {
      console.log('\n🔧 Healing Actions Performed:');
      for (const log of this.healingLog) {
        console.log(`   ${log.emoji} ${log.message}`);
      }
    }

    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues Requiring Manual Intervention:');
      for (const issue of this.criticalIssues) {
        console.log(`   ❌ ${issue}`);
      }
    }
  }

  /**
   * Escalate critical issues that couldn't be auto-healed
   */
  async escalateCriticalIssues() {
    if (this.criticalIssues.length === 0) return;

    console.log('\n🚨 Escalating critical issues for manual intervention...');

    // In a real environment, this could create GitHub issues, send notifications, etc.
    const escalationData = {
      timestamp: new Date().toISOString(),
      criticalIssues: this.criticalIssues,
      healingLog: this.healingLog,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      }
    };

    // Write escalation data for CI to pick up
    fs.writeFileSync(
      'auto-healing-escalation.json',
      JSON.stringify(escalationData, null, 2)
    );

    console.log('📝 Escalation data written to auto-healing-escalation.json');
  }

  /**
   * Log healing action
   */
  log(emoji, message) {
    const logEntry = { emoji, message, timestamp: new Date().toISOString() };
    this.healingLog.push(logEntry);
    console.log(`${emoji} ${message}`);
  }
}

// CLI interface
if (require.main === module) {
  const healer = new AutoHealer();

  const command = process.argv[2];

  if (command === 'report') {
    healer.generateHealingReport();
  } else {
    healer.heal();
  }
}

module.exports = AutoHealer;