import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  eventId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Set additional context for Sentry
    Sentry.setContext('errorBoundary', {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
    });

    // Capture the error with Sentry
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    this.setState({
      error,
      errorInfo,
      eventId,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      eventId: undefined,
    });
  };

  private handleReportError = () => {
    if (this.state.eventId) {
      // In React Native, we can't show the web dialog, so we'll just capture additional context
      Sentry.captureMessage('User reported error manually', 'info');
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error fallback
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.description}>
              We're sorry, but something unexpected happened. Please try again or restart the app.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorMessage}>{this.state.error.message}</Text>
                <Text style={styles.errorStack}>{this.state.error.stack}</Text>
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reportButton} onPress={this.handleReportError}>
                <Text style={styles.reportButtonText}>Report Issue</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.errorId}>
              Error ID: {this.state.eventId || 'Unknown'}
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    maxHeight: 200,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 11,
    color: '#991b1b',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: '#7f1d1d',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  reportButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  errorId: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

// HOC for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}