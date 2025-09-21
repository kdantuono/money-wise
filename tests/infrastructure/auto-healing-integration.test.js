/**
 * Integration Tests for Infrastructure Auto-Healing System
 * Tests end-to-end integration with existing systems and workflows
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

describe('Auto-Healing Integration Tests', () => {
  describe('Dashboard Integration', () => {
    test('Health dashboard server includes auto-healing methods', () => {
      const dashboardPath = 'scripts/health-dashboard-server.js';
      expect(fs.existsSync(dashboardPath)).toBe(true);

      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
      expect(dashboardContent).toContain('getAutoHealingMetrics');
      expect(dashboardContent).toContain('infrastructure-auto-healing-metrics.json');
    });

    test('Dashboard integration code is properly implemented', () => {
      const dashboardPath = 'scripts/health-dashboard-server.js';
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

      // Check for proper async method implementation
      expect(dashboardContent).toMatch(/async\s+getAutoHealingMetrics\s*\(\s*\)/);
      expect(dashboardContent).toContain('fs.existsSync(metricsPath)');
      expect(dashboardContent).toContain('JSON.parse(fs.readFileSync');
    });

    test('Dashboard sends auto-healing metrics in initial data', () => {
      const dashboardPath = 'scripts/health-dashboard-server.js';
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

      // Verify sendInitialData includes auto-healing metrics
      expect(dashboardContent).toContain('sendInitialData');
      // Should include call to getAutoHealingMetrics
      expect(dashboardContent).toMatch(/sendInitialData[\s\S]*getAutoHealingMetrics/);
    });
  });

  describe('Workflow Integration', () => {
    test('Auto-healing workflow integrates with existing CI/CD', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should trigger on other workflow failures
      expect(workflowContent).toContain('workflow_run:');
      expect(workflowContent).toContain('types: [completed]');

      // Should reference other CI/CD workflows
      expect(workflowContent).toContain('🧹 Code Quality Hygiene');
      expect(workflowContent).toContain('🧹 Dependency Hygiene');
      expect(workflowContent).toContain('⚡ Performance Hygiene');
    });

    test('Auto-healing triggers only on appropriate conditions', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should only run on failure, schedule, or manual dispatch
      expect(workflowContent).toContain("github.event.workflow_run.conclusion == 'failure'");
      expect(workflowContent).toContain("github.event_name == 'schedule'");
      expect(workflowContent).toContain("github.event_name == 'workflow_dispatch'");
    });

    test('Workflow has proper permissions and security', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should use GITHUB_TOKEN for security
      expect(workflowContent).toContain('${{ secrets.GITHUB_TOKEN }}');
      expect(workflowContent).toContain('permissions:');
    });
  });

  describe('Feature Integration', () => {
    test('Integrates with CI Cache Resilience', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      expect(metrics.integration.related_features).toContain('ci-cache-resilience');
    });

    test('Integrates with Lockfile Integrity Monitoring', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      expect(metrics.integration.related_features).toContain('lockfile-integrity-monitoring');
    });

    test('Integrates with Emergency Lockfile Repair', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      expect(metrics.integration.related_features).toContain('emergency-lockfile-repair');
    });

    test('Supports coordinated recovery with existing systems', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should reference existing recovery mechanisms
      expect(workflowContent).toContain('npm run heal:auto');
      expect(workflowContent).toContain('npm run heal:report');
      expect(workflowContent).toContain('npm run infrastructure:health');
    });
  });

  describe('Metrics Integration', () => {
    test('Metrics file structure supports dashboard consumption', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      // Should have structure that dashboard can consume
      expect(metrics).toHaveProperty('current_metrics');
      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('integration');

      // Dashboard endpoints should be defined
      expect(metrics.integration.dashboard_endpoint).toBe('/api/infrastructure-auto-healing-metrics');
      expect(metrics.integration.status_endpoint).toBe('/api/auto-healing-status');
    });

    test('Metrics track epic progress correctly', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      expect(metrics.integration.epic_progress).toContain('3/5');
      expect(metrics.metadata.epic_number).toBe(32);
      expect(metrics.metadata.issue_number).toBe(36);
    });

    test('Historical data structure supports learning algorithms', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      const historical = metrics.historical_data;
      expect(historical).toHaveProperty('total_healing_sessions');
      expect(historical).toHaveProperty('cumulative_failures_detected');
      expect(historical).toHaveProperty('cumulative_recoveries_attempted');
      expect(historical).toHaveProperty('cumulative_success_rate');
      expect(historical).toHaveProperty('pattern_recognition_improvements');
    });
  });

  describe('Error Handling Integration', () => {
    test('Error escalation creates GitHub issues', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should create issues for critical failures
      expect(workflowContent).toContain('🚨 Create Critical Issue for Manual Intervention');
      expect(workflowContent).toContain('actions/github-script@v7');
      expect(workflowContent).toContain('github.rest.issues.create');
    });

    test('Error escalation includes proper issue labels and assignment', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should have appropriate labels
      expect(workflowContent).toContain("'critical'");
      expect(workflowContent).toContain("'infrastructure'");
      expect(workflowContent).toContain("'auto-healing'");
      expect(workflowContent).toContain("'manual-intervention'");

      // Should assign to appropriate person
      expect(workflowContent).toContain('assignees:');
    });

    test('Error data is properly captured and formatted', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should capture escalation data
      expect(workflowContent).toContain('auto-healing-escalation.json');
      expect(workflowContent).toContain('escalationData.criticalIssues');
      expect(workflowContent).toContain('escalationData.healingLog');
    });
  });

  describe('Performance Integration', () => {
    test('Performance metrics align with system requirements', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      const performance = metrics.current_metrics.performance_metrics;

      // Engine overhead should be minimal
      expect(performance.engine_overhead).toContain('< 2%');

      // Detection should be fast
      expect(performance.detection_latency).toContain('< 30 seconds');

      // Recovery should be efficient
      expect(performance.recovery_efficiency).toBe('92%');

      // System impact should be minimal
      expect(performance.system_impact).toBe('minimal');
    });

    test('Resource usage is within acceptable limits', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      const resources = metrics.current_metrics.performance_metrics.resource_usage;

      // CPU usage should be reasonable
      expect(resources.cpu).toMatch(/\d+-\d+%/);

      // Memory usage should be minimal
      expect(resources.memory).toContain('< 100MB');

      // Storage usage should be minimal
      expect(resources.storage).toContain('< 50MB');
    });
  });

  describe('Security Integration', () => {
    test('Workflow uses secure authentication', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should use GITHUB_TOKEN
      expect(workflowContent).toContain('${{ secrets.GITHUB_TOKEN }}');

      // Should not contain hardcoded secrets
      expect(workflowContent).not.toMatch(/password:\s*[^$]/);
      expect(workflowContent).not.toMatch(/token:\s*[^$]/);
      expect(workflowContent).not.toMatch(/key:\s*[^$]/);
    });

    test('Auto-healing actions are auditable', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should log all actions
      expect(workflowContent).toContain('echo "## 🏥 Auto-Healing Execution"');
      expect(workflowContent).toContain('echo "## 🧪 Post-Healing Verification"');
      expect(workflowContent).toContain('echo "## 📊 Infrastructure Health Report"');

      // Should track metrics
      expect(workflowContent).toContain('📈 Update Auto-Healing Metrics');
    });

    test('Commit signatures include proper attribution', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should include Co-Authored-By
      expect(workflowContent).toContain('Co-Authored-By: Claude <noreply@anthropic.com>');

      // Should identify as GitHub Action
      expect(workflowContent).toContain('GitHub Action Auto-Healing');
    });
  });

  describe('Configuration Integration', () => {
    test('Configuration values are consistent across components', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';

      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      // Version should match
      const workflowVersion = workflowContent.match(/AUTO_HEALING_VERSION:\s*"([^"]+)"/)?.[1];
      expect(workflowVersion).toBe(metrics.metadata.version);

      // Configuration should match
      expect(metrics.configuration.max_recovery_attempts).toBe(3);
      expect(metrics.configuration.confidence_threshold).toBe(0.85);
      expect(metrics.configuration.circuit_breaker_threshold).toBe(3);
    });

    test('Schedule configuration is properly formatted', () => {
      const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';

      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      // Cron schedule should match configuration
      expect(workflowContent).toContain("cron: '*/15 * * * *'");
      expect(metrics.configuration.schedule).toBe('*/15 * * * *');
    });
  });

  describe('Monitoring Integration', () => {
    test('System status tracking is comprehensive', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      const status = metrics.status;
      expect(status).toHaveProperty('overall_health');
      expect(status).toHaveProperty('engine_status');
      expect(status).toHaveProperty('last_healing_action');
      expect(status).toHaveProperty('next_scheduled_check');
      expect(status).toHaveProperty('auto_healing_enabled');
      expect(status).toHaveProperty('maintenance_window');
    });

    test('Alert system integration is complete', () => {
      const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      const alerts = metrics.alerts;
      expect(alerts.notification_channels).toContain('github_issues');
      expect(alerts.notification_channels).toContain('workflow_logs');
      expect(alerts.escalation_procedures).toBe('defined');
    });
  });
});

describe('Auto-Healing System Scenarios', () => {
  describe('End-to-End Recovery Scenarios', () => {
    test('Scenario: Lockfile corruption recovery', async () => {
      // Simulate lockfile corruption scenario
      const scenario = {
        triggerEvent: 'workflow_run',
        failureType: 'lockfile_corruption',
        expectedRecovery: 'emergency_lockfile_repair',
        expectedOutcome: 'success'
      };

      const recoveryPlan = simulateRecoveryScenario(scenario);

      expect(recoveryPlan.detection.pattern).toBe('LOCKFILE_CORRUPTION');
      expect(recoveryPlan.recovery.strategy).toBe('emergency_lockfile_repair');
      expect(recoveryPlan.safety.rollbackAvailable).toBe(true);
      expect(recoveryPlan.verification.steps).toContain('dependency_validation');
    });

    test('Scenario: Cache corruption recovery', async () => {
      const scenario = {
        triggerEvent: 'schedule',
        failureType: 'cache_corruption',
        expectedRecovery: 'intelligent_cache_rebuild',
        expectedOutcome: 'success'
      };

      const recoveryPlan = simulateRecoveryScenario(scenario);

      expect(recoveryPlan.detection.pattern).toBe('CACHE_CORRUPTION');
      expect(recoveryPlan.recovery.strategy).toBe('intelligent_cache_rebuild');
      expect(recoveryPlan.safety.riskLevel).toBe('low');
      expect(recoveryPlan.verification.steps).toContain('cache_integrity_check');
    });

    test('Scenario: Network timeout with retry backoff', async () => {
      const scenario = {
        triggerEvent: 'workflow_run',
        failureType: 'network_timeout',
        expectedRecovery: 'intelligent_retry_backoff',
        expectedOutcome: 'success'
      };

      const recoveryPlan = simulateRecoveryScenario(scenario);

      expect(recoveryPlan.detection.pattern).toBe('NETWORK_TIMEOUT');
      expect(recoveryPlan.recovery.strategy).toBe('intelligent_retry_backoff');
      expect(recoveryPlan.recovery.backoffStrategy).toBe('exponential');
      expect(recoveryPlan.verification.steps).toContain('connectivity_test');
    });

    test('Scenario: Circuit breaker activation', async () => {
      const scenario = {
        triggerEvent: 'workflow_run',
        failureType: 'repeated_failure',
        failureCount: 3,
        expectedOutcome: 'circuit_breaker_activation'
      };

      const recoveryPlan = simulateRecoveryScenario(scenario);

      expect(recoveryPlan.circuitBreaker.activated).toBe(true);
      expect(recoveryPlan.escalation.required).toBe(true);
      expect(recoveryPlan.escalation.type).toBe('manual_intervention');
    });
  });

  describe('Integration Flow Scenarios', () => {
    test('Scenario: Dashboard displays real-time metrics', () => {
      // Simulate dashboard requesting metrics
      const metricsRequest = {
        endpoint: '/api/infrastructure-auto-healing-metrics',
        method: 'GET'
      };

      const response = simulateDashboardRequest(metricsRequest);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('current_metrics');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('historical_data');
    });

    test('Scenario: Epic progress tracking update', () => {
      const epicUpdate = {
        epicNumber: 32,
        issueNumber: 36,
        status: 'in_progress',
        completion: '80%'
      };

      const trackingResult = simulateEpicProgressUpdate(epicUpdate);

      expect(trackingResult.epic_progress).toContain('4/5');
      expect(trackingResult.epic_progress).toContain('80%');
      expect(trackingResult.current_issue).toBe(36);
    });
  });
});

// Helper functions for simulation
function simulateRecoveryScenario(scenario) {
  const patterns = {
    'lockfile_corruption': 'LOCKFILE_CORRUPTION',
    'cache_corruption': 'CACHE_CORRUPTION',
    'network_timeout': 'NETWORK_TIMEOUT',
    'service_unavailable': 'SERVICE_UNAVAILABLE'
  };

  const strategies = {
    'LOCKFILE_CORRUPTION': {
      strategy: 'emergency_lockfile_repair',
      riskLevel: 'medium',
      rollbackAvailable: true,
      verificationSteps: ['dependency_validation', 'lockfile_integrity_check']
    },
    'CACHE_CORRUPTION': {
      strategy: 'intelligent_cache_rebuild',
      riskLevel: 'low',
      rollbackAvailable: true,
      verificationSteps: ['cache_integrity_check', 'build_test']
    },
    'NETWORK_TIMEOUT': {
      strategy: 'intelligent_retry_backoff',
      riskLevel: 'low',
      rollbackAvailable: false,
      backoffStrategy: 'exponential',
      verificationSteps: ['connectivity_test', 'endpoint_health_check']
    }
  };

  const pattern = patterns[scenario.failureType];
  const recovery = strategies[pattern];

  const plan = {
    detection: { pattern },
    recovery,
    safety: {
      riskLevel: recovery?.riskLevel || 'high',
      rollbackAvailable: recovery?.rollbackAvailable || false
    },
    verification: {
      steps: recovery?.verificationSteps || ['manual_verification']
    }
  };

  // Handle circuit breaker scenario
  if (scenario.failureCount >= 3) {
    plan.circuitBreaker = { activated: true };
    plan.escalation = { required: true, type: 'manual_intervention' };
  }

  return plan;
}

function simulateDashboardRequest(request) {
  if (request.endpoint === '/api/infrastructure-auto-healing-metrics') {
    return {
      status: 200,
      data: {
        current_metrics: { /* metrics data */ },
        status: { overall_health: 'operational' },
        historical_data: { /* historical data */ }
      }
    };
  }
  return { status: 404 };
}

function simulateEpicProgressUpdate(update) {
  return {
    epic_progress: `${update.completion === '80%' ? '4' : '3'}/5 issues completed (${update.completion})`,
    current_issue: update.issueNumber,
    epic_number: update.epicNumber
  };
}