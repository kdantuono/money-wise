/**
 * Unit tests for OnboardingTip component (#053).
 * Focus: render, dismiss persistence (localStorage), accessibility.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingTip } from '@/components/onboarding/OnboardingTip';

const STORAGE_KEY = 'mw_onboarding_tip_test_id_dismissed';

describe('OnboardingTip', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders banner with message + CTA on first mount (not dismissed)', () => {
    render(<OnboardingTip id="test_id" message="Test message content" />);
    expect(screen.getByTestId('onboarding-tip-test_id')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-tip-dismiss-test_id')).toBeInTheDocument();
  });

  it('uses default title "Suggerimento" when not provided', () => {
    render(<OnboardingTip id="test_id" message="msg" />);
    expect(screen.getByText('Suggerimento')).toBeInTheDocument();
  });

  it('uses custom title + ctaLabel when provided', () => {
    render(
      <OnboardingTip
        id="test_id"
        title="Custom Title"
        message="msg"
        ctaLabel="OK grazie"
      />,
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('OK grazie');
  });

  it('does NOT render when dismiss flag already in localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { container } = render(<OnboardingTip id="test_id" message="msg" />);
    // useEffect runs synchronously in test → component returns null
    expect(container.querySelector('[data-testid="onboarding-tip-test_id"]')).toBeNull();
  });

  it('persists dismiss in localStorage when CTA clicked', () => {
    render(<OnboardingTip id="test_id" message="msg" />);
    fireEvent.click(screen.getByTestId('onboarding-tip-dismiss-test_id'));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('hides banner after dismiss click (same mount)', () => {
    render(<OnboardingTip id="test_id" message="msg" />);
    const btn = screen.getByTestId('onboarding-tip-dismiss-test_id');
    fireEvent.click(btn);
    expect(screen.queryByTestId('onboarding-tip-test_id')).toBeNull();
  });

  it('renders with forceShow=true even if dismiss flag set', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<OnboardingTip id="test_id" message="msg" forceShow />);
    expect(screen.getByTestId('onboarding-tip-test_id')).toBeInTheDocument();
  });

  it('has role="note" + aria-label for screen readers', () => {
    render(<OnboardingTip id="test_id" title="Tip title" message="msg" />);
    const banner = screen.getByRole('note');
    expect(banner).toHaveAttribute('aria-label', 'Suggerimento onboarding: Tip title');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('dismiss button has accessible aria-label', () => {
    render(<OnboardingTip id="test_id" message="msg" ctaLabel="OK" />);
    const btn = screen.getByTestId('onboarding-tip-dismiss-test_id');
    expect(btn).toHaveAttribute('aria-label', 'OK — nascondi suggerimento');
  });

  it('different ids have independent dismiss state', () => {
    const { rerender } = render(<OnboardingTip id="id_a" message="A" />);
    fireEvent.click(screen.getByTestId('onboarding-tip-dismiss-id_a'));
    // id_a dismissed, id_b should still show
    rerender(<OnboardingTip id="id_b" message="B" />);
    expect(screen.getByTestId('onboarding-tip-id_b')).toBeInTheDocument();
  });

  it('fails safely when localStorage throws (incognito)', () => {
    const originalSetItem = window.localStorage.setItem;
    vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    render(<OnboardingTip id="test_id" message="msg" />);
    // Should NOT crash on dismiss click
    expect(() =>
      fireEvent.click(screen.getByTestId('onboarding-tip-dismiss-test_id')),
    ).not.toThrow();
    window.localStorage.setItem = originalSetItem;
  });
});
