/**
 * Tests for Label component
 * Tests rendering, accessibility, and Radix UI integration
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';

describe('Label Component', () => {
  describe('Rendering', () => {
    it('renders label element correctly', () => {
      render(<Label>Label text</Label>);

      const label = screen.getByText('Label text');
      expect(label).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<Label data-testid="label">Text</Label>);

      const label = screen.getByTestId('label');
      expect(label).toHaveClass('text-sm', 'font-medium', 'leading-none');
    });

    it('applies custom className', () => {
      render(<Label className="custom-label-class">Custom</Label>);

      const label = screen.getByText('Custom');
      expect(label).toHaveClass('custom-label-class');
    });
  });

  describe('Accessibility', () => {
    it('connects to input via htmlFor attribute', () => {
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" />
        </div>
      );

      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox', { name: 'Username' });

      expect(label).toHaveAttribute('for', 'username');
      expect(input).toHaveAttribute('id', 'username');
    });

    it('supports peer-disabled styling', () => {
      render(<Label className="peer-disabled:opacity-70">Disabled Label</Label>);

      const label = screen.getByText('Disabled Label');
      expect(label).toHaveClass('peer-disabled:opacity-70', 'peer-disabled:cursor-not-allowed');
    });

    it('works with form controls', () => {
      render(
        <form>
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" required />
        </form>
      );

      const label = screen.getByText('Email Address');
      const input = screen.getByRole('textbox', { name: 'Email Address' });

      expect(label).toBeInTheDocument();
      expect(input).toBeRequired();
    });
  });

  describe('Radix UI Integration', () => {
    it('uses Radix Label primitive', () => {
      render(<Label htmlFor="test">Radix Label</Label>);

      const label = screen.getByText('Radix Label');
      // Radix UI labels render as label elements
      expect(label.tagName).toBe('LABEL');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Ref Label</Label>);

      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });

    it('spreads additional props', () => {
      render(
        <Label
          htmlFor="test-input"
          data-testid="test-label"
          aria-label="Test Label"
        >
          Test
        </Label>
      );

      const label = screen.getByTestId('test-label');
      expect(label).toHaveAttribute('for', 'test-input');
      expect(label).toHaveAttribute('aria-label', 'Test Label');
    });
  });

  describe('Form Integration', () => {
    it('displays error state with associated input', () => {
      render(
        <div>
          <Label htmlFor="password" className="text-destructive">
            Password (required)
          </Label>
          <Input
            id="password"
            type="password"
            aria-invalid="true"
            aria-describedby="password-error"
          />
          <span id="password-error" className="text-sm text-destructive">
            Password is required
          </span>
        </div>
      );

      const label = screen.getByText('Password (required)');
      expect(label).toHaveClass('text-destructive');

      const input = screen.getByLabelText('Password (required)');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('works with multiple form fields', () => {
      render(
        <form>
          <div>
            <Label htmlFor="first-name">First Name</Label>
            <Input id="first-name" />
          </div>
          <div>
            <Label htmlFor="last-name">Last Name</Label>
            <Input id="last-name" />
          </div>
        </form>
      );

      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    });
  });

  describe('Styling Variants', () => {
    it('renders with default variant', () => {
      render(<Label>Default Label</Label>);

      const label = screen.getByText('Default Label');
      expect(label).toHaveClass('text-sm', 'font-medium');
    });

    it('supports custom styling for required fields', () => {
      render(
        <Label htmlFor="required-field" className="after:content-['*'] after:ml-0.5 after:text-destructive">
          Required Field
        </Label>
      );

      const label = screen.getByText('Required Field');
      expect(label).toHaveClass("after:content-['*']");
    });
  });
});
