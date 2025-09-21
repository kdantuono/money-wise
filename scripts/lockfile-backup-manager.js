#!/usr/bin/env node

/**
 * MoneyWise Lockfile Backup Manager
 *
 * Automated backup management system for package-lock.json with
 * validation, rotation, and emergency restoration capabilities.
 *
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class LockfileBackupManager {
  constructor() {
    this.config = {
      backupDir: '.lockfile-backups',
      maxBackups: 5,
      validationTimeout: 30000, // 30 seconds
      compressionEnabled: true,
      autoCleanup: true
    };

    this.backupTypes = {
      MANUAL: 'manual',
      AUTO: 'auto',
      SUCCESS: 'success',
      EMERGENCY: 'emergency',
      PRE_REPAIR: 'pre-repair'
    };
  }

  /**
   * Create a backup of the current lockfile
   */
  async createBackup(type = this.backupTypes.AUTO, metadata = {}) {
    try {
      console.log(`💾 Creating ${type} backup...`);

      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Validate current lockfile
      const validation = await this.validateLockfile('package-lock.json');
      if (!validation.valid && type !== this.backupTypes.EMERGENCY) {
        console.warn('⚠️ Warning: Current lockfile is invalid, skipping backup');
        return null;
      }

      // Generate backup info
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `${type}-${timestamp}`;
      const backupPath = path.join(this.config.backupDir, backupId);

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      // Copy files
      await this.copyFile('package-lock.json', path.join(backupPath, 'package-lock.json'));
      await this.copyFile('package.json', path.join(backupPath, 'package.json'));

      // Create metadata
      const backupMetadata = {
        id: backupId,
        type,
        timestamp: new Date().toISOString(),
        validation,
        checksum: await this.calculateChecksum('package-lock.json'),
        nodeVersion: process.version,
        npmVersion: this.getNpmVersion(),
        gitCommit: this.getGitCommit(),
        ...metadata
      };

      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(backupMetadata, null, 2)
      );

      console.log(`✅ Backup created: ${backupId}`);
      console.log(`📁 Location: ${backupPath}`);

      // Auto-cleanup if enabled
      if (this.config.autoCleanup) {
        await this.cleanupOldBackups();
      }

      return {
        id: backupId,
        path: backupPath,
        metadata: backupMetadata
      };

    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate lockfile integrity
   */
  async validateLockfile(lockfilePath) {
    const validation = {
      valid: false,
      exists: false,
      validJson: false,
      hasRequiredFields: false,
      sizeOk: false,
      issues: []
    };

    try {
      // Check existence
      await fs.access(lockfilePath);
      validation.exists = true;

      // Read and parse
      const content = await fs.readFile(lockfilePath, 'utf8');
      const lockfile = JSON.parse(content);
      validation.validJson = true;

      // Check size
      if (content.length > 50) {
        validation.sizeOk = true;
      } else {
        validation.issues.push('File too small (possible truncation)');
      }

      // Check required fields
      if (lockfile.packages || lockfile.dependencies) {
        validation.hasRequiredFields = true;
      } else {
        validation.issues.push('Missing required fields (packages or dependencies)');
      }

      // Overall validation
      validation.valid = validation.exists &&
                        validation.validJson &&
                        validation.hasRequiredFields &&
                        validation.sizeOk;

    } catch (error) {
      if (error.code === 'ENOENT') {
        validation.issues.push('File does not exist');
      } else if (error instanceof SyntaxError) {
        validation.issues.push('Invalid JSON syntax');
      } else {
        validation.issues.push(`Validation error: ${error.message}`);
      }
    }

    return validation;
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      await fs.access(this.config.backupDir);
      const backups = await fs.readdir(this.config.backupDir);

      const backupInfo = [];
      for (const backup of backups) {
        const backupPath = path.join(this.config.backupDir, backup);
        const metadataPath = path.join(backupPath, 'metadata.json');

        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          const stats = await fs.stat(path.join(backupPath, 'package-lock.json'));

          backupInfo.push({
            id: backup,
            path: backupPath,
            metadata,
            size: stats.size,
            created: new Date(metadata.timestamp)
          });
        } catch (error) {
          console.warn(`⚠️ Could not read metadata for backup ${backup}:`, error.message);
        }
      }

      // Sort by creation date (newest first)
      return backupInfo.sort((a, b) => b.created - a.created);

    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Restore from a specific backup
   */
  async restoreFromBackup(backupId) {
    try {
      console.log(`🔄 Restoring from backup: ${backupId}`);

      const backupPath = path.join(this.config.backupDir, backupId);
      const lockfilePath = path.join(backupPath, 'package-lock.json');
      const packageJsonPath = path.join(backupPath, 'package.json');

      // Validate backup exists
      await fs.access(backupPath);
      await fs.access(lockfilePath);

      // Validate backup integrity
      const validation = await this.validateLockfile(lockfilePath);
      if (!validation.valid) {
        throw new Error(`Backup ${backupId} is corrupted: ${validation.issues.join(', ')}`);
      }

      // Create emergency backup of current state
      console.log('💾 Creating emergency backup of current state...');
      await this.createBackup(this.backupTypes.EMERGENCY, {
        restoreOperation: true,
        sourceBackup: backupId
      });

      // Restore files
      await this.copyFile(lockfilePath, 'package-lock.json');

      // Optionally restore package.json if it exists in backup
      try {
        await fs.access(packageJsonPath);
        await this.copyFile(packageJsonPath, 'package.json');
        console.log('📄 Restored package.json from backup');
      } catch (error) {
        console.log('ℹ️ package.json not found in backup, keeping current version');
      }

      // Verify restoration
      const postRestoreValidation = await this.validateLockfile('package-lock.json');
      if (!postRestoreValidation.valid) {
        throw new Error('Restoration failed - restored lockfile is invalid');
      }

      console.log(`✅ Successfully restored from backup: ${backupId}`);

      // Test installation
      console.log('🧪 Testing installation with restored lockfile...');
      await this.testInstallation();

      return {
        success: true,
        backupId,
        validation: postRestoreValidation
      };

    } catch (error) {
      console.error('❌ Restoration failed:', error.message);
      throw error;
    }
  }

  /**
   * Find the best available backup for restoration
   */
  async findBestBackup() {
    const backups = await this.listBackups();

    if (backups.length === 0) {
      return null;
    }

    // Priority order: success > auto > manual > emergency
    const priorityOrder = [
      this.backupTypes.SUCCESS,
      this.backupTypes.AUTO,
      this.backupTypes.MANUAL,
      this.backupTypes.EMERGENCY
    ];

    for (const type of priorityOrder) {
      const backup = backups.find(b => b.metadata.type === type && b.metadata.validation.valid);
      if (backup) {
        return backup;
      }
    }

    // Fallback to any valid backup
    return backups.find(b => b.metadata.validation.valid) || null;
  }

  /**
   * Automated emergency restoration
   */
  async emergencyRestore() {
    try {
      console.log('🚨 Starting emergency restoration...');

      const bestBackup = await this.findBestBackup();
      if (!bestBackup) {
        throw new Error('No valid backups available for emergency restoration');
      }

      console.log(`🎯 Selected backup: ${bestBackup.id} (${bestBackup.metadata.type})`);
      return await this.restoreFromBackup(bestBackup.id);

    } catch (error) {
      console.error('❌ Emergency restoration failed:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup old backups (keep most recent N)
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();

      if (backups.length <= this.config.maxBackups) {
        return;
      }

      const toDelete = backups.slice(this.config.maxBackups);
      console.log(`🧹 Cleaning up ${toDelete.length} old backups...`);

      for (const backup of toDelete) {
        await fs.rmdir(backup.path, { recursive: true });
        console.log(`🗑️ Deleted backup: ${backup.id}`);
      }

      console.log('✅ Backup cleanup completed');

    } catch (error) {
      console.error('⚠️ Backup cleanup failed:', error.message);
    }
  }

  /**
   * Generate backup health report
   */
  async generateHealthReport() {
    try {
      const backups = await this.listBackups();
      const currentValidation = await this.validateLockfile('package-lock.json');

      const report = {
        timestamp: new Date().toISOString(),
        current_lockfile: currentValidation,
        backup_summary: {
          total_backups: backups.length,
          valid_backups: backups.filter(b => b.metadata.validation.valid).length,
          types: {}
        },
        backups: backups.map(b => ({
          id: b.id,
          type: b.metadata.type,
          created: b.metadata.timestamp,
          valid: b.metadata.validation.valid,
          size: b.size,
          issues: b.metadata.validation.issues
        }))
      };

      // Count by type
      for (const backup of backups) {
        const type = backup.metadata.type;
        report.backup_summary.types[type] = (report.backup_summary.types[type] || 0) + 1;
      }

      return report;

    } catch (error) {
      console.error('❌ Health report generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  async ensureBackupDirectory() {
    await fs.mkdir(this.config.backupDir, { recursive: true });
  }

  async copyFile(src, dest) {
    const content = await fs.readFile(src);
    await fs.writeFile(dest, content);
  }

  async calculateChecksum(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  getNpmVersion() {
    try {
      return execSync('npm --version', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getGitCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  async testInstallation() {
    try {
      execSync('npm ci --dry-run', { stdio: 'inherit', timeout: this.config.validationTimeout });
      console.log('✅ Installation test passed');
      return true;
    } catch (error) {
      console.warn('⚠️ Installation test failed:', error.message);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const manager = new LockfileBackupManager();
  const command = process.argv[2];
  const arg = process.argv[3];

  async function main() {
    try {
      switch (command) {
        case 'create':
          const type = arg || 'manual';
          const backup = await manager.createBackup(type);
          console.log(`\n✅ Backup created: ${backup.id}`);
          break;

        case 'list':
          const backups = await manager.listBackups();
          console.log(`\n📂 Available backups (${backups.length}):\n`);
          backups.forEach(backup => {
            const status = backup.metadata.validation.valid ? '✅' : '❌';
            const age = Math.round((Date.now() - backup.created) / (1000 * 60 * 60)) + 'h ago';
            console.log(`${status} ${backup.id} (${backup.metadata.type}) - ${age}`);
          });
          break;

        case 'restore':
          if (!arg) {
            console.error('❌ Usage: restore <backup-id>');
            process.exit(1);
          }
          await manager.restoreFromBackup(arg);
          break;

        case 'emergency':
          await manager.emergencyRestore();
          break;

        case 'cleanup':
          await manager.cleanupOldBackups();
          break;

        case 'health':
          const report = await manager.generateHealthReport();
          console.log('\n📊 Backup Health Report:\n');
          console.log(JSON.stringify(report, null, 2));
          break;

        case 'validate':
          const validation = await manager.validateLockfile('package-lock.json');
          console.log('\n🔍 Lockfile Validation:\n');
          console.log(JSON.stringify(validation, null, 2));
          break;

        default:
          console.log(`
📦 Lockfile Backup Manager

Usage:
  create [type]     Create backup (auto, manual, success, emergency)
  list             List all available backups
  restore <id>     Restore from specific backup
  emergency        Emergency restore from best available backup
  cleanup          Remove old backups
  health           Generate health report
  validate         Validate current lockfile

Examples:
  node lockfile-backup-manager.js create manual
  node lockfile-backup-manager.js list
  node lockfile-backup-manager.js restore success-2024-01-01T10-00-00
  node lockfile-backup-manager.js emergency
`);
      }
    } catch (error) {
      console.error('❌ Command failed:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = LockfileBackupManager;