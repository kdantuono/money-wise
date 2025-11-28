'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Settings className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Settings
        </h2>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Profile settings, notifications, security, and connected services will be available here.
        </p>
        <p className="text-sm text-gray-400">
          Coming soon...
        </p>
      </div>
    </div>
  );
}
