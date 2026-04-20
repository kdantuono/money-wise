'use client';

/**
 * Sprint 1.5.3 WP-Q5: read-only info card for lifestyle budget.
 * Lifestyle is "locked-info" — carved from incomeAfterEssentials but NOT
 * allocable to goals. Shown as separate section below savings/investments pools.
 */
export function LifestyleInfoSection({ budget }: { budget: number }) {
  if (budget <= 0) return null;

  const formatted = `€${budget.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return (
    <section
      aria-labelledby="pool-lifestyle-heading"
      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-3 sm:p-4"
      data-testid="lifestyle-info"
    >
      <div className="flex justify-between flex-wrap items-center gap-2 mb-1">
        <h3
          id="pool-lifestyle-heading"
          className="text-sm sm:text-base font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2"
        >
          <span aria-hidden="true">🎯</span>
          Lifestyle (non allocabile)
        </h3>
        <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {formatted}/mese
        </span>
      </div>
      <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
        Budget protetto per spese discrezionali quotidiane (uscite, caffè, cene fuori). Non viene
        distribuito tra gli obiettivi finanziari.
      </p>
    </section>
  );
}
