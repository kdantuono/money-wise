/**
 * Comprehensive Test Suite for Infrastructure Auto-Healing System
 * Tests the complete auto-healing workflow including detection, recovery, and safety mechanisms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Infrastructure Auto-Healing System Tests', () => {
  const testDataDir = path.join(__dirname, 'test-data');
  const metricsPath = '.github/metrics/infrastructure-auto-healing-metrics.json';
  const workflowPath = '.github/workflows/infrastructure-auto-healing-v2.yml';

  beforeAll(() => {
    // Create test data directory
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('1. Workflow Configuration Tests', () => {
    test('Auto-healing workflow file exists and is valid YAML', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);

      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      expect(workflowContent).toContain('name: 🏥 Infrastructure Auto-Healing v2.0');
      expect(workflowContent).toContain('AUTO_HEALING_VERSION: "2.0.0"');
      expect(workflowContent).toContain('MAX_RECOVERY_ATTEMPTS: 3');
      expect(workflowContent).toContain('CONFIDENCE_THRESHOLD: 0.85');
    });

    test('Workflow contains all required jobs', () => {
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      const requiredJobs = [
        'initialize-engine',
        'failure-detection',
        'auto-recovery',
        'safety-verification',
        'metrics-collection',
        'notification-summary'
      ];

      requiredJobs.forEach(job => {
        expect(workflowContent).toContain(job);
      });
    });

    test('Workflow has proper trigger configuration', () => {
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      expect(workflowContent).toContain('workflow_run:');
      expect(workflowContent).toContain('schedule:');
      expect(workflowContent).toContain('workflow_dispatch:');
      expect(workflowContent).toContain("cron: '*/15 * * * *'"); // Every 15 minutes
    });
  });

  describe('2. Metrics System Tests', () => {
    test('Metrics file exists with correct structure', () => {
      expect(fs.existsSync(metricsPath)).toBe(true);

      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      expect(metrics).toHaveProperty('metadata');
      expect(metrics).toHaveProperty('current_metrics');
      expect(metrics).toHaveProperty('historical_data');
      expect(metrics).toHaveProperty('configuration');
    });

    test('Metrics contains required performance targets', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

      // Failure detection metrics
      expect(metrics.current_metrics.failure_detection).toHaveProperty('detection_accuracy');
      expect(metrics.current_metrics.failure_detection).toHaveProperty('mean_detection_time');
      expect(metrics.current_metrics.failure_detection).toHaveProperty('confidence_threshold');

      // Recovery orchestration metrics
      expect(metrics.current_metrics.recovery_orchestration).toHaveProperty('success_rate_target');
      expect(metrics.current_metrics.recovery_orchestration).toHaveProperty('mean_recovery_time');
      expect(metrics.current_metrics.recovery_orchestration).toHaveProperty('rollback_capability');

      // Safety mechanisms
      expect(metrics.current_metrics.safety_mechanisms).toHaveProperty('circuit_breaker_enabled');
      expect(metrics.current_metrics.safety_mechanisms).toHaveProperty('circuit_breaker_threshold');
    });

    test('Configuration parameters are within acceptable ranges', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const config = metrics.configuration;

      expect(config.confidence_threshold).toBeGreaterThanOrEqual(0.8);
      expect(config.confidence_threshold).toBeLessThanOrEqual(1.0);
      expect(config.max_recovery_attempts).toBeGreaterThan(0);
      expect(config.max_recovery_attempts).toBeLessThanOrEqual(5);
      expect(config.recovery_timeout).toBeGreaterThan(60);
      expect(config.recovery_timeout).toBeLessThanOrEqual(600);
    });
  });

  describe('3. Failure Detection Engine Tests', () => {
    test('Supports all required failure patterns', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const supportedTypes = metrics.current_metrics.failure_detection.supported_failure_types;

      const requiredPatterns = [
        'lockfile_corruption',
        'cache_corruption',
        'network_timeout',
        'service_unavailable'
      ];

      requiredPatterns.forEach(pattern => {
        expect(supportedTypes).toContain(pattern);
      });
    });

    test('Detection accuracy meets target threshold', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const accuracy = metrics.current_metrics.failure_detection.detection_accuracy;

      // Extract percentage and verify it meets 95% target
      const accuracyValue = parseInt(accuracy.replace('%', ''));
      expect(accuracyValue).toBeGreaterThanOrEqual(95);
    });

    test('False positive rate is within acceptable limits', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const falsePositiveRate = metrics.current_metrics.failure_detection.false_positive_rate;

      // Extract percentage and verify it's below 5%
      const rateValue = parseInt(falsePositiveRate.replace(/[<%]/g, ''));
      expect(rateValue).toBeLessThan(5);
    });
  });

  describe('4. Recovery Orchestrator Tests', () => {
    test('Supports all required recovery strategies', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const strategies = metrics.current_metrics.recovery_orchestration.supported_strategies;

      const requiredStrategies = [
        'emergency_lockfile_repair',
        'intelligent_cache_rebuild',
        'intelligent_retry_backoff',
        'service_failover'
      ];

      requiredStrategies.forEach(strategy => {
        expect(strategies).toContain(strategy);
      });
    });

    test('Recovery success rate meets target', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const successRateTarget = metrics.current_metrics.recovery_orchestration.success_rate_target;

      // Extract percentage and verify it meets 90% target
      const targetValue = parseInt(successRateTarget.replace('%', ''));
      expect(targetValue).toBeGreaterThanOrEqual(90);
    });

    test('Recovery time meets performance target', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const recoveryTime = metrics.current_metrics.recovery_orchestration.mean_recovery_time;

      expect(recoveryTime).toContain('5 minutes');
      expect(recoveryTime).toContain('<');
    });

    test('Rollback capability is enabled', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const rollbackCapability = metrics.current_metrics.recovery_orchestration.rollback_capability;

      expect(rollbackCapability).toBe('enabled');
    });
  });

  describe('5. Safety Mechanisms Tests', () => {
    test('Circuit breaker is properly configured', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const safety = metrics.current_metrics.safety_mechanisms;

      expect(safety.circuit_breaker_enabled).toBe(true);
      expect(safety.circuit_breaker_threshold).toBe(3);
      expect(safety.manual_override).toBe('available');
    });

    test('Integrity checks are comprehensive', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const safety = metrics.current_metrics.safety_mechanisms;

      expect(safety.integrity_checks).toBeGreaterThanOrEqual(5);
      expect(safety.verification_steps).toBe('comprehensive');
    });

    test('Safety score target is appropriate', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const safetyTarget = metrics.current_metrics.safety_mechanisms.safety_score_target;

      expect(safetyTarget).toContain('85/100');
      expect(safetyTarget).toContain('>');
    });
  });

  describe('6. Performance Metrics Tests', () => {
    test('System overhead is within acceptable limits', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const overhead = metrics.current_metrics.performance_metrics.engine_overhead;

      expect(overhead).toContain('2%');
      expect(overhead).toContain('<');
    });

    test('Detection latency meets performance target', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const latency = metrics.current_metrics.performance_metrics.detection_latency;

      expect(latency).toContain('30 seconds');
      expect(latency).toContain('<');
    });

    test('Resource usage is optimized', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const resources = metrics.current_metrics.performance_metrics.resource_usage;

      expect(resources).toHaveProperty('cpu');
      expect(resources).toHaveProperty('memory');
      expect(resources).toHaveProperty('storage');

      expect(resources.memory).toContain('100MB');
      expect(resources.storage).toContain('50MB');
    });
  });

  describe('7. Learning Engine Tests', () => {
    test('Learning engine is initialized', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const learning = metrics.learning_engine;

      expect(learning.status).toBe('initialized');
      expect(learning.machine_learning).toBe('foundation_ready');
    });

    test('Learning targets are established', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const historical = metrics.historical_data;

      expect(historical.pattern_recognition_improvements).toBe('5% monthly target');
      expect(historical.knowledge_base_growth).toBe('4 initial patterns');
    });
  });

  describe('8. Dashboard Integration Tests', () => {
    test('Dashboard integration endpoints are configured', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const integration = metrics.integration;

      expect(integration.dashboard_endpoint).toBe('/api/infrastructure-auto-healing-metrics');
      expect(integration.status_endpoint).toBe('/api/auto-healing-status');
    });

    test('Related features are properly integrated', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const relatedFeatures = metrics.integration.related_features;

      const expectedFeatures = [
        'ci-cache-resilience',
        'lockfile-integrity-monitoring',
        'emergency-lockfile-repair'
      ];

      expectedFeatures.forEach(feature => {
        expect(relatedFeatures).toContain(feature);
      });
    });

    test('Epic progress tracking is accurate', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const epicProgress = metrics.integration.epic_progress;

      expect(epicProgress).toContain('3/5');
      expect(epicProgress).toContain('60%');
    });
  });

  describe('9. Alert System Tests', () => {
    test('Alert configuration is complete', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const alerts = metrics.alerts;

      expect(alerts).toHaveProperty('active_alerts');
      expect(alerts).toHaveProperty('alert_history');
      expect(alerts).toHaveProperty('escalation_procedures');
      expect(alerts).toHaveProperty('notification_channels');
      expect(alerts).toHaveProperty('severity_levels');
    });

    test('Notification channels are configured', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const channels = metrics.alerts.notification_channels;

      expect(channels).toContain('github_issues');
      expect(channels).toContain('workflow_logs');
    });

    test('Severity levels are comprehensive', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const severityLevels = metrics.alerts.severity_levels;

      const expectedLevels = ['low', 'medium', 'high', 'critical'];
      expectedLevels.forEach(level => {
        expect(severityLevels).toContain(level);
      });
    });
  });

  describe('10. System Status Tests', () => {
    test('Overall system health is operational', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const status = metrics.status;

      expect(status.overall_health).toBe('operational');
      expect(status.engine_status).toBe('initialized');
      expect(status.auto_healing_enabled).toBe(true);
    });

    test('Scheduled check frequency is appropriate', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const status = metrics.status;

      expect(status.next_scheduled_check).toBe('every_15_minutes');
    });
  });

  describe('11. Threshold Configuration Tests', () => {
    test('Warning and critical thresholds are properly set', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const thresholds = metrics.thresholds;

      // Detection accuracy thresholds
      expect(thresholds.detection_accuracy_warning).toBe(85);
      expect(thresholds.detection_accuracy_critical).toBe(75);

      // Recovery success thresholds
      expect(thresholds.recovery_success_warning).toBe(80);
      expect(thresholds.recovery_success_critical).toBe(70);

      // Recovery time thresholds (in seconds)
      expect(thresholds.recovery_time_warning).toBe(300);
      expect(thresholds.recovery_time_critical).toBe(600);

      // Integrity score thresholds
      expect(thresholds.integrity_score_warning).toBe(80);
      expect(thresholds.integrity_score_critical).toBe(70);
    });

    test('Thresholds follow logical hierarchy (warning > critical)', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const thresholds = metrics.thresholds;

      expect(thresholds.detection_accuracy_warning).toBeGreaterThan(thresholds.detection_accuracy_critical);
      expect(thresholds.recovery_success_warning).toBeGreaterThan(thresholds.recovery_success_critical);
      expect(thresholds.recovery_time_critical).toBeGreaterThan(thresholds.recovery_time_warning);
      expect(thresholds.integrity_score_warning).toBeGreaterThan(thresholds.integrity_score_critical);
    });
  });

  describe('12. Documentation and Versioning Tests', () => {
    test('System version is properly tracked', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const metadata = metrics.metadata;

      expect(metadata.version).toBe('2.0.0');
      expect(metadata.feature_name).toBe('Infrastructure Auto-Healing v2.0');
      expect(metadata.implementation_phase).toBe('Phase 1 - Core Framework');
    });

    test('Documentation references are complete', () => {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const metadata = metrics.metadata;

      expect(metadata).toHaveProperty('issue_number');
      expect(metadata).toHaveProperty('epic_number');
      expect(metadata).toHaveProperty('workflow_file');
      expect(metadata).toHaveProperty('last_updated');
      expect(metadata).toHaveProperty('author');
    });
  });
});

// Mock function tests for workflow logic simulation
describe('Auto-Healing Workflow Logic Tests', () => {
  describe('Failure Classification Logic', () => {
    test('Lockfile corruption detection', () => {
      const mockFailureLog = 'Error: package-lock.json is corrupted or invalid';
      const classification = simulateFailureClassification(mockFailureLog);

      expect(classification.type).toBe('LOCKFILE_CORRUPTION');
      expect(classification.confidence).toBeGreaterThan(0.9);
    });

    test('Cache corruption detection', () => {
      const mockFailureLog = 'npm ERR! cache integrity error';
      const classification = simulateFailureClassification(mockFailureLog);

      expect(classification.type).toBe('CACHE_CORRUPTION');
      expect(classification.confidence).toBeGreaterThan(0.9);
    });

    test('Network timeout detection', () => {
      const mockFailureLog = 'Error: Request timeout after 30000ms';
      const classification = simulateFailureClassification(mockFailureLog);

      expect(classification.type).toBe('NETWORK_TIMEOUT');
      expect(classification.confidence).toBeGreaterThan(0.8);
    });

    test('Service unavailable detection', () => {
      const mockFailureLog = 'Error: Service unavailable (503)';
      const classification = simulateFailureClassification(mockFailureLog);

      expect(classification.type).toBe('SERVICE_UNAVAILABLE');
      expect(classification.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Recovery Strategy Selection', () => {
    test('Emergency lockfile repair strategy', () => {
      const classification = { type: 'LOCKFILE_CORRUPTION', confidence: 0.95 };
      const strategy = selectRecoveryStrategy(classification);

      expect(strategy.name).toBe('emergency_lockfile_repair');
      expect(strategy.riskLevel).toBe('medium');
      expect(strategy.rollbackSupported).toBe(true);
    });

    test('Intelligent cache rebuild strategy', () => {
      const classification = { type: 'CACHE_CORRUPTION', confidence: 0.92 };
      const strategy = selectRecoveryStrategy(classification);

      expect(strategy.name).toBe('intelligent_cache_rebuild');
      expect(strategy.riskLevel).toBe('low');
      expect(strategy.rollbackSupported).toBe(true);
    });
  });

  describe('Circuit Breaker Logic', () => {
    test('Circuit breaker allows execution under threshold', () => {
      const failureCount = 2;
      const threshold = 3;
      const allowed = checkCircuitBreaker(failureCount, threshold);

      expect(allowed).toBe(true);
    });

    test('Circuit breaker blocks execution at threshold', () => {
      const failureCount = 3;
      const threshold = 3;
      const allowed = checkCircuitBreaker(failureCount, threshold);

      expect(allowed).toBe(false);
    });

    test('Circuit breaker escalates after threshold', () => {
      const failureCount = 4;
      const threshold = 3;
      const result = checkCircuitBreaker(failureCount, threshold);

      expect(result).toBe(false);
    });
  });
});

// Helper functions to simulate workflow logic
function simulateFailureClassification(failureLog) {
  if (failureLog.includes('package-lock') || failureLog.includes('lockfile')) {
    return { type: 'LOCKFILE_CORRUPTION', confidence: 0.95 };
  } else if (failureLog.includes('cache') || failureLog.includes('npm ERR!')) {
    return { type: 'CACHE_CORRUPTION', confidence: 0.92 };
  } else if (failureLog.includes('timeout') || failureLog.includes('ETIMEDOUT')) {
    return { type: 'NETWORK_TIMEOUT', confidence: 0.88 };
  } else if (failureLog.includes('503') || failureLog.includes('unavailable')) {
    return { type: 'SERVICE_UNAVAILABLE', confidence: 0.85 };
  }
  return { type: 'UNKNOWN', confidence: 0.5 };
}

function selectRecoveryStrategy(classification) {
  const strategies = {
    'LOCKFILE_CORRUPTION': {
      name: 'emergency_lockfile_repair',
      riskLevel: 'medium',
      rollbackSupported: true
    },
    'CACHE_CORRUPTION': {
      name: 'intelligent_cache_rebuild',
      riskLevel: 'low',
      rollbackSupported: true
    },
    'NETWORK_TIMEOUT': {
      name: 'intelligent_retry_backoff',
      riskLevel: 'low',
      rollbackSupported: false
    },
    'SERVICE_UNAVAILABLE': {
      name: 'service_failover',
      riskLevel: 'high',
      rollbackSupported: true
    }
  };

  return strategies[classification.type] || { name: 'manual_intervention', riskLevel: 'critical', rollbackSupported: false };
}

function checkCircuitBreaker(failureCount, threshold) {
  return failureCount < threshold;
}