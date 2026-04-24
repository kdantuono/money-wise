'use client';

import {
  PiggyBank,
  TrendingUp,
  CreditCard,
  Star,
  Target,
  Trash2,
  Calendar,
  Infinity as InfinityIcon,
  Check,
  Archive,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PRIORITY_LABEL_IT, type PriorityRank } from '@/types/onboarding-plan';
import type { GoalCategory } from './GoalTypeFilter';
import type { Goal } from '@/services/goals.client';

// =============================================================================
// Category inference helper (UI grouping from name — NOT the DB type field)
// =============================================================================

/**
 * Derives a display category from the goal name for icon/color purposes.
 * This is a UI heuristic; do NOT use it as a substitute for `goal.type`.
 *
 * WP-K: renamed from inferGoalType → inferGoalCategory (old name kept as
 * deprecated alias to avoid breaking existing callers during migration).
 */
export function inferGoalCategory(name: string): GoalCategory {
  const lower = name.toLowerCase();
  if (lower.includes('emergenza') || lower.includes('fondo')) return 'emergency';
  if (lower.includes('debito') || lower.includes('debiti') || lower.includes('prestito')) return 'debt';
  if (lower.includes('invest') || lower.includes('crypto') || lower.includes('portafoglio') || lower.includes('patrimonio')) return 'investment';
  if (lower.includes('viaggio') || lower.includes('vacanza') || lower.includes('lifestyle') || lower.includes('spesa')) return 'lifestyle';
  return 'savings';
}

/** @deprecated use inferGoalCategory — kept for backward compat */
export function inferGoalType(name: string): GoalCategory {
  return inferGoalCategory(name);
}

// =============================================================================
// Icon per category
// =============================================================================

const CATEGORY_ICON: Record<GoalCategory, React.ComponentType<{ className?: string }>> = {
  all: Target,
  emergency: PiggyBank,
  savings: Star,
  investment: TrendingUp,
  debt: CreditCard,
  lifestyle: Star,
};

const CATEGORY_COLOR: Record<GoalCategory, { bg: string; text: string; light: string }> = {
  all: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950/30' },
  emergency: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950/30' },
  savings: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950/30' },
  investment: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50 dark:bg-purple-950/30' },
  debt: { bg: 'bg-red-600', text: 'text-red-600', light: 'bg-red-50 dark:bg-red-950/30' },
  lifestyle: { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50 dark:bg-orange-950/30' },
};

const PRIORITY_COLOR: Record<PriorityRank, { bg: string }> = {
  1: { bg: 'bg-blue-600' },
  2: { bg: 'bg-orange-500' },
  3: { bg: 'bg-emerald-600' },
};

// =============================================================================
// GoalCard
// =============================================================================

interface GoalCardProps {
  goal: Goal;
  onEditClick: (goal: Goal) => void;
  onDeleteClick: (goalId: string) => void;
  /** #058: optional archive handler, rendered as secondary action per goal COMPLETED */
  onArchiveClick?: (goalId: string) => void;
}

export function GoalCard({ goal, onEditClick, onDeleteClick, onArchiveClick }: GoalCardProps) {
  // WP-K: use goal.type (DB field) for openended-specific display logic.
  // Use inferGoalCategory for icon/color (name heuristic — independent of type).
  const isOpenended = goal.type === 'openended';
  const category = inferGoalCategory(goal.name);
  const Icon = CATEGORY_ICON[category];
  const colors = CATEGORY_COLOR[category];
  const priorityColor = PRIORITY_COLOR[goal.priority];

  const effectiveTarget = goal.target ?? 0;
  // Sprint 1.6.6 Fase 3a (#043): usa currentEffective (manual + linked accounts
  // - linked liabilities) per progress display. Fallback `current` se VIEW non
  // disponibile (dati legacy pre-Fase-3a).
  const displayCurrent = goal.currentEffective ?? goal.current;
  const pct = effectiveTarget > 0 ? Math.min(100, (displayCurrent / effectiveTarget) * 100) : 0;
  const remaining = Math.max(0, effectiveTarget - displayCurrent);

  let daysLeft: number | null = null;
  if (goal.deadline) {
    const [dy, dm, dd] = goal.deadline.slice(0, 10).split('-').map(Number);
    const deadlineMs = new Date(dy!, (dm! - 1), dd!).getTime();
    const todayMs = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    ).getTime();
    daysLeft = Math.max(0, Math.ceil((deadlineMs - todayMs) / 86_400_000));
  }

  return (
    <Card
      data-testid={`goal-card-${goal.id}`}
      className={`p-5 hover:shadow-lg transition-shadow cursor-pointer ${colors.light}`}
      onClick={() => onEditClick(goal)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-xl ${colors.bg} text-white shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3
              data-testid="goal-card-name"
              className="font-semibold text-foreground truncate"
            >
              {goal.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs"
                data-testid="goal-card-priority"
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityColor.bg}`} />
                {PRIORITY_LABEL_IT[goal.priority]}
              </Badge>
              {isOpenended && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1"
                  data-testid="goal-card-type-badge"
                >
                  <InfinityIcon className="w-3 h-3" />
                  Aperto
                </Badge>
              )}
              {/* #058: COMPLETED status badge */}
              {goal.status === 'COMPLETED' && (
                <Badge
                  className="text-xs gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  data-testid="goal-card-completed-badge"
                >
                  <Check className="w-3 h-3" />
                  Completato
                </Badge>
              )}
              {/* #058: ARCHIVED status badge */}
              {goal.status === 'ARCHIVED' && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1 text-muted-foreground"
                  data-testid="goal-card-archived-badge"
                >
                  <Archive className="w-3 h-3" />
                  Archiviato
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* #058: archive button (rendered only if handler passed + goal non-ARCHIVED) */}
          {onArchiveClick && goal.status !== 'ARCHIVED' && (
            <button
              type="button"
              data-testid={`goal-archive-${goal.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onArchiveClick(goal.id);
              }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label={`Archivia ${goal.name}`}
              title="Archivia"
            >
              <Archive className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
          <button
            type="button"
            data-testid={`goal-delete-${goal.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(goal.id);
            }}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            aria-label={`Elimina ${goal.name}`}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Target/progress: hidden for openended goals (no concrete target) */}
      {!isOpenended && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1.5">
            <span
              className="text-muted-foreground"
              data-testid="goal-card-current"
              title={
                goal.currentEffective !== undefined && goal.currentEffective !== goal.current
                  ? `Manuale: €${goal.current.toLocaleString('it-IT')} · Effective (+ balance linked): €${goal.currentEffective.toLocaleString('it-IT')}`
                  : undefined
              }
            >
              &euro;{displayCurrent.toLocaleString('it-IT')}
            </span>
            <span
              data-testid="goal-card-target"
              className="font-semibold text-foreground"
            >
              &euro;{effectiveTarget.toLocaleString('it-IT')}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className={`text-xs font-bold mt-1 ${colors.text}`}>{pct.toFixed(0)}%</p>
        </div>
      )}

      {isOpenended && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground italic">
            Obiettivo aperto — accumulo continuo senza target fisso
          </p>
          <p className="text-sm font-medium text-foreground mt-1" data-testid="goal-card-current">
            &euro;{displayCurrent.toLocaleString('it-IT')} accumulati
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40">
        <div>
          <p className="text-xs text-muted-foreground">Scadenza</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <p
              data-testid="goal-card-deadline"
              className="text-xs font-medium text-foreground"
            >
              {daysLeft !== null ? `${daysLeft}g` : 'Nessuna'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Mensile</p>
          <p className="text-xs font-medium text-foreground mt-0.5">
            &euro;{goal.monthlyAllocation.toFixed(0)}
          </p>
        </div>
      </div>

      {!isOpenended && remaining > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Mancano &euro;{remaining.toLocaleString('it-IT')} al target
        </p>
      )}
    </Card>
  );
}
