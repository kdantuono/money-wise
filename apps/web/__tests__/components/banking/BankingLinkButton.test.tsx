/**
 * Tests for BankingLinkButton component
 * 
 * React 19 + @testing-library/react v16 compatibility:
 * - Tests that involve user interactions use real timers (default)
 * - Tests that need timer control (polling, delays) use fake timers explicitly
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '../../utils/test-utils';
import { BankingLinkButton } from '../../../src/components/banking/BankingLinkButton';

// Mock window.open
const mockWindowOpen = vi.fn();
const mockPopup = {
  closed: false,
  focus: vi.fn(),
  close: vi.fn(),
};

describe('BankingLinkButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.window.open = mockWindowOpen;
    mockWindowOpen.mockReturnValue(mockPopup);
    mockPopup.closed = false;
  });

  afterEach(() => {
    // Ensure cleanup
    mockPopup.closed = true;
    vi.restoreAllMocks();
  });

  // ============================================
  // Basic Rendering Tests (no timers needed)
  // ============================================

  it('renders with default props', () => {
    render(<BankingLinkButton />);

    const button = screen.getByRole('button', { name: /link your bank account/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Link Bank Account');
    expect(button).not.toBeDisabled();
  });

  it('renders with custom children', () => {
    render(<BankingLinkButton>Connect Your Bank</BankingLinkButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Connect Your Bank');
  });

  it('applies custom className', () => {
    render(<BankingLinkButton className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('uses custom aria-label when provided', () => {
    render(<BankingLinkButton ariaLabel="Custom aria label" />);

    const button = screen.getByRole('button', { name: /custom aria label/i });
    expect(button).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<BankingLinkButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Link your bank account via OAuth authentication');
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  // ============================================
  // OAuth Flow Tests (use real timers)
  // ============================================

  it('initiates OAuth flow on click', async () => {
    const mockResponse = {
      redirectUrl: 'https://oauth.example.com/auth',
      _connectionId: 'conn-123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { user } = render(<BankingLinkButton provider="SALTEDGE" />);
    const button = screen.getByRole('button');

    // Close popup immediately to prevent polling
    mockPopup.closed = true;

    await user.click(button);

    expect(global.fetch).toHaveBeenCalledWith('/api/banking/initiate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'SALTEDGE' }),
    });

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://oauth.example.com/auth',
      'BankLinkPopup',
      expect.stringContaining('width=600')
    );
  });

  it('focuses popup window after opening', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
    });

    const { user } = render(<BankingLinkButton />);
    const button = screen.getByRole('button');

    // Close popup immediately to prevent polling
    mockPopup.closed = true;

    await user.click(button);

    expect(mockPopup.focus).toHaveBeenCalled();
  });

  it('sends correct provider in request', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
    });

    const { user } = render(<BankingLinkButton provider="TINK" />);
    const button = screen.getByRole('button');

    // Close popup immediately to prevent polling
    mockPopup.closed = true;

    await user.click(button);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/banking/initiate-link',
      expect.objectContaining({
        body: JSON.stringify({ provider: 'TINK' }),
      })
    );
  });

  // ============================================
  // Message Event Tests (use real timers)
  // ============================================

  it('calls onSuccess when OAuth completion message is received', async () => {
    const onSuccess = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
    });

    const { user } = render(<BankingLinkButton onSuccess={onSuccess} />);
    const button = screen.getByRole('button');

    await user.click(button);

    // Simulate postMessage from callback page indicating success
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'BANKING_OAUTH_COMPLETE', accountCount: 2 },
          origin: window.location.origin,
        })
      );
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls onError when OAuth error message is received', async () => {
    const onError = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
    });

    const { user } = render(<BankingLinkButton onError={onError} />);
    const button = screen.getByRole('button');

    await user.click(button);

    // Simulate postMessage from callback page indicating error
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'BANKING_OAUTH_ERROR', error: 'Connection failed' },
          origin: window.location.origin,
        })
      );
    });

    expect(onError).toHaveBeenCalledWith('Connection failed');
  });

  it('ignores messages from different origins', async () => {
    const onSuccess = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
    });

    const { user } = render(<BankingLinkButton onSuccess={onSuccess} />);
    const button = screen.getByRole('button');

    // Close popup immediately
    mockPopup.closed = true;

    await user.click(button);

    // Simulate postMessage from different origin (should be ignored)
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'BANKING_OAUTH_COMPLETE', accountCount: 2 },
          origin: 'https://malicious-site.com',
        })
      );
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ============================================
  // Error Handling Tests (use real timers)
  // ============================================

  it('handles API error gracefully', async () => {
    const onError = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Failed to initiate OAuth' }),
    });

    const { user } = render(<BankingLinkButton onError={onError} />);
    const button = screen.getByRole('button');

    await user.click(button);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error linking account')).toBeInTheDocument();
    expect(screen.getByText('Failed to initiate OAuth')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('Failed to initiate OAuth');
  });

  it('handles missing redirect URL', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _connectionId: 'conn-123' }), // No redirectUrl
    });

    const { user } = render(<BankingLinkButton />);
    const button = screen.getByRole('button');

    await user.click(button);

    expect(screen.getByText('No redirect URL provided')).toBeInTheDocument();
  });

  it('handles popup blocking', async () => {
    mockWindowOpen.mockReturnValueOnce(null);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
    });

    const { user } = render(<BankingLinkButton />);
    const button = screen.getByRole('button');

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { user } = render(<BankingLinkButton />);
    const button = screen.getByRole('button');

    await user.click(button);

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('error has correct ARIA attributes', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Test error' }),
    });

    const { user } = render(<BankingLinkButton />);
    const button = screen.getByRole('button');

    await user.click(button);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-describedby', 'banking-link-error');
    expect(alert).toHaveAttribute('id', 'banking-link-error');
  });

  it('allows dismissing error message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Test error' }),
    });

    const { user } = render(<BankingLinkButton />);
    const button = screen.getByRole('button');

    await user.click(button);

    expect(screen.getByText('Test error')).toBeInTheDocument();

    const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
    await user.click(dismissButton);

    expect(screen.queryByText('Test error')).not.toBeInTheDocument();
  });

  // ============================================
  // Timer-dependent Tests (use fake timers)
  // ============================================

  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      mockPopup.closed = true;
      vi.runAllTimers();
      vi.useRealTimers();
    });

    it('displays loading state during OAuth flow', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
            });
          }, 100);
        })
      );

      render(<BankingLinkButton />);
      const button = screen.getByRole('button');

      // Use fireEvent for fake timers compatibility instead of userEvent
      await act(async () => {
        button.click();
      });

      // Loading state should be immediately visible
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();

      // Advance timers to resolve fetch
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    });

    it('displays spinner during loading', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
            });
          }, 100);
        })
      );

      render(<BankingLinkButton />);
      const button = screen.getByRole('button');

      // Use fireEvent for fake timers compatibility
      await act(async () => {
        button.click();
      });

      // Spinner should appear immediately while loading
      const svg = button.querySelector('svg.animate-spin');
      expect(svg).toBeInTheDocument();

      // Clean up - advance timers to complete fetch
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    });

    it('does not call onSuccess when popup is closed without OAuth completion', async () => {
      const onSuccess = vi.fn();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ redirectUrl: 'https://oauth.example.com/auth', _connectionId: 'conn-123' }),
      });

      render(<BankingLinkButton onSuccess={onSuccess} />);
      const button = screen.getByRole('button');

      await act(async () => {
        button.click();
      });

      // Simulate popup closure without OAuth completion (user cancelled)
      mockPopup.closed = true;

      // Advance timers to trigger polling
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // onSuccess should NOT be called when popup closes without completion message
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
