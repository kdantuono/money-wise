/**
 * Tests for ClientOnly component
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import { ClientOnly } from '../../src/components/client-only';

describe('ClientOnly Component', () => {
  it('renders children after mount (useEffect runs in test environment)', async () => {
    render(
      <ClientOnly fallback={<div data-testid="fallback">Loading...</div>}>
        <div data-testid="content">Content</div>
      </ClientOnly>
    );

    // In test environment with jsdom, useEffect runs quickly
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  it('renders children when mounted with no fallback', async () => {
    render(
      <ClientOnly>
        <div data-testid="content">Content</div>
      </ClientOnly>
    );

    // Wait for useEffect to run
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  it('handles complex children content', async () => {
    render(
      <ClientOnly>
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Click me</button>
        </div>
      </ClientOnly>
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });
  });

  it('renders with fallback prop', async () => {
    render(
      <ClientOnly
        fallback={
          <div>
            <div className="loading-spinner" />
            <p>Please wait...</p>
          </div>
        }
      >
        <div data-testid="content">Content</div>
      </ClientOnly>
    );

    // After mount, children should be visible
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });
});
