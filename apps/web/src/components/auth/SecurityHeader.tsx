import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Database } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// SRP: Single Responsibility - Display security-themed header with status indicators
interface SecurityHeaderProps {
  isUnlocking: boolean;
}

export const SecurityHeader: React.FC<SecurityHeaderProps> = ({
  isUnlocking,
}) => {
  return (
    <CardHeader className='text-center relative z-30'>
      <motion.div
        className='mx-auto mb-4 relative'
        animate={
          isUnlocking ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}
        }
        transition={{ duration: 0.5, repeat: isUnlocking ? Infinity : 0 }}
      >
        <div className='relative'>
          <Shield className='h-16 w-16 text-cyan-400 mx-auto' />
          {isUnlocking && (
            <motion.div
              className='absolute inset-0 border-4 border-cyan-400 rounded-full'
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>
      </motion.div>

      <CardTitle className='text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent'>
        SECURE ACCESS
      </CardTitle>
      <CardDescription className='text-slate-300'>
        {isUnlocking
          ? 'Authenticating...'
          : 'Enter credentials to unlock MoneyWise'}
      </CardDescription>

      {/* Status Indicators */}
      <div className='flex justify-center space-x-4 mt-4'>
        <div className='flex items-center space-x-2'>
          <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
          <span className='text-xs text-slate-400'>SYSTEM ONLINE</span>
        </div>
        <div className='flex items-center space-x-2'>
          <Database className='w-3 h-3 text-blue-400' />
          <span className='text-xs text-slate-400'>ENCRYPTED</span>
        </div>
      </div>
    </CardHeader>
  );
};
