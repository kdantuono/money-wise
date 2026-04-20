'use client';

import {
  PiggyBank,
  TrendingUp,
  CreditCard,
  Star,
  Target,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PRIORITY_LABEL_IT, type PriorityRank } from '@/types/onboarding-plan';
import type { GoalType } from './GoalTypeFilter';
import type { Goal } from '@/services/goals.client';

// =============================================================================
// Type inference helper (pre-MED-11: heuristic from name)
// =============================================================================

export function inferGoalType(name: string): GoalType {
  const lower = name.toLowerCase();
  if (lower.includes('emergenza') || lower.includes('fondo')) return 'emergency';
  if (lower.includes('debito') || lower.includes('debiti') || lower.includes('prestito')) return 'debt';
  if (lower.includes('invest') || lower.includes('crypto') || lower.includes('portafoglio') || lower.includes('patrimonio')) return 'investment';
  if (lower.includes('viaggio') || lower.includes('vacanza') || lower.includes('lifestyle') || lower.includes('spesa')) return 'lifestyle';
  return 'savings';
}

// =============================================================================
// Icon per type
// =============================================================================

const TYPE_ICON: Record<GoalType, React.ComponentType<{ className?: string }>> = {
  all: Target,
  emergency: PiggyBank,
  savings: Star,
  investment: TrendingUp,
  debt: CreditCard,
  lifestyle: Star,
};

const TYPE_COLOR: Record<GoalType, { bg: string; text: string; light: string }> = {
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
}

export function GoalCard({ goal, onEditClick, onDeleteClick }: GoalCardProps) {
  const type = inferGoalType(goal.name);
  const Icon = TYPE_ICON[type];
  const colors = TYPE_COLOR[type];
  const priorityColor = PRIORITY_COLOR[goal.priority];

  const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.current);

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
            <Badge
              variant="outline"
              className="text-xs mt-0.5"
              data-testid="goal-card-priority"
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityColor.bg}`} />
              {PRIORITY_LABEL_IT[goal.priority]}
            </Badge>
          </div>
        </div>

        <button
          type="button"
          data-testid={`goal-delete-${goal.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(goal.id);
          }}
          className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-2"
          aria-label={`Elimina ${goal.name}`}
        >
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">
            &euro;{goal.current.toLocaleString('it-IT')}
          </span>
          <span
            data-testid="goal-card-target"
            className="font-semibold text-foreground"
          >
            &euro;{goal.target.toLocaleString('it-IT')}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className={`text-xs font-bold mt-1 ${colors.text}`}>{pct.toFixed(0)}%</p>
      </div>

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

      {remaining > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Mancano &euro;{remaining.toLocaleString('it-IT')} al target
        </p>
      )}
    </Card>
  );
}
