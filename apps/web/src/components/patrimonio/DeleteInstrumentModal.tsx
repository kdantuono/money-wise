'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { accountsClient } from '@/services/accounts.client';
import { liabilitiesClient } from '@/services/liabilities.client';
import type { FinancialInstrument } from '@/services/financial-instruments.client';

interface DeleteInstrumentModalProps {
  instrument: FinancialInstrument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation modal per delete instrument Patrimonio.
 *
 * Consequence text differenzia asset vs liability: account cancellato richiede
 * warning su transazioni linked (LinkedTransfersError gestito da backend);
 * liability cancellata richiede warning su installments + payments storici.
 *
 * Post-delete: invalidate patrimonio query per refresh immediato.
 */
export function DeleteInstrumentModal({
  instrument,
  open,
  onOpenChange,
}: DeleteInstrumentModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (instrument.class === 'ASSET') {
        await accountsClient.deleteAccount(instrument.id);
      } else {
        await liabilitiesClient.deleteLiability(instrument.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrimonio'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message || 'Errore eliminazione');
    },
  });

  const isLiability = instrument.class === 'LIABILITY';
  const entityLabel = isLiability ? 'debito' : 'conto';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-testid="delete-instrument-modal"
          className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-card p-6 shadow-lg rounded-xl"
        >
          <div className="space-y-2">
            <Dialog.Title className="text-lg font-semibold">
              Elimina {entityLabel}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Stai per eliminare <strong>{instrument.name}</strong>. Questa azione non
              può essere annullata.
            </Dialog.Description>
          </div>

          <div className="text-sm text-muted-foreground">
            {isLiability ? (
              <p>
                Le rate storiche e i pagamenti collegati resteranno visibili nello storico
                transazioni, ma il debito scomparirà dal patrimonio.
              </p>
            ) : (
              <p>
                Le transazioni storiche resteranno archiviate. Se il conto ha trasferimenti
                collegati, l&apos;eliminazione sarà bloccata e dovrai gestirli prima.
              </p>
            )}
          </div>

          {error && (
            <p
              data-testid="delete-instrument-error"
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
              onClick={() => {
                setError(null);
                onOpenChange(false);
              }}
              disabled={mutation.isPending}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="delete-instrument-confirm"
              onClick={() => {
                setError(null);
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Eliminazione...' : `Elimina ${entityLabel}`}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
