'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import {
  useAddSavingsEntry,
  useUpdateSavingsEntry,
} from '@/hooks/use-wallet';
import type { SavingsBox, SavingsEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

// Lançamento numa caixinha: aporte (+) ou retirada (−).
export function SavingsEntryDialog({
  box,
  entry,
  open,
  onOpenChange,
}: {
  box: SavingsBox | null;
  entry?: SavingsEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const add = useAddSavingsEntry();
  const update = useUpdateSavingsEntry();
  const editing = !!entry;

  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);

  useEffect(() => {
    if (!open) return;
    const amt = entry?.amount ?? 0;
    setKind(amt < 0 ? 'out' : 'in');
    setAmount(entry ? String(Math.abs(amt)) : '');
    setDescription(entry?.description ?? '');
    setDate(entry ? entry.date.slice(0, 10) : today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount) || 0;
    if (value <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    const signed = kind === 'out' ? -value : value;
    const payload = {
      amount: signed,
      description: description.trim() || null,
      date,
    };
    if (editing) {
      update.mutate(
        { id: entry!.id, ...payload },
        {
          onSuccess: () => {
            onOpenChange(false);
            toast.success('Lançamento atualizado!');
          },
          onError: (er) => toast.error(er.message),
        },
      );
      return;
    }
    if (!box) return;
    add.mutate(
      { boxId: box.id, ...payload },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(kind === 'out' ? 'Retirada registrada!' : 'Aporte registrado!');
        },
        onError: (er) => toast.error(er.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar lançamento' : 'Novo lançamento'}
          </DialogTitle>
          <DialogDescription>
            {box ? `Caixinha "${box.name}".` : ''} Aportes somam ao saldo,
            retiradas descontam.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* aporte × retirada */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['in', 'Aporte'],
                ['out', 'Retirada'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setKind(key)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                  kind === key
                    ? key === 'out'
                      ? 'border-rose-400/60 bg-rose-400/10 text-rose-300'
                      : 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Valor (R$)</Label>
              <NumberInput
                value={amount}
                onValueChange={setAmount}
                min={0}
                placeholder="0,00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: 13º salário, sobra do mês…"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={add.isPending || update.isPending}>
              {editing ? 'Salvar' : 'Lançar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
