import axios from 'axios'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  avatar?: string
  timezone?: string
  currency?: string
  preferences?: any
  lastLoginAt?: string
  emailVerifiedAt?: string
  createdAt: string
  updatedAt: string
  fullName: string
  isEmailVerified: boolean
  isActive: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
  expiresIn: number
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

// API Client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include auth token
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor to handle token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          })

          const { accessToken } = response.data
          localStorage.setItem('accessToken', accessToken)

          return authApi(originalRequest)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/auth/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

// Auth API functions
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await authApi.post('/auth/login', credentials)
    return response.data
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await authApi.post('/auth/register', credentials)
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await authApi.post('/auth/refresh', { refreshToken })
    return response.data
  },

  getProfile: async (): Promise<User> => {
    const response = await authApi.get('/auth/profile')
    return response.data
  },

  logout: async (): Promise<void> => {
    await authApi.post('/auth/logout')
  },
}