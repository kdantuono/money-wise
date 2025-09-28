import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  debug: boolean;
  release?: string;
}

export const createSentryConfig = (configService: ConfigService): SentryConfig => {
  const environment = configService.get<string>('NODE_ENV', 'development');

  return {
    dsn: configService.get<string>('SENTRY_DSN', ''),
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    debug: environment === 'development',
    release: configService.get<string>('SENTRY_RELEASE'),
  };
};

export const initializeSentry = (config: SentryConfig): void => {
  if (!config.dsn) {
    console.warn('Sentry DSN not provided. Error tracking will be disabled.');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,
    debug: config.debug,
    release: config.release,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration({
        tracing: {
          ignoreIncomingRequestHook: (request) => {
            // Ignore health check and metrics endpoints
            const ignoredPaths = ['/health', '/metrics', '/health/ready', '/health/live'];
            return ignoredPaths.some(path => request.url?.includes(path));
          },
        },
      }),
      Sentry.prismaIntegration(),
    ],
    beforeSend: (event) => {
      // Filter out sensitive data
      if (event.request?.data) {
        // Remove password fields
        if (typeof event.request.data === 'object') {
          delete event.request.data.password;
          delete event.request.data.confirmPassword;
          delete event.request.data.currentPassword;
          delete event.request.data.newPassword;
        }
      }
      return event;
    },
  });
};