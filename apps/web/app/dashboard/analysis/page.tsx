'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Sparkles,
  AlertCircle,
  Trophy,
  Target,
  Brain,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Mock Data (from Figma) ───────────────────────────────────

interface AIInsight {
  id: string;
  type: 'warning' | 'suggestion' | 'achievement';
  title: string;
  description: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

const aiInsights: AIInsight[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'Obiettivo Risparmio Raggiunto!',
    description:
      'Hai risparmiato il 15% del tuo reddito questo mese, superando il tuo obiettivo del 10%.',
    date: '2026-03-17',
    priority: 'high',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Spese Ristorazione Elevate',
    description:
      'Le tue spese per ristoranti sono aumentate del 35% rispetto al mese scorso. Considera di ridurre le cene fuori.',
    date: '2026-03-16',
    priority: 'medium',
  },
  {
    id: '3',
    type: 'suggestion',
    title: 'Opportunità di Investimento',
    description:
      'Il tuo portafoglio crypto sta performando bene (+30%). Considera di diversificare in ETF per ridurre il rischio.',
    date: '2026-03-15',
    priority: 'medium',
  },
  {
    id: '4',
    type: 'warning',
    title: 'Commissioni Elevate',
    description:
      'Hai pagato €45 in commissioni bancarie questo mese. Valuta di passare a un conto online senza spese.',
    date: '2026-03-14',
    priority: 'high',
  },
  {
    id: '5',
    type: 'suggestion',
    title: 'Ottimizza Spese Ricorrenti',
    description:
      'Potresti risparmiare €25/mese cancellando abbonamenti poco utilizzati (Netflix, Spotify). Utilizzo rilevato: <30%.',
    date: '2026-03-13',
    priority: 'low',
  },
  {
    id: '6',
    type: 'achievement',
    title: 'Portfolio in Crescita',
    description:
      "Il tuo portafoglio investimenti è cresciuto del 12% nell'ultimo trimestre. Ottimo lavoro!",
    date: '2026-03-12',
    priority: 'medium',
  },
];

const monthlyTrend = [
  { month: 'Set', income: 3200, expenses: 2400, savings: 800, investments: 500 },
  { month: 'Ott', income: 3400, expenses: 2600, savings: 800, investments: 600 },
  { month: 'Nov', income: 3300, expenses: 2800, savings: 500, investments: 400 },
  { month: 'Dic', income: 4200, expenses: 3500, savings: 700, investments: 800 },
  { month: 'Gen', income: 3500, expenses: 2700, savings: 800, investments: 650 },
  { month: 'Feb', income: 3600, expenses: 2550, savings: 1050, investments: 700 },
  { month: 'Mar', income: 4350, expenses: 2100, savings: 1500, investments: 750 },
];

// ─── Helpers ──────────────────────────────────────────────────

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'achievement':
      return Trophy;
    case 'warning':
      return AlertCircle;
    case 'suggestion':
      return Target;
    default:
      return Sparkles;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'achievement':
      return 'bg-green-50 border-green-500 text-green-700';
    case 'warning':
      return 'bg-yellow-50 border-yellow-500 text-yellow-700';
    case 'suggestion':
      return 'bg-blue-50 border-blue-500 text-blue-700';
    default:
      return 'bg-gray-50 border-gray-500 text-gray-700';
  }
};

// ─── Page Component ───────────────────────────────────────────

export default function AnalysisPage() {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const achievementInsights = aiInsights.filter((i) => i.type === 'achievement');
  const warningInsights = aiInsights.filter((i) => i.type === 'warning');
  const suggestionInsights = aiInsights.filter((i) => i.type === 'suggestion');

  // Calcoli per i consigli AI
  const savingsRate = monthlyTrend[monthlyTrend.length - 1];
  const savingsPercentage = (savingsRate.savings / savingsRate.income) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-full">
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analisi AI</h1>
            <p className="text-muted-foreground mt-1">
              Consigli intelligenti per ottimizzare le tue finanze
            </p>
          </div>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Sparkles className="w-4 h-4 mr-2" />
          Genera Nuovo Rapporto
        </Button>
      </div>

      {/* AI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500 rounded-full">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-green-900">Successi</h3>
            </div>
            <p className="text-3xl font-bold text-green-900 mb-2">
              {achievementInsights.length}
            </p>
            <p className="text-sm text-green-700">Obiettivi raggiunti questo mese</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500 rounded-full">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-yellow-900">Avvisi</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-900 mb-2">
              {warningInsights.length}
            </p>
            <p className="text-sm text-yellow-700">Punti di attenzione rilevati</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500 rounded-full">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-blue-900">Suggerimenti</h3>
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-2">
              {suggestionInsights.length}
            </p>
            <p className="text-sm text-blue-700">Opportunità di miglioramento</p>
          </Card>
        </motion.div>
      </div>

      {/* Financial Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Punteggio Salute Finanziaria</h3>
              <p className="text-sm text-gray-500 mt-1">
                Basato sull&apos;analisi AI dei tuoi comportamenti finanziari
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600">82</div>
              <div className="text-sm text-gray-500 mt-1">su 100</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Risparmio</p>
              <p className="text-2xl font-bold text-green-600">92</p>
              <p className="text-xs text-green-600 mt-1">Eccellente</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Spese</p>
              <p className="text-2xl font-bold text-yellow-600">75</p>
              <p className="text-xs text-yellow-600 mt-1">Buono</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Investimenti</p>
              <p className="text-2xl font-bold text-green-600">88</p>
              <p className="text-xs text-green-600 mt-1">Ottimo</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Budget</p>
              <p className="text-2xl font-bold text-yellow-600">73</p>
              <p className="text-xs text-yellow-600 mt-1">Buono</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Savings Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Trend Risparmio</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid key="grid" strokeDasharray="3 3" />
              <XAxis key="xaxis" dataKey="month" />
              <YAxis key="yaxis" />
              <Tooltip key="tooltip" />
              <Legend key="legend" />
              <Line
                key="savings-line"
                type="monotone"
                dataKey="savings"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Risparmi (€)"
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">
                Il tuo tasso di risparmio è del {savingsPercentage.toFixed(1)}%, superiore
                alla media nazionale (8-10%). Continua così!
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* All Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Tutti i Consigli AI</h3>
          </div>
          <div className="space-y-4">
            {aiInsights.map((insight, index) => {
              const Icon = getInsightIcon(insight.type);
              const isExpanded = expandedInsight === insight.id;

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                >
                  <div
                    className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)} cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() =>
                      setExpandedInsight(isExpanded ? null : insight.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-full ${
                            insight.type === 'achievement'
                              ? 'bg-green-100'
                              : insight.type === 'warning'
                                ? 'bg-yellow-100'
                                : 'bg-blue-100'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{insight.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {insight.type === 'achievement'
                                ? 'Successo'
                                : insight.type === 'warning'
                                  ? 'Avviso'
                                  : 'Suggerimento'}
                            </Badge>
                          </div>
                          <p className="text-sm">{insight.description}</p>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 pt-4 border-t"
                            >
                              <p className="text-sm font-medium mb-2">
                                Azioni consigliate:
                              </p>
                              <ul className="text-sm space-y-2">
                                {insight.type === 'achievement' && (
                                  <>
                                    <li className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4" />
                                      Mantieni questa abitudine per i prossimi mesi
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4" />
                                      Considera di aumentare il tuo obiettivo di
                                      risparmio
                                    </li>
                                  </>
                                )}
                                {insight.type === 'warning' && (
                                  <>
                                    <li className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4" />
                                      Rivedi le spese in questa categoria
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4" />
                                      Imposta un budget più rigido per il prossimo mese
                                    </li>
                                  </>
                                )}
                                {insight.type === 'suggestion' && (
                                  <>
                                    <li className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4" />
                                      Esplora le opzioni consigliate
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4" />
                                      Monitora i risultati dopo l&apos;implementazione
                                    </li>
                                  </>
                                )}
                              </ul>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge
                          variant={
                            insight.priority === 'high'
                              ? 'destructive'
                              : insight.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {insight.priority}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 ml-11">
                      {new Date(insight.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Monthly Report CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Rapporto Mensile Personalizzato</h3>
              <p className="text-purple-100">
                Ricevi un&apos;analisi completa delle tue finanze ogni mese via email
              </p>
            </div>
            <Button className="bg-white text-purple-600 hover:bg-gray-100">
              Attiva Rapporti
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
