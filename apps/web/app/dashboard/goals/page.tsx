'use client';

import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Target className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-500">
            Set and track your financial goals
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          No goals set
        </h2>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Create savings goals, debt payoff targets, or investment milestones to stay on track.
        </p>
        <Button disabled className="gap-2" title="Coming soon">
          <Plus className="h-4 w-4" />
          Create Goal
        </Button>
        <p className="text-xs text-gray-400 mt-3">
          Coming soon
        </p>
      </div>
    </div>
  );
}
