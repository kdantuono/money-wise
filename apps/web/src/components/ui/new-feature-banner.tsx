'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

interface NewFeatureBannerProps {
  href: string;
  title?: string;
  message?: string;
  ctaLabel?: string;
  /** Usato per testid — default "new-feature-banner". */
  testId?: string;
}

/**
 * Shared banner per deprecation hint verso feature nuove.
 * Pattern coesistenza ADR-005 Fase 2.1 (Q1 lock 1 sprint).
 */
export function NewFeatureBanner({
  href,
  title = 'Novità',
  message = 'Tutti i tuoi strumenti in un\'unica vista',
  ctaLabel = 'Vai a Patrimonio',
  testId = 'new-feature-banner',
}: NewFeatureBannerProps) {
  return (
    <div
      data-testid={testId}
      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/50"
    >
      <div className="shrink-0 p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {title}
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
          {message}
        </p>
      </div>
      <Link
        href={href}
        className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
      >
        {ctaLabel}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
