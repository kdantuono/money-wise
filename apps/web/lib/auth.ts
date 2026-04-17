/**
 * Auth Service — Supabase Auth
 *
 * Replaces the old BFF cookie/CSRF pattern with Supabase Auth.
 * Session is managed via Supabase's built-in cookie handling (@supabase/ssr).
 *
 * @module lib/auth
 */

import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/utils/supabase/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  avatar?: string | null
  timezone?: string | null
  currency: string
  preferences?: Record<string, unknown> | null
  onboarded: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
  fullName: string
  isEmailVerified: boolean
  isActive: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
}

function profileToUser(profile: ProfileRow, email: string, emailConfirmedAt?: string | null): User {
  return {
    id: profile.id,
    email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    status: profile.status,
    avatar: profile.avatar,
    timezone: profile.timezone,
    currency: profile.currency,
    preferences: profile.preferences as Record<string, unknown> | null,
    onboarded: profile.onboarded,
    lastLoginAt: profile.last_login_at,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    fullName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || email,
    isEmailVerified: !!emailConfirmedAt,
    isActive: profile.status === 'ACTIVE',
  }
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User }> {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) throw new Error(error.message)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) throw new Error('Failed to load profile')

    return { user: profileToUser(profile, data.user.email!, data.user.email_confirmed_at) }
  },

  async register(credentials: RegisterCredentials): Promise<{ user: User; needsEmailConfirmation: boolean }> {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          first_name: credentials.firstName,
          last_name: credentials.lastName,
        },
      },
    })

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Registration failed — no user returned')

    // If email confirmation is required, session is null — can't query profiles via RLS
    if (!data.session) {
      return {
        needsEmailConfirmation: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
          firstName: credentials.firstName,
          lastName: credentials.lastName,
          role: 'ADMIN',
          status: 'ACTIVE',
          currency: 'EUR',
          onboarded: false,
          createdAt: data.user.created_at,
          updatedAt: data.user.created_at,
          fullName: `${credentials.firstName} ${credentials.lastName}`,
          isEmailVerified: false,
          isActive: true,
        },
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) throw new Error('Failed to load profile after registration')

    return {
      needsEmailConfirmation: false,
      user: profileToUser(profile, data.user.email!, data.user.email_confirmed_at),
    }
  },

  async getProfile(): Promise<User> {
    const supabase = createClient()

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) throw new Error('Not authenticated')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileError) throw new Error('Failed to load profile')

    return profileToUser(profile, authUser.email!, authUser.email_confirmed_at)
  },

  async logout(): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },
}
