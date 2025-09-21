#!/usr/bin/env node

/**
 * MoneyWise Alert Manager
 *
 * Centralized alert management system with multiple notification channels
 * and intelligent alert routing and escalation.
 *
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class AlertManager {
  constructor() {
    this.config = {
      channels: {
        console: { enabled: true },
        github: { enabled: true },
        webhook: { enabled: false, url: process.env.WEBHOOK_URL },
        email: { enabled: false, smtp: process.env.SMTP_CONFIG }
      },
      escalation: {
        critical: {
          immediate: ['console', 'github'],
          after_5min: ['webhook'],
          after_15min: ['email']
        },
        warning: {
          immediate: ['console'],
          after_30min: ['github']
        },
        info: {
          immediate: ['console']
        }
      },
      rateLimit: {
        critical: 60000, // 1 minute
        warning: 300000, // 5 minutes
        info: 600000 // 10 minutes
      }
    };

    this.alertHistory = [];
    this.rateLimitCache = new Map();
  }

  /**
   * Send alert through appropriate channels
   */
  async sendAlert(alert) {
    try {
      // Validate alert
      if (!this.validateAlert(alert)) {
        console.error('❌ Invalid alert format:', alert);
        return false;
      }

      // Check rate limiting
      if (this.isRateLimited(alert)) {
        console.log(`⏸️ Alert rate limited: ${alert.type} - ${alert.message}`);
        return false;
      }

      // Normalize alert
      const normalizedAlert = this.normalizeAlert(alert);

      // Store in history
      this.alertHistory.push(normalizedAlert);

      // Get escalation plan
      const escalationPlan = this.config.escalation[alert.severity] ||
                            this.config.escalation.info;

      // Send immediate alerts
      await this.sendImmediateAlerts(normalizedAlert, escalationPlan.immediate);

      // Schedule escalated alerts
      this.scheduleEscalatedAlerts(normalizedAlert, escalationPlan);

      // Update rate limit
      this.updateRateLimit(normalizedAlert);

      console.log(`✅ Alert sent: ${alert.severity} - ${alert.message}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send alert:', error.message);
      return false;
    }
  }

  /**
   * Validate alert format
   */
  validateAlert(alert) {
    return alert &&
           typeof alert.message === 'string' &&
           ['critical', 'warning', 'info'].includes(alert.severity) &&
           alert.timestamp;
  }

  /**
   * Check if alert is rate limited
   */
  isRateLimited(alert) {
    const key = `${alert.severity}_${alert.type || 'default'}`;
    const lastSent = this.rateLimitCache.get(key);
    const limit = this.config.rateLimit[alert.severity] || this.config.rateLimit.info;

    if (lastSent && (Date.now() - lastSent) < limit) {
      return true;
    }

    return false;
  }

  /**
   * Normalize alert format
   */
  normalizeAlert(alert) {
    return {
      id: this.generateAlertId(),
      timestamp: alert.timestamp || new Date().toISOString(),
      severity: alert.severity,
      type: alert.type || 'general',
      message: alert.message,
      details: alert.details || {},
      source: alert.source || 'ci-health-monitor',
      status: 'active'
    };
  }

  /**
   * Send immediate alerts
   */
  async sendImmediateAlerts(alert, channels) {
    const promises = channels
      .filter(channel => this.config.channels[channel]?.enabled)
      .map(channel => this.sendToChannel(alert, channel));

    await Promise.allSettled(promises);
  }

  /**
   * Schedule escalated alerts
   */
  scheduleEscalatedAlerts(alert, escalationPlan) {
    // Schedule after_5min alerts
    if (escalationPlan.after_5min) {
      setTimeout(async () => {
        await this.sendImmediateAlerts(alert, escalationPlan.after_5min);
      }, 300000); // 5 minutes
    }

    // Schedule after_15min alerts
    if (escalationPlan.after_15min) {
      setTimeout(async () => {
        await this.sendImmediateAlerts(alert, escalationPlan.after_15min);
      }, 900000); // 15 minutes
    }

    // Schedule after_30min alerts
    if (escalationPlan.after_30min) {
      setTimeout(async () => {
        await this.sendImmediateAlerts(alert, escalationPlan.after_30min);
      }, 1800000); // 30 minutes
    }
  }

  /**
   * Send alert to specific channel
   */
  async sendToChannel(alert, channel) {
    try {
      switch (channel) {
        case 'console':
          await this.sendToConsole(alert);
          break;
        case 'github':
          await this.sendToGitHub(alert);
          break;
        case 'webhook':
          await this.sendToWebhook(alert);
          break;
        case 'email':
          await this.sendToEmail(alert);
          break;
        default:
          console.warn(`⚠️ Unknown alert channel: ${channel}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send to ${channel}:`, error.message);
    }
  }

  /**
   * Send alert to console
   */
  async sendToConsole(alert) {
    const severityIcons = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const icon = severityIcons[alert.severity] || '📢';
    const timestamp = new Date(alert.timestamp).toLocaleString();

    console.log(`\n${icon} ALERT [${alert.severity.toUpperCase()}]`);
    console.log(`📅 Time: ${timestamp}`);
    console.log(`🏷️ Type: ${alert.type}`);
    console.log(`💬 Message: ${alert.message}`);

    if (alert.details && Object.keys(alert.details).length > 0) {
      console.log(`📋 Details:`);
      Object.entries(alert.details).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    console.log(`🆔 Alert ID: ${alert.id}\n`);
  }

  /**
   * Send alert to GitHub (create issue)
   */
  async sendToGitHub(alert) {
    // This would integrate with GitHub API to create issues
    // For now, just log the intent
    console.log(`📝 GitHub alert queued: ${alert.severity} - ${alert.message}`);

    // In a full implementation, this would:
    // 1. Check if similar issue already exists
    // 2. Create new issue or update existing
    // 3. Apply appropriate labels and assignees
    // 4. Set priority based on severity
  }

  /**
   * Send alert to webhook
   */
  async sendToWebhook(alert) {
    if (!this.config.channels.webhook.url) {
      console.log('⏸️ Webhook URL not configured, skipping webhook alert');
      return;
    }

    const payload = {
      timestamp: alert.timestamp,
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      details: alert.details,
      source: 'moneywise-ci-health'
    };

    console.log(`🔗 Webhook alert queued: ${JSON.stringify(payload)}`);

    // In a full implementation, this would make HTTP POST request
    // fetch(this.config.channels.webhook.url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
  }

  /**
   * Send alert to email
   */
  async sendToEmail(alert) {
    console.log(`📧 Email alert queued: ${alert.severity} - ${alert.message}`);

    // In a full implementation, this would:
    // 1. Format alert as HTML email
    // 2. Send via SMTP
    // 3. Handle delivery confirmation
  }

  /**
   * Update rate limit cache
   */
  updateRateLimit(alert) {
    const key = `${alert.severity}_${alert.type}`;
    this.rateLimitCache.set(key, Date.now());
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(timeWindow = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const recentAlerts = this.alertHistory.filter(
      alert => new Date(alert.timestamp).getTime() > cutoff
    );

    const stats = {
      total: recentAlerts.length,
      critical: recentAlerts.filter(a => a.severity === 'critical').length,
      warning: recentAlerts.filter(a => a.severity === 'warning').length,
      info: recentAlerts.filter(a => a.severity === 'info').length,
      byType: {}
    };

    // Count by type
    recentAlerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Save alert history to file
   */
  async saveAlertHistory() {
    try {
      const historyFile = path.join(__dirname, '../alert-history.json');
      const data = {
        alerts: this.alertHistory.slice(-1000), // Keep last 1000 alerts
        stats: this.getAlertStats(),
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(historyFile, JSON.stringify(data, null, 2));
      console.log(`💾 Alert history saved (${data.alerts.length} alerts)`);
    } catch (error) {
      console.error('❌ Failed to save alert history:', error.message);
    }
  }

  /**
   * Load alert history from file
   */
  async loadAlertHistory() {
    try {
      const historyFile = path.join(__dirname, '../alert-history.json');
      const data = await fs.readFile(historyFile, 'utf8');
      const parsed = JSON.parse(data);

      this.alertHistory = parsed.alerts || [];
      console.log(`📂 Loaded ${this.alertHistory.length} alerts from history`);
    } catch (error) {
      console.log('📝 No alert history found, starting fresh');
      this.alertHistory = [];
    }
  }
}

// CLI interface for testing
if (require.main === module) {
  const alertManager = new AlertManager();

  // Load existing history
  alertManager.loadAlertHistory().then(() => {
    // Test alerts
    console.log('🧪 Testing Alert Manager...\n');

    // Test different severity levels
    const testAlerts = [
      {
        severity: 'info',
        type: 'test',
        message: 'Alert manager test - info level',
        timestamp: new Date().toISOString()
      },
      {
        severity: 'warning',
        type: 'test',
        message: 'Alert manager test - warning level',
        details: { component: 'test-runner' },
        timestamp: new Date().toISOString()
      },
      {
        severity: 'critical',
        type: 'test',
        message: 'Alert manager test - critical level',
        details: { component: 'health-monitor', failureRate: '45%' },
        timestamp: new Date().toISOString()
      }
    ];

    // Send test alerts
    Promise.all(testAlerts.map(alert => alertManager.sendAlert(alert)))
      .then(() => {
        console.log('\n📊 Alert Statistics:');
        console.log(JSON.stringify(alertManager.getAlertStats(), null, 2));

        return alertManager.saveAlertHistory();
      })
      .then(() => {
        console.log('\n✅ Alert Manager testing completed');
      })
      .catch(error => {
        console.error('❌ Alert Manager test failed:', error.message);
      });
  });
}

module.exports = AlertManager;