'use client';

/**
 * GoalTypeFilter — horizontal chip row for filtering by goal type.
 * Since MED-11 migration (adds `type` column) is not yet applied, type is
 * inferred from goal names via heuristics in the parent page.
 */

export type GoalType = 'all' | 'emergency' | 'savings' | 'investment' | 'debt' | 'lifestyle';

interface GoalTypeFilterProps {
  selected: GoalType;
  onTypeSelect: (type: GoalType) => void;
}

const CHIPS: { type: GoalType; label: string }[] = [
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
