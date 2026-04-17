/**
 * NotificationsTab — Settings > Notifiche tab
 *
 * Persists notification preferences (channels, types, quiet hours) to
 * `profiles.preferences.notifications` JSONB via the user-preferences service.
 *
 * @module components/settings/NotificationsTab
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { userPreferencesClient } from '@/services/user-preferences.client';
import {
  defaultNotificationPreferences,
  parseNotificationPreferences,
  TIME_REGEX,
  type NotificationChannels,
  type NotificationPreferences,
  type NotificationTypes,
  type QuietHours,
  type UserPreferences,
} from '@/types/user-preferences';

// =============================================================================
// Static definitions (pure — rendered by JSX)
// =============================================================================

interface ChannelDef {
  key: keyof NotificationChannels;
  icon: typeof Mail;
  title: string;
  desc: string;
}

const CHANNELS: ChannelDef[] = [
  {
    key: 'email',
    icon: Mail,
    title: 'Notifiche Email',
    desc: 'Ricevi aggiornamenti via email',
  },
  {
    key: 'push',
    icon: Smartphone,
    title: 'Notifiche Push',
    desc: 'Ricevi notifiche sul dispositivo',
  },
  {
    key: 'inApp',
    icon: MessageSquare,
    title: 'Notifiche In-App',
    desc: "Badge e popup nell'applicazione",
  },
];

interface TypeDef {
  key: keyof NotificationTypes;
  label: string;
  desc: string;
}

const TYPES: TypeDef[] = [
  {
    key: 'monthlyReport',
    label: 'Rapporto Mensile AI',
    desc: 'Analisi mensile delle tue finanze',
  },
  {
    key: 'budgetAlerts',
    label: 'Alert Budget',
    desc: "Quando superi l'80% di un budget",
  },
  {
    key: 'aiAdvice',
    label: 'Consigli AI Personalizzati',
    desc: 'Suggerimenti per ottimizzare',
  },
  {
    key: 'investmentUpdates',
    label: 'Aggiornamenti Investimenti',
    desc: 'Variazioni significative del portafoglio',
  },
  {
    key: 'recurringDeadlines',
    label: 'Scadenze Ricorrenti',
    desc: 'Promemoria pagamenti in scadenza',
  },
  {
    key: 'goalsAchieved',
    label: 'Obiettivi Raggiunti',
    desc: 'Celebra i tuoi traguardi',
  },
  {
    key: 'newFeatures',
    label: 'Nuove Funzionalità',
    desc: "Scopri le novità dell'app",
  },
  {
    key: 'promotions',
    label: 'Promozioni e Offerte',
    desc: 'Offerte speciali e sconti',
  },
];

const TOGGLE_CLASS =
  "appearance-none w-10 h-5 bg-muted rounded-full relative cursor-pointer checked:bg-emerald-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5";

// =============================================================================
// Component
// =============================================================================

export function NotificationsTab() {
  const { user, setUser } = useAuthStore();

  const initial = useMemo<NotificationPreferences>(
    () =>
      user
        ? parseNotificationPreferences(
            (user.preferences as Record<string, unknown> | undefined)
              ?.notifications
          )
        : defaultNotificationPreferences(),
    [user]
  );

  const [channels, setChannels] = useState<NotificationChannels>(
    initial.channels
  );
  const [types, setTypes] = useState<NotificationTypes>(initial.types);
  const [quietHours, setQuietHours] = useState<QuietHours>(initial.quietHours);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-hydrate when the auth user object changes (e.g. session refresh)
  useEffect(() => {
    setChannels(initial.channels);
    setTypes(initial.types);
    setQuietHours(initial.quietHours);
  }, [initial]);

  // Clear any pending "Salvato!" reset timer on unmount
  useEffect(() => {
    return () => {
      if (savedResetTimer.current) {
        clearTimeout(savedResetTimer.current);
        savedResetTimer.current = null;
      }
    };
  }, []);

  const handleChannelToggle = (key: keyof NotificationChannels) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTypeToggle = (key: keyof NotificationTypes) => {
    setTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleQuietToggle = () => {
    setQuietHours((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleQuietTimeChange = (field: 'from' | 'to', value: string) => {
    setQuietHours((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      setError('Utente non trovato. Effettua nuovamente il login.');
      return;
    }
    // Guard against malformed time values before persisting. `<input type="time">`
    // can emit an empty string, and quietHours could be set programmatically.
    if (
      quietHours.enabled &&
      (!TIME_REGEX.test(quietHours.from) || !TIME_REGEX.test(quietHours.to))
    ) {
      setError(
        'Orari di silenziamento non validi. Usa il formato HH:MM (es. 22:00).'
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const nextNotifications: NotificationPreferences = {
        channels,
        types,
        quietHours,
      };
      const mergedPreferences = await userPreferencesClient.updateNotifications(
        user.id,
        user.preferences as UserPreferences | null | undefined,
        nextNotifications
      );
      setUser({
        ...user,
        preferences: mergedPreferences as unknown as Record<string, unknown>,
      });
      setSavedAt(Date.now());
      if (savedResetTimer.current) {
        clearTimeout(savedResetTimer.current);
      }
      savedResetTimer.current = setTimeout(() => {
        setSavedAt(null);
        savedResetTimer.current = null;
      }, 2500);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Impossibile salvare le preferenze notifiche'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-6 rounded-2xl border-0 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Canali di Notifica
        </h3>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 p-4 mb-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl"
          >
            <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
            <p className="text-[13px] text-rose-600">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const inputId = `notif-channel-${channel.key}`;
            return (
              <div
                key={channel.key}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label
                      htmlFor={inputId}
                      className="font-medium text-foreground"
                    >
                      {channel.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {channel.desc}
                    </p>
                  </div>
                </div>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={channels[channel.key]}
                  onChange={() => handleChannelToggle(channel.key)}
                  className={TOGGLE_CLASS}
                />
              </div>
            );
          })}

          <div className="border-t border-border pt-6">
            <h4 className="font-medium text-foreground mb-4">
              Tipologia Notifiche
            </h4>
            <div className="space-y-4">
              {TYPES.map((type) => {
                const inputId = `notif-type-${type.key}`;
                return (
                  <div
                    key={type.key}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <Label
                        htmlFor={inputId}
                        className="font-medium text-sm text-foreground"
                      >
                        {type.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {type.desc}
                      </p>
                    </div>
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={types[type.key]}
                      onChange={() => handleTypeToggle(type.key)}
                      className={TOGGLE_CLASS}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-foreground">
                  Orario Silenziamento
                </h4>
                <p className="text-xs text-muted-foreground">
                  Sospendi le notifiche in determinate fasce orarie
                </p>
              </div>
              <input
                id="notif-quiet-enabled"
                type="checkbox"
                checked={quietHours.enabled}
                onChange={handleQuietToggle}
                className={TOGGLE_CLASS}
                aria-label="Abilita silenziamento"
              />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-quiet-from">Dalle</Label>
                <Input
                  id="notif-quiet-from"
                  type="time"
                  value={quietHours.from}
                  onChange={(e) =>
                    handleQuietTimeChange('from', e.target.value)
                  }
                  disabled={!quietHours.enabled}
                  className="w-32"
                />
              </div>
              <span className="text-muted-foreground">&mdash;</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="notif-quiet-to">Alle</Label>
                <Input
                  id="notif-quiet-to"
                  type="time"
                  value={quietHours.to}
                  onChange={(e) => handleQuietTimeChange('to', e.target.value)}
                  disabled={!quietHours.enabled}
                  className="w-32"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio...
                </>
              ) : savedAt ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> Salvato!
                </>
              ) : (
                'Salva Preferenze'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default NotificationsTab;
