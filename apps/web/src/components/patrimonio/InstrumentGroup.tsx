'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { FinancialInstrument } from '@/services/financial-instruments.client';
import type { Goal } from '@/services/goals.client';
import { InstrumentRow } from './InstrumentRow';

interface InstrumentGroupProps {
  label: string;
  instruments: FinancialInstrument[];
  goals?: Goal[];
  defaultOpen?: boolean;
}

/**
 * Collapsible group di instruments con label. Client-side grouping per type.
 */
export function InstrumentGroup({
  label,
  instruments,
  goals = [],
  defaultOpen = true,
}: InstrumentGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (instruments.length === 0) return null;

  const groupTotal = instruments.reduce(
    (sum, i) => sum + Number(i.currentBalance),
    0,
  );

  return (
    <section
      data-testid={`instrument-group-${label.toLowerCase().replace(/\s/g, '-')}`}
      className="space-y-2"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span>{label}</span>
          <span className="text-xs opacity-60">({instruments.length})</span>
        </div>
        <span className="text-xs font-semibold">
          &euro;{groupTotal.toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 pl-6">
          {instruments.map((i) => (
            <InstrumentRow key={i.id} instrument={i} goals={goals} />
          ))}
        </div>
      )}
    </section>
  );
}
