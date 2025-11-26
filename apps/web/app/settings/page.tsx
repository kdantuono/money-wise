'use client'

export default function SettingsPage() {
  return (
    <div data-testid="settings-container" className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        <div data-testid="settings-section" className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Profile Settings</h2>
          <p className="text-gray-600">Manage your profile information</p>
        </div>
      </div>
    </div>
  )
}
