/**
 * Tests for Input component
 * Tests accessibility, controlled/uncontrolled modes, error states, and user interactions
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { Input } from '../../../src/components/ui/input';
import { Label } from '../../../src/components/ui/label';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders input element correctly', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with placeholder text', () => {
      render(<Input placeholder="Enter your email" />);

      const input = screen.getByPlaceholderText('Enter your email');
      expect(input).toBeInTheDocument();
    });

    it('renders different input types', () => {
      const types = ['text', 'email', 'password', 'number', 'tel', 'url'] as const;

      types.forEach(type => {
        const { unmount } = render(<Input type={type} data-testid={`input-${type}`} />);
        const input = screen.getByTestId(`input-${type}`);
        expect(input).toHaveAttribute('type', type);
        unmount();
      });
    });

    it('applies custom className', () => {
      render(<Input className="custom-input-class" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input-class');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes when used with Label', () => {
      render(
        <div>
          <Label htmlFor="email-input">Email Address</Label>
          <Input id="email-input" type="email" />
        </div>
      );

      const input = screen.getByRole('textbox', { name: /email address/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('supports aria-describedby for error messages', () => {
      render(
        <div>
          <Input aria-describedby="error-message" aria-invalid="true" />
          <span id="error-message">Invalid email format</span>
        </div>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'error-message');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('supports aria-required attribute', () => {
      render(<Input aria-required="true" required />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toBeRequired();
    });
  });

  describe('User Interactions', () => {
    it('handles text input correctly', async () => {
      const { user } = render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('handles onChange event', async () => {
      const handleChange = vi.fn();
      const { user } = render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(handleChange).toHaveBeenCalled();
      expect(handleChange).toHaveBeenCalledTimes(4); // 't', 'e', 's', 't'
    });

    it('handles onBlur event', async () => {
      const handleBlur = vi.fn();
      const { user } = render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('handles onFocus event', async () => {
      const handleFocus = vi.fn();
      const { user } = render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe('Controlled Mode', () => {
    it('works as a controlled component', async () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="controlled-input"
            placeholder="Controlled input"
          />
        );
      };

      const { user } = render(<TestComponent />);

      const input = screen.getByPlaceholderText('Controlled input');
      await user.type(input, 'controlled');

      expect(input).toHaveValue('controlled');
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('does not accept input when disabled', async () => {
      const { user } = render(<Input disabled value="" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(input).toHaveValue('');
    });

    it('applies disabled opacity class', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('Read-only State', () => {
    it('is read-only when readOnly prop is true', () => {
      render(<Input readOnly value="read-only text" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('does not accept input when read-only', async () => {
      const { user } = render(<Input readOnly value="original" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'new');

      expect(input).toHaveValue('original');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('can focus input via ref', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Additional Props', () => {
    it('spreads additional HTML attributes', () => {
      render(
        <Input
          data-testid="test-input"
          maxLength={10}
          minLength={5}
          pattern="[A-Za-z]+"
          autoComplete="email"
        />
      );

      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('maxlength', '10');
      expect(input).toHaveAttribute('minlength', '5');
      expect(input).toHaveAttribute('pattern', '[A-Za-z]+');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });

    it('supports file input type with custom styling', () => {
      render(<Input type="file" data-testid="file-input" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveClass('file:border-0', 'file:bg-transparent');
    });
  });
});
