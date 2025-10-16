/**
 * Tests for ProtectedRoute component
 * Tests authentication checking, redirection, loading states, and HOC
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { ProtectedRoute, withAuth } from '../../../components/auth/protected-route';
import { useAuthStore } from '../../../stores/auth-store';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock auth store
vi.mock('../../../stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  describe('Loading State', () => {
    it('shows loading spinner during initialization', () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        loadUserFromStorage: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Should show spinner (animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading spinner while auth is loading', () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        loadUserFromStorage: vi.fn(),
      });

      const { container } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const loadingContainer = container.querySelector('.min-h-screen.flex.items-center.justify-center');
      expect(loadingContainer).toBeInTheDocument();
    });
  });

  describe('Authenticated Access', () => {
    it('renders children when user is authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('does not redirect when user is authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('calls loadUserFromStorage on mount', () => {
      const loadUserFromStorage = vi.fn();

      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage,
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(loadUserFromStorage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unauthenticated Access', () => {
    it('redirects to login when not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('shows access denied message when not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/You need to be logged in/)).toBeInTheDocument();
      });
    });

    it('does not render protected content when not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided and not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      const CustomFallback = () => <div>Custom Access Denied</div>;

      render(
        <ProtectedRoute fallback={<CustomFallback />}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
        expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      });
    });

    it('does not render custom fallback when authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      const CustomFallback = () => <div>Custom Access Denied</div>;

      render(
        <ProtectedRoute fallback={<CustomFallback />}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Custom Access Denied')).not.toBeInTheDocument();
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication State Transitions', () => {
    it('handles transition from loading to authenticated', async () => {
      const loadUserFromStorage = vi.fn();

      // Start with loading state
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        loadUserFromStorage,
      });

      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Should show loading
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage,
      });

      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('handles transition from loading to unauthenticated', async () => {
      const loadUserFromStorage = vi.fn();

      // Start with loading state
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        loadUserFromStorage,
      });

      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Transition to unauthenticated
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loadUserFromStorage,
      });

      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login');
      });
    });
  });

  describe('Multiple Children', () => {
    it('renders all children when authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Child 1')).toBeInTheDocument();
        expect(screen.getByText('Child 2')).toBeInTheDocument();
        expect(screen.getByText('Child 3')).toBeInTheDocument();
      });
    });
  });
});

describe('withAuth Higher-Order Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  describe('Component Wrapping', () => {
    it('wraps component with ProtectedRoute', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      const TestComponent = ({ title }: { title: string }) => <div>{title}</div>;
      const ProtectedComponent = withAuth(TestComponent);

      render(<ProtectedComponent title="Test Title" />);

      await waitFor(() => {
        expect(screen.getByText('Test Title')).toBeInTheDocument();
      });
    });

    it('forwards props to wrapped component', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      const TestComponent = ({ name, age }: { name: string; age: number }) => (
        <div>
          {name} - {age}
        </div>
      );

      const ProtectedComponent = withAuth(TestComponent);

      render(<ProtectedComponent name="John" age={30} />);

      await waitFor(() => {
        expect(screen.getByText('John - 30')).toBeInTheDocument();
      });
    });

    it('protects wrapped component from unauthenticated access', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      const TestComponent = () => <div>Sensitive Data</div>;
      const ProtectedComponent = withAuth(TestComponent);

      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Sensitive Data')).not.toBeInTheDocument();
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });

    it('redirects to login when wrapped component accessed without auth', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      const TestComponent = () => <div>Protected Page</div>;
      const ProtectedComponent = withAuth(TestComponent);

      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login');
      });
    });
  });

  describe('HOC with Complex Components', () => {
    it('works with components that have state', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loadUserFromStorage: vi.fn(),
      });

      const StatefulComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
          </div>
        );
      };

      const ProtectedComponent = withAuth(StatefulComponent);
      const { user } = render(<ProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByText('Count: 0')).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /increment/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Count: 1')).toBeInTheDocument();
      });
    });
  });
});
