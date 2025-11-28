'use client';

import { CreditCard } from 'lucide-react';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <CreditCard className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">
            View and manage your transaction history
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          No transactions yet
        </h2>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Once you connect your accounts, your transactions will appear here automatically.
        </p>
        <p className="text-sm text-gray-400">
          Coming soon...
        </p>
      </div>
    </div>
  );
}
