'use client';

import { Card } from '@/components/ui/card';
import { Coins, Plus } from 'lucide-react';
import Link from 'next/link';

/**
 * Empty state: zero instrument tracked. CTA verso /dashboard/accounts (legacy add).
 * Usa `Link` con stile inline anziché Button (local Button non supporta asChild).
 */
export function EmptyState() {
  return (
    <Card
      data-testid="patrimonio-empty-state"
      className="p-10 text-center space-y-4"
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
        <Coins className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Nessuno strumento ancora
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Aggiungi conti, investimenti o debiti per vedere il tuo patrimonio
          unificato. Il patrimonio netto si aggiorna automaticamente.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Aggiungi conto
        </Link>
        <Link
          href="/dashboard/liabilities"
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus className="w-4 h-4" />
          Aggiungi debito
        </Link>
      </div>
    </Card>
  );
}
