'use client';

/**
 * ComingSoonTab — generic "In arrivo" placeholder for Settings tabs
 * whose functionality is not yet wired (Piano, Integrazioni, API Keys).
 *
 * Replaces the previous mock UI that showed fake buttons/feedback. The
 * real implementation for each tab will come in a later sprint — this
 * placeholder sets expectations honestly without removing the tab entry
 * from the nav (users still discover the feature area exists).
 *
 * @module components/settings/ComingSoonTab
 */

import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ComingSoonTabProps {
  /** Optional hero icon (lucide). Defaults to Clock. */
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  /** Title shown in the hero card. */
  title: string;
  /** One-sentence description of what this tab will do when live. */
  description: string;
  /** Expected availability label. Default: "Beta Q3 2026". */
  eta?: string;
  /** Gradient classes for the hero icon background. */
  iconGradient?: string;
  /** Optional bullet list of features the user can expect. */
  previewFeatures?: string[];
}

export function ComingSoonTab({
  icon: Icon = Clock,
  title,
  description,
  eta = 'Beta Q3 2026',
  iconGradient = 'from-indigo-500 to-violet-500',
  previewFeatures,
}: ComingSoonTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="p-6 rounded-2xl border-0 shadow-sm bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-blue-500/5">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-lg flex-shrink-0`}
            aria-hidden="true"
          >
            <Icon className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[18px] font-medium text-foreground">{title}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                In arrivo — {eta}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">
              {description}
            </p>
          </div>
        </div>
      </Card>

      {previewFeatures && previewFeatures.length > 0 && (
        <Card className="p-6 rounded-2xl border-0 shadow-sm">
          <h4 className="text-[14px] font-medium text-foreground mb-3">
            Cosa potrai fare
          </h4>
          <ul className="space-y-2">
            {previewFeatures.map((feature, index) => (
              <li
                // Index-based key — feature strings are not guaranteed unique
                // (callers may pass duplicate labels) and the list is static
                // per render so index is stable.
                key={`${index}-${feature}`}
                className="flex items-start gap-2 text-[13px] text-muted-foreground"
              >
                <span
                  className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500/60 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </motion.div>
  );
}

export default ComingSoonTab;
