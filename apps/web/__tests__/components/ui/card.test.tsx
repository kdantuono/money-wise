/**
 * Tests for Card component and its subcomponents
 * Tests rendering, composition, styling, and accessibility
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../../components/ui/card';

describe('Card Component', () => {
  describe('Card', () => {
    it('renders correctly', () => {
      render(<Card>Card content</Card>);

      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<Card data-testid="card">Card content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'shadow-sm');
    });

    it('applies custom className', () => {
      render(<Card className="custom-card-class" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-card-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('spreads additional props', () => {
      render(<Card data-testid="card" role="article" aria-label="Test Card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'article');
      expect(card).toHaveAttribute('aria-label', 'Test Card');
    });
  });

  describe('CardHeader', () => {
    it('renders correctly', () => {
      render(<CardHeader>Header content</CardHeader>);

      const header = screen.getByText('Header content');
      expect(header).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('applies custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardHeader ref={ref}>Header</CardHeader>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 element', () => {
      render(<CardTitle>Card Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3, name: 'Card Title' });
      expect(title).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardTitle>Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('custom-title');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<CardTitle ref={ref}>Title</CardTitle>);

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('CardDescription', () => {
    it('renders as paragraph element', () => {
      render(<CardDescription>Card description text</CardDescription>);

      const description = screen.getByText('Card description text');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('P');
    });

    it('applies default styling classes', () => {
      render(<CardDescription data-testid="description">Description</CardDescription>);

      const description = screen.getByTestId('description');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc" data-testid="description">Desc</CardDescription>);

      const description = screen.getByTestId('description');
      expect(description).toHaveClass('custom-desc');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<CardDescription ref={ref}>Description</CardDescription>);

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent', () => {
    it('renders correctly', () => {
      render(<CardContent>Content area</CardContent>);

      const content = screen.getByText('Content area');
      expect(content).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('applies custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>);

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-content');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardContent ref={ref}>Content</CardContent>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter', () => {
    it('renders correctly', () => {
      render(<CardFooter>Footer content</CardFooter>);

      const footer = screen.getByText('Footer content');
      expect(footer).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardFooter ref={ref}>Footer</CardFooter>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Card Composition', () => {
    it('renders complete card with all subcomponents', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Test Card Title</CardTitle>
            <CardDescription>Test card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('full-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Test Card Title' })).toBeInTheDocument();
      expect(screen.getByText('Test card description')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('renders card with only title and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Simple Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Simple content</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByRole('heading', { name: 'Simple Card' })).toBeInTheDocument();
      expect(screen.getByText('Simple content')).toBeInTheDocument();
    });

    it('renders multiple cards independently', () => {
      render(
        <>
          <Card data-testid="card-1">
            <CardTitle>Card 1</CardTitle>
          </Card>
          <Card data-testid="card-2">
            <CardTitle>Card 2</CardTitle>
          </Card>
        </>
      );

      expect(screen.getByTestId('card-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-2')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Card 1' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Card 2' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Main Title</CardTitle>
            <CardDescription>Subtitle</CardDescription>
          </CardHeader>
        </Card>
      );

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Main Title');
    });

    it('supports semantic HTML with custom roles', () => {
      render(
        <Card role="region" aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
          </CardHeader>
        </Card>
      );

      const card = screen.getByRole('region', { name: 'Accessible Card' });
      expect(card).toBeInTheDocument();
    });
  });
});
