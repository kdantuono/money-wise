'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Sparkles,
  Calendar,
  Repeat,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Mock data — preserved from Figma (DB lacks fixed/variable classification)
// ---------------------------------------------------------------------------

interface RecurringExpense {
  id: string;
  name: string;
  category: 'fixed' | 'variable';
  amount: number;
  frequency: string;
  nextDate: string;
  isActive: boolean;
}

const recurringExpenses: RecurringExpense[] = [
  { id: '1', name: 'Affitto', category: 'fixed', amount: 800, frequency: 'Mensile', nextDate: '2026-05-01', isActive: true },
  { id: '2', name: 'Internet + Streaming', category: 'fixed', amount: 45.97, frequency: 'Mensile', nextDate: '2026-05-05', isActive: true },
  { id: '3', name: 'Assicurazione Auto', category: 'fixed', amount: 120, frequency: 'Mensile', nextDate: '2026-05-10', isActive: true },
  { id: '4', name: 'Palestra', category: 'fixed', amount: 45, frequency: 'Mensile', nextDate: '2026-05-01', isActive: true },
  { id: '5', name: 'Spotify + Cloud', category: 'fixed', amount: 24.99, frequency: 'Mensile', nextDate: '2026-05-15', isActive: true },
  { id: '6', name: 'Bolletta Luce', category: 'variable', amount: 65, frequency: 'Mensile', nextDate: '2026-05-20', isActive: true },
  { id: '7', name: 'Bolletta Gas', category: 'variable', amount: 45, frequency: 'Bimestrale', nextDate: '2026-06-01', isActive: true },
  { id: '8', name: 'Acqua', category: 'variable', amount: 13.80, frequency: 'Bimestrale', nextDate: '2026-06-01', isActive: true },
];

const fixedDetailData = {
  aiAnalysis: "I tuoi costi fissi rappresentano il 45% delle uscite mensili, leggermente sopra la media consigliata (40%). L'affitto pesa per il 73% dei costi fissi. Consiglio: valuta di rinegoziare l'assicurazione auto o cercare pacchetti internet+streaming combinati per risparmiare circa €20/mese.",
  trend: [
    { month: 'Ott', total: 1130 },
    { month: 'Nov', total: 1135 },
    { month: 'Dic', total: 1135 },
    { month: 'Gen', total: 1135 },
    { month: 'Feb', total: 1135 },
    { month: 'Mar', total: 1135.97 },
  ],
};

const variableDetailData = {
  aiAnalysis: "Le bollette variabili sono cresciute del 12% negli ultimi 3 mesi, principalmente a causa del riscaldamento invernale. Con l'arrivo della primavera prevedo una riduzione del 20% sulla bolletta del gas. Consiglio: considera un contratto a prezzo fisso per l'energia elettrica per stabilizzare i costi.",
  trend: [
    { month: 'Ott', total: 110 },
    { month: 'Nov', total: 135 },
    { month: 'Dic', total: 155 },
    { month: 'Gen', total: 148 },
    { month: 'Feb', total: 130 },
    { month: 'Mar', total: 123.80 },
  ],
};

const recurringDetailItems = [
  {
    id: 'r1', name: 'Finanziamento Auto', linkedTo: 'Volkswagen Golf 2024', totalAmount: 18000, paidAmount: 6000,
    monthlyRate: 375, ratesPaid: 16, totalRates: 48, nextDate: '2026-04-01',
  },
  {
    id: 'r2', name: 'Prestito Personale', linkedTo: 'Ristrutturazione bagno', totalAmount: 8000, paidAmount: 5333.28,
    monthlyRate: 333.33, ratesPaid: 16, totalRates: 24, nextDate: '2026-04-05',
  },
  {
    id: 'r3', name: 'Abbonamento Palestra', linkedTo: 'FitnessPro annuale', totalAmount: 540, paidAmount: 225,
    monthlyRate: 45, ratesPaid: 5, totalRates: 12, nextDate: '2026-04-01',
  },
];

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Totale: <span className="font-medium text-foreground">€{payload[0]?.value?.toFixed(2)}</span></p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpenseDetail Page — adapted from Figma ExpenseDetail.tsx
// ---------------------------------------------------------------------------

export default function ExpenseDetailPage() {
  const params = useParams<{ type: string }>();
  const type = params.type;

  const isFixed = type === 'fixed';
  const isVariable = type === 'variable';
  const isRecurring = type === 'recurring';

  const expenses = isFixed
    ? recurringExpenses.filter(e => e.category === 'fixed')
    : isVariable
    ? recurringExpenses.filter(e => e.category === 'variable')
    : recurringExpenses;

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const detail = isFixed ? fixedDetailData : variableDetailData;

  const title = isFixed ? 'Costi Fissi' : isVariable ? 'Costi Variabili' : 'Spese Ricorrenti';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/transactions" className="hover:text-foreground transition-colors">Spese</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{title}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-[32px] tracking-[-0.03em] text-foreground">{title}</h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          Totale mensile: <span className="font-semibold text-foreground">€{total.toFixed(2)}</span>
        </p>
      </div>

      {/* AI Analysis */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 rounded-2xl border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-card dark:from-purple-950/30">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl flex-shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Analisi AI</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isRecurring
                  ? "Hai 3 impegni ricorrenti attivi per un totale di €753,33/mese. Il finanziamento auto rappresenta il costo maggiore (50%). Completando prima il prestito personale (8 rate rimanenti) risparmierai €333,33/mese."
                  : detail.aiAnalysis}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recurring Detail — progress bars */}
      {isRecurring ? (
        <div className="space-y-4">
          {recurringDetailItems.map((item, i) => {
            const progress = (item.ratesPaid / item.totalRates) * 100;
            const remaining = item.totalAmount - item.paidAmount;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <Card className="p-6 rounded-2xl border-0 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
                          <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">Collegato a: {item.linkedTo}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso pagamento</span>
                          <span className="font-semibold text-foreground">{item.ratesPaid}/{item.totalRates} rate</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Pagato: €{item.paidAmount.toLocaleString('it-IT')}</span>
                          <span>Restante: €{remaining.toLocaleString('it-IT')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 md:w-64">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">Rata Mensile</p>
                        <p className="font-bold text-foreground">€{item.monthlyRate.toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">Prossima Rata</p>
                        <p className="font-bold text-foreground">{new Date(item.nextDate).toLocaleDateString('it-IT')}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">Rate Restanti</p>
                        <p className="font-bold text-foreground">{item.totalRates - item.ratesPaid}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">Totale</p>
                        <p className="font-bold text-foreground">€{item.totalAmount.toLocaleString('it-IT')}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 rounded-2xl border-0 shadow-sm">
              <h3 className="text-[16px] font-medium text-foreground mb-4">Andamento Ultimi 6 Mesi</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={detail.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground, #6b7280)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground, #6b7280)' }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted, #f3f4f6)', opacity: 0.3 }} />
                  <Bar dataKey="total" fill={isFixed ? '#3b82f6' : '#eab308'} name="Totale (€)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Expense List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-6 rounded-2xl border-0 shadow-sm">
              <h3 className="text-[16px] font-medium text-foreground mb-4">Dettaglio Voci</h3>
              <div className="space-y-3">
                {expenses.map((exp, i) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      isFixed ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-yellow-50 dark:bg-yellow-950/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        isFixed
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{exp.name}</p>
                        <p className="text-xs text-muted-foreground">Prossimo: {new Date(exp.nextDate).toLocaleDateString('it-IT')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">€{exp.amount.toFixed(2)}</p>
                      <Badge variant="outline" className="text-xs mt-1">{exp.frequency}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
