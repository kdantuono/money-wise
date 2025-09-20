'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { SecurityHeader } from '@/components/auth/SecurityHeader';
import { UnlockProgress } from '@/components/auth/UnlockProgress';
import { SecurityEffects } from '@/components/auth/SecurityEffects';
import { useAuthentication } from '@/hooks/useAuthentication';

interface FuturisticLoginWallProps {
  children: React.ReactNode;
}

export const FuturisticLoginWall: React.FC<FuturisticLoginWallProps> = ({
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
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (unlockProgress >= 100) {
      setTimeout(() => {
        setIsUnlocked(true);
      }, 500);
    }
  }, [unlockProgress]);

  if (isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className='w-full h-full'
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className='relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
      <SecurityEffects />

      {/* Main Wall Structure */}
      <div className='absolute inset-0 flex items-center justify-center'>
        <motion.div
          className='relative w-full max-w-md mx-4'
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {/* Security Lock Interface */}
          <Card className='relative overflow-hidden bg-slate-800/90 border-slate-700/50 backdrop-blur-lg shadow-2xl'>
            {/* Unlock Progress Overlay */}
            <AnimatePresence>
              {isUnlocking && (
                <motion.div
                  className='absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 z-5 pointer-events-none'
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: unlockProgress / 100 }}
                  transition={{ duration: 0.1 }}
                  style={{ transformOrigin: 'left' }}
                />
              )}
            </AnimatePresence>

            <SecurityHeader isUnlocking={isUnlocking} />

            <CardContent className='space-y-6 relative z-30'>
              <LoginForm
                email={email}
                password={password}
                isLoading={isLoading || isUnlocking}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={handleLogin}
              />

              <UnlockProgress
                isVisible={isUnlocking}
                progress={unlockProgress}
              />

              {/* Footer Links */}
              <div className='text-center space-y-2'>
                <p className='text-slate-400 text-sm'>
                  Need access credentials?{' '}
                  <button
                    onClick={() => router.push('/register')}
                    className='relative z-40 text-cyan-400 hover:text-cyan-300 underline transition-colors pointer-events-auto'
                    disabled={isUnlocking}
                  >
                    Request Access
                  </button>
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => {
                      localStorage.setItem('dev-auth-bypass', 'true');
                      localStorage.setItem('token', 'dev-token');
                      localStorage.setItem(
                        'user',
                        JSON.stringify({
                          id: 'dev-user-1',
                          email: 'dev@moneywise.com',
                          name: 'Dev User',
                        })
                      );
                      setIsUnlocked(true);
                    }}
                    className='block mx-auto mt-2 px-4 py-2 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors'
                  >
                    DEV: Skip Auth
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Floating Security Elements */}
          <motion.div
            className='absolute -top-10 -right-10 w-20 h-20 border border-cyan-400/30 rounded-full'
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className='absolute -bottom-10 -left-10 w-16 h-16 border border-purple-400/30 rounded-full'
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      </div>
    </div>
  );
};
