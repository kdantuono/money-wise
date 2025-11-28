/**
 * Tests for DashboardTemplate component
 * Tests page transition animations wrapper
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import DashboardTemplate from '../../../app/dashboard/template';

describe('DashboardTemplate', () => {
  it('renders children content', () => {
    render(
      <DashboardTemplate>
        <div>Test Child Content</div>
      </DashboardTemplate>
    );

    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('wraps children in animation container', () => {
    const { container } = render(
      <DashboardTemplate>
        <div>Content</div>
      </DashboardTemplate>
    );

    const animationWrapper = container.querySelector('.animate-fade-in');
    expect(animationWrapper).toBeInTheDocument();
  });

  it('preserves children structure', () => {
    render(
      <DashboardTemplate>
        <div data-testid="child-element">
          <span>Nested Content</span>
        </div>
      </DashboardTemplate>
    );

    const childElement = screen.getByTestId('child-element');
    expect(childElement).toBeInTheDocument();
    expect(screen.getByText('Nested Content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <DashboardTemplate>
        <div>First Child</div>
        <div>Second Child</div>
      </DashboardTemplate>
    );

    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
  });
});
