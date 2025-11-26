'use client'

export default function BudgetsPage() {
  return (
    <div data-testid="budgets-container" className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Budgets</h1>
      <div data-testid="budgets-list" className="space-y-4">
        <div data-testid="empty-state" className="text-center py-12 text-gray-500">
          <p>No budgets yet</p>
        </div>
      </div>
    </div>
  )
}
