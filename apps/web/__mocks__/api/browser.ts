import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// This configures a Service Worker with the given request handlers for browser environment
export const worker = setupWorker(...handlers);

// Start worker with specific options
export const startWorker = async () => {
  if (typeof window !== 'undefined') {
    await worker.start({
      onUnhandledRequest: 'warn',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }
};

// For use in development environment
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  startWorker();
}
