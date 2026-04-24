'use client';

import { Button } from '@/components/ui/button';

export type PatrimonioTab = 'all' | 'assets' | 'liabilities' | 'by-goal';

interface PatrimonioTabsProps {
  value: PatrimonioTab;
  onChange: (tab: PatrimonioTab) => void;
  counts: { total: number; assets: number; liabilities: number; byGoal: number };
}

const TABS: Array<{ id: PatrimonioTab; label: string }> = [
  { id: 'all', label: 'Tutto' },
  { id: 'assets', label: 'Asset' },
  { id: 'liabilities', label: 'Debiti' },
  { id: 'by-goal', label: 'Per goal' },
];

/**
 * Pill-style tab filter. Fase 2.1: UI-side filter (no re-query).
 */
export function PatrimonioTabs({ value, onChange, counts }: PatrimonioTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtra strumenti"
      className="flex flex-wrap gap-2"
      data-testid="patrimonio-tabs"
    >
      {TABS.map((tab) => {
        const isActive = value === tab.id;
        const count =
          tab.id === 'all'
            ? counts.total
            : tab.id === 'assets'
            ? counts.assets
            : tab.id === 'liabilities'
            ? counts.liabilities
            : counts.byGoal;
        return (
          <Button
            key={tab.id}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            data-testid={`patrimonio-tab-${tab.id}`}
            className="gap-1.5"
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {count}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
