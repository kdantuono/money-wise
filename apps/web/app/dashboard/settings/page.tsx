/**
 * Settings Page
 *
 * User profile and preferences management.
 * Connects to /api/users/:id for updates.
 *
 * @module app/dashboard/settings/page
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Globe,
  DollarSign,
  Bell,
  Moon,
  Sun,
  Monitor,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { getCsrfToken } from '@/utils/csrf';

// =============================================================================
// Types
// =============================================================================

interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    categories?: boolean;
    budgets?: boolean;
  };
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  currency: string;
  preferences: UserPreferences;
}

// =============================================================================
// Constants
// =============================================================================

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'GMT/BST (London)' },
  { value: 'Europe/Paris', label: 'CET (Paris)' },
  { value: 'Europe/Berlin', label: 'CET (Berlin)' },
  { value: 'Europe/Rome', label: 'CET (Rome)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'CST (China)' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore)' },
  { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
  { value: 'UTC', label: 'UTC' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro' },
  { value: 'GBP', label: 'British Pound' },
  { value: 'JPY', label: 'Japanese Yen' },
  { value: 'CAD', label: 'Canadian Dollar' },
  { value: 'AUD', label: 'Australian Dollar' },
  { value: 'CHF', label: 'Swiss Franc' },
  { value: 'CNY', label: 'Chinese Yuan' },
  { value: 'INR', label: 'Indian Rupee' },
  { value: 'BRL', label: 'Brazilian Real' },
];

// =============================================================================
// Component
// =============================================================================

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    timezone: 'America/New_York',
    currency: 'USD',
    preferences: {
      theme: 'auto',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        categories: true,
        budgets: true,
      },
    },
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        timezone: user.timezone || 'America/New_York',
        currency: user.currency || 'USD',
        preferences: {
          theme: user.preferences?.theme || 'auto',
          language: user.preferences?.language || 'en',
          notifications: {
            email: user.preferences?.notifications?.email ?? true,
            push: user.preferences?.notifications?.push ?? true,
            categories: user.preferences?.notifications?.categories ?? true,
            budgets: user.preferences?.notifications?.budgets ?? true,
          },
        },
      });
    }
  }, [user]);

  /**
   * Handle form input changes
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith('notifications.')) {
      const notifKey = name.split('.')[1] as keyof NonNullable<UserPreferences['notifications']>;
      setFormData((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          notifications: {
            ...prev.preferences.notifications,
            [notifKey]: checked,
          },
        },
      }));
    } else if (name === 'theme') {
      setFormData((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          theme: value as 'light' | 'dark' | 'auto',
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  /**
   * Save profile changes
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          timezone: formData.timezone,
          currency: formData.currency,
          preferences: formData.preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();

      // Update the auth store with new user data
      setUser({
        ...user,
        ...updatedUser,
      });

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <SettingsIcon className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            Profile Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={2}
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={2}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-500" />
            Regional Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="timezone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <DollarSign className="inline h-4 w-4 mr-1" />
                Preferred Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur.value} value={cur.value}>
                    {cur.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-gray-500" />
            Appearance
          </h2>

          <div className="flex gap-3">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'auto', label: 'System', icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`
                  flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    formData.preferences.theme === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={formData.preferences.theme === value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <Icon className="h-5 w-5" />
                <span className="font-medium">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: Theme preferences are saved but the feature is coming soon.
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            Notifications
          </h2>

          <div className="space-y-4">
            {[
              {
                key: 'email',
                label: 'Email Notifications',
                description: 'Receive important updates via email',
              },
              {
                key: 'push',
                label: 'Push Notifications',
                description: 'Get real-time alerts in your browser',
              },
              {
                key: 'budgets',
                label: 'Budget Alerts',
                description: 'Notify when approaching budget limits',
              },
              {
                key: 'categories',
                label: 'Category Insights',
                description: 'Weekly spending insights by category',
              },
            ].map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
                <input
                  type="checkbox"
                  name={`notifications.${key}`}
                  checked={
                    formData.preferences.notifications?.[
                      key as keyof NonNullable<UserPreferences['notifications']>
                    ] ?? true
                  }
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: Notification preferences are saved but the feature is coming soon.
          </p>
        </div>

        {/* Account Information (Read Only) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Account Information
          </h2>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Account ID</dt>
              <dd className="font-mono text-gray-900 mt-1">{user.id}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Account Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {user.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Member Since</dt>
              <dd className="text-gray-900 mt-1">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Email Verified</dt>
              <dd className="mt-1">
                {user.isEmailVerified ? (
                  <span className="inline-flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center text-yellow-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Not verified
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
