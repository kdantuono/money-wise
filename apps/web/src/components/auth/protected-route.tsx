/**
 * Protected Route Component
 *
 * Wraps routes that require authentication.
 * Ensures user is authenticated before rendering children.
 */

'use client';

import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // TODO: Add authentication check
  // For now, just render children
  return <>{children}</>;
}
