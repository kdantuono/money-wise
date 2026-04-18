/**
 * Tests for ComingSoonTab — placeholder for unfinished Settings tabs.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Crown, Key } from 'lucide-react';

import { ComingSoonTab } from '../../../src/components/settings/ComingSoonTab';

describe('ComingSoonTab', () => {
  it('renders title, default eta label, and description', () => {
    render(
      <ComingSoonTab
        icon={Crown}
        title="Gestione Piano"
        description="Passa a Pro o Premium per sbloccare altre feature."
      />
    );
    expect(screen.getByText('Gestione Piano')).toBeInTheDocument();
    expect(screen.getByText(/In arrivo — Beta Q3 2026/)).toBeInTheDocument();
    expect(
      screen.getByText(/Passa a Pro o Premium/)
    ).toBeInTheDocument();
  });

  it('honors a custom eta label', () => {
    render(
      <ComingSoonTab
        icon={Key}
        title="Chiavi API"
        description="x"
        eta="Q4 2026"
      />
    );
    expect(screen.getByText(/In arrivo — Q4 2026/)).toBeInTheDocument();
  });

  it('renders preview features when provided', () => {
    render(
      <ComingSoonTab
        title="X"
        description="y"
        previewFeatures={['Feature uno', 'Feature due', 'Feature tre']}
      />
    );
    expect(screen.getByText('Cosa potrai fare')).toBeInTheDocument();
    expect(screen.getByText('Feature uno')).toBeInTheDocument();
    expect(screen.getByText('Feature due')).toBeInTheDocument();
    expect(screen.getByText('Feature tre')).toBeInTheDocument();
  });

  it('does not render the preview section when no features passed', () => {
    render(<ComingSoonTab title="X" description="y" />);
    expect(screen.queryByText('Cosa potrai fare')).not.toBeInTheDocument();
  });

  it('does not render the preview section for an empty array', () => {
    render(<ComingSoonTab title="X" description="y" previewFeatures={[]} />);
    expect(screen.queryByText('Cosa potrai fare')).not.toBeInTheDocument();
  });

  it('applies a custom icon gradient class', () => {
    const { container } = render(
      <ComingSoonTab
        title="X"
        description="y"
        iconGradient="from-red-500 to-pink-500"
      />
    );
    const icon = container.querySelector('[class*="from-red-500"]');
    expect(icon).not.toBeNull();
  });
});
