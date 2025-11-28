/**
 * Banking Page Redirect
 *
 * Redirects from the old /banking route to /dashboard/accounts.
 * Keeps the /banking/callback route working for OAuth.
 *
 * @module app/banking/page
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * BankingRedirect Component
 *
 * Redirects users to the new dashboard accounts page.
 *
 * @returns {JSX.Element} Loading indicator while redirecting
 */
export default function BankingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/accounts');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to accounts...</p>
      </div>
    </div>
  );
}
