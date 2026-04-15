'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Diamond,
  TrendingUp,
  Shield,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Login / Register / Forgot — 1:1 from Figma Login.tsx
// ---------------------------------------------------------------------------

type Mode = 'login' | 'register' | 'forgot';

const features = [
  { icon: TrendingUp, title: 'Traccia Investimenti', desc: 'Conti, transazioni e budget in tempo reale' },
  { icon: Sparkles, title: 'AI Intelligente', desc: 'Consigli personalizzati per le tue finanze' },
  { icon: Diamond, title: 'Gamification', desc: 'Guadagna traguardi gestendo le finanze' },
  { icon: Shield, title: 'Sicurezza', desc: 'I tuoi dati sempre al sicuro con Supabase' },
];

export default function LoginPage() {
  const router = useRouter();

  const { login, register: registerUser } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email o password non validi');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!firstName || !email || !password) {
      setError('Compila tutti i campi obbligatori');
      return;
    }
    setLoading(true);
    try {
      await registerUser(email, password, firstName, lastName);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setError('');
    if (!email) {
      setError('Inserisci la tua email');
      return;
    }
    setLoading(true);
    // TODO: Supabase resetPasswordForEmail
    setTimeout(() => {
      setError('Funzionalità in arrivo. Contatta il supporto.');
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ============================================================
          Left panel — features (desktop only)
          ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-emerald-500 text-[13px] tracking-wide mb-3">● Zecca</p>
          <h1 className="text-[40px] tracking-[-0.04em] text-foreground leading-[1.1] mb-4">
            Le tue finanze,
            <br />
            <span className="text-muted-foreground">semplificate.</span>
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-md mb-12">
            Gestisci patrimonio, budget e spese con l&apos;aiuto dell&apos;intelligenza artificiale.
          </p>
        </motion.div>

        <div className="space-y-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-start gap-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-card shadow-sm flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[13px] text-foreground">{f.title}</p>
                <p className="text-[12px] text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ============================================================
          Right panel — auth form
          ============================================================ */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <p className="text-emerald-500 text-[13px] mb-1">● Zecca</p>
            <p className="text-[13px] text-muted-foreground">
              Gestione finanziaria intelligente
            </p>
          </div>

          <Card className="p-7 border-0 shadow-lg bg-card">
            <AnimatePresence mode="wait">
              {/* ────────── LOGIN ────────── */}
              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <h2 className="text-[20px] tracking-[-0.02em] text-foreground mb-0.5">
                    Bentornato
                  </h2>
                  <p className="text-[13px] text-muted-foreground mb-6">
                    Accedi al tuo account
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-11 border-border/50 rounded-xl"
                          placeholder="email@esempio.it"
                          data-testid="email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-11 border-border/50 rounded-xl"
                          placeholder="••••••"
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          data-testid="password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[12px] text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl"
                      >
                        {error}
                      </motion.p>
                    )}

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded" />
                        Ricordami
                      </label>
                      <button
                        onClick={() => { setMode('forgot'); setError(''); }}
                        className="text-[12px] text-emerald-500 hover:underline"
                      >
                        Password dimenticata?
                      </button>
                    </div>

                    <Button
                      onClick={handleLogin}
                      disabled={loading}
                      className="w-full h-11 rounded-xl bg-foreground text-background hover:opacity-90"
                      data-testid="login-button"
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-background border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          Accedi <ArrowRight className="w-4 h-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-6 text-center text-[12px] text-muted-foreground">
                    Non hai un account?{' '}
                    <button
                      onClick={() => { setMode('register'); setError(''); }}
                      className="text-emerald-500 hover:underline"
                    >
                      Registrati
                    </button>
                  </div>

                </motion.div>
              )}

              {/* ────────── REGISTER ────────── */}
              {mode === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <h2 className="text-[20px] tracking-[-0.02em] text-foreground mb-0.5">
                    Crea Account
                  </h2>
                  <p className="text-[13px] text-muted-foreground mb-6">
                    Inizia a gestire le tue finanze
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-muted-foreground">Nome</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                          <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="pl-10 h-11 border-border/50 rounded-xl"
                            placeholder="Mario"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-muted-foreground">Cognome</Label>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="h-11 border-border/50 rounded-xl"
                          placeholder="Rossi"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-11 border-border/50 rounded-xl"
                          placeholder="email@esempio.it"
                          type="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-11 border-border/50 rounded-xl"
                          placeholder="Min. 12 caratteri"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {error && (
                      <p className="text-[12px] text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl">
                        {error}
                      </p>
                    )}
                    <Button
                      onClick={handleRegister}
                      disabled={loading}
                      className="w-full h-11 rounded-xl bg-foreground text-background hover:opacity-90"
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-background border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          Crea Account <ArrowRight className="w-4 h-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="mt-6 text-center text-[12px] text-muted-foreground">
                    Hai già un account?{' '}
                    <button
                      onClick={() => { setMode('login'); setError(''); }}
                      className="text-emerald-500 hover:underline"
                    >
                      Accedi
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ────────── FORGOT ────────── */}
              {mode === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <h2 className="text-[20px] tracking-[-0.02em] text-foreground mb-0.5">
                    Recupera Password
                  </h2>
                  <p className="text-[13px] text-muted-foreground mb-6">
                    Inserisci la tua email
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-11 border-border/50 rounded-xl"
                          placeholder="email@esempio.it"
                          type="email"
                        />
                      </div>
                    </div>
                    {error && (
                      <p className="text-[12px] text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl">
                        {error}
                      </p>
                    )}
                    <Button
                      onClick={handleForgot}
                      disabled={loading}
                      className="w-full h-11 rounded-xl bg-foreground text-background hover:opacity-90"
                    >
                      {loading ? 'Invio...' : 'Invia Link di Reset'}
                    </Button>
                  </div>
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => { setMode('login'); setError(''); }}
                      className="text-[12px] text-emerald-500 hover:underline"
                    >
                      ← Torna al Login
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
