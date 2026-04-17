/**
 * DataTab — Settings > Dati tab
 *
 * Two sections:
 *   - Esportazione Dati: placeholder "In arrivo" (standalone export needs
 *     a dedicated edge function — out of scope for Sprint 1.3)
 *   - Zona Pericolosa: "Elimina Account" wired to the `account-delete` edge
 *     function (PR #441). Defense-in-depth UX:
 *       1. Primary button reveals a confirmation form
 *       2. User types their password + the literal word "ELIMINA"
 *       3. Optional "Esporta prima" checkbox → JSON download before deletion
 *       4. On server success: trigger export download (if any), then logout
 *          and redirect to /auth/login (session is dead server-side)
 *
 * @module components/settings/DataTab
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { gdprClient, GdprApiError } from '@/services/gdpr.client';
import {
  deleteAccountSchema,
  DELETE_CONFIRM_PHRASE,
  type DeleteAccountInput,
} from '@/types/gdpr';

// =============================================================================
// Export download helper (client-side blob)
// =============================================================================

function triggerExportDownload(data: Record<string, unknown>) {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneywise-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Non-fatal: the account was deleted regardless; user can request again
    // from their email if needed. We don't block the redirect.
  }
}

// =============================================================================
// Export section (placeholder)
// =============================================================================

function ExportSection() {
  return (
    <Card className="p-6 rounded-2xl border-0 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-semibold text-foreground">Esportazione Dati</h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          In arrivo
        </span>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl opacity-70">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-foreground">Esporta Tutti i Dati</p>
              <p className="text-sm text-muted-foreground">
                Scarica un backup completo in JSON. Per ora disponibile solo
                insieme all&apos;eliminazione account qui sotto.
              </p>
            </div>
          </div>
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" /> Esporta
          </Button>
        </div>
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl opacity-70">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-foreground">Export Mensile Automatico</p>
              <p className="text-sm text-muted-foreground">
                Ricevi un report CSV ogni primo del mese
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            disabled
            className="w-10 h-6 appearance-none bg-muted rounded-full relative cursor-not-allowed"
            aria-label="Export mensile automatico — non ancora disponibile"
          />
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Delete account form
// =============================================================================

type FormState = Partial<DeleteAccountInput>;

type FieldErrors = Partial<Record<keyof DeleteAccountInput, string>>;

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const [form, setForm] = useState<FormState>({
    password: '',
    exportDataFirst: false,
    confirmPhrase: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof DeleteAccountInput>(
    key: K,
    value: DeleteAccountInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (serverError) setServerError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setServerError(null);
    const parsed = deleteAccountSchema.safeParse(form);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof DeleteAccountInput | undefined;
        if (k && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const result = await gdprClient.deleteAccount({
        password: parsed.data.password,
        exportDataFirst: parsed.data.exportDataFirst,
      });
      if (result.exportData) {
        triggerExportDownload(result.exportData);
      }
      // Session is dead server-side. Invalidate local store + redirect.
      try {
        await logout();
      } catch {
        // Already invalid; the redirect is what matters.
      }
      router.replace('/auth/login?deleted=1');
    } catch (err) {
      if (err instanceof GdprApiError) {
        if (err.code === 'password_mismatch') {
          setErrors({ password: err.message });
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(
          'Errore imprevisto durante l\'eliminazione. Riprova.'
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900"
      noValidate
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="text-sm text-red-900 dark:text-red-200 space-y-1">
          <p className="font-medium">Questa azione è irreversibile.</p>
          <p>
            Tutti i tuoi dati (profilo, transazioni, categorie, budget, notifiche)
            saranno eliminati permanentemente dal nostro server.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delete-password">Conferma con la tua password</Label>
        <Input
          id="delete-password"
          type="password"
          autoComplete="current-password"
          value={form.password ?? ''}
          onChange={(e) => setField('password', e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'delete-password-error' : undefined}
          disabled={submitting}
        />
        {errors.password && (
          <p id="delete-password-error" className="text-sm text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.exportDataFirst ?? false}
          onChange={(e) => setField('exportDataFirst', e.target.checked)}
          disabled={submitting}
        />
        <span className="text-sm text-foreground">
          Esporta i miei dati in JSON prima di eliminare. Il download partirà
          automaticamente.
        </span>
      </label>

      <div className="space-y-2">
        <Label htmlFor="delete-confirm">
          Digita <span className="font-mono font-semibold">{DELETE_CONFIRM_PHRASE}</span>{' '}
          per confermare
        </Label>
        <Input
          id="delete-confirm"
          type="text"
          autoComplete="off"
          value={form.confirmPhrase ?? ''}
          onChange={(e) => setField('confirmPhrase', e.target.value)}
          aria-invalid={!!errors.confirmPhrase}
          aria-describedby={
            errors.confirmPhrase ? 'delete-confirm-error' : undefined
          }
          disabled={submitting}
        />
        {errors.confirmPhrase && (
          <p id="delete-confirm-error" className="text-sm text-destructive">
            {errors.confirmPhrase}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-[13px] text-red-600">{serverError}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-red-600 hover:bg-red-700 text-white border-0"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Eliminazione in corso...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" /> Conferma Eliminazione Definitiva
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// Danger zone card
// =============================================================================

function DangerZone() {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <Card className="p-6 rounded-2xl border-red-200 dark:border-red-800">
      <h3 className="text-lg font-semibold text-red-600 mb-4">Zona Pericolosa</h3>
      <div className="space-y-4">
        {!showDelete ? (
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Elimina Account</p>
              <p className="text-sm text-muted-foreground">
                Cancella permanentemente tutti i dati. GDPR Art. 17 (diritto all&apos;oblio).
              </p>
            </div>
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Elimina
            </Button>
          </div>
        ) : (
          <DeleteAccountForm onCancel={() => setShowDelete(false)} />
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function DataTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <ExportSection />
      <DangerZone />
    </motion.div>
  );
}

export default DataTab;

// Re-export for tests that want to drive the inner form directly
export { DeleteAccountForm as __DeleteAccountForm };
