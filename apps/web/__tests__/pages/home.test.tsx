/**
 * Tests for HomePage component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../utils/test-utils';
import HomePage from '../../app/page';

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('MoneyWise');
  });

  it('renders the subtitle', () => {
    render(<HomePage />);

    const subtitle = screen.getByText('AI-powered Personal Finance Management');
    expect(subtitle).toBeInTheDocument();
  });

  it('has correct CSS classes for layout', () => {
    render(<HomePage />);

    const container = screen.getByRole('heading').closest('div');
    expect(container).toHaveClass('text-center');
  });

  it('renders with accessibility-friendly structure', () => {
    render(<HomePage />);

    // Check for heading hierarchy
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();

    // Check for descriptive text
    const description = screen.getByText(/AI-powered Personal Finance Management/i);
    expect(description).toBeInTheDocument();
  });
});