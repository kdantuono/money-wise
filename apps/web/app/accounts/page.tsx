'use client'

export default function AccountsPage() {
  return (
    <div data-testid="accounts-container" className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Accounts</h1>
      <div data-testid="accounts-list" className="space-y-4">
        <div data-testid="empty-state" className="text-center py-12 text-gray-500">
          <p>No accounts yet</p>
        </div>
      </div>
    </div>
  )
}
