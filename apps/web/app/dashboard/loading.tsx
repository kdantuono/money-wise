'use client';

import { motion } from 'framer-motion';

/**
 * Dashboard Loading — Zecca branded, theme-aware
 */
export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <p className="text-[13px] text-muted-foreground">
          Caricamento...
        </p>
      </motion.div>
    </div>
  );
}
