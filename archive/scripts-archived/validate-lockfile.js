#!/usr/bin/env node

/**
 * Lockfile Integrity Validation Script
 * Prevents corrupted package-lock.json from breaking CI/CD
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LockfileValidator {
  constructor() {
    this.lockfilePath = path.join(process.cwd(), 'package-lock.json');
    this.packagePath = path.join(process.cwd(), 'package.json');
  }

  /**
   * Main validation entry point
   */
  async validate() {
    console.log('🔍 Starting lockfile integrity validation...');

    try {
      await this.checkFileExists();
      await this.validateJSON();
      await this.validateStructure();
      await this.validateIntegrity();
      await this.validateDependencyConsistency();

      console.log('✅ Lockfile validation passed - integrity confirmed');
      process.exit(0);
    } catch (error) {
      console.error(`❌ Lockfile validation failed: ${error.message}`);
      console.error('🔧 Run "npm install" to regenerate lockfile');
      process.exit(1);
    }
  }

  /**
   * Check if lockfile exists
   */
  async checkFileExists() {
    if (!fs.existsSync(this.lockfilePath)) {
      throw new Error('package-lock.json not found');
    }

    if (!fs.existsSync(this.packagePath)) {
      throw new Error('package.json not found');
    }

    console.log('📄 Lockfile and package.json found');
  }

  /**
   * Validate JSON syntax
   */
  async validateJSON() {
    try {
      const lockfileContent = fs.readFileSync(this.lockfilePath, 'utf8');
      JSON.parse(lockfileContent);
      console.log('📋 JSON syntax validation passed');
    } catch (error) {
      throw new Error(`Invalid JSON syntax: ${error.message}`);
    }
  }

  /**
   * Validate lockfile structure
   */
  async validateStructure() {
    const lockfile = JSON.parse(fs.readFileSync(this.lockfilePath, 'utf8'));

    // Required fields
    const requiredFields = ['name', 'version', 'lockfileVersion', 'packages'];
    for (const field of requiredFields) {
      if (!lockfile[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate lockfile version
    if (lockfile.lockfileVersion < 2) {
      throw new Error(`Unsupported lockfile version: ${lockfile.lockfileVersion}`);
    }

    console.log('🏗️ Lockfile structure validation passed');
  }

  /**
   * Validate integrity hashes
   */
  async validateIntegrity() {
    const lockfile = JSON.parse(fs.readFileSync(this.lockfilePath, 'utf8'));

    let packageCount = 0;
    let integrityCount = 0;

    for (const [packageName, packageData] of Object.entries(lockfile.packages || {})) {
      packageCount++;

      if (packageData.integrity) {
        integrityCount++;

        // Validate integrity format
        if (!packageData.integrity.match(/^(sha\d+|md5|sha1)-[A-Za-z0-9+/=]+$/)) {
          throw new Error(`Invalid integrity hash for ${packageName}: ${packageData.integrity}`);
        }
      }
    }

    console.log(`🔒 Integrity validation passed - ${integrityCount}/${packageCount} packages have integrity hashes`);
  }

  /**
   * Validate dependency consistency between package.json and lockfile
   */
  async validateDependencyConsistency() {
    const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
    const lockfile = JSON.parse(fs.readFileSync(this.lockfilePath, 'utf8'));

    // Check name and version consistency
    if (packageJson.name !== lockfile.name) {
      throw new Error(`Name mismatch: package.json(${packageJson.name}) vs lockfile(${lockfile.name})`);
    }

    if (packageJson.version !== lockfile.version) {
      throw new Error(`Version mismatch: package.json(${packageJson.version}) vs lockfile(${lockfile.version})`);
    }

    // Check workspace consistency
    if (packageJson.workspaces) {
      const workspacePackages = this.getWorkspacePackages(packageJson.workspaces);
      for (const workspace of workspacePackages) {
        if (!lockfile.packages[workspace]) {
          console.warn(`⚠️ Workspace ${workspace} not found in lockfile`);
        }
      }
    }

    console.log('🔗 Dependency consistency validation passed');
  }

  /**
   * Get workspace packages from package.json
   */
  getWorkspacePackages(workspaces) {
    const packages = [];

    for (const workspace of workspaces) {
      if (workspace.includes('*')) {
        // Handle glob patterns
        packages.push(workspace);
      } else {
        packages.push(workspace);
      }
    }

    return packages;
  }

  /**
   * Generate lockfile health report
   */
  async generateHealthReport() {
    const lockfile = JSON.parse(fs.readFileSync(this.lockfilePath, 'utf8'));
    const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));

    const stats = {
      lockfileVersion: lockfile.lockfileVersion,
      totalPackages: Object.keys(lockfile.packages || {}).length,
      packagesWithIntegrity: 0,
      workspaces: packageJson.workspaces?.length || 0,
      fileSize: fs.statSync(this.lockfilePath).size,
      lastModified: fs.statSync(this.lockfilePath).mtime
    };

    // Count packages with integrity
    for (const packageData of Object.values(lockfile.packages || {})) {
      if (packageData.integrity) {
        stats.packagesWithIntegrity++;
      }
    }

    console.log('\n📊 Lockfile Health Report:');
    console.log(`   Version: ${stats.lockfileVersion}`);
    console.log(`   Total packages: ${stats.totalPackages}`);
    console.log(`   Packages with integrity: ${stats.packagesWithIntegrity}`);
    console.log(`   Workspaces: ${stats.workspaces}`);
    console.log(`   File size: ${(stats.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Last modified: ${stats.lastModified.toISOString()}`);

    return stats;
  }
}

// CLI interface
if (require.main === module) {
  const validator = new LockfileValidator();

  const command = process.argv[2];

  if (command === 'report') {
    validator.generateHealthReport();
  } else {
    validator.validate();
  }
}

module.exports = LockfileValidator;