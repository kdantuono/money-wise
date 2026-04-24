'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { accountsClient } from '@/services/accounts.client';
import { liabilitiesClient } from '@/services/liabilities.client';
import type { FinancialInstrument } from '@/services/financial-instruments.client';

interface EditInstrumentModalProps {
  instrument: FinancialInstrument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edit modal "quick" per instrument Patrimonio: rinomina + aggiorna saldo.
 * Discriminator `class` dispatch a accountsClient (ASSET) o liabilitiesClient (LIABILITY).
 *
 * Scope MVP §5.5: 80% use-cases reali (rinomina + saldo manuale). Per edit full
 * (institution, settings SaltEdge, statement dates) user naviga a `/accounts/[id]`
 * o `/liabilities/[id]` — deferred a future sprint.
 */
export function EditInstrumentModal({
  instrument,
  open,
  onOpenChange,
}: EditInstrumentModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(instrument.name);
  const [balance, setBalance] = useState(instrument.currentBalance.toString());
  const [error, setError] = useState<string | null>(null);

  // Reset form state quando modal si apre con nuovo instrument
  useEffect(() => {
    if (open) {
      setName(instrument.name);
      setBalance(instrument.currentBalance.toString());
      setError(null);
    }
  }, [open, instrument.id, instrument.name, instrument.currentBalance]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedBalance = Number(balance);
      if (!Number.isFinite(parsedBalance)) {
        throw new Error('Saldo non valido');
      }
      // FinancialInstrument.currentBalance è positivo sempre (convenzione italiana:
      // assets positivi, liabilities positivi = debito residuo). Rifiutare negativi
      // preserva la semantica del dominio.
      if (parsedBalance < 0) {
        throw new Error('Il saldo non può essere negativo');
      }
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Nome obbligatorio');
      }
      if (instrument.class === 'ASSET') {
        await accountsClient.updateAccount(instrument.id, {
          name: trimmedName,
          currentBalance: parsedBalance,
        });
      } else {
        await liabilitiesClient.updateLiability(instrument.id, {
          name: trimmedName,
          currentBalance: parsedBalance,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrimonio'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message || 'Errore aggiornamento');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  const isLiability = instrument.class === 'LIABILITY';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-testid="edit-instrument-modal"
          className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-card p-6 shadow-lg rounded-xl"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              Modifica {isLiability ? 'debito' : 'conto'}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Chiudi"
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-instrument-name">Nome</Label>
              <Input
                id="edit-instrument-name"
                data-testid="edit-instrument-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-instrument-balance">
                Saldo attuale {isLiability ? '(debito residuo)' : ''}
              </Label>
              <Input
                id="edit-instrument-balance"
                data-testid="edit-instrument-balance"
                type="number"
                step="0.01"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {isLiability
                  ? 'Importo ancora da pagare. Aggiornamento manuale.'
                  : 'Saldo corrente del conto. Per sync automatico, usa integrazione banking.'}
              </p>
            </div>

            {error && (
              <p
                data-testid="edit-instrument-error"
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                data-testid="edit-instrument-submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
