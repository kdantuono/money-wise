'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthentication } from '@/hooks/useAuthentication';

interface SimpleLoginWallProps {
  children: React.ReactNode;
}

export const SimpleLoginWall: React.FC<SimpleLoginWallProps> = ({
  children,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const {
    email,
    password,
    isLoading,
    isUnlocking,
    unlockProgress,
    setEmail,
    setPassword,
    handleLogin,
  } = useAuthentication();

  useEffect(() => {
    if (isAuthenticated && user) {
      setIsUnlocked(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    }
  }, [isAuthenticated, user, router]);

  if (isUnlocked || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center transition-opacity duration-500">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">

      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmMTAiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPC9wYXR0ZXJuPgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPgo8L3N2Zz4=')] opacity-20"></div>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full max-w-md mx-4">

          {/* Security Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-white font-medium">Secure Access Portal</span>
            </div>
          </div>

          {/* Login Card */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-2xl">
            <CardContent className="p-8">

              {/* Progress Bar */}
              {isUnlocking && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Authenticating...</span>
                    <span className="text-sm text-gray-500">{Math.round(unlockProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${unlockProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Login Form */}
              <LoginForm
                email={email}
                password={password}
                isLoading={isLoading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={handleLogin}
              />
            </CardContent>
          </Card>

          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-20 h-20 border border-cyan-400/30 rounded-full hover:border-cyan-400/50 transition-colors duration-300" />
          <div className="absolute -bottom-10 -left-10 w-16 h-16 border border-purple-400/30 rounded-full hover:border-purple-400/50 transition-colors duration-300" />
        </div>
      </div>
    </div>
  );
};