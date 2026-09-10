'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Substitui o window.confirm: `const confirm = useConfirm();` →
// `if (await confirm({ description })) { ... }`
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa do <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={state !== null}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{state?.opts.title ?? 'Confirmar'}</DialogTitle>
            {state?.opts.description && (
              <DialogDescription>{state.opts.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => close(false)}>
              {state?.opts.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button
              variant={state?.opts.destructive ? 'destructive' : 'default'}
              onClick={() => close(true)}
            >
              {state?.opts.confirmLabel ?? 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
