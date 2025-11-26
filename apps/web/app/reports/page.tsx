'use client'

export default function ReportsPage() {
  return (
    <div data-testid="reports-container" className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div data-testid="reports-list" className="space-y-4">
        <div data-testid="empty-state" className="text-center py-12 text-gray-500">
          <p>No reports available</p>
        </div>
      </div>
    </div>
  )
}
