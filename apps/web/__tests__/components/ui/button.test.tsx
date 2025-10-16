/**
 * Tests for Button component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { Button } from '../../../components/ui/button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('applies default variant and size classes', () => {
    render(<Button>Default Button</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
    expect(button).toHaveClass('h-10', 'px-4', 'py-2'); // default size
  });

  it('renders different variants correctly', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;

    variants.forEach(variant => {
      const { unmount } = render(<Button variant={variant}>{variant} Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  it('renders different sizes correctly', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const;

    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>{size} Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Clickable</Button>);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('spreads additional props', () => {
    render(
      <Button data-testid="test-button" title="Test Title">
        Props Button
      </Button>
    );

    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('title', 'Test Title');
  });
});