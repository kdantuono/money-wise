'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Check,
  X,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  aiSuggestedCategory: string;
  aiSuggestedIcon: string;
  aiConfidence: number;
}

const PENDING_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'CARD PAYMENT TO JOHN LEWIS', amount: -19.95, type: 'expense', date: '2026-04-15', aiSuggestedCategory: 'Shopping', aiSuggestedIcon: '🛍️', aiConfidence: 92 },
  { id: '2', description: 'Pagamento Esselunga', amount: -67.30, type: 'expense', date: '2026-04-14', aiSuggestedCategory: 'Spesa Alimentare', aiSuggestedIcon: '🛒', aiConfidence: 97 },
  { id: '3', description: 'Netflix Monthly', amount: -15.99, type: 'expense', date: '2026-04-13', aiSuggestedCategory: 'Abbonamenti', aiSuggestedIcon: '📺', aiConfidence: 99 },
  { id: '4', description: 'BOOTS 773 LONDON', amount: -3.24, type: 'expense', date: '2026-04-15', aiSuggestedCategory: 'Salute', aiSuggestedIcon: '💊', aiConfidence: 78 },
  { id: '5', description: 'Bonifico DA Mario Rossi', amount: 500, type: 'income', date: '2026-04-12', aiSuggestedCategory: 'Trasferimenti', aiSuggestedIcon: '↔️', aiConfidence: 65 },
];

const ALL_CATEGORIES = [
  { name: 'Spesa Alimentare', icon: '🛒' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Abbonamenti', icon: '📺' },
  { name: 'Salute', icon: '💊' },
  { name: 'Trasporti', icon: '🚗' },
  { name: 'Ristorazione', icon: '🍽️' },
  { name: 'Bollette', icon: '⚡' },
  { name: 'Trasferimenti', icon: '↔️' },
  { name: 'Stipendio', icon: '💼' },
  { name: 'Intrattenimento', icon: '🎬' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function getConfidenceColor(confidence: number) {
  if (confidence >= 85) return 'text-green-600 dark:text-green-400';
  if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getConfidenceBg(confidence: number) {
  if (confidence >= 85) return 'bg-green-500/10';
  if (confidence >= 70) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

export function AICategorization() {
  const [pending, setPending] = useState(PENDING_TRANSACTIONS);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [changingCategory, setChangingCategory] = useState<string | null>(null);

  const totalToReview = PENDING_TRANSACTIONS.length;
  const progress = totalToReview > 0 ? (reviewedCount / totalToReview) * 100 : 0;

  const handleAccept = (id: string) => {
    setPending(prev => prev.filter(t => t.id !== id));
    setReviewedCount(prev => prev + 1);
  };

  const handleReject = (id: string) => {
    setPending(prev => prev.filter(t => t.id !== id));
    setReviewedCount(prev => prev + 1);
    setChangingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-foreground">Categorizzazione AI</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {pending.length > 0
              ? `${pending.length} transazioni da revisionare`
              : 'Tutte le transazioni sono state categorizzate!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            <Brain className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <Card className="p-5 rounded-2xl border-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">Progresso revisione</p>
          <span className="text-sm font-semibold text-foreground">{reviewedCount}/{totalToReview}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </Card>

      {/* Pending list */}
      {pending.length > 0 ? (
        <div className="space-y-3">
          {pending.map((tx) => (
            <Card key={tx.id} className="p-5 rounded-2xl border-0 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Transaction info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-medium text-foreground truncate">{tx.description}</p>
                    <span className={`text-[13px] font-semibold tabular-nums ${tx.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.amount < 0 ? '-' : '+'}€{Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{new Date(tx.date).toLocaleDateString('it-IT')}</p>

                  {/* AI suggestion */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${getConfidenceBg(tx.aiConfidence)}`}>
                      <span className="text-[16px]">{tx.aiSuggestedIcon}</span>
                      <span className="text-[13px] font-medium text-foreground">{tx.aiSuggestedCategory}</span>
                      <span className={`text-[11px] font-semibold ${getConfidenceColor(tx.aiConfidence)}`}>
                        {tx.aiConfidence}%
                      </span>
                    </div>
                    {tx.aiConfidence < 80 && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Bassa confidenza</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {changingCategory === tx.id ? (
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {ALL_CATEGORIES.map(cat => (
                        <button
                          key={cat.name}
                          onClick={() => {
                            // Apply the chosen category to the transaction, then accept
                            setPending(prev => prev.map(t =>
                              t.id === tx.id
                                ? { ...t, aiSuggestedCategory: cat.name, aiSuggestedIcon: cat.icon, aiConfidence: 100 }
                                : t
                            ));
                            handleAccept(tx.id);
                            setChangingCategory(null);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-[11px] text-foreground transition-colors"
                        >
                          <span>{cat.icon}</span> {cat.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[12px] border-border/50"
                        onClick={() => setChangingCategory(tx.id)}
                      >
                        <ChevronRight className="w-3 h-3 mr-1" />
                        Cambia
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl text-[12px] bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => handleAccept(tx.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Accetta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[12px] text-rose-500 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        onClick={() => handleReject(tx.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 rounded-2xl border-0 shadow-sm text-center">
          <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Tutto categorizzato!</h3>
          <p className="text-[13px] text-muted-foreground">
            Hai revisionato {reviewedCount} transazioni. L'AI imparerà dalle tue scelte per migliorare le prossime classificazioni.
          </p>
        </Card>
      )}
    </div>
  );
}
