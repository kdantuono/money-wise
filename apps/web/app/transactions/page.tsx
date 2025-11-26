'use client'

export default function TransactionsPage() {
  return (
    <div data-testid="transactions-container" className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      <div data-testid="transactions-list" className="space-y-4">
        <div data-testid="empty-state" className="text-center py-12 text-gray-500">
          <p>No transactions yet</p>
        </div>
      </div>
    </div>
  )
}
