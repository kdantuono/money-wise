import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// SRP: Single Responsibility - Handle authentication logic and state
export const useAuthentication = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(0);

  const { login } = useAuth();

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setIsUnlocking(true);

      try {
        const result = await login(email, password);

        if (result.success) {
          // Start the unlock animation sequence
          const interval = setInterval(() => {
            setUnlockProgress(prev => {
              if (prev >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                  toast.success('Access granted! Welcome to MoneyWise');
                }, 500);
                return 100;
              }
              return prev + 2;
            });
          }, 50);
        } else {
          setIsUnlocking(false);
          setUnlockProgress(0);
          toast.error(result.error || 'Authentication failed');
        }
      } catch (error) {
        setIsUnlocking(false);
        setUnlockProgress(0);
        toast.error('System error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, login]
  );

  return {
    email,
    password,
    isLoading,
    isUnlocking,
    unlockProgress,
    setEmail,
    setPassword,
    handleLogin,
  };
};
