/**
 * Unit tests for OnboardingTip component (#053).
 * Focus: render, dismiss persistence (localStorage), accessibility.
 *
 * Async assertions (findByTestId): component useEffect reads localStorage
 * post-mount → banner appears/disappears on next tick, not sync.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingTip } from '@/components/onboarding/OnboardingTip';

const STORAGE_KEY = 'mw_onboarding_tip_test_id_dismissed';

describe('OnboardingTip', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders banner with message + CTA on first mount (not dismissed)', async () => {
    render(<OnboardingTip id="test_id" message="Test message content" />);
    expect(await screen.findByTestId('onboarding-tip-test_id')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-tip-dismiss-test_id')).toBeInTheDocument();
  });

  it('uses default title "Suggerimento" when not provided', async () => {
    render(<OnboardingTip id="test_id" message="msg" />);
    expect(await screen.findByText('Suggerimento')).toBeInTheDocument();
  });

  it('uses custom title + ctaLabel when provided', async () => {
    render(
      <OnboardingTip
        id="test_id"
        title="Custom Title"
        message="msg"
        ctaLabel="OK grazie"
      />,
    );
    expect(await screen.findByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('OK grazie');
  });

  it('does NOT render when dismiss flag already in localStorage', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<OnboardingTip id="test_id" message="msg" />);
    // After useEffect resolves, component returns null — assert via waitFor
    await waitFor(() => {
      expect(screen.queryByTestId('onboarding-tip-test_id')).toBeNull();
    });
  });

  it('persists dismiss in localStorage when CTA clicked', async () => {
    render(<OnboardingTip id="test_id" message="msg" />);
    const btn = await screen.findByTestId('onboarding-tip-dismiss-test_id');
    fireEvent.click(btn);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('hides banner after dismiss click (same mount)', async () => {
    render(<OnboardingTip id="test_id" message="msg" />);
    const btn = await screen.findByTestId('onboarding-tip-dismiss-test_id');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.queryByTestId('onboarding-tip-test_id')).toBeNull();
    });
  });

  it('renders with forceShow=true even if dismiss flag set', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<OnboardingTip id="test_id" message="msg" forceShow />);
    expect(await screen.findByTestId('onboarding-tip-test_id')).toBeInTheDocument();
  });

  it('has role="note" + aria-label for screen readers', async () => {
    render(<OnboardingTip id="test_id" title="Tip title" message="msg" />);
    const banner = await screen.findByRole('note');
    expect(banner).toHaveAttribute('aria-label', 'Suggerimento onboarding: Tip title');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('dismiss button has accessible aria-label', async () => {
    render(<OnboardingTip id="test_id" message="msg" ctaLabel="OK" />);
    const btn = await screen.findByTestId('onboarding-tip-dismiss-test_id');
    expect(btn).toHaveAttribute('aria-label', 'OK — nascondi suggerimento');
  });

  it('different ids have independent dismiss state', async () => {
    const { rerender } = render(<OnboardingTip id="id_a" message="A" />);
    const dismissA = await screen.findByTestId('onboarding-tip-dismiss-id_a');
    fireEvent.click(dismissA);
    // id_a dismissed, id_b should still show
    rerender(<OnboardingTip id="id_b" message="B" />);
    expect(await screen.findByTestId('onboarding-tip-id_b')).toBeInTheDocument();
  });

  it('fails safely when localStorage throws (incognito)', async () => {
    // Spy via vi.spyOn — cleanup automatic via afterEach restoreAllMocks()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    render(<OnboardingTip id="test_id" message="msg" />);
    const btn = await screen.findByTestId('onboarding-tip-dismiss-test_id');
    // Should NOT crash on dismiss click
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});
