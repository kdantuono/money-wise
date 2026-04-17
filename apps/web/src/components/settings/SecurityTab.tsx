/**
 * SecurityTab — Settings > Sicurezza tab
 *
 * Owns the password change flow. Uses `securityClient.changePassword` which
 * re-verifies the current password before applying the new one.
 *
 * 2FA, active sessions, and activity log sections remain as "In arrivo"
 * placeholders (out of scope for Sprint 1.2 — wired in later sprints when
 * the respective backends land).
 *
 * @module components/settings/SecurityTab
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  Key,
  Loader2,
  Mail,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import {
  securityClient,
  SecurityApiError,
} from '@/services/security.client';
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from '@/types/security';

const TOGGLE_CLASS =
  'w-10 h-6 appearance-none bg-muted rounded-full relative cursor-pointer checked:bg-primary transition-colors before:content-[""] before:absolute before:top-0.5 before:left-0.5 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-transform checked:before:translate-x-4';

// =============================================================================
// Password form
// =============================================================================

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_FORM: FormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

type FieldErrors = Partial<Record<keyof PasswordChangeInput, string>>;

function PasswordChangeForm() {
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (serverError) setServerError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setServerError(null);
    setSuccess(null);

    const parsed = passwordChangeSchema.safeParse(form);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof PasswordChangeInput | undefined;
        if (k && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }

    if (!user?.email) {
      setServerError('Sessione non valida. Rifai login e riprova.');
      return;
    }

    setSubmitting(true);
    try {
      await securityClient.changePassword({
        email: user.email,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      setForm(EMPTY_FORM);
      setSuccess('Password aggiornata con successo.');
    } catch (err) {
      if (err instanceof SecurityApiError) {
        if (err.code === 'current_password_mismatch') {
          setErrors({ currentPassword: err.message });
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(
          'Errore imprevisto durante il cambio password. Riprova.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Password Attuale</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setField('currentPassword', e.target.value)}
          aria-invalid={!!errors.currentPassword}
          aria-describedby={
            errors.currentPassword ? 'currentPassword-error' : undefined
          }
          disabled={submitting}
        />
        {errors.currentPassword && (
          <p
            id="currentPassword-error"
            className="text-sm text-destructive"
          >
            {errors.currentPassword}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nuova Password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => setField('newPassword', e.target.value)}
          aria-invalid={!!errors.newPassword}
          aria-describedby={
            errors.newPassword ? 'newPassword-error' : undefined
          }
          disabled={submitting}
        />
        {errors.newPassword && (
          <p id="newPassword-error" className="text-sm text-destructive">
            {errors.newPassword}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Conferma Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => setField('confirmPassword', e.target.value)}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={
            errors.confirmPassword ? 'confirmPassword-error' : undefined
          }
          disabled={submitting}
        />
        {errors.confirmPassword && (
          <p
            id="confirmPassword-error"
            className="text-sm text-destructive"
          >
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-[13px] text-red-600">{serverError}</span>
        </div>
      )}

      {success ? (
        <span className="flex items-center gap-2 text-[13px] text-emerald-600">
          <Check className="w-4 h-4" /> {success}
        </span>
      ) : (
        <Button
          type="submit"
          disabled={submitting}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Aggiornamento...
            </>
          ) : (
            'Aggiorna Password'
          )}
        </Button>
      )}
    </form>
  );
}

// =============================================================================
// Placeholder sections (functional in later sprints)
// =============================================================================

const TWO_FA_ITEMS = [
  { icon: Smartphone, title: '2FA con SMS', desc: 'Codice via SMS al tuo telefono' },
  { icon: Key, title: 'Authenticator App', desc: 'Google Authenticator o simili' },
  { icon: Mail, title: '2FA via Email', desc: 'Codice di verifica via email' },
];

function TwoFactorPlaceholder() {
  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="font-medium text-foreground">Autenticazione a Due Fattori</h4>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          In arrivo
        </span>
      </div>
      <div className="space-y-3">
        {TWO_FA_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-xl opacity-70"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <input
              type="checkbox"
              className={TOGGLE_CLASS}
              disabled
              aria-label={`${item.title} — non ancora disponibile`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentSessionRow() {
  // We intentionally show only the current session — full session enumeration
  // needs an admin-side API that isn't wired yet.
  return (
    <div className="p-4 bg-muted/50 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Sessione corrente</p>
            <p className="text-sm text-muted-foreground">Attiva ora</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-1">
          <Check className="w-3 h-3" /> Verificata
        </span>
      </div>
    </div>
  );
}

function SessionsPlaceholder() {
  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="font-medium text-foreground">Sessioni Attive</h4>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          Elenco completo in arrivo
        </span>
      </div>
      <div className="space-y-3">
        <CurrentSessionRow />
      </div>
    </div>
  );
}

function ActivityLogPlaceholder() {
  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="font-medium text-foreground">Log Attività</h4>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          In arrivo
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Quando sarà disponibile, qui troverai la cronologia di accessi e modifiche rilevanti al tuo account.
      </p>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function SecurityTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-6 rounded-2xl border-0 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Sicurezza Account
        </h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-foreground mb-4">Cambia Password</h4>
            <PasswordChangeForm />
          </div>
          <TwoFactorPlaceholder />
          <SessionsPlaceholder />
          <ActivityLogPlaceholder />
        </div>
      </Card>
    </motion.div>
  );
}

export default SecurityTab;
