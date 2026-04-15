'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Brain,
  Sparkles,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  Eye,
  Share2,
  Printer,
  Clock,
  AlertCircle,
  Trophy,
  Target,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────

interface HistoricalReport {
  id: string;
  month: string;
  date: string;
  score: number;
  status: string;
  data: {
    entrate: number;
    uscite: number;
    risparmio: number;
    savingsRate: number;
    spendingData: { month: string; entrate: number; uscite: number }[];
    categoryBreakdown: { name: string; value: number; color: string }[];
    savingsProgress: { month: string; risparmiato: number }[];
    insights: {
      type: 'achievement' | 'warning' | 'suggestion';
      icon: string;
      title: string;
      text: string;
      color: string;
    }[];
    scores: { label: string; score: number; icon: string }[];
  };
}

interface ReportSection {
  id: string;
  title: string;
  status: 'pending' | 'generating' | 'done';
}

// ─── Mock Data (from Figma) ───────────────────────────────────

const HISTORICAL_REPORTS: HistoricalReport[] = [
  {
    id: 'apr-2026',
    month: 'Aprile 2026',
    date: '12/04/2026',
    score: 85,
    status: 'Ottimo',
    data: {
      entrate: 4200,
      uscite: 2780,
      risparmio: 1420,
      savingsRate: 33.8,
      spendingData: [
        { month: 'Nov', entrate: 4200, uscite: 2800 },
        { month: 'Dic', entrate: 5100, uscite: 3400 },
        { month: 'Gen', entrate: 4200, uscite: 2650 },
        { month: 'Feb', entrate: 4200, uscite: 2900 },
        { month: 'Mar', entrate: 4700, uscite: 3100 },
        { month: 'Apr', entrate: 4200, uscite: 2780 },
      ],
      categoryBreakdown: [
        { name: 'Affitto', value: 850, color: '#3b82f6' },
        { name: 'Alimentari', value: 420, color: '#10b981' },
        { name: 'Trasporti', value: 180, color: '#f59e0b' },
        { name: 'Utenze', value: 210, color: '#8b5cf6' },
        { name: 'Svago', value: 350, color: '#ef4444' },
        { name: 'Salute', value: 120, color: '#06b6d4' },
        { name: 'Altro', value: 250, color: '#6b7280' },
      ],
      savingsProgress: [
        { month: 'Nov', risparmiato: 1400 },
        { month: 'Dic', risparmiato: 1700 },
        { month: 'Gen', risparmiato: 1550 },
        { month: 'Feb', risparmiato: 1300 },
        { month: 'Mar', risparmiato: 1600 },
        { month: 'Apr', risparmiato: 1420 },
      ],
      insights: [
        {
          type: 'achievement',
          icon: 'trophy',
          title: 'Ottimo Risparmio!',
          text: 'Hai risparmiato il 33.8% del reddito, superando la media nazionale del 12%.',
          color: 'green',
        },
        {
          type: 'warning',
          icon: 'alert',
          title: 'Svago in Aumento',
          text: 'Le spese di svago sono aumentate del 15% rispetto al mese scorso.',
          color: 'orange',
        },
        {
          type: 'suggestion',
          icon: 'target',
          title: 'Opportunità Utenze',
          text: 'Cambiando operatore utenze potresti risparmiare ~€35/mese (€420/anno).',
          color: 'blue',
        },
        {
          type: 'suggestion',
          icon: 'trending',
          title: 'Investimento PAC',
          text: 'Con €500/mese in un ETF globale genererai ~€32.000 in 5 anni.',
          color: 'purple',
        },
      ],
      scores: [
        { label: 'Risparmio', score: 92, icon: 'pie' },
        { label: 'Spese', score: 78, icon: 'down' },
        { label: 'Budget', score: 85, icon: 'wallet' },
        { label: 'Investimenti', score: 80, icon: 'up' },
      ],
    },
  },
  {
    id: 'mar-2026',
    month: 'Marzo 2026',
    date: '01/04/2026',
    score: 87,
    status: 'Eccellente',
    data: {
      entrate: 4700,
      uscite: 3100,
      risparmio: 1600,
      savingsRate: 34.0,
      spendingData: [
        { month: 'Ott', entrate: 3800, uscite: 2700 },
        { month: 'Nov', entrate: 4200, uscite: 2800 },
        { month: 'Dic', entrate: 5100, uscite: 3400 },
        { month: 'Gen', entrate: 4200, uscite: 2650 },
        { month: 'Feb', entrate: 4200, uscite: 2900 },
        { month: 'Mar', entrate: 4700, uscite: 3100 },
      ],
      categoryBreakdown: [
        { name: 'Affitto', value: 950, color: '#3b82f6' },
        { name: 'Alimentari', value: 380, color: '#10b981' },
        { name: 'Trasporti', value: 220, color: '#f59e0b' },
        { name: 'Utenze', value: 190, color: '#8b5cf6' },
        { name: 'Svago', value: 310, color: '#ef4444' },
        { name: 'Shopping', value: 450, color: '#ec4899' },
        { name: 'Altro', value: 200, color: '#6b7280' },
      ],
      savingsProgress: [
        { month: 'Ott', risparmiato: 1100 },
        { month: 'Nov', risparmiato: 1400 },
        { month: 'Dic', risparmiato: 1700 },
        { month: 'Gen', risparmiato: 1550 },
        { month: 'Feb', risparmiato: 1300 },
        { month: 'Mar', risparmiato: 1600 },
      ],
      insights: [
        {
          type: 'achievement',
          icon: 'trophy',
          title: 'Portfolio +12%!',
          text: 'Il portafoglio investimenti è cresciuto del 12% nel trimestre. Ottimo lavoro!',
          color: 'green',
        },
        {
          type: 'achievement',
          icon: 'trophy',
          title: 'Fondo Emergenza al 82%',
          text: 'Sei a €12.340 su €15.000. Ancora 2 mesi!',
          color: 'green',
        },
        {
          type: 'warning',
          icon: 'alert',
          title: 'Shopping Elevato',
          text: '€450 in shopping, +40% rispetto alla media. Controlla acquisti impulsivi.',
          color: 'orange',
        },
        {
          type: 'suggestion',
          icon: 'target',
          title: 'PAC ETF Consigliato',
          text: 'Inizia un Piano di Accumulo da €200/mese su VWCE per diversificare.',
          color: 'blue',
        },
      ],
      scores: [
        { label: 'Risparmio', score: 90, icon: 'pie' },
        { label: 'Spese', score: 82, icon: 'down' },
        { label: 'Budget', score: 88, icon: 'wallet' },
        { label: 'Investimenti', score: 85, icon: 'up' },
      ],
    },
  },
  {
    id: 'feb-2026',
    month: 'Febbraio 2026',
    date: '01/03/2026',
    score: 72,
    status: 'Buono',
    data: {
      entrate: 4200,
      uscite: 2900,
      risparmio: 1300,
      savingsRate: 31.0,
      spendingData: [
        { month: 'Set', entrate: 3500, uscite: 2600 },
        { month: 'Ott', entrate: 3800, uscite: 2700 },
        { month: 'Nov', entrate: 4200, uscite: 2800 },
        { month: 'Dic', entrate: 5100, uscite: 3400 },
        { month: 'Gen', entrate: 4200, uscite: 2650 },
        { month: 'Feb', entrate: 4200, uscite: 2900 },
      ],
      categoryBreakdown: [
        { name: 'Affitto', value: 950, color: '#3b82f6' },
        { name: 'Alimentari', value: 350, color: '#10b981' },
        { name: 'Ristorazione', value: 380, color: '#f59e0b' },
        { name: 'Utenze', value: 240, color: '#8b5cf6' },
        { name: 'Svago', value: 280, color: '#ef4444' },
        { name: 'Altro', value: 300, color: '#6b7280' },
      ],
      savingsProgress: [
        { month: 'Set', risparmiato: 900 },
        { month: 'Ott', risparmiato: 1100 },
        { month: 'Nov', risparmiato: 1400 },
        { month: 'Dic', risparmiato: 1700 },
        { month: 'Gen', risparmiato: 1550 },
        { month: 'Feb', risparmiato: 1300 },
      ],
      insights: [
        {
          type: 'warning',
          icon: 'alert',
          title: 'Ristorazione +35%',
          text: 'Spese ristoranti in forte aumento. €380 questo mese vs €280 media.',
          color: 'orange',
        },
        {
          type: 'warning',
          icon: 'alert',
          title: 'Utenze Invernali',
          text: "Bollette in aumento stagionale. Gas +€40 rispetto all'autunno.",
          color: 'orange',
        },
        {
          type: 'suggestion',
          icon: 'target',
          title: 'Riduci Cene Fuori',
          text: 'Cucinando 2 cene in più a settimana risparmieresti ~€120/mese.',
          color: 'blue',
        },
        {
          type: 'achievement',
          icon: 'trophy',
          title: 'Streak 10 Giorni!',
          text: "Hai utilizzato l'app per 10 giorni consecutivi. Continua così!",
          color: 'green',
        },
      ],
      scores: [
        { label: 'Risparmio', score: 75, icon: 'pie' },
        { label: 'Spese', score: 65, icon: 'down' },
        { label: 'Budget', score: 72, icon: 'wallet' },
        { label: 'Investimenti', score: 78, icon: 'up' },
      ],
    },
  },
  {
    id: 'gen-2026',
    month: 'Gennaio 2026',
    date: '01/02/2026',
    score: 81,
    status: 'Ottimo',
    data: {
      entrate: 4200,
      uscite: 2650,
      risparmio: 1550,
      savingsRate: 36.9,
      spendingData: [
        { month: 'Ago', entrate: 3200, uscite: 2500 },
        { month: 'Set', entrate: 3500, uscite: 2600 },
        { month: 'Ott', entrate: 3800, uscite: 2700 },
        { month: 'Nov', entrate: 4200, uscite: 2800 },
        { month: 'Dic', entrate: 5100, uscite: 3400 },
        { month: 'Gen', entrate: 4200, uscite: 2650 },
      ],
      categoryBreakdown: [
        { name: 'Affitto', value: 950, color: '#3b82f6' },
        { name: 'Alimentari', value: 310, color: '#10b981' },
        { name: 'Trasporti', value: 150, color: '#f59e0b' },
        { name: 'Utenze', value: 280, color: '#8b5cf6' },
        { name: 'Svago', value: 210, color: '#ef4444' },
        { name: 'Altro', value: 350, color: '#6b7280' },
      ],
      savingsProgress: [
        { month: 'Ago', risparmiato: 700 },
        { month: 'Set', risparmiato: 900 },
        { month: 'Ott', risparmiato: 1100 },
        { month: 'Nov', risparmiato: 1400 },
        { month: 'Dic', risparmiato: 1700 },
        { month: 'Gen', risparmiato: 1550 },
      ],
      insights: [
        {
          type: 'achievement',
          icon: 'trophy',
          title: 'Inizio Anno Forte!',
          text: 'Risparmio del 36.9% a Gennaio. Il miglior mese finora!',
          color: 'green',
        },
        {
          type: 'suggestion',
          icon: 'target',
          title: "Pianifica l'Anno",
          text: 'Imposta obiettivi annuali: €18.000 risparmi + €5.000 investimenti.',
          color: 'blue',
        },
        {
          type: 'warning',
          icon: 'alert',
          title: 'Utenze Invernali Alte',
          text: '€280 in utenze. Considera termostato smart per risparmiare.',
          color: 'orange',
        },
        {
          type: 'suggestion',
          icon: 'trending',
          title: 'Cripto in Ripresa',
          text: 'BTC +15% a Gennaio. Buon momento per DCA su posizioni esistenti.',
          color: 'purple',
        },
      ],
      scores: [
        { label: 'Risparmio', score: 95, icon: 'pie' },
        { label: 'Spese', score: 80, icon: 'down' },
        { label: 'Budget', score: 78, icon: 'wallet' },
        { label: 'Investimenti', score: 72, icon: 'up' },
      ],
    },
  },
  {
    id: 'dic-2025',
    month: 'Dicembre 2025',
    date: '01/01/2026',
    score: 65,
    status: 'Sufficiente',
    data: {
      entrate: 5100,
      uscite: 3400,
      risparmio: 1700,
      savingsRate: 33.3,
      spendingData: [
        { month: 'Lug', entrate: 3100, uscite: 2400 },
        { month: 'Ago', entrate: 3200, uscite: 2500 },
        { month: 'Set', entrate: 3500, uscite: 2600 },
        { month: 'Ott', entrate: 3800, uscite: 2700 },
        { month: 'Nov', entrate: 4200, uscite: 2800 },
        { month: 'Dic', entrate: 5100, uscite: 3400 },
      ],
      categoryBreakdown: [
        { name: 'Affitto', value: 950, color: '#3b82f6' },
        { name: 'Regali', value: 580, color: '#ec4899' },
        { name: 'Alimentari', value: 450, color: '#10b981' },
        { name: 'Ristorazione', value: 420, color: '#f59e0b' },
        { name: 'Svago', value: 380, color: '#ef4444' },
        { name: 'Altro', value: 220, color: '#6b7280' },
      ],
      savingsProgress: [
        { month: 'Lug', risparmiato: 700 },
        { month: 'Ago', risparmiato: 700 },
        { month: 'Set', risparmiato: 900 },
        { month: 'Ott', risparmiato: 1100 },
        { month: 'Nov', risparmiato: 1400 },
        { month: 'Dic', risparmiato: 1700 },
      ],
      insights: [
        {
          type: 'warning',
          icon: 'alert',
          title: 'Spese Natalizie!',
          text: '€580 in regali + €420 ristorazione. Spese festive elevate ma previste.',
          color: 'orange',
        },
        {
          type: 'achievement',
          icon: 'trophy',
          title: 'Tredicesima Ben Gestita',
          text: 'Nonostante le spese extra, hai risparmiato €1.700 grazie alla tredicesima.',
          color: 'green',
        },
        {
          type: 'suggestion',
          icon: 'target',
          title: 'Budget Feste 2026',
          text: 'Crea un fondo dedicato: €50/mese = €600 per le prossime feste.',
          color: 'blue',
        },
        {
          type: 'suggestion',
          icon: 'trending',
          title: 'Investi la Tredicesima',
          text: 'Con €1.000 investiti ora in ETF, potresti avere €1.070+ a fine 2026.',
          color: 'purple',
        },
      ],
      scores: [
        { label: 'Risparmio', score: 70, icon: 'pie' },
        { label: 'Spese', score: 55, icon: 'down' },
        { label: 'Budget', score: 60, icon: 'wallet' },
        { label: 'Investimenti', score: 75, icon: 'up' },
      ],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'trophy':
      return Trophy;
    case 'alert':
      return AlertCircle;
    case 'target':
      return Target;
    case 'trending':
      return TrendingUp;
    case 'pie':
      return PieChart;
    case 'down':
      return TrendingDown;
    case 'wallet':
      return Wallet;
    case 'up':
      return TrendingUp;
    default:
      return Sparkles;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-orange-500';
  return 'text-red-500';
};

const getScoreBadge = (status: string) => {
  const map: Record<string, string> = {
    Eccellente: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
    Ottimo: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    Buono: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
    Sufficiente: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  };
  return map[status] || '';
};

// ─── Page Component ───────────────────────────────────────────

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('aprile-2026');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(
    null,
  );
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'overview', title: 'Panoramica Finanziaria', status: 'pending' },
    { id: 'income', title: 'Analisi Entrate', status: 'pending' },
    { id: 'expenses', title: 'Analisi Spese per Categoria', status: 'pending' },
    { id: 'savings', title: 'Risparmio e Obiettivi', status: 'pending' },
    { id: 'investments', title: 'Performance Investimenti', status: 'pending' },
    { id: 'ai', title: 'Consigli AI Personalizzati', status: 'pending' },
  ]);
  const [activeTab, setActiveTab] = useState<'generate' | 'view' | 'history'>('generate');
  const [viewingReport, setViewingReport] = useState<HistoricalReport>(HISTORICAL_REPORTS[0]);

  const dismissFeedback = () => setFeedback(null);

  const generateReport = async () => {
    setGenerating(true);
    setGenerated(false);
    setFeedback(null);

    for (let i = 0; i < sections.length; i++) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
      setSections((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx === i ? 'generating' : idx < i ? 'done' : s.status,
        })),
      );
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
      setSections((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx <= i ? 'done' : s.status,
        })),
      );
    }

    setGenerating(false);
    setGenerated(true);
    setViewingReport(HISTORICAL_REPORTS[0]);
    setActiveTab('view');
    setFeedback({ message: 'Report generato con successo!', type: 'success' });
  };

  const handleDownload = (format: string) => {
    setFeedback({
      message: `Report "${viewingReport.month}" scaricato in formato ${format}`,
      type: 'success',
    });
  };

  const handleViewHistorical = (report: HistoricalReport) => {
    setViewingReport(report);
    setGenerated(true);
    setActiveTab('view');
  };

  const report = viewingReport;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Feedback Banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
          }`}
        >
          <span className="text-sm font-medium">{feedback.message}</span>
          <button
            onClick={dismissFeedback}
            className="text-sm font-medium underline ml-4 hover:opacity-70"
          >
            Chiudi
          </button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Report AI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Report finanziari generati dall&apos;intelligenza artificiale
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['generate', 'view', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab === 'generate' ? 'Genera' : tab === 'view' ? 'Visualizza' : 'Storico'}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <Card className="p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-foreground">Seleziona Periodo</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'aprile-2026', label: 'Aprile 2026' },
                { id: 'q1-2026', label: 'Q1 2026' },
                { id: 'h1-2026', label: 'H1 2026' },
                { id: 'custom', label: 'Personalizzato' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`px-4 py-3 rounded-xl text-sm transition-all border ${
                    selectedPeriod === p.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-border hover:border-blue-300 hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-foreground">Sezioni del Report</h3>
            </div>
            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                >
                  <span className="text-sm">{section.title}</span>
                  {section.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/20" />
                  )}
                  {section.status === 'generating' && (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  )}
                  {section.status === 'done' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6"
              onClick={generateReport}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generazione in corso...
                </>
              ) : generated ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Rigenera Report
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Genera Report con AI
                </>
              )}
            </Button>
          </Card>
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          {!generated ? (
            <Card className="p-12 rounded-2xl text-center">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nessun Report Generato
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vai nella tab &quot;Genera&quot; per creare il tuo primo report AI
              </p>
              <Button onClick={() => setActiveTab('generate')} className="rounded-xl">
                Genera Report <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Card>
          ) : (
            <>
              {/* Report header */}
              <Card className="p-5 rounded-2xl">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Report Finanziario - {report.month}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      Generato il {report.date} · Powered by AI
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleDownload('PDF')}
                    >
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleDownload('Excel')}
                    >
                      <Download className="w-4 h-4 mr-1" /> Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() =>
                        setFeedback({ message: 'Funzione stampa aperta', type: 'info' })
                      }
                    >
                      <Printer className="w-4 h-4 mr-1" /> Stampa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() =>
                        setFeedback({
                          message: 'Link condivisione copiato!',
                          type: 'success',
                        })
                      }
                    >
                      <Share2 className="w-4 h-4 mr-1" /> Condividi
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Health Score */}
              <Card className="p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Punteggio Salute Finanziaria</h3>
                    <p className="text-xs text-muted-foreground">Valutazione complessiva AI</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className={`text-3xl font-bold ${getScoreColor(report.score)}`}>
                      {report.score}
                      <span className="text-lg">/100</span>
                    </p>
                    <Badge className={getScoreBadge(report.status)}>{report.status}</Badge>
                  </div>
                </div>
                <Progress value={report.score} className="h-3 rounded-full" />
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {report.data.scores.map((m) => {
                    const Icon = getIcon(m.icon);
                    return (
                      <div key={m.label} className="text-center p-2 rounded-xl bg-muted/40">
                        <Icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                        <p className={`text-lg font-bold ${getScoreColor(m.score)}`}>{m.score}</p>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Entrate Totali',
                    value: `€${report.data.entrate.toLocaleString('it-IT')}`,
                    icon: TrendingUp,
                    color: 'green',
                  },
                  {
                    label: 'Uscite Totali',
                    value: `€${report.data.uscite.toLocaleString('it-IT')}`,
                    icon: TrendingDown,
                    color: 'red',
                  },
                  {
                    label: 'Risparmio Netto',
                    value: `€${report.data.risparmio.toLocaleString('it-IT')}`,
                    icon: PieChart,
                    color: 'blue',
                  },
                ].map((stat) => (
                  <Card key={stat.label} className="p-4 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <stat.icon
                        className={`w-4 h-4 ${stat.color === 'green' ? 'text-green-600' : stat.color === 'red' ? 'text-red-500' : 'text-blue-600'}`}
                      />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Tasso risparmio: {report.data.savingsRate}%
                    </p>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 rounded-2xl">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Entrate vs Uscite (6 mesi)
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={report.data.spendingData}>
                      <CartesianGrid key="grid" strokeDasharray="3 3" opacity={0.1} />
                      <XAxis key="x" dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis key="y" tick={{ fontSize: 12 }} />
                      <Tooltip key="tooltip" />
                      <Area
                        key="entrate"
                        type="monotone"
                        dataKey="entrate"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                      <Area
                        key="uscite"
                        type="monotone"
                        dataKey="uscite"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-5 rounded-2xl">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Spese per Categoria
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie
                        data={report.data.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        dataKey="value"
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {report.data.categoryBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip key="pie-tooltip" />
                    </RechartsPie>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Savings trend */}
              <Card className="p-5 rounded-2xl">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Trend Risparmio Mensile
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={report.data.savingsProgress}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" opacity={0.1} />
                    <XAxis key="x" dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis key="y" tick={{ fontSize: 12 }} />
                    <Tooltip key="tooltip" />
                    <Bar
                      key="bar"
                      dataKey="risparmiato"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* AI Insights */}
              <Card className="p-5 rounded-2xl">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Consigli AI Personalizzati
                </h3>
                <div className="space-y-3">
                  {report.data.insights.map((insight, i) => {
                    const Icon = getIcon(insight.icon);
                    return (
                      <motion.div
                        key={`${report.id}-insight-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-4 rounded-xl border-l-4 ${
                          insight.color === 'green'
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                            : insight.color === 'orange'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                              : insight.color === 'blue'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                : 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon
                            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                              insight.color === 'green'
                                ? 'text-green-600'
                                : insight.color === 'orange'
                                  ? 'text-orange-600'
                                  : insight.color === 'blue'
                                    ? 'text-blue-600'
                                    : 'text-purple-600'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-semibold">{insight.title}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{insight.text}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>

              {/* Download bar */}
              <Card className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Scarica il report completo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {['PDF', 'Excel', 'JSON'].map((fmt) => (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleDownload(fmt)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> {fmt}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card className="p-5 rounded-2xl">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Report Precedenti
            </h3>
            <div className="space-y-3">
              {HISTORICAL_REPORTS.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                  onClick={() => handleViewHistorical(r)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.month}</p>
                      <p className="text-xs text-muted-foreground">Generato il {r.date}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Entrate: €{r.data.entrate.toLocaleString('it-IT')}</span>
                        <span>Uscite: €{r.data.uscite.toLocaleString('it-IT')}</span>
                        <span className="text-green-600">
                          Risparmio: €{r.data.risparmio.toLocaleString('it-IT')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getScoreColor(r.score)}`}>{r.score}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${getScoreBadge(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewHistorical(r);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingReport(r);
                          handleDownload('PDF');
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
