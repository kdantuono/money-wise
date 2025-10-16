import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService, type User, type LoginCredentials, type RegisterCredentials } from '@/lib/auth'

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
  loadUserFromStorage: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.login(credentials)

          // Store tokens in localStorage
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Login failed',
          })
          throw error
        }
      },

      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.register(credentials)

          // Store tokens in localStorage
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Registration failed',
          })
          throw error
        }
      },

      logout: async () => {
        try {
          await authService.logout()
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error)
        } finally {
          // Clear local storage
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      refreshAuth: async () => {
        const { refreshToken } = get()

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await authService.refreshToken(refreshToken)

          // Store new tokens
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          })
        } catch (error) {
          // Refresh failed, clear auth state
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          })
          throw error
        }
      },

      clearError: () => {
        set({ error: null })
      },

      loadUserFromStorage: () => {
        const accessToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')

        if (accessToken && refreshToken) {
          set({
            accessToken,
            refreshToken,
            isAuthenticated: true,
          })

          // Optionally fetch user profile
          authService.getProfile()
            .then(user => {
              set({ user })
            })
            .catch(() => {
              // If profile fetch fails, clear auth state
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
              })
            })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)