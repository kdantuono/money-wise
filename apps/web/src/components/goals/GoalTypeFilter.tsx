'use client';

/**
 * GoalTypeFilter — horizontal chip row for filtering by goal category.
 *
 * WP-K: `GoalType` renamed to `GoalCategory` to avoid collision with the new
 * DB-level `GoalType = 'fixed' | 'openended'` in types/onboarding-plan.ts.
 * The 5-category taxonomy (emergency / savings / investment / debt / lifestyle)
 * is a UI grouping derived from the goal name heuristic, not the DB field.
 */

export type GoalCategory = 'all' | 'emergency' | 'savings' | 'investment' | 'debt' | 'lifestyle';

/** @deprecated use GoalCategory — alias kept for incremental migration */
export type GoalType = GoalCategory;

interface GoalTypeFilterProps {
  selected: GoalCategory;
  onTypeSelect: (type: GoalCategory) => void;
}

const CHIPS: { type: GoalCategory; label: string }[] = [
  { type: 'all', label: 'Tutti' },
  { type: 'emergency', label: 'Emergenza' },
  { type: 'savings', label: 'Risparmio' },
  { type: 'investment', label: 'Investimento' },
  { type: 'debt', label: 'Debiti' },
  { type: 'lifestyle', label: 'Lifestyle' },
];

export function GoalTypeFilter({ selected, onTypeSelect }: GoalTypeFilterProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filtro per tipo di obiettivo"
      data-testid="goal-type-filter"
    >
      {CHIPS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          data-testid={`filter-chip-${type}`}
          onClick={() => onTypeSelect(type)}
          className={[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            selected === type
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          ].join(' ')}
          aria-pressed={selected === type}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
