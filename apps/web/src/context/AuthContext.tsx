'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // DEV: Hardcode user for development mode
  const isDev = process.env.NODE_ENV === 'development';
  const mockUser = isDev ? {
    id: 'dev-user-1',
    email: 'dev@moneywise.com',
    name: 'Dev User',
  } : null;

  const [user, setUser] = useState<User | null>(mockUser);
  const [loading, setLoading] = useState(!isDev);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    // DEV MODE: Auto-login for development and UI testing
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Force dev bypass in development mode
      const mockUser = {
        id: 'dev-user-1',
        email: 'dev@moneywise.com',
        name: 'Dev User',
      };
      setUser(mockUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', 'dev-token');
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('dev-auth-bypass', 'true');
      }
    } else if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // DEV MODE: Special credentials for UI development
    if (
      process.env.NODE_ENV === 'development' &&
      email === 'dev@moneywise.com' &&
      password === 'dev123'
    ) {
      const mockUser = {
        id: 'dev-user-1',
        email: 'dev@moneywise.com',
        name: 'Dev User',
      };
      localStorage.setItem('token', 'dev-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('dev-auth-bypass', 'true');
      setUser(mockUser);
      return { success: true };
    }

    try {
      const response = await fetch('http://localhost:3002/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true };
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Login failed' }));
        return {
          success: false,
          error: errorData.message || 'Invalid credentials',
        };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('http://localhost:3002/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true };
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Registration failed' }));
        return {
          success: false,
          error: errorData.message || 'Registration failed',
        };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
