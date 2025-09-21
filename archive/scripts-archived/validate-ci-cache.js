#!/usr/bin/env node

/**
 * CI Cache Validation Script
 * Validates and repairs corrupted npm cache in CI environments
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class CacheValidator {
  constructor() {
    this.npmCacheDir = this.getNpmCacheDir();
    this.packageLockPath = path.join(process.cwd(), 'package-lock.json');
  }

  /**
   * Get npm cache directory
   */
  getNpmCacheDir() {
    try {
      return execSync('npm config get cache', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.warn('⚠️ Could not determine npm cache directory');
      return null;
    }
  }

  /**
   * Main cache validation entry point
   */
  async validate() {
    console.log('🔍 Starting CI cache validation...');

    try {
      await this.validateCacheHealth();
      await this.validateCacheConsistency();
      await this.optimizeCache();

      console.log('✅ Cache validation passed - cache is healthy');
      process.exit(0);
    } catch (error) {
      console.error(`❌ Cache validation failed: ${error.message}`);
      console.error('🔧 Attempting cache recovery...');

      await this.recoverCache();
      process.exit(1);
    }
  }

  /**
   * Validate overall cache health
   */
  async validateCacheHealth() {
    if (!this.npmCacheDir || !fs.existsSync(this.npmCacheDir)) {
      throw new Error('npm cache directory not found');
    }

    console.log(`📦 Cache directory: ${this.npmCacheDir}`);

    // Check cache size (warn if >2GB, fail if >5GB)
    const cacheSize = this.getCacheSize();
    console.log(`💾 Cache size: ${this.formatBytes(cacheSize)}`);

    if (cacheSize > 5 * 1024 * 1024 * 1024) {
      throw new Error('Cache size exceeds 5GB - corruption likely');
    }

    if (cacheSize > 2 * 1024 * 1024 * 1024) {
      console.warn('⚠️ Cache size >2GB - consider cleanup');
    }

    console.log('📊 Cache health check passed');
  }

  /**
   * Validate cache consistency with lockfile
   */
  async validateCacheConsistency() {
    if (!fs.existsSync(this.packageLockPath)) {
      console.log('📋 No lockfile found - skipping consistency check');
      return;
    }

    console.log('🔗 Validating cache consistency...');

    try {
      // Test npm ci --dry-run to check cache validity
      execSync('npm ci --dry-run --cache-min 999999', {
        stdio: 'pipe',
        timeout: 30000
      });

      console.log('✅ Cache consistency validated');
    } catch (error) {
      throw new Error('Cache inconsistent with lockfile');
    }
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache() {
    console.log('⚡ Optimizing cache...');

    try {
      // Verify cache integrity
      execSync('npm cache verify', { stdio: 'pipe', timeout: 30000 });
      console.log('🔍 Cache integrity verified');
    } catch (error) {
      console.warn('⚠️ Cache verification failed - may need cleanup');
    }
  }

  /**
   * Recover corrupted cache
   */
  async recoverCache() {
    console.log('🔧 Attempting cache recovery...');

    try {
      // Step 1: Clean cache completely
      console.log('🧹 Cleaning cache...');
      execSync('npm cache clean --force', { stdio: 'inherit' });

      // Step 2: Verify cache is clean
      execSync('npm cache verify', { stdio: 'inherit' });

      // Step 3: Test installation
      console.log('🧪 Testing cache recovery...');
      execSync('npm ci --dry-run', { stdio: 'pipe', timeout: 60000 });

      console.log('✅ Cache recovery successful');
    } catch (error) {
      console.error('❌ Cache recovery failed:', error.message);
      throw new Error('Manual cache intervention required');
    }
  }

  /**
   * Get cache directory size
   */
  getCacheSize() {
    if (!this.npmCacheDir || !fs.existsSync(this.npmCacheDir)) {
      return 0;
    }

    try {
      const output = execSync(`du -sb "${this.npmCacheDir}"`, { encoding: 'utf8' });
      return parseInt(output.split('\t')[0]);
    } catch (error) {
      console.warn('⚠️ Could not determine cache size');
      return 0;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate cache health report
   */
  async generateHealthReport() {
    const cacheSize = this.getCacheSize();

    const stats = {
      cacheDirectory: this.npmCacheDir,
      cacheSize: cacheSize,
      cacheSizeFormatted: this.formatBytes(cacheSize),
      cacheHealthy: cacheSize > 0 && cacheSize < 2 * 1024 * 1024 * 1024,
      timestamp: new Date().toISOString()
    };

    console.log('\n📊 Cache Health Report:');
    console.log(`   Directory: ${stats.cacheDirectory}`);
    console.log(`   Size: ${stats.cacheSizeFormatted}`);
    console.log(`   Healthy: ${stats.cacheHealthy ? '✅' : '⚠️'}`);
    console.log(`   Timestamp: ${stats.timestamp}`);

    return stats;
  }
}

// CLI interface
if (require.main === module) {
  const validator = new CacheValidator();

  const command = process.argv[2];

  if (command === 'report') {
    validator.generateHealthReport();
  } else if (command === 'clean') {
    validator.recoverCache();
  } else {
    validator.validate();
  }
}

module.exports = CacheValidator;