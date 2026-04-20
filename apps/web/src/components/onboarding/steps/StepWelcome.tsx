'use client';

import { motion } from 'framer-motion';
import { Sparkles, Brain, Diamond, TrendingUp } from 'lucide-react';

interface StepWelcomeProps {
  /** User's first name from auth store. Null = fallback to generic greeting. */
  firstName: string | null;
}

export function StepWelcome({ firstName }: StepWelcomeProps) {
  const greeting = firstName ? `Ciao, ${firstName}! 👋` : 'Ciao! 👋';

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      {/* Animated hero icon with purple-to-blue gradient */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg"
        aria-hidden="true"
      >
        <motion.div
          animate={{ rotate: [0, 10, -8, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
      </motion.div>

      {/* Greeting */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">{greeting}</h1>
        <p className="text-base text-muted-foreground max-w-md leading-relaxed">
          Benvenuto su Zecca. In pochi step configureremo il tuo hub finanziario personalizzato con AI.
        </p>
      </div>

      {/* Feature chips */}
      <div
        className="flex flex-wrap justify-center gap-3"
        role="list"
        aria-label="Funzionalita principali"
      >
        {/* Chip 1: 5 Agenti AI */}
        <div
          role="listitem"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/40"
        >
          <Brain
            className="w-4 h-4 text-purple-500 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            5 Agenti AI
          </span>
        </div>

        {/* Chip 2: Gamification */}
        <div
          role="listitem"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/40"
        >
          <Diamond
            className="w-4 h-4 text-blue-500 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Gamification
          </span>
        </div>

        {/* Chip 3: Analisi Smart */}
        <div
          role="listitem"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/40"
        >
          <TrendingUp
            className="w-4 h-4 text-green-500 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Analisi Smart
          </span>
        </div>
      </div>
    </div>
  );
}
