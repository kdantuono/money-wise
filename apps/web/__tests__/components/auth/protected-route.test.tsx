/**
 * Tests for ProtectedRoute component
 *
 * Tests authentication checking, redirection, and content rendering
 * with the cookie-based auth system (validateSession, not loadUserFromStorage).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { ProtectedRoute } from '../../../src/components/auth/protected-route';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock auth store - matches current interface: { isAuthenticated, user, validateSession }
vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

// Import the mocked store for per-test configuration
import { useAuthStore } from '../../../src/store/auth.store';
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

// Standard mock user
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  fullName: 'John Doe',
  isEmailVerified: true,
  isActive: true,
};

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  describe('Checking State', () => {
    it('shows loading state during session validation', () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // ProtectedRoute shows loading spinner while checking
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('does not render children while checking authentication', () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession: vi.fn().mockReturnValue(new Promise(() => {})),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Access', () => {
    it('renders children when user is authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        validateSession: vi.fn(),
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
        user: mockUser,
        validateSession: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not call validateSession when already authenticated with user', async () => {
      const validateSession = vi.fn();

      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        validateSession,
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // When already authenticated with user, validateSession should not be called
      expect(validateSession).not.toHaveBeenCalled();
    });
  });

  describe('Unauthenticated Access', () => {
    it('calls validateSession when not authenticated', async () => {
      const validateSession = vi.fn().mockResolvedValue(false);

      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession,
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(validateSession).toHaveBeenCalledTimes(1);
      });
    });

    it('redirects to login when validateSession returns false', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession: vi.fn().mockResolvedValue(false),
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

    it('does not render protected content when not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession: vi.fn().mockResolvedValue(false),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login');
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Session Validation Success', () => {
    it('renders children after successful session validation', async () => {
      // Start unauthenticated, but validateSession succeeds
      // After validateSession succeeds, the store will update to authenticated
      const validateSession = vi.fn().mockResolvedValue(true);

      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession,
      });

      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Wait for validateSession to be called
      await waitFor(() => {
        expect(validateSession).toHaveBeenCalled();
      });

      // Simulate store update after successful validation
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        validateSession,
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
  });

  describe('Authentication State Transitions', () => {
    it('handles transition from checking to authenticated', async () => {
      const validateSession = vi.fn().mockResolvedValue(true);

      // Start not authenticated
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession,
      });

      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Should render null (checking)
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Transition to authenticated
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        validateSession,
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

    it('handles transition from checking to unauthenticated', async () => {
      const validateSession = vi.fn().mockResolvedValue(false);

      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        validateSession,
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
  });

  describe('Multiple Children', () => {
    it('renders all children when authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        validateSession: vi.fn(),
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
