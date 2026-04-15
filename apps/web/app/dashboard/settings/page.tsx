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
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';

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
  const { setTheme } = useTheme();
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
        preferences: (() => {
          const prefs = user.preferences as Record<string, unknown> | null;
          const notif = prefs?.notifications as Record<string, boolean> | undefined;
          return {
            theme: (prefs?.theme as 'light' | 'dark' | 'auto') || 'auto',
            language: (prefs?.language as string) || 'en',
            notifications: {
              email: notif?.email ?? true,
              push: notif?.push ?? true,
              categories: notif?.categories ?? true,
              budgets: notif?.budgets ?? true,
            },
          };
        })(),
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
      const themeValue = value as 'light' | 'dark' | 'auto';
      setFormData((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          theme: themeValue,
        },
      }));
      // Apply theme immediately (backend uses 'auto', frontend uses 'system')
      setTheme(themeValue === 'auto' ? 'system' : themeValue);
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
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      // Update profile in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          timezone: formData.timezone,
          currency: formData.currency,
          preferences: JSON.parse(JSON.stringify(formData.preferences)),
        })
        .eq('id', user.id);

      if (profileError) {
        throw new Error(profileError.message || 'Failed to update profile');
      }

      // Update the auth store with new user data
      setUser({
        ...user,
        firstName: formData.firstName,
        lastName: formData.lastName,
        timezone: formData.timezone,
        currency: formData.currency,
        preferences: formData.preferences as Record<string, unknown>,
        fullName: `${formData.firstName} ${formData.lastName}`,
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-xl">
          <SettingsIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.01em] text-foreground">Impostazioni</h1>
          <p className="text-[13px] text-muted-foreground">
            Gestisci il tuo account e le tue preferenze
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
          <p className="text-[13px] text-rose-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <p className="text-[13px] text-emerald-600">{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Information */}
        <div className="bg-card rounded-2xl border-0 shadow-sm p-6">
          <h2 className="text-[14px] font-medium text-foreground mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Profile Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-foreground mb-1"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                required
                minLength={2}
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                required
                minLength={2}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1"
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-card rounded-2xl border-0 shadow-sm p-6">
          <h2 className="text-[14px] font-medium text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            Regional Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="timezone"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
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
                className="block text-sm font-medium text-foreground mb-1"
              >
                <DollarSign className="inline h-4 w-4 mr-1" />
                Preferred Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
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
        <div className="bg-card rounded-2xl border-0 shadow-sm p-6">
          <h2 className="text-[14px] font-medium text-foreground mb-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-muted-foreground" />
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
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-muted-foreground'
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
          <p className="text-xs text-muted-foreground mt-2">
            Theme changes apply immediately and are saved to your profile.
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl border-0 shadow-sm p-6">
          <h2 className="text-[14px] font-medium text-foreground mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
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
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
              >
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
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
                  className="h-5 w-5 text-primary rounded focus:ring-primary"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Notification preferences are saved but the feature is coming soon.
          </p>
        </div>

        {/* Account Information (Read Only) */}
        <div className="bg-card rounded-2xl border-0 shadow-sm p-6">
          <h2 className="text-[14px] font-medium text-foreground mb-4">
            Informazioni Account
          </h2>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Account ID</dt>
              <dd className="font-mono text-foreground mt-1">{user.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Account Status</dt>
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
              <dt className="text-muted-foreground">Member Since</dt>
              <dd className="text-foreground mt-1">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email Verified</dt>
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
