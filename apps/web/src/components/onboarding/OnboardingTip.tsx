'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

interface OnboardingTipProps {
  /**
   * Unique id — key localStorage. Es: 'step3_folders', 'step4_chips'.
   * Persiste dismiss cross-session. Post-beta migrare a profile column.
   */
  id: string;
  title?: string;
  message: string;
  ctaLabel?: string;
  /**
   * Se true, renderizza sempre. Usato per preview in Storybook / dev.
   */
  forceShow?: boolean;
}

const STORAGE_PREFIX = 'mw_onboarding_tip_';
const DISMISSED_SUFFIX = '_dismissed';

/**
 * Dismissible onboarding hint banner. Persiste dismiss in localStorage.
 * Pattern #053: primo accesso step guidato → banner blu "💡 Suggerimento"
 * con CTA "Ho capito". Re-entry post-dismiss: nulla renderizzato.
 *
 * Accessibility:
 * - role="note" + aria-label
 * - Dismiss button tabable + Enter activatable
 * - Screen reader: messaggio letto all'apertura (aria-live="polite")
 */
export function OnboardingTip({
  id,
  title = 'Suggerimento',
  message,
  ctaLabel = 'Ho capito',
  forceShow = false,
}: OnboardingTipProps) {
  const storageKey = `${STORAGE_PREFIX}${id}${DISMISSED_SUFFIX}`;
  // null = not yet checked (SSR-safe). false = shown. true = dismissed.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setDismissed(stored === 'true');
    } catch {
      // localStorage disabled (incognito strict, SSR edge) → mostra banner
      setDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      // Fail silent: banner chiuso questa sessione, può riapparire next
    }
  };

  // SSR / pre-check: render nothing to avoid flash
  if (!forceShow && (dismissed === null || dismissed === true)) return null;

  return (
    <div
      role="note"
      aria-label={`Suggerimento onboarding: ${title}`}
      aria-live="polite"
      data-testid={`onboarding-tip-${id}`}
      className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/50"
    >
      <div className="shrink-0 p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 mt-0.5">
        <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {title}
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200 mt-0.5 leading-snug">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        data-testid={`onboarding-tip-dismiss-${id}`}
        className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 px-2 py-1 rounded hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors"
        aria-label={`${ctaLabel} — nascondi suggerimento`}
      >
        {ctaLabel}
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
