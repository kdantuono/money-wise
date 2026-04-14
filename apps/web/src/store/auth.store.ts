/**
 * Auth Store — Supabase Auth
 *
 * Zustand store for authentication state using Supabase Auth.
 * Session managed by Supabase's cookie-based SSR integration.
 *
 * @module store/auth.store
 */

import { create } from 'zustand'
import { authService, type User } from '../../lib/auth'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => Promise<void>
  validateSession: () => Promise<boolean>
  clearError: () => void
  loadUserFromStorage: () => Promise<void>
  setUser: (user: User | null) => void
}

const parseErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  clearError: () => set({ error: null }),

  loadUserFromStorage: async () => {
    try {
      await get().validateSession()
    } catch {
      set({ user: null, isAuthenticated: false })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const { user } = await authService.login({ email, password })
      set({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch (error) {
      const errorMessage = parseErrorMessage(error)
      set({ error: errorMessage, isLoading: false, user: null, isAuthenticated: false })
      throw error
    }
  },

  register: async (email: string, password: string, firstName: string, lastName: string) => {
    set({ isLoading: true, error: null })

    try {
      const result = await authService.register({ email, password, firstName, lastName })

      if (result.needsEmailConfirmation) {
        set({ user: result.user, isAuthenticated: false, isLoading: false, error: null })
        return
      }

      set({ user: result.user, isAuthenticated: true, isLoading: false, error: null })
    } catch (error) {
      const errorMessage = parseErrorMessage(error)
      set({ error: errorMessage, isLoading: false, user: null, isAuthenticated: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      set({ user: null, isAuthenticated: false, error: null })
    }
  },

  validateSession: async (): Promise<boolean> => {
    try {
      const user = await authService.getProfile()
      set({ user, isAuthenticated: true })
      return true
    } catch {
      set({ user: null, isAuthenticated: false })
      return false
    }
  },
}))
