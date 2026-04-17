/**
 * Settings Page — Figma Design Sprint
 *
 * 9-tab settings page matching the Figma template.
 * Tabs: Profilo, Aspetto, Categorie, API Keys, Piano, Notifiche, Integrazioni, Sicurezza, Dati
 *
 * @module app/dashboard/settings/page
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { SecurityTab } from '@/components/settings/SecurityTab';
import { DataTab } from '@/components/settings/DataTab';
import {
  User,
  CreditCard,
  Shield,
  Globe,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Sun,
  Palette,
  Crown,
  Users,
  Building2,
  CheckCircle2,
  X as XIcon,
  FileSpreadsheet,
  Zap,
  RefreshCw,
  Key,
  Monitor,
  TrendingUp,
  Wallet,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Brain,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import { useTheme, type Theme } from '@/hooks/useTheme';

// =============================================================================
// Types & Constants
// =============================================================================

type TabKey =
  | 'profile'
  | 'appearance'
  | 'categories'
  | 'apikeys'
  | 'plan'
  | 'notifications'
  | 'integrations'
  | 'security'
  | 'data';

// Profile-form-owned slice of preferences. Notifications are owned and
// persisted by <NotificationsTab /> — don't add them here or handleSaveProfile
// will clobber the nested notifications schema.
interface ProfileFormPreferences {
  theme?: 'system' | 'dracula' | 'italian';
  language?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  timezone: string;
  currency: string;
  preferences: ProfileFormPreferences;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Profilo' },
  { key: 'appearance', label: 'Aspetto' },
  { key: 'categories', label: 'Categorie' },
  { key: 'apikeys', label: 'API Keys' },
  { key: 'plan', label: 'Piano' },
  { key: 'notifications', label: 'Notifiche' },
  { key: 'integrations', label: 'Integrazioni' },
  { key: 'security', label: 'Sicurezza' },
  { key: 'data', label: 'Dati' },
];

const plans = [
  {
    id: 'single',
    name: 'Single User',
    price: 'Gratis',
    icon: User,
    color: 'border-blue-200 bg-blue-50 dark:bg-blue-950/30',
    features: [
      { name: 'Dashboard base', included: true },
      { name: '2 Conti', included: true },
      { name: 'Spese e Budget', included: true },
      { name: 'Analisi AI base', included: true },
      { name: '50 transazioni/mese', included: true },
      { name: 'Conti illimitati', included: false },
      { name: 'AskAI illimitato', included: false },
      { name: 'Integrazioni PayPal/Plaid', included: false },
      { name: 'Report mensili avanzati', included: false },
      { name: 'Import/Export avanzato', included: false },
      { name: 'Multi-utente', included: false },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    price: '€9,99/mese',
    icon: Users,
    color: 'border-purple-200 bg-purple-50 dark:bg-purple-950/30',
    popular: true,
    features: [
      { name: 'Dashboard avanzata', included: true },
      { name: 'Conti illimitati', included: true },
      { name: 'Spese e Budget', included: true },
      { name: 'Analisi AI avanzata', included: true },
      { name: 'Transazioni illimitate', included: true },
      { name: 'AskAI illimitato', included: true },
      { name: 'Integrazioni PayPal/Plaid', included: true },
      { name: 'Report mensili avanzati', included: true },
      { name: 'Import/Export completo', included: true },
      { name: 'Fino a 5 utenti', included: true },
      { name: 'API access', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '€24,99/mese',
    icon: Building2,
    color: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30',
    features: [
      { name: 'Dashboard avanzata', included: true },
      { name: 'Conti illimitati', included: true },
      { name: 'Spese e Budget', included: true },
      { name: 'Analisi AI premium', included: true },
      { name: 'Transazioni illimitate', included: true },
      { name: 'AskAI illimitato', included: true },
      { name: 'Tutte le integrazioni', included: true },
      { name: 'Report personalizzati', included: true },
      { name: 'Import/Export completo', included: true },
      { name: 'Utenti illimitati', included: true },
      { name: 'API access + Webhook', included: true },
    ],
  },
];

const integrations = [
  { id: 'paypal', name: 'PayPal', desc: 'Gestione pagamenti e transazioni', icon: CreditCard, color: 'bg-blue-600', category: 'pagamenti' },
  { id: 'plaid', name: 'Plaid Banking', desc: 'Sincronizza conti bancari automaticamente', icon: LinkIcon, color: 'bg-green-600', category: 'banca' },
  { id: 'revolut', name: 'Revolut', desc: 'Conto e carta multi-valuta', icon: RefreshCw, color: 'bg-indigo-600', category: 'banca' },
  { id: 'wise', name: 'Wise (TransferWise)', desc: 'Trasferimenti internazionali economici', icon: Globe, color: 'bg-cyan-600', category: 'pagamenti' },
  { id: 'coinbase', name: 'Coinbase', desc: 'Portafoglio crypto e trading', icon: TrendingUp, color: 'bg-blue-500', category: 'crypto' },
  { id: 'binance', name: 'Binance', desc: 'Exchange crypto avanzato', icon: TrendingUp, color: 'bg-yellow-500', category: 'crypto' },
  { id: 'gsheets', name: 'Google Sheets', desc: 'Esporta dati su fogli di calcolo', icon: FileSpreadsheet, color: 'bg-green-500', category: 'produttività' },
  { id: 'zapier', name: 'Zapier', desc: 'Automatizzazioni e workflow', icon: Zap, color: 'bg-orange-500', category: 'automazione' },
];

const TOGGLE_CLASS =
  'appearance-none w-10 h-5 bg-muted rounded-full relative cursor-pointer checked:bg-emerald-500 after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5';

// =============================================================================
// Component
// =============================================================================

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Profile state
  const [isSaving, setIsSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    timezone: 'Europe/Rome',
    currency: 'EUR',
    preferences: {
      theme: 'system',
      language: 'it',
    },
  });

  // Plan state
  const [currentPlan, setCurrentPlan] = useState('single');
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);

  // Integrations state
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [integrationFeedback, setIntegrationFeedback] = useState<string | null>(null);

  // API Keys state
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState({ openai: '', anthropic: '', gemini: '', coinbase: '', plaid: '' });
  const [apiKeyFeedback, setApiKeyFeedback] = useState<string | null>(null);


  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const prefs = user.preferences as Record<string, unknown> | null;
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '',
        bio: '',
        timezone: user.timezone || 'Europe/Rome',
        currency: user.currency || 'EUR',
        preferences: {
          theme: (prefs?.theme as Theme) || 'system',
          language: (prefs?.language as string) || 'it',
        },
      });
    }
  }, [user]);

  // Helpers
  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const showFeedback = (setter: (v: string | null) => void, msg: string) => {
    setter(msg);
    setTimeout(() => setter(null), 2500);
  };

  // Profile save (real Supabase)
  const handleSaveProfile = async () => {
    if (!user?.id) {
      setError('Utente non trovato. Effettua nuovamente il login.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();

      // Merge profile-form prefs with the existing stored preferences so we
      // preserve keys owned by other tabs (e.g. `notifications` from <NotificationsTab />).
      const existingPrefs =
        (user.preferences as Record<string, unknown> | null) ?? {};
      const mergedPreferences = {
        ...existingPrefs,
        ...formData.preferences,
      };

      // Type-safe update with explicit casting to avoid Next.js build type inference issues
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        timezone: formData.timezone,
        currency: formData.currency,
        preferences: JSON.parse(JSON.stringify(mergedPreferences)),
      };

      const { error: profileError } = await (supabase
        .from('profiles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update as any)(updateData)
        .eq('id', user.id);
      if (profileError) throw new Error(profileError.message || 'Errore aggiornamento profilo');
      setUser({
        ...user,
        firstName: formData.firstName,
        lastName: formData.lastName,
        timezone: formData.timezone,
        currency: formData.currency,
        preferences: mergedPreferences,
        fullName: `${formData.firstName} ${formData.lastName}`,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err instanceof Error ? err.message : 'Impossibile salvare le modifiche');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleIntegration = (id: string) => {
    if (connectedIntegrations.includes(id)) {
      setConnectedIntegrations((prev) => prev.filter((i) => i !== id));
      showFeedback(setIntegrationFeedback, 'Integrazione disconnessa');
    } else {
      setConnectedIntegrations((prev) => [...prev, id]);
      showFeedback(setIntegrationFeedback, 'Integrazione connessa!');
    }
  };

  // Theme descriptions
  const themes: { id: Theme; name: string; icon: typeof Sun; desc: string; preview: string }[] = [
    { id: 'dracula', name: 'Dracula', icon: Palette, desc: 'Tema Dracula con accenti viola', preview: 'bg-[#282a36] border-[#bd93f9]' },
    { id: 'italian', name: 'Italian Style', icon: Sun, desc: 'Tricolore italiano — verde, bianco, rosso', preview: 'bg-[#1a1a2e] border-[#009246]' },
    { id: 'system', name: 'Sistema', icon: Monitor, desc: 'Si adatta al tema del tuo sistema', preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-400' },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[32px] tracking-[-0.03em] text-foreground">Impostazioni</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Gestisci il tuo profilo e le preferenze</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
          <p className="text-[13px] text-rose-600">{error}</p>
        </div>
      )}

      {/* Tab Bar */}
      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Profile Tab */}
      {/* ================================================================= */}
      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-6">Informazioni Profilo</h3>
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {initials}
                </div>
                <div>
                  <Button variant="outline">Cambia Immagine</Button>
                  <p className="text-sm text-muted-foreground mt-2">JPG, PNG max 5MB</p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+39 333 1234567"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label>Bio / Nota</Label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Appassionato di finanza personale..."
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-foreground resize-none h-20"
                />
              </div>

              {/* Timezone / Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fuso Orario</Label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData((f) => ({ ...f, timezone: e.target.value }))}
                    className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-xl text-sm"
                  >
                    <option value="Europe/Rome">CET (Roma)</option>
                    <option value="Europe/London">GMT/BST (Londra)</option>
                    <option value="Europe/Paris">CET (Parigi)</option>
                    <option value="Europe/Berlin">CET (Berlino)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Asia/Tokyo">JST (Tokyo)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-xl text-sm"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (Fr.)</option>
                  </select>
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end gap-3">
                <Button variant="outline">Annulla</Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio...</>
                  ) : profileSaved ? (
                    <><Check className="w-4 h-4 mr-2" /> Salvato!</>
                  ) : (
                    'Salva Modifiche'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* Appearance Tab */}
      {/* ================================================================= */}
      {activeTab === 'appearance' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-6">Tema Interfaccia</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themes.map((t) => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTheme(t.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    theme === t.id
                      ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className={`w-full h-20 rounded-xl mb-3 border ${t.preview}`} />
                  <div className="flex items-center gap-2">
                    <t.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{t.name}</span>
                    {theme === t.id && <Check className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </motion.button>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-6">Preferenze Display</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Lingua</Label>
                  <select id="language" className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-xl text-sm">
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                    <option value="es">Espanol</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Formato Data</Label>
                  <select className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-xl text-sm">
                    <option>GG/MM/AAAA</option>
                    <option>MM/GG/AAAA</option>
                    <option>AAAA-MM-GG</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Formato Numeri</Label>
                  <select className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-xl text-sm">
                    <option>1.234,56 (EU)</option>
                    <option>1,234.56 (US)</option>
                  </select>
                </div>
              </div>

              {[
                { title: 'Modalità Compatta', desc: 'Riduci lo spazio tra gli elementi', defaultOn: false },
                { title: 'Animazioni', desc: "Abilita le animazioni dell'interfaccia", defaultOn: true },
                { title: 'Mostra Centesimi', desc: 'Visualizza sempre i decimali', defaultOn: true },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={item.defaultOn}
                    className={TOGGLE_CLASS}
                  />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* Categories Tab — real CRUD via CategoryManager */}
      {/* ================================================================= */}
      {activeTab === 'categories' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <CategoryManager />
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* API Keys Tab */}
      {/* ================================================================= */}
      {activeTab === 'apikeys' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Header Card */}
          <Card className="p-6 rounded-2xl border-0 shadow-sm bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-blue-500/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-medium text-foreground">Chiavi API</h3>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Configura le tue API keys per abilitare l&apos;integrazione con servizi AI e finanziari
                </p>
              </div>
            </div>
          </Card>

          {/* Feedback */}
          {apiKeyFeedback && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-[13px] text-emerald-600">{apiKeyFeedback}</span>
            </div>
          )}

          {/* AI Services */}
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <h4 className="text-[16px] font-medium text-foreground mb-5 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Intelligenza Artificiale
            </h4>
            <div className="space-y-4">
              {[
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4, GPT-3.5 Turbo', icon: '🤖', gradient: 'from-emerald-500 to-teal-500' },
                { id: 'anthropic', name: 'Anthropic Claude', desc: 'Claude 3 Opus, Sonnet, Haiku', icon: '🧠', gradient: 'from-orange-500 to-amber-500' },
                { id: 'gemini', name: 'Google Gemini', desc: 'Gemini Pro, Ultra', icon: '✨', gradient: 'from-blue-500 to-indigo-500' },
              ].map((service) => {
                const keyValue = apiKeys[service.id as keyof typeof apiKeys];
                const isConfigured = keyValue.length > 0;
                return (
                  <div key={service.id} className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all border border-border/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.gradient} flex items-center justify-center text-[20px] shadow-sm flex-shrink-0`}>
                        {service.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-foreground">{service.name}</p>
                          {isConfigured && (
                            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3 h-3" />Attiva
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{service.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKeys[service.id] ? 'text' : 'password'}
                          placeholder="sk-••••••••••••••••••••••••"
                          value={keyValue}
                          onChange={(e) => setApiKeys({ ...apiKeys, [service.id]: e.target.value })}
                          className="h-9 pr-16 font-mono text-[11px] bg-background border-border/50"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setShowApiKeys({ ...showApiKeys, [service.id]: !showApiKeys[service.id] })}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          >
                            {showApiKeys[service.id] ? (
                              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                          {keyValue && (
                            <button
                              type="button"
                              onClick={() => {
                                window.navigator.clipboard.writeText(keyValue);
                                showFeedback(setApiKeyFeedback, 'API key copiata!');
                              }}
                              className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className={`h-9 px-4 rounded-lg ${
                          isConfigured
                            ? 'bg-muted text-foreground hover:bg-muted/80'
                            : `bg-gradient-to-r ${service.gradient} text-white hover:opacity-90`
                        }`}
                        onClick={() =>
                          showFeedback(setApiKeyFeedback, `API key ${service.name} ${isConfigured ? 'aggiornata' : 'salvata'}!`)
                        }
                      >
                        {isConfigured ? 'Aggiorna' : 'Salva'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Financial Services */}
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <h4 className="text-[16px] font-medium text-foreground mb-5 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-500" />
              Servizi Finanziari
            </h4>
            <div className="space-y-4">
              {[
                { id: 'plaid', name: 'Plaid Banking', desc: 'Sincronizzazione bancaria automatica', icon: '🏦', gradient: 'from-blue-500 to-cyan-500' },
                { id: 'coinbase', name: 'Coinbase API', desc: 'Trading e portfolio crypto', icon: '₿', gradient: 'from-orange-500 to-yellow-500' },
              ].map((service) => {
                const keyValue = apiKeys[service.id as keyof typeof apiKeys];
                const isConfigured = keyValue.length > 0;
                return (
                  <div key={service.id} className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all border border-border/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.gradient} flex items-center justify-center text-[20px] shadow-sm flex-shrink-0`}>
                        {service.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-foreground">{service.name}</p>
                          {isConfigured && (
                            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3 h-3" />Attiva
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{service.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKeys[service.id] ? 'text' : 'password'}
                          placeholder="••••••••••••••••••••••••"
                          value={keyValue}
                          onChange={(e) => setApiKeys({ ...apiKeys, [service.id]: e.target.value })}
                          className="h-9 pr-16 font-mono text-[11px] bg-background border-border/50"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setShowApiKeys({ ...showApiKeys, [service.id]: !showApiKeys[service.id] })}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          >
                            {showApiKeys[service.id] ? (
                              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                          {keyValue && (
                            <button
                              type="button"
                              onClick={() => {
                                window.navigator.clipboard.writeText(keyValue);
                                showFeedback(setApiKeyFeedback, 'API key copiata!');
                              }}
                              className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className={`h-9 px-4 rounded-lg ${
                          isConfigured
                            ? 'bg-muted text-foreground hover:bg-muted/80'
                            : `bg-gradient-to-r ${service.gradient} text-white hover:opacity-90`
                        }`}
                        onClick={() =>
                          showFeedback(setApiKeyFeedback, `API key ${service.name} ${isConfigured ? 'aggiornata' : 'salvata'}!`)
                        }
                      >
                        {isConfigured ? 'Aggiorna' : 'Salva'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Security Note */}
          <Card className="p-5 rounded-2xl border-0 bg-amber-500/5 border-l-4 border-l-amber-500">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-foreground">Sicurezza e Privacy</p>
                <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                  Le API keys vengono criptate end-to-end e archiviate in modo sicuro. Non vengono mai condivise con terze parti.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* Plan Tab */}
      {/* ================================================================= */}
      {activeTab === 'plan' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-1">Gestione Piano</h3>
            <p className="text-sm text-muted-foreground">
              Piano attuale: <Badge className="ml-1">{plans.find((p) => p.id === currentPlan)?.name}</Badge>
            </p>
            {planFeedback && (
              <div className="mt-3 flex items-center gap-2 text-[13px] text-emerald-600">
                <Check className="w-4 h-4" /> {planFeedback}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const active = currentPlan === plan.id;
              return (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`p-6 relative rounded-2xl border-0 shadow-sm ${active ? 'ring-2 ring-emerald-500' : ''} ${plan.color}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-purple-600 text-white">
                          <Crown className="w-3 h-3 mr-1" /> Popolare
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-card rounded-xl">
                        <plan.icon className="w-6 h-6 text-foreground" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{plan.name}</h4>
                        <p className="text-lg font-bold text-foreground">{plan.price}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <div key={f.name} className="flex items-center gap-2 text-sm">
                          {f.included ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <XIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={f.included ? 'text-foreground' : 'text-muted-foreground'}>{f.name}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className={`w-full ${
                        active
                          ? 'bg-muted text-muted-foreground cursor-default'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                      }`}
                      onClick={() => {
                        if (!active) {
                          setCurrentPlan(plan.id);
                          showFeedback(setPlanFeedback, `Piano ${plan.name} attivato!`);
                        }
                      }}
                      disabled={active}
                    >
                      {active ? 'Piano Attuale' : 'Seleziona'}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* Notifications Tab — real persistence to profiles.preferences.notifications */}
      {/* ================================================================= */}
      {activeTab === 'notifications' && <NotificationsTab />}

      {/* ================================================================= */}
      {/* Integrations Tab */}
      {/* ================================================================= */}
      {activeTab === 'integrations' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* AI Suggestion */}
          <Card className="p-4 rounded-2xl border-0 shadow-sm border-l-4 border-l-purple-500">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Suggerimento AI</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Collegando Plaid Banking e PayPal, le tue transazioni verranno importate automaticamente.
                  Risparmierai circa 15 minuti al giorno!
                </p>
              </div>
            </div>
          </Card>

          {/* Feedback */}
          {integrationFeedback && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-[13px] text-emerald-600">{integrationFeedback}</span>
            </div>
          )}

          {/* Grouped */}
          {(['banca', 'pagamenti', 'crypto', 'produttività', 'automazione'] as const).map((cat) => {
            const items = integrations.filter((i) => i.category === cat);
            if (items.length === 0) return null;
            const catLabels: Record<string, string> = {
              banca: 'Banking',
              pagamenti: 'Pagamenti',
              crypto: 'Crypto',
              produttivita: 'Produttività',
              automazione: 'Automazione',
            };
            return (
              <div key={cat}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">{catLabels[cat]}</h4>
                <div className="space-y-3">
                  {items.map((integration) => {
                    const connected = connectedIntegrations.includes(integration.id);
                    return (
                      <Card key={integration.id} className="p-4 rounded-2xl border-0 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                              <integration.icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{integration.name}</h3>
                              <p className="text-sm text-muted-foreground">{integration.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {connected ? (
                              <>
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  <Check className="w-3 h-3 mr-1" />Connesso
                                </Badge>
                                <Button variant="outline" size="sm" onClick={() => toggleIntegration(integration.id)}>
                                  Disconnetti
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
                                onClick={() => toggleIntegration(integration.id)}
                              >
                                <LinkIcon className="w-4 h-4 mr-2" />Connetti
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Privacy Note */}
          <Card className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Nota sulla Privacy</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Questa è un&apos;applicazione demo. Le integrazioni sono simulate e non trasmettono dati reali.
                  Non inserire credenziali finanziarie reali.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'security' && <SecurityTab />}

      {/* ================================================================= */}
      {/* Data Tab */}
      {/* ================================================================= */}
      {activeTab === 'data' && <DataTab />}
    </div>
  );
}
