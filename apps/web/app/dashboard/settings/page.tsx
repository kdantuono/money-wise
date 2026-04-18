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
import { ComingSoonTab } from '@/components/settings/ComingSoonTab';
import {
  Link as LinkIcon,
  Check,
  AlertCircle,
  Sun,
  Palette,
  Crown,
  Key,
  Monitor,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// `plans` and `integrations` catalogs removed in Sprint 1.4 — their tabs
// render <ComingSoonTab /> until the real feature ships. When restoring,
// consider moving them into dedicated config files (plans.config.ts,
// integrations.config.ts) rather than inlining here.

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

  // Piano / Integrazioni / API Keys tabs are "In arrivo" placeholders (Sprint 1.4),
  // so their state is gone. When these tabs go live, restore here.


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
        <ComingSoonTab
          icon={Key}
          iconGradient="from-purple-500 to-indigo-500"
          title="Chiavi API"
          description="Configura le tue API keys per abilitare l'integrazione con servizi AI e finanziari (OpenAI, Anthropic, Gemini, Plaid, Coinbase)."
          eta="Beta Q3 2026"
          previewFeatures={[
            'Chiavi cifrate end-to-end lato server',
            'Rotazione automatica e audit delle chiamate',
            'Quota e rate-limit per servizio',
          ]}
        />
      )}

      {/* ================================================================= */}
      {/* Plan Tab */}
      {/* ================================================================= */}
      {activeTab === 'plan' && (
        <ComingSoonTab
          icon={Crown}
          iconGradient="from-emerald-500 to-teal-500"
          title="Gestione Piano"
          description="Passa a Pro o Premium per sbloccare report AI avanzati, integrazioni bancarie e supporto prioritario."
          eta="Beta Q3 2026"
          previewFeatures={[
            'Confronto Free / Pro / Premium',
            'Fatturazione Stripe con ricevuta PDF',
            'Cambio piano e cancellazione senza attrito',
          ]}
        />
      )}

      {/* ================================================================= */}
      {/* Notifications Tab — real persistence to profiles.preferences.notifications */}
      {/* ================================================================= */}
      {activeTab === 'notifications' && <NotificationsTab />}

      {/* ================================================================= */}
      {/* Integrations Tab */}
      {/* ================================================================= */}
      {activeTab === 'integrations' && (
        <ComingSoonTab
          icon={LinkIcon}
          iconGradient="from-cyan-500 to-blue-500"
          title="Integrazioni"
          description="Collega servizi esterni (PayPal, Revolut, Google Sheets, Notion) per centralizzare finanze e workflow."
          eta="Beta Q3 2026"
          previewFeatures={[
            'Marketplace di integrazioni certificate',
            'Sync bidirezionale dove supportato',
            'Log delle sincronizzazioni con retry automatico',
          ]}
        />
      )}

      {activeTab === 'security' && <SecurityTab />}

      {/* ================================================================= */}
      {/* Data Tab */}
      {/* ================================================================= */}
      {activeTab === 'data' && <DataTab />}
    </div>
  );
}
