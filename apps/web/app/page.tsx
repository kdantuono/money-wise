import { redirect } from 'next/navigation';

/**
 * Root page — redirects to dashboard.
 * Middleware handles auth: if not logged in → /auth/login
 */
export default function HomePage() {
  redirect('/dashboard');
}
