import { TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Investments | MoneyWise',
  description: 'Track and manage your investment portfolio',
};

export default function InvestmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <TrendingUp className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
          <p className="text-sm text-gray-500">
            Track and manage your investment portfolio
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          No investments tracked
        </h2>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Start tracking your stocks, ETFs, crypto, and other investments in one place.
        </p>
        <p className="text-sm text-gray-400">
          Coming soon...
        </p>
      </div>
    </div>
  );
}
