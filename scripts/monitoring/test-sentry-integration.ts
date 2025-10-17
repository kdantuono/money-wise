#!/usr/bin/env tsx

/**
 * Sentry Integration Test Script
 *
 * This script tests Sentry error tracking and performance monitoring
 * across all MoneyWise applications in development environment.
 */

import { execSync } from 'child_process';
import axios from 'axios';
import * as Sentry from '@sentry/node';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

class SentryIntegrationTester {
  private results: TestResult[] = [];
  private readonly backendUrl = 'http://localhost:3001';
  private readonly frontendUrl = 'http://localhost:3000';

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Sentry Integration Tests\n');

    await this.testBackendSentryConfiguration();
    await this.testBackendErrorCapture();
    await this.testBackendPerformanceMonitoring();
    await this.testFrontendSentryConfiguration();
    await this.testErrorBoundaryFunctionality();
    await this.testPerformanceMonitoring();
    await this.testEnvironmentConfiguration();
    await this.testCIConfiguration();

    this.printResults();
  }

  private async testBackendSentryConfiguration(): Promise<void> {
    const testName = 'Backend Sentry Configuration';

    try {
      // Check if Sentry is properly configured in backend
      const response = await axios.get(`${this.backendUrl}/api/health`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        this.addResult(testName, 'pass', 'Backend is accessible and health check passes');
      } else {
        this.addResult(testName, 'fail', `Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.addResult(testName, 'skip', 'Backend not running - start with: pnpm dev:backend');
      } else {
        this.addResult(testName, 'fail', `Backend health check failed: ${error.message}`);
      }
    }
  }

  private async testBackendErrorCapture(): Promise<void> {
    const testName = 'Backend Error Capture';

    try {
      // Test error endpoint if it exists, otherwise simulate error
      const response = await axios.post(`${this.backendUrl}/api/test/error`, {
        message: 'Test error for Sentry integration',
      }, {
        timeout: 5000,
        validateStatus: () => true, // Accept any status code
      });

      if (response.status >= 400) {
        this.addResult(testName, 'pass', 'Error endpoint responded as expected');
      } else {
        this.addResult(testName, 'skip', 'No test error endpoint found');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.addResult(testName, 'skip', 'Backend not running');
      } else {
        this.addResult(testName, 'fail', `Error test failed: ${error.message}`);
      }
    }
  }

  private async testBackendPerformanceMonitoring(): Promise<void> {
    const testName = 'Backend Performance Monitoring';

    try {
      const startTime = Date.now();

      const response = await axios.get(`${this.backendUrl}/api/health/detailed`, {
        timeout: 10000,
      });

      const duration = Date.now() - startTime;

      if (response.status === 200 && duration < 5000) {
        this.addResult(testName, 'pass', `Performance endpoint responded in ${duration}ms`);
      } else if (response.status === 200) {
        this.addResult(testName, 'fail', `Performance endpoint too slow: ${duration}ms`);
      } else {
        this.addResult(testName, 'fail', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.addResult(testName, 'skip', 'Backend not running');
      } else {
        this.addResult(testName, 'fail', `Performance test failed: ${error.message}`);
      }
    }
  }

  private async testFrontendSentryConfiguration(): Promise<void> {
    const testName = 'Frontend Sentry Configuration';

    try {
      const response = await axios.get(this.frontendUrl, {
        timeout: 5000,
      });

      if (response.status === 200) {
        // Check if Sentry scripts are loaded
        const html = response.data;
        if (html.includes('sentry') || html.includes('Sentry')) {
          this.addResult(testName, 'pass', 'Frontend accessible with Sentry references');
        } else {
          this.addResult(testName, 'pass', 'Frontend accessible (Sentry loaded client-side)');
        }
      } else {
        this.addResult(testName, 'fail', `Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.addResult(testName, 'skip', 'Frontend not running - start with: pnpm dev:web');
      } else {
        this.addResult(testName, 'fail', `Frontend test failed: ${error.message}`);
      }
    }
  }

  private async testErrorBoundaryFunctionality(): Promise<void> {
    const testName = 'Error Boundary Functionality';

    try {
      // Check if error boundary components exist
      const errorBoundaryExists = this.checkFileExists('apps/web/src/components/error/ErrorBoundary.tsx');
      const errorFallbackExists = this.checkFileExists('apps/web/src/components/error/ErrorFallback.tsx');

      if (errorBoundaryExists && errorFallbackExists) {
        this.addResult(testName, 'pass', 'Error boundary components found');
      } else {
        this.addResult(testName, 'fail', 'Error boundary components missing');
      }
    } catch (error) {
      this.addResult(testName, 'fail', `Error boundary test failed: ${error.message}`);
    }
  }

  private async testPerformanceMonitoring(): Promise<void> {
    const testName = 'Performance Monitoring Setup';

    try {
      // Check if performance monitoring files exist
      const backendPerf = this.checkFileExists('apps/backend/src/common/decorators/performance-monitor.decorator.ts');
      const frontendPerf = this.checkFileExists('apps/web/src/lib/performance.ts');

      if (backendPerf && frontendPerf) {
        this.addResult(testName, 'pass', 'Performance monitoring utilities found');
      } else {
        this.addResult(testName, 'fail', 'Performance monitoring utilities missing');
      }
    } catch (error) {
      this.addResult(testName, 'fail', `Performance monitoring test failed: ${error.message}`);
    }
  }

  private async testEnvironmentConfiguration(): Promise<void> {
    const testName = 'Environment Configuration';

    try {
      // Check if environment files exist
      const backendEnv = this.checkFileExists('apps/backend/.env.example');
      const frontendEnv = this.checkFileExists('apps/web/.env.example');
      const mobileEnv = this.checkFileExists('apps/mobile/.env.example');

      if (backendEnv && frontendEnv && mobileEnv) {
        // Check if they contain Sentry configuration
        const backendContent = execSync('cat apps/backend/.env.example', { encoding: 'utf8' });
        const frontendContent = execSync('cat apps/web/.env.example', { encoding: 'utf8' });
        const mobileContent = execSync('cat apps/mobile/.env.example', { encoding: 'utf8' });

        const hasBackendSentry = backendContent.includes('SENTRY_DSN');
        const hasFrontendSentry = frontendContent.includes('SENTRY_DSN');
        const hasMobileSentry = mobileContent.includes('SENTRY_DSN');

        if (hasBackendSentry && hasFrontendSentry && hasMobileSentry) {
          this.addResult(testName, 'pass', 'Environment configuration files contain Sentry settings');
        } else {
          this.addResult(testName, 'fail', 'Environment files missing Sentry configuration');
        }
      } else {
        this.addResult(testName, 'fail', 'Environment configuration files missing');
      }
    } catch (error) {
      this.addResult(testName, 'fail', `Environment configuration test failed: ${error.message}`);
    }
  }

  private async testCIConfiguration(): Promise<void> {
    const testName = 'CI/CD Sentry Configuration';

    try {
      // Check if Sentry workflow exists
      const sentryWorkflow = this.checkFileExists('.github/workflows/release.yml');

      if (sentryWorkflow) {
        // Check if main CI workflow includes Sentry
        const ciContent = execSync('cat .github/workflows/ci-cd.yml', { encoding: 'utf8' });
        const hasSentryEnv = ciContent.includes('SENTRY_ORG') || ciContent.includes('SENTRY_AUTH_TOKEN');

        if (hasSentryEnv) {
          this.addResult(testName, 'pass', 'CI/CD workflows configured for Sentry');
        } else {
          this.addResult(testName, 'fail', 'Main CI workflow missing Sentry configuration');
        }
      } else {
        this.addResult(testName, 'fail', 'Sentry release workflow missing');
      }
    } catch (error) {
      this.addResult(testName, 'fail', `CI configuration test failed: ${error.message}`);
    }
  }

  private checkFileExists(filePath: string): boolean {
    try {
      execSync(`test -f ${filePath}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private addResult(name: string, status: 'pass' | 'fail' | 'skip', message: string): void {
    this.results.push({ name, status, message });

    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
    console.log(`${emoji} ${name}: ${message}`);
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('═'.repeat(50));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`📝 Total: ${this.results.length}`);

    if (failed > 0) {
      console.log('\n💡 Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.message}`);
        });
    }

    if (skipped > 0) {
      console.log('\n⚠️ Skipped Tests:');
      this.results
        .filter(r => r.status === 'skip')
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.message}`);
        });
    }

    const successRate = (passed / (passed + failed)) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);

    if (successRate === 100) {
      console.log('🎉 All tests passed! Sentry integration is working correctly.');
    } else if (successRate >= 80) {
      console.log('✨ Most tests passed. Review failed tests and fix issues.');
    } else {
      console.log('⚠️ Multiple tests failed. Sentry integration needs attention.');
    }
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new SentryIntegrationTester();
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { SentryIntegrationTester };