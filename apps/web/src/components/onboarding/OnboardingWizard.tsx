'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  Wallet,
  Target,
  TrendingUp,
  Receipt,
  ChevronRight,
  ChevronLeft,
  Check,
  Diamond,
  Brain,
  PiggyBank,
  Landmark,
  CreditCard,
  Banknote,
  Bitcoin,
  BarChart3,
  Rocket,
} from 'lucide-react';

export interface OnboardingData {
  incomeRange: string;
  savingsGoal: string;
  goals: string[];
  aiPreferences: string[];
}

interface OnboardingWizardProps {
  userName: string;
  onComplete: (data: OnboardingData) => void;
}

const STEPS = [
  { title: 'Benvenuto', icon: Sparkles },
  { title: 'Profilo', icon: Wallet },
  { title: 'Obiettivi', icon: Target },
  { title: 'Preferenze AI', icon: Brain },
  { title: 'Pronto!', icon: Rocket },
];

const incomeRanges = [
  '< \u20AC1.500',
  '\u20AC1.500 - \u20AC2.500',
  '\u20AC2.500 - \u20AC4.000',
  '\u20AC4.000 - \u20AC6.000',
  '> \u20AC6.000',
  'Preferisco non dire',
];

const goalOptions = [
  { id: 'emergency', label: 'Fondo Emergenza', icon: PiggyBank, color: 'blue' },
  { id: 'house', label: 'Comprare Casa', icon: Landmark, color: 'green' },
  { id: 'invest', label: 'Iniziare a Investire', icon: TrendingUp, color: 'purple' },
  { id: 'debt', label: 'Eliminare Debiti', icon: CreditCard, color: 'red' },
  { id: 'save', label: 'Risparmiare di Pi\u00F9', icon: Banknote, color: 'orange' },
  { id: 'crypto', label: 'Portafoglio Crypto', icon: Bitcoin, color: 'yellow' },
  { id: 'budget', label: 'Gestire il Budget', icon: Receipt, color: 'cyan' },
  { id: 'grow', label: 'Far Crescere Patrimonio', icon: BarChart3, color: 'emerald' },
];

const aiPreferences = [
  {
    id: 'proactive',
    label: 'Consigli Proattivi',
    desc: 'Ricevi suggerimenti AI automatici quando rileva pattern nelle spese',
  },
  {
    id: 'alerts',
    label: 'Alert Budget',
    desc: 'Notifiche quando ti avvicini ai limiti di budget',
  },
  {
    id: 'weekly',
    label: 'Report Settimanale',
    desc: 'Riepilogo AI ogni luned\u00EC con insight della settimana',
  },
  {
    id: 'invest',
    label: 'Suggerimenti Investimento',
    desc: 'Opportunit\u00E0 di investimento personalizzate in base al tuo profilo',
  },
];

export function OnboardingWizard({ userName, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedAI, setSelectedAI] = useState<string[]>(['proactive', 'alerts']);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleAI = (id: string) => {
    setSelectedAI((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 1) return income !== '';
    if (step === 2) return selectedGoals.length > 0;
    return true;
  };

  const handleComplete = () => {
    onComplete({
      incomeRange: income,
      savingsGoal,
      goals: selectedGoals,
      aiPreferences: selectedAI,
    });
  };

  const handleSkip = () => {
    onComplete({
      incomeRange: '',
      savingsGoal: '',
      goals: [],
      aiPreferences: [],
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Ciao, {userName}! 👋
              </h2>
              <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                Benvenuto su{' '}
                <span className="font-semibold text-blue-600">Zecca</span>. In
                pochi step configureremo il tuo hub finanziario personalizzato
                con AI.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {[
                {
                  icon: Brain,
                  label: '5 Agenti AI',
                  color: 'from-purple-500 to-pink-500',
                },
                {
                  icon: Diamond,
                  label: 'Gamification',
                  color: 'from-cyan-500 to-blue-500',
                },
                {
                  icon: TrendingUp,
                  label: 'Analisi Smart',
                  color: 'from-green-500 to-emerald-500',
                },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center`}
                  >
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {f.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">
                Il tuo Profilo Finanziario
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ci aiuta a personalizzare i consigli AI
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Fascia di reddito mensile
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {incomeRanges.map((r) => (
                    <button
                      key={r}
                      onClick={() => setIncome(r)}
                      className={`px-3 py-2 rounded-xl text-sm transition-all border ${
                        income === r
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-500'
                          : 'border-border hover:border-blue-300 hover:bg-muted'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Obiettivo risparmio mensile (&euro;)
                </Label>
                <Input
                  type="number"
                  placeholder="es. 500"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">
                I tuoi Obiettivi
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Seleziona quelli che ti interessano
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {goalOptions.map((g) => {
                const selected = selectedGoals.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                      selected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500'
                        : 'border-border hover:border-blue-300 hover:bg-muted'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <g.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{g.label}</span>
                    {selected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">
                Preferenze AI
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Personalizza come l&apos;AI ti aiuta
              </p>
            </div>
            <div className="space-y-2">
              {aiPreferences.map((pref) => {
                const selected = selectedAI.includes(pref.id);
                return (
                  <button
                    key={pref.id}
                    onClick={() => toggleAI(pref.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                      selected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-500'
                        : 'border-border hover:border-purple-300 hover:bg-muted'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selected
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pref.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-5">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center"
            >
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Tutto Pronto! 🎉
              </h2>
              <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                Il tuo hub finanziario è configurato. I 5 agenti AI sono pronti
                ad assisterti.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-cyan-950/30 dark:to-purple-950/30 mx-auto w-fit"
            >
              <Diamond className="w-5 h-5 text-cyan-500" />
              <span className="font-semibold text-foreground">
                +50 Diamanti Bonus
              </span>
              <span className="text-muted-foreground text-sm">
                di benvenuto!
              </span>
            </motion.div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-sm">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="font-medium">{selectedGoals.length}</p>
                <p className="text-xs text-muted-foreground">
                  Obiettivi selezionati
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="font-medium">{selectedAI.length}</p>
                <p className="text-xs text-muted-foreground">
                  Funzioni AI attive
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-lg"
      >
        <Card className="w-full rounded-3xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="flex-1 flex flex-col items-center gap-1.5"
                >
                  <div className="w-full flex items-center">
                    <div
                      className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                        i <= step ? 'bg-blue-600' : 'bg-muted'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] hidden sm:block whitespace-nowrap transition-colors ${
                      i <= step
                        ? 'text-blue-600 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="px-6 h-[380px] flex items-center">
            <div className="w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            {step > 0 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="rounded-xl text-muted-foreground"
              >
                Salta
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                Inizia! <Rocket className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
