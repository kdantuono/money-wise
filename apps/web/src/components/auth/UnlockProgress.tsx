import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// SRP: Single Responsibility - Display unlock progress animation
interface UnlockProgressProps {
  isVisible: boolean;
  progress: number;
}

export const UnlockProgress: React.FC<UnlockProgressProps> = ({
  isVisible,
  progress,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className='space-y-2'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className='flex justify-between text-sm text-slate-300'>
            <span>Authentication Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className='w-full bg-slate-700 rounded-full h-2 overflow-hidden'>
            <motion.div
              className='h-full bg-gradient-to-r from-cyan-400 to-purple-400'
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
