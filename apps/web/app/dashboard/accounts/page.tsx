'use client';

import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Wallet className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500">
            Manage your bank accounts and financial connections
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          No accounts connected
        </h2>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Connect your bank accounts to automatically track your transactions and balances.
        </p>
        <Button disabled className="gap-2" title="Coming soon">
          <Plus className="h-4 w-4" />
          Connect Account
        </Button>
        <p className="text-xs text-gray-400 mt-3">
          Coming soon
        </p>
      </div>
    </div>
  );
}
